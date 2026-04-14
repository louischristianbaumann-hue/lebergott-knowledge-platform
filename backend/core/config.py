"""
SYNODEA NEXT — Core Configuration
Loads settings from env vars with sensible defaults.
All paths reference paths.json as single source of truth.
"""
import json
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_paths() -> dict:
    """Load paths.json — single source of truth for all project paths."""
    paths_file = Path.home() / ".claude" / "paths.json"
    if paths_file.exists():
        return json.loads(paths_file.read_text(encoding="utf-8"))
    return {}


_PATHS = _load_paths()


def _resolve(key: str, fallback: str = "") -> str:
    """Resolve a path key from paths.json, expanding ~ and env vars."""
    raw = _PATHS.get(key, fallback)
    if raw:
        return str(Path(raw).expanduser().resolve())
    return fallback


class Settings(BaseSettings):
    """Application settings — override via environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "SYNODEA NEXT"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS — override via CORS_ORIGINS env var in prod
    # Accepts JSON array: CORS_ORIGINS='["https://your-app.vercel.app"]'
    # OR comma-separated: CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://lebergott-knowledge-platform.vercel.app",
    ]
    # Regex for Vercel preview URLs — override via CORS_ORIGIN_REGEX env var
    cors_origin_regex: str = r"https://.*-louischristianbaumann-hue\.vercel\.app"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS_ORIGINS from JSON array string or comma-separated string."""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            stripped = v.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            # comma-separated: "https://a.com, https://b.com"
            return [o.strip() for o in stripped.split(",") if o.strip()]
        return v

    # Database
    database_url: str = "sqlite:///./synodea.db"
    # PostgreSQL-ready: set DATABASE_URL=postgresql+asyncpg://user:pass@host/db

    # Paths — resolved from paths.json, overridable via env
    synodea_engine_path: str = _resolve(
        "synodea",
        str(Path.home() / "Obsidian/go to/local/AI OS/7_PROJECTS/SYNODEA/SYNODEA"),
    )
    vault_path: str = _resolve(
        "vault",
        str(Path.home() / "Obsidian/go to/local"),
    )
    lebergott_vault_path: str = str(
        Path.home()
        / "Obsidian/go to/local/Efforts/Ongoing ♻️/lebergott/analyse 1.0 workbook"
    )

    # Demo
    demo_vault_id: str = "lebergott"

    # JWT Auth
    jwt_secret_key: str = "lebergott-secret-key-change-in-production"  # Override: JWT_SECRET_KEY
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    # n8n
    n8n_webhook_url: str = ""  # Set via N8N_WEBHOOK_URL env var — lebergott-bot endpoint

    # InfraNodus Live Integration
    infranodus_api_key: str = ""          # Set via INFRANODUS_API_KEY env var
    infranodus_username: str = "lautloos" # InfraNodus account username

    @property
    def engine_path(self) -> Path:
        return Path(self.synodea_engine_path)

    @property
    def vault_root(self) -> Path:
        return Path(self.vault_path)

    @property
    def lebergott_path(self) -> Path:
        return Path(self.lebergott_vault_path)


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
