import json
import re

import httpx
import pytest
from jsonschema import Draft202012Validator

from app.core.config import Settings
from app.main import create_app
from app.services.catalog import validate_product


@pytest.mark.parametrize(
    ("suffix", "content_type"),
    [
        ("webp", "image/webp"),
        ("avif", "image/avif"),
        ("glb", "model/gltf-binary"),
        ("gltf", "model/gltf+json"),
        ("bin", "application/octet-stream"),
    ],
)
async def test_static_media_mime_range_and_conditional_cache(
    tmp_path, monkeypatch, suffix, content_type
):
    import app.main

    # Bytes locais sintéticos: testa transporte HTTP, não mídia licenciada ou renderização 3D.
    data = b"0123456789abcdef"
    (tmp_path / f"asset.{suffix}").write_bytes(data)
    monkeypatch.setattr(app.main, "STATIC_DIR", tmp_path)
    app = create_app(Settings(_env_file=None))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        path = f"/static/asset.{suffix}"
        full = await client.get(path)
        assert full.status_code == 200
        assert full.headers["content-type"] == content_type
        assert full.content == data
        assert full.headers["content-length"] == str(len(data))
        assert full.headers["accept-ranges"] == "bytes"
        head = await client.head(path)
        assert head.status_code == 200 and head.content == b""
        assert head.headers["content-length"] == str(len(data))
        partial = await client.get(path, headers={"Range": "bytes=4-7"})
        assert partial.status_code == 206 and partial.content == data[4:8]
        assert partial.headers["content-range"] == f"bytes 4-7/{len(data)}"
        cached = await client.get(path, headers={"If-None-Match": full.headers["etag"]})
        assert cached.status_code == 304 and cached.content == b""
        assert (await client.get("/static/missing.glb")).status_code == 404


@pytest.mark.parametrize(
    "slug", ["air-max-95", "air-max-90", "new-balance-9060", "adidas-samba-og"]
)
async def test_product_media_stays_associated_in_detail_featured_and_html(
    catalog_app, contract, slug
):
    app, collection, doc, cursor = catalog_app
    media = {
        "mainImageUrl": f"/static/images/products/{slug}/main.webp",
        "galleryUrls": [
            f"/static/images/products/{slug}/main.webp",
            f"/static/images/products/{slug}/detail.avif",
        ],
        "model3dUrl": f"/static/models/{slug}/model.glb",
    }
    doc.update(slug=slug, **media)
    doc["featured"] = {
        "enabled": True,
        "order": 1,
        "backgroundHex": "#000000",
        "accentHex": "#ffffff",
    }
    # Validação de entrada real; coleção é dublê local, sem operação nos bancos.
    from app.schemas.product import ProductCreate

    payload = {k: v for k, v in doc.items() if k in ProductCreate.model_fields}
    assert all(validate_product(payload, app.state.settings)[k] == v for k, v in media.items())
    cursor.to_list.return_value = [doc]
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        detail = await client.get(f"/api/products/{slug}")
        assert detail.status_code == 200
        Draft202012Validator(
            {"$ref": "#/components/schemas/ProductDetail", "components": contract["components"]}
        ).validate(detail.json())
        for key, value in media.items():
            assert detail.json()[key] == value
        featured = await client.get("/api/featured")
        assert featured.status_code == 200
        assert featured.json()["items"][0]["id"] == str(doc["_id"])
        assert all(featured.json()["items"][0][k] == v for k, v in media.items())
        page = await client.get(f"/tenis/{slug}")
        assert page.status_code == 200
        # O contexto entregue ao template conserva a mídia do produto selecionado.
        assert media["mainImageUrl"] in page.text
        assert media["galleryUrls"][1] in page.text
        home = await client.get("/")
        assert home.status_code == 200
        hero_data = json.loads(
            re.search(
                r'<script type="application/json" id="hero-data">(.*?)</script>', home.text, re.S
            ).group(1)
        )
        assert hero_data[0]["id"] == str(doc["_id"])
        assert all(hero_data[0][k] == v for k, v in media.items())
        collection.insert_one.assert_not_awaited()
        collection.find_one_and_update.assert_not_awaited()
