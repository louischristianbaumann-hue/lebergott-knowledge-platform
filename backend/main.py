"""
SYNODEA NEXT — FastAPI Application
Customer-facing Knowledge Intelligence Platform.

Start: uvicorn backend.main:app --reload
Docs:  http://localhost:8000/docs
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

from .core.config import get_settings
from .models import database as _db_mod
from .models.database import create_db_engine, create_session_factory, init_db, seed_admin_user, seed_demo_vault

# ── Settings ─────────────────────────────────────────────────────────────

settings = get_settings()

# ── DB Setup ──────────────────────────────────────────────────────────────

engine = create_db_engine(settings.database_url)
create_session_factory(engine)  # populates _db_mod.SessionLocal

# Run init_db eagerly at module load — safe (no-op if tables exist)
# This ensures tables exist whether app is started via uvicorn OR TestClient
init_db(engine)


# ── Lifespan ──────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup + shutdown lifecycle."""
    # Seed demo vault and admin user (init_db already called at module level)
    with _db_mod.SessionLocal() as db:
        seed_demo_vault(db, str(settings.lebergott_path))
        seed_admin_user(db)

    yield

    # Shutdown (nothing needed for SQLite)


# ── App ───────────────────────────────────────────────────────────────────


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Knowledge Intelligence Platform — 3-lens brand analysis: "
        "Smart Connections (vault) × InfraNodus (discourse) × Steiner Freiheitsprofil"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── CORS ──────────────────────────────────────────────────────────────────


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception Handlers ────────────────────────────────────────────────────


@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"detail": "Not found"})


@app.exception_handler(500)
async def server_error_handler(request, exc):
    logger.error(f"Internal error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ein interner Fehler ist aufgetreten. Bitte versuche es erneut."},
    )


# ── Request Timeout Middleware ─────────────────────────────────────────────
# 30s global timeout — prevents hanging InfraNodus / n8n calls from blocking

@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    try:
        return await asyncio.wait_for(call_next(request), timeout=30.0)
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=504,
            content={"detail": "Anfrage hat zu lange gedauert. Bitte versuche es erneut."},
        )


# ── Router ────────────────────────────────────────────────────────────────


from .api.routes import router  # noqa: E402

app.include_router(router)


# ── Root ──────────────────────────────────────────────────────────────────


@app.get("/", tags=["system"])
def root():
    """Root — links to docs."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/v1/health",
        "demo": "/api/v1/demo/lebergott",
    }
