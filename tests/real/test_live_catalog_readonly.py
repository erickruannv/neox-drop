"""Catálogo público contra Atlas real: somente leitura, sem cookies de visitante."""

from html import unescape
from urllib.parse import quote

from httpx import AsyncClient

from app.db.mongodb import mongodb_client


async def test_main_catalog_matches_real_atlas_without_fixtures(real_settings):
    assert real_settings.allowed_origin == "http://127.0.0.1:8000"
    async with mongodb_client(real_settings) as mongo:
        collection = mongo[real_settings.mongodb_database]["products"]
        documents = await collection.find({"active": True}).to_list()
        assert documents, "O teste exige ao menos um produto ativo já autorizado."
        by_id = {str(doc["_id"]): doc for doc in documents}
        async with AsyncClient(base_url=real_settings.allowed_origin, timeout=20) as client:
            items = []
            page = 1
            while True:
                response = await client.get("/api/products", params={"limit": 24, "page": page})
                assert response.status_code == 200
                result = response.json()
                assert result["total"] == len(documents)
                assert result["items"], "Paginação não pode terminar antes do total declarado."
                items.extend(result["items"])
                if len(items) >= result["total"]:
                    break
                page += 1
            assert len(items) == len(by_id)
            assert {item["id"] for item in items} == set(by_id)
            for item in items:
                doc = by_id[item["id"]]
                for key in (
                    "sku",
                    "slug",
                    "name",
                    "brand",
                    "category",
                    "priceCents",
                    "mainImageUrl",
                ):
                    assert item[key] == doc[key]
                assert "sizes" not in item

            response = await client.get("/api/featured")
            assert response.status_code == 200
            featured = response.json()["items"]
            expected = sorted(
                (d for d in documents if d.get("featured", {}).get("enabled")),
                key=lambda d: (d["featured"]["order"], str(d["_id"])),
            )
            assert [p["id"] for p in featured] == [str(d["_id"]) for d in expected]
            for item in featured:
                doc = by_id[item["id"]]
                for key in ("mainImageUrl", "galleryUrls", "model3dUrl"):
                    assert item.get(key) == doc.get(key)
                # O modelo aprovado AM95 não pode aparecer associado a outro tênis ativo.
                if item.get("model3dUrl") == (
                    "https://sketchfab.com/models/c425a652fc59427ba1fcef48ea174c92/embed"
                ):
                    assert item["sku"] == "NEOX-AM95-DARKARMY"

            response = await client.get("/")
            assert response.status_code == 200
            html = unescape(response.text)
            latest = sorted(
                (d for d in documents if d["sku"] != "NEOX-AM90-INFRARED"),
                key=lambda d: str(d["_id"]),
            )
            latest.sort(key=lambda d: d["createdAt"], reverse=True)
            am90 = next(d for d in documents if d["sku"] == "NEOX-AM90-INFRARED")
            assert am90["name"] not in html and am90["slug"] not in html
            for doc in latest[:6]:
                assert doc["name"] in html
                assert "/tenis/" + quote(doc["slug"], safe="") in html
            for doc in documents:
                response = await client.get(
                    "/api/products", params={"brand": doc["brand"], "category": doc["category"]}
                )
                assert response.status_code == 200
                assert str(doc["_id"]) in {p["id"] for p in response.json()["items"]}
