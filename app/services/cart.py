import re
from urllib.parse import urlencode

from bson import ObjectId

from app.core.exceptions import ApiFault, ServiceUnavailable
from app.db.supabase import store_contact
from app.schemas.checkout import CheckoutRequest


def brl(cents: int) -> str:
    whole, fraction = divmod(cents, 100)
    return f"R$ {whole:,}".replace(",", ".") + f",{fraction:02d}"


async def checkout_summary(collection, payload: dict, settings):
    request = CheckoutRequest.model_validate(payload)
    grouped = {}
    for item in request.items:
        key = (str(ObjectId(item.productId)), item.sizeBR)
        grouped[key] = grouped.get(key, 0) + item.quantity
        if grouped[key] > 10:
            raise ApiFault(422, "CART_ITEM_UNAVAILABLE", "Revise a quantidade dos itens.")
    docs = await collection.find(
        {
            "_id": {"$in": [ObjectId(identifier) for identifier, _ in grouped]},
            "active": True,
        }
    ).to_list(length=50)
    products = {str(doc["_id"]): doc for doc in docs}
    lines = []
    for (identifier, size), quantity in grouped.items():
        product = products.get(identifier)
        sizes = (
            [row for row in product.get("sizes", []) if row.get("sizeBR") == size]
            if product
            else []
        )
        if (
            not product
            or product.get("active") is not True
            or len(sizes) != 1
            or not isinstance(sizes[0].get("stock"), int)
            or isinstance(sizes[0]["stock"], bool)
            or sizes[0]["stock"] < quantity
        ):
            raise ApiFault(
                422, "CART_ITEM_UNAVAILABLE", "Produto, tamanho ou quantidade indisponível."
            )
        price = product.get("priceCents")
        if not isinstance(price, int) or isinstance(price, bool) or price < 0:
            raise ServiceUnavailable()
        lines.append(
            {
                "productId": identifier,
                "name": product["name"],
                "sizeBR": size,
                "quantity": quantity,
                "unitPriceCents": price,
                "lineTotalCents": quantity * price,
            }
        )
    total = sum(line["lineTotalCents"] for line in lines)
    phone = await store_contact(settings)
    if not isinstance(phone, str) or not re.fullmatch(r"[1-9][0-9]{7,14}", phone):
        raise ApiFault(503, "STORE_WHATSAPP_NOT_CONFIGURED", "Contato da loja não configurado.")
    message = "Olá, gostaria de pedir:\n" + "\n".join(
        f"{line['quantity']}x {line['name']} — tamanho BR {line['sizeBR']} — "
        f"{brl(line['lineTotalCents'])}"
        for line in lines
    )
    message += (
        f"\nTotal: {brl(total)}\nSolicitação sujeita a confirmação; sem pagamento ou reserva."
    )
    if len(message) > 8000:
        raise ApiFault(422, "CHECKOUT_LIMIT_EXCEEDED", "Mensagem excede o limite permitido.")
    query = urlencode({"text": message})
    return {
        "items": lines,
        "totalCents": total,
        "currency": "BRL",
        "waUrl": f"https://wa.me/{phone}?{query}",
    }
