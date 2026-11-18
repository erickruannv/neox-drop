from pathlib import Path

from fastapi import APIRouter
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).resolve().parents[1] / "templates")
# Loaders HTML são ligados em T014 após autorização/admin/catálogo e templates do Claude.
