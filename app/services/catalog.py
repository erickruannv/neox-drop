import re
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from urllib.parse import unquote, urlsplit

from bson import ObjectId
from fastapi import Request
from pydantic import ValidationError
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import ApiFault
from app.db.mongodb import mongodb_client
from app.schemas.product import AdminProduct, ProductCreate


async def products_collection(request: Request):
    settings = request.app.state.settings
    async with mongodb_client(settings) as client:
        yield client[settings.mongodb_database]["products"]


def invalid_product():
    return ApiFault(422, "VALIDATION_ERROR", "Revise os dados do produto.")


def validate_product(payload, settings) -> dict:
    try:
        data = ProductCreate.model_validate(payload).model_dump(exclude_unset=True)
    except ValidationError as exc:
        raise invalid_product() from exc
    for key in ("sku", "slug", "name", "brand", "category", "colorName"):
        if not data[key].strip():
            raise invalid_product()
    sizes = data["sizes"]
    if len({s["sizeBR"] for s in sizes}) != len(sizes):
        raise invalid_product()
    integers = [data["priceCents"], *(s["stock"] for s in sizes)]
    if "featured" in data:
        integers.append(data["featured"]["order"])
    if any(number > 2**63 - 1 for number in integers):
        raise invalid_product()
    urls = [data["mainImageUrl"], *data["galleryUrls"]]
    if data.get("model3dUrl"):
        urls.append(data["model3dUrl"])
    for value in urls:
        decoded = value
        for _ in range(6):
            decoded = unquote(decoded)
        if "\\" in decoded or any(ord(c) < 32 for c in decoded):
            raise invalid_product()
        url = urlsplit(decoded)
        if value.startswith("/static/"):
            if any(part in {".", ".."} for part in url.path.split("/")):
                raise invalid_product()
        elif (
            url.scheme != "https"
            or url.username
            or url.password
            or f"https://{url.netloc}" not in settings.media_allowed_origins
        ):
            raise invalid_product()
    stack = [(data.get("attributes", {}), 0)]
    while stack:
        value, depth = stack.pop()
        if depth > 20:
            raise invalid_product()
        if isinstance(value, dict):
            if any(key.startswith("$") or "." in key or "\x00" in key for key in value):
                raise invalid_product()
            stack.extend((item, depth + 1) for item in value.values())
        elif isinstance(value, list):
            stack.extend((item, depth + 1) for item in value)
    return data


def merge_patch(original: dict, changes: dict) -> dict:
    result = deepcopy(original)
    for key, value in changes.items():
        if key == "model3dUrl" and value is None:
            result.pop(key, None)
        elif key == "featured":
            result[key] = {**result.get(key, {}), **value}
        else:
            result[key] = value
    return result


def admin_product(doc: dict) -> dict:
    result = {key: doc[key] for key in AdminProduct.model_fields if key in doc}
    result["id"] = str(doc["_id"])
    return result


def public_product(doc: dict, detail: bool = True) -> dict:
    keys = {"sku", "slug", "name", "brand", "category", "priceCents", "mainImageUrl", "active"}
    if detail:
        keys |= {
            "description",
            "currency",
            "galleryUrls",
            "model3dUrl",
            "colorName",
            "featured",
            "attributes",
        }
    result = {key: doc[key] for key in keys if key in doc}
    result["id"] = str(doc["_id"])
    result["sizesAvailable"] = sorted({s["sizeBR"] for s in doc["sizes"] if s["stock"] > 0})
    return result


def object_id(value: str):
    if not ObjectId.is_valid(value):
        raise invalid_product()
    return ObjectId(value)


async def create_product(collection, payload, settings):
    data = validate_product(payload, settings)
    now = datetime.now(UTC)
    now = now.replace(microsecond=now.microsecond // 1000 * 1000)
    doc = {**data, "_id": ObjectId(), "createdAt": now, "updatedAt": now}
    try:
        await collection.insert_one(doc)
    except DuplicateKeyError as exc:
        raise ApiFault(409, "PRODUCT_CONFLICT", "SKU ou slug já utilizado.") from exc
    return admin_product(doc)


async def update_product(collection, product_id: str, changes: dict, settings):
    identifier = object_id(product_id)
    original = await collection.find_one({"_id": identifier})
    if original is None:
        raise ApiFault(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.")
    base = {key: original[key] for key in ProductCreate.model_fields if key in original}
    data = validate_product(merge_patch(base, changes), settings)
    now = datetime.now(UTC)
    now = now.replace(microsecond=now.microsecond // 1000 * 1000)
    data["updatedAt"] = max(now, original["updatedAt"] + timedelta(milliseconds=1))
    update = {"$set": data}
    if "model3dUrl" in changes and changes["model3dUrl"] is None:
        update["$unset"] = {"model3dUrl": ""}
    try:
        doc = await collection.find_one_and_update(
            {"_id": identifier, "updatedAt": original["updatedAt"]},
            update,
            return_document=ReturnDocument.AFTER,
        )
    except DuplicateKeyError as exc:
        raise ApiFault(409, "PRODUCT_CONFLICT", "SKU ou slug já utilizado.") from exc
    if doc is None:
        raise ApiFault(409, "PRODUCT_CONFLICT", "Produto alterado por outra requisição.")
    return admin_product(doc)


def catalog_filter(filters, public: bool):
    query = {"active": True} if public else {}
    if not public and getattr(filters, "active", None) is not None:
        query["active"] = filters.active
    for key in ("brand", "category"):
        value = getattr(filters, key)
        if value:
            query[key] = value
    if filters.q:
        query["$or"] = [
            {key: {"$regex": re.escape(filters.q), "$options": "i"}}
            for key in ("name", "brand", "description")
        ]
    if filters.sizeBR is not None:
        query["sizes"] = {"$elemMatch": {"sizeBR": filters.sizeBR, "stock": {"$gt": 0}}}
    return query


async def list_products(collection, filters, public: bool):
    query = catalog_filter(filters, public)
    order = {
        "recent": [("createdAt", -1), ("_id", 1)],
        "price_asc": [("priceCents", 1), ("_id", 1)],
        "price_desc": [("priceCents", -1), ("_id", 1)],
    }[filters.sort]
    docs = (
        await collection.find(query)
        .sort(order)
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit)
        .to_list(length=filters.limit)
    )
    return {
        "items": [
            public_product(doc, detail=False) if public else admin_product(doc) for doc in docs
        ],
        "page": filters.page,
        "limit": filters.limit,
        "total": await collection.count_documents(query),
    }
