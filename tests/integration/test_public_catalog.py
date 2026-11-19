import httpx
from jsonschema import Draft202012Validator
from pymongo.errors import ServerSelectionTimeoutError


def validate(contract, name, response):
    Draft202012Validator(
        {"$ref": f"#/components/schemas/{name}", "components": contract["components"]}
    ).validate(response.json())


async def test_public_query_filters_and_projection(catalog_app, contract):
    app, collection, doc, cursor = catalog_app
    cursor.to_list.return_value = [doc]
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get("/api/products?sizeBR=40&q=%2E%2A&sort=price_asc")
        assert response.status_code == 200, response.text
        validate(contract, "ProductList", response)
        assert "sizes" not in response.json()["items"][0]
        query = collection.find.call_args.args[0]
        assert query["active"] is True
        assert query["sizes"] == {"$elemMatch": {"sizeBR": 40, "stock": {"$gt": 0}}}
        assert query["$or"][0]["name"]["$regex"] == r"\.\*"
        assert cursor.sort.call_args.args[0] == [("priceCents", 1), ("_id", 1)]
        assert (await client.get("/api/products?sizeBR=100")).status_code == 422
        assert (await client.get("/api/products?sort=arbitrary")).status_code == 422


async def test_detail_and_featured_without_visit_side_effect(catalog_app, contract):
    app, collection, doc, cursor = catalog_app
    cursor.to_list.return_value = [doc]
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        response = await client.get(f"/api/products/{doc['slug']}")
        assert response.status_code == 200
        validate(contract, "ProductDetail", response)
        assert collection.find_one.call_args_list[0].args[0] == {
            "slug": doc["slug"],
            "active": True,
        }
        assert not response.headers.get("set-cookie")
        response = await client.get("/api/featured")
        assert response.status_code == 200
        validate(contract, "FeaturedList", response)
        assert collection.find.call_args.args[0] == {"active": True, "featured.enabled": True}
        assert cursor.sort.call_args.args[0] == [("featured.order", 1), ("_id", 1)]
        collection.find_one.return_value = None
        assert (await client.get("/api/products/absent")).status_code == 404
        collection.find_one.side_effect = ServerSelectionTimeoutError("secret://host")
        response = await client.get("/api/products/failure")
        assert response.status_code == 503
        assert "secret" not in response.text
