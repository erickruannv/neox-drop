from copy import deepcopy
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from bson import ObjectId

from app.core.config import Settings
from app.main import create_app
from app.schemas.auth import AdminProfile
from app.services.admin import require_admin
from app.services.catalog import products_collection


@pytest.fixture
def catalog_app(examples):
    app = create_app(Settings(_env_file=None, cookie_secret="test-only-" * 8))
    collection = MagicMock(
        insert_one=AsyncMock(),
        find_one=AsyncMock(),
        find_one_and_update=AsyncMock(),
        delete_one=AsyncMock(return_value=MagicMock(deleted_count=1)),
        count_documents=AsyncMock(return_value=1),
    )
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(return_value=[])
    collection.find.return_value = cursor
    doc = {
        **deepcopy(examples["ProductCreate"]),
        "_id": ObjectId(),
        "createdAt": datetime.now(UTC),
        "updatedAt": datetime.now(UTC),
    }
    collection.find_one.return_value = doc

    async def products():
        yield collection

    app.dependency_overrides[products_collection] = products
    app.dependency_overrides[require_admin] = lambda: AdminProfile.model_validate(
        examples["AdminProfile"]
    )
    return app, collection, doc, cursor
