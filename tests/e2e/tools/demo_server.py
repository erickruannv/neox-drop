"""Servidor de DEMONSTRAÇÃO local da UI (não é a aplicação FastAPI).

Renderiza os templates Jinja2 reais com as fixtures fictícias de render_preview.py e responde
às rotas /api/* no formato do OpenAPI, em memória. Sem banco, sem sessão real, sem WhatsApp real.
Uso: pnpm demo  ->  http://127.0.0.1:4180/
"""

import json
import re
import sys
import uuid
from datetime import UTC, datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace
from urllib.parse import parse_qs, quote, unquote, urlsplit

import render_preview as rp
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from jsonschema import Draft202012Validator

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4180
# Número inexistente (DDD 00): o link wa.me abre, mas não chega a nenhuma pessoa real.
DEMO_WHATSAPP = "5500000000000"

env = Environment(
    loader=FileSystemLoader(rp.ROOT / "app/templates"), autoescape=True, undefined=StrictUndefined
)
routes, mock = rp.pages()
details = mock["details"]
admin_items = routes["admin/produtos"][1]["products"]["items"]
admin_profile = routes["admin/produtos"][1]["admin"]


def err(code, message, details=()):
    return {"error": {"code": code, "message": message, "details": list(details)}}


def product_list(params):
    def get(k):
        return (params.get(k) or [""])[0].strip()

    out = [rp.summary(d) for d in details]
    if get("q"):
        out = [p for p in out if get("q").lower() in f"{p['name']} {p['brand']}".lower()]
    if get("brand"):
        out = [p for p in out if get("brand").lower() in p["brand"].lower()]
    if get("category"):
        out = [p for p in out if p["category"] == get("category")]
    if get("sizeBR").isdigit():
        out = [p for p in out if int(get("sizeBR")) in p["sizesAvailable"]]
    if get("sort") == "price_asc":
        out.sort(key=lambda p: p["priceCents"])
    elif get("sort") == "price_desc":
        out.sort(key=lambda p: -p["priceCents"])
    page = int(get("page")) if get("page").isdigit() and int(get("page")) > 0 else 1
    limit = min(24, int(get("limit"))) if get("limit").isdigit() and int(get("limit")) > 0 else 12
    return {
        "items": out[(page - 1) * limit : page * limit],
        "page": page,
        "limit": limit,
        "total": len(out),
    }


def checkout(body):
    items = body.get("items") if isinstance(body, dict) else None
    if not isinstance(items, list) or not 1 <= len(items) <= 50:
        return 422, err("VALIDATION_ERROR", "Carrinho vazio ou inválido.")
    grouped = {}
    for i in items:
        try:
            key = (str(i["productId"]), int(i["sizeBR"]))
            grouped[key] = grouped.get(key, 0) + int(i["quantity"])
        except (KeyError, TypeError, ValueError):
            return 422, err("VALIDATION_ERROR", "Item do carrinho inválido.")
    by_id = {d["id"]: d for d in details}
    lines, problems = [], []
    for (pid, size), qty in grouped.items():
        d = by_id.get(pid)
        if not d or size not in d["sizesAvailable"] or not 1 <= qty <= 10:
            problems.append(
                {
                    "field": f"items[{len(lines) + len(problems)}]",
                    "code": "CART_ITEM_UNAVAILABLE",
                    "message": f"{d['name'] if d else 'Produto'} {size} indisponível.",
                }
            )
            continue
        lines.append(
            {
                "productId": pid,
                "name": d["name"],
                "sizeBR": size,
                "quantity": qty,
                "unitPriceCents": d["priceCents"],
                "lineTotalCents": d["priceCents"] * qty,
            }
        )
    if problems:
        return 422, err("CART_ITEM_UNAVAILABLE", "Alguns itens não estão disponíveis.", problems)
    total = sum(line["lineTotalCents"] for line in lines)

    def brl(c):
        return f"R$ {c // 100:,}".replace(",", ".") + f",{c % 100:02d}"

    text = (
        "Olá! Quero fazer um pedido na NEOX drop:\n"
        + "\n".join(
            f"- {x['quantity']}x {x['name']} (nº {x['sizeBR']}) {brl(x['lineTotalCents'])}"
            for x in lines
        )
        + f"\nTotal: {brl(total)}"
    )
    res = {
        "items": lines,
        "totalCents": total,
        "currency": "BRL",
        "waUrl": f"https://wa.me/{DEMO_WHATSAPP}?text={quote(text)}",
    }
    rp.validate_as("CheckoutResponse", res)
    return 200, res


