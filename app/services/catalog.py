import json
import logging
import math
import re
from copy import deepcopy
from datetime import UTC, datetime, timedelta
from urllib.parse import unquote, urlsplit

from bson import BSON, ObjectId
from bson.errors import BSONError
from fastapi import Request
from pydantic import ValidationError
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import ApiFault
from app.db.mongodb import mongodb_client
from app.db.redis import redis_client
from app.schemas.product import AdminProduct, ProductCreate, ProductDetail


async def products_collection(request: Request):
    settings = request.app.state.settings
    async with mongodb_client(settings) as client:
        yield client[settings.mongodb_database]["products"]


def invalid_product():
    return ApiFault(422, "VALIDATION_ERROR", "Revise os dados do produto.")


def safe_credit_url(value):
    if not isinstance(value, str) or not re.fullmatch(r"https://[^\s\\]+", value):
        return False
    try:
        url = urlsplit(value)
        _ = url.port
        return bool(url.hostname and not url.username and not url.password)
    except ValueError:
        return False


def public_attributes(attributes):
    return {
        key: value
        for key, value in attributes.items()
        if key not in {"imageCreditUrl", "model3dCreditUrl"} or safe_credit_url(value)
    }


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
        try:
            url = urlsplit(decoded)
            _ = url.port
        except ValueError as exc:
            raise invalid_product() from exc
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
    model = data.get("model3dUrl")
    if (
        model
        and urlsplit(model).hostname == "sketchfab.com"
        and not re.fullmatch(r"https://sketchfab\.com/models/[0-9a-f]{32}/embed", model)
    ):
        raise invalid_product()
    for key in ("imageCreditUrl", "model3dCreditUrl"):
        if key in data.get("attributes", {}) and not safe_credit_url(data["attributes"][key]):
            raise invalid_product()
    stack = [(data.get("attributes", {}), 0)]
    while stack:
        value, depth = stack.pop()
        if depth > 20:
            raise invalid_product()
        if isinstance(value, float) and not math.isfinite(value):
            raise invalid_product()
        if isinstance(value, dict):
            if any(key.startswith("$") or "." in key or "\x00" in key for key in value):
                raise invalid_product()
            stack.extend((item, depth + 1) for item in value.values())
        elif isinstance(value, list):
            stack.extend((item, depth + 1) for item in value)
    try:
        BSON.encode(data)
    except (BSONError, OverflowError, ValueError) as exc:
        raise invalid_product() from exc
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
    if "attributes" in result:
        result["attributes"] = public_attributes(result["attributes"])
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
    await invalidate_product(settings, str(doc["_id"]))
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
    await invalidate_product(settings, str(doc["_id"]))
    return admin_product(doc)


async def delete_product(collection, product_id: str, settings):
    """Exclusão definitiva: o documento sai do MongoDB e o SKU/slug ficam livres para recadastro."""
    result = await collection.delete_one({"_id": object_id(product_id)})
    if not result.deleted_count:
        raise ApiFault(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.")
    await invalidate_product(settings, product_id)


def catalog_filter(filters, public: bool):
    query = {"active": True} if public else {}
    if not public and getattr(filters, "active", None) is not None:
        query["active"] = filters.active
    for key in ("brand", "category"):
        value = getattr(filters, key)
        if value:
            query[key] = {"$regex": f"^{re.escape(value)}$", "$options": "i"}
    if filters.q:
        query["$or"] = [
            {key: {"$regex": re.escape(filters.q), "$options": "i"}}
            for key in ("name", "brand", "description")
        ]
    if filters.sizeBR is not None:
        query["sizes"] = {"$elemMatch": {"sizeBR": filters.sizeBR, "stock": {"$gt": 0}}}
    return query


async def list_products(collection, filters, public: bool, *, excluded_skus=()):
    query = catalog_filter(filters, public)
    if excluded_skus:
        query["sku"] = {"$nin": list(excluded_skus)}
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


logger = logging.getLogger("neox.catalog")


async def invalidate_product(settings, product_id: str):
    try:
        async with redis_client(settings) as redis:
            await redis.delete(f"{settings.redis_key_prefix}cache:product:{product_id}")
    except Exception:
        logger.warning("event=cache_invalidation_unavailable")


async def product_detail(collection, slug: str, settings):
    query = {"slug": slug, "active": True}
    probe = await collection.find_one(query, {"_id": 1, "active": 1, "updatedAt": 1})
    if not probe or probe.get("active") is not True:
        raise ApiFault(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.")
    key = f"{settings.redis_key_prefix}cache:product:{probe['_id']}"
    try:
        async with redis_client(settings) as redis:
            cached = await redis.get(key)
        if cached:
            envelope = json.loads(cached)
            if envelope["version"] == probe["updatedAt"].isoformat():
                payload = ProductDetail.model_validate(envelope["payload"]).model_dump(
                    mode="json",
                    exclude_unset=True,
                )
                if payload["id"] == str(probe["_id"]) and payload["slug"] == slug:
                    if "attributes" in payload:
                        payload["attributes"] = public_attributes(payload["attributes"])
                    return payload
    except Exception:
        logger.warning("event=cache_read_unavailable")
    doc = await collection.find_one({"_id": probe["_id"], "active": True})
    if not doc or doc.get("active") is not True:
        raise ApiFault(404, "PRODUCT_NOT_FOUND", "Produto não encontrado.")
    payload = public_product(doc)
    envelope = {"version": doc["updatedAt"].isoformat(), "payload": payload}
    try:
        async with redis_client(settings) as redis:
            await redis.set(key, json.dumps(envelope), ex=settings.cache_ttl_seconds)
    except Exception:
        logger.warning("event=cache_write_unavailable")
    return payload