def create_product(body):
    schema = {"$ref": "urn:openapi#/components/schemas/ProductCreate"}
    errors = sorted(
        Draft202012Validator(schema, registry=rp.registry).iter_errors(body),
        key=lambda e: list(e.path),
    )
    if errors:
        det = [
            {
                "field": ".".join(map(str, e.path)) or "body",
                "code": "INVALID",
                "message": e.message[:200],
            }
            for e in errors
        ]
        return 422, err("VALIDATION_ERROR", "Revise os campos informados.", det)
    if any(p["sku"] == body["sku"] or p["slug"] == body["slug"] for p in admin_items):
        return 409, err("PRODUCT_CONFLICT", "SKU ou slug já cadastrado.")
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    item = {
        **body,
        "id": uuid.uuid4().hex[:24],
        "currency": "BRL",
        "createdAt": now,
        "updatedAt": now,
    }
    item.setdefault("galleryUrls", [])
    item.setdefault("active", True)
    try:
        rp.validate_as("AdminProduct", item)
    except Exception as e:  # contrato do mock divergente: mostra no terminal, não esconde
        print("AdminProduct inválido no demo:", e)
    admin_items.insert(0, item)
    return 201, item


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(rp.ROOT / "app"), **kw)

    def send_json(self, status, body=None):
        data = b"" if body is None else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        if body is not None:
            self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def page(self, template, ctx, status=200):
        path = urlsplit(self.path).path
        html = (
            env.get_template(template)
            .render(
                request=SimpleNamespace(url=SimpleNamespace(path=path)),
                csrfToken="demo-csrf",
                siteName="NEOX drop",
                demoMode=True,
                **ctx,
            )
            .encode()
        )
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(html)

    def do_GET(self):
        url = urlsplit(self.path)
        path, params = unquote(url.path).rstrip("/") or "/", parse_qs(url.query)
        if path.startswith("/static/"):
            return super().do_GET()
        if path == "/api/products":
            return self.send_json(200, product_list(params))
        if m := re.fullmatch(r"/api/products/([a-z0-9-]+)", path):
            d = next((d for d in details if d["slug"] == m[1]), None)
            return (
                self.send_json(200, d)
                if d
                else self.send_json(404, err("NOT_FOUND", "Produto não encontrado."))
            )
        if path == "/api/featured":
            return self.send_json(200, routes[""][1]["featured"])
        if path == "/api/recent":
            return self.send_json(200, routes[""][1]["recent"])
        if path == "/api/admin/me":
            return self.send_json(200, admin_profile)
        if path == "/api/admin/products":
            return self.send_json(
                200, {"items": admin_items, "page": 1, "limit": 24, "total": len(admin_items)}
            )
        if path == "/tenis":
            filters = {
                k: v[0]
                for k, v in params.items()
                if k in ("q", "brand", "category", "sizeBR", "sort")
            }
            if filters.get("sizeBR", "").isdigit():
                filters["sizeBR"] = int(filters["sizeBR"])
            return self.page("catalog.html", {"catalog": product_list(params), "filters": filters})
        if path == "/admin/produtos":
            ctx = {
                "products": {
                    "items": admin_items,
                    "page": 1,
                    "limit": 24,
                    "total": len(admin_items),
                },
                "admin": admin_profile,
            }
            return self.page("admin/products.html", ctx)
        if path.lstrip("/") in routes:
            template, ctx = routes[path.lstrip("/")]
            return self.page(template, ctx)
        if path.startswith("/api/"):
            return self.send_json(404, err("NOT_FOUND", "Rota não existe no contrato."))
        self.send_response(404)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write("Página não encontrada (demo).".encode())

    def do_POST(self):
        path = urlsplit(self.path).path
        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"null")
        except json.JSONDecodeError:
            return self.send_json(400, err("BAD_REQUEST", "JSON inválido."))
        if self.headers.get("X-CSRF-Token") != "demo-csrf":
            return self.send_json(403, err("CSRF_INVALID", "Sessão expirada. Recarregue a página."))
        if path == "/api/checkout":
            return self.send_json(*checkout(body))
        if path == "/api/recent":
            return self.send_json(204)
        if path == "/api/admin/auth/login":
            ok = (
                isinstance(body, dict)
                and "@" in str(body.get("email", ""))
                and body.get("password")
            )
            return (
                self.send_json(200, admin_profile)
                if ok
                else self.send_json(401, err("INVALID_CREDENTIALS", "E-mail ou senha inválidos."))
            )
        if path == "/api/admin/auth/logout":
            return self.send_json(204)
        if path == "/api/admin/products":
            return self.send_json(*create_product(body))
        return self.send_json(404, err("NOT_FOUND", "Rota não existe no contrato."))

    def log_message(self, fmt, *args):
        sys.stderr.write(
            f"[demo] {self.command} {self.path} -> {args[1] if len(args) > 1 else ''}\n"
        )


if __name__ == "__main__":
    print(f"NEOX drop DEMO em http://127.0.0.1:{PORT}/  (Ctrl+C para parar)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
