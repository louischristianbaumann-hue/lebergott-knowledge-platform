"""
SYNODEA NEXT — Database Models (SQLAlchemy 2.x, Python 3.9 compatible)
SQLite for dev, PostgreSQL-ready for production.
Switch by setting DATABASE_URL env var.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    event,
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker


# ── Base ────────────────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    # Allow legacy-style Column() annotations without Mapped[]
    __allow_unmapped__ = True


# ── Models ──────────────────────────────────────────────────────────────────


class Customer(Base):
    """A customer/brand registered on the platform."""

    __tablename__ = "customers"

    id: int = Column(Integer, primary_key=True, index=True)
    name: str = Column(String(255), nullable=False, index=True)
    industry: str = Column(String(255), default="")
    vault_path: str = Column(Text, default="")
    created_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    analyses: list["Analysis"] = relationship("Analysis", back_populates="customer", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Customer id={self.id} name={self.name!r}>"


class Analysis(Base):
    """A full 3-lens Synodea analysis run."""

    __tablename__ = "analyses"

    id: int = Column(Integer, primary_key=True, index=True)
    customer_id: Optional[int] = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    subject: str = Column(String(255), nullable=False, index=True)
    mode: str = Column(String(50), default="brand")  # "brand" | "thought_leader"
    status: str = Column(String(50), default="pending")  # "pending" | "running" | "completed" | "failed"

    # Raw content used for analysis
    content: str = Column(Text, default="")
    industry: str = Column(String(255), default="")
    competitors_json: str = Column(Text, default="[]")

    # Lens specs (serialized dicts — for agent pickup)
    vault_prime_spec_json: Optional[str] = Column(Text, nullable=True)
    discourse_spec_json: Optional[str] = Column(Text, nullable=True)
    steiner_prompts_json: Optional[str] = Column(Text, nullable=True)

    # Final scores
    freiheitsindex: Optional[float] = Column(Float, nullable=True)
    archetype: Optional[str] = Column(String(100), nullable=True)

    # Full serialized results blob
    results_json: Optional[str] = Column(Text, nullable=True)

    error: Optional[str] = Column(Text, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Optional[datetime] = Column(DateTime, nullable=True)

    # Relationships
    customer: Optional[Customer] = relationship("Customer", back_populates="analyses")
    dimension_scores: list["DimensionScore"] = relationship(
        "DimensionScore", back_populates="analysis", cascade="all, delete-orphan"
    )

    # Helpers
    @property
    def competitors(self) -> list[str]:
        return json.loads(self.competitors_json or "[]")

    @competitors.setter
    def competitors(self, value: list[str]) -> None:
        self.competitors_json = json.dumps(value)

    @property
    def vault_prime_spec(self) -> Optional[dict]:
        return json.loads(self.vault_prime_spec_json) if self.vault_prime_spec_json else None

    @vault_prime_spec.setter
    def vault_prime_spec(self, value: Optional[dict]) -> None:
        self.vault_prime_spec_json = json.dumps(value) if value else None

    @property
    def discourse_spec(self) -> Optional[dict]:
        return json.loads(self.discourse_spec_json) if self.discourse_spec_json else None

    @discourse_spec.setter
    def discourse_spec(self, value: Optional[dict]) -> None:
        self.discourse_spec_json = json.dumps(value) if value else None

    @property
    def steiner_prompts(self) -> Optional[dict]:
        return json.loads(self.steiner_prompts_json) if self.steiner_prompts_json else None

    @steiner_prompts.setter
    def steiner_prompts(self, value: Optional[dict]) -> None:
        self.steiner_prompts_json = json.dumps(value) if value else None

    @property
    def results(self) -> Optional[dict]:
        return json.loads(self.results_json) if self.results_json else None

    @results.setter
    def results(self, value: Optional[dict]) -> None:
        self.results_json = json.dumps(value, default=str) if value else None

    def __repr__(self) -> str:
        return f"<Analysis id={self.id} subject={self.subject!r} status={self.status}>"


class DimensionScore(Base):
    """Scores for each of the 7 Steiner dimensions within an analysis."""

    __tablename__ = "dimension_scores"

    id: int = Column(Integer, primary_key=True, index=True)
    analysis_id: int = Column(Integer, ForeignKey("analyses.id"), nullable=False, index=True)
    dimension_id: str = Column(String(100), nullable=False)
    dimension_name: str = Column(String(255), default="")
    score: float = Column(Float, nullable=False)
    label: str = Column(String(255), default="")
    justification: str = Column(Text, default="")
    evidence: str = Column(Text, default="")
    recommendation: str = Column(Text, default="")

    # Relationships
    analysis: Analysis = relationship("Analysis", back_populates="dimension_scores")

    def __repr__(self) -> str:
        return f"<DimensionScore analysis={self.analysis_id} dim={self.dimension_id} score={self.score}>"


class User(Base):
    """Platform user — admin (Marcel), staff (Mitarbeiter), client (Klient)."""

    __tablename__ = "users"

    id: int = Column(Integer, primary_key=True, index=True)
    email: str = Column(String(255), unique=True, nullable=False, index=True)
    password_hash: str = Column(String(255), nullable=False)
    role: str = Column(String(50), default="client")  # admin | staff | client
    onboarding_data: str = Column(Text, default="{}")  # JSON blob
    created_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)

    onboarding_sessions: list["OnboardingSession"] = relationship(
        "OnboardingSession", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"


class OnboardingSession(Base):
    """One completed onboarding session — answers to 5 symptom questions."""

    __tablename__ = "onboarding_sessions"

    id: int = Column(Integer, primary_key=True, index=True)
    user_id: int = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    answers: str = Column(Text, default="{}")  # JSON: beschwerden, dauer, massnahmen, hauptziel, vertrautheit
    completed_at: Optional[datetime] = Column(DateTime, nullable=True)

    user: "User" = relationship("User", back_populates="onboarding_sessions")

    def __repr__(self) -> str:
        return f"<OnboardingSession id={self.id} user_id={self.user_id}>"


class VaultRegistry(Base):
    """Registered vaults for multi-tenant use."""

    __tablename__ = "vault_registry"

    id: int = Column(Integer, primary_key=True, index=True)
    vault_id: str = Column(String(100), unique=True, nullable=False, index=True)
    name: str = Column(String(255), nullable=False)
    vault_path: str = Column(Text, nullable=False)
    industry: str = Column(String(255), default="")
    customer_id: Optional[int] = Column(Integer, ForeignKey("customers.id"), nullable=True)
    file_count: int = Column(Integer, default=0)
    registered_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_indexed_at: Optional[datetime] = Column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<VaultRegistry vault_id={self.vault_id!r} path={self.vault_path!r}>"


# ── Engine + Session ────────────────────────────────────────────────────────

# Module-level SessionLocal — populated by create_session_factory()
# Importable from here to avoid circular imports (routes → main → routes).
SessionLocal: sessionmaker | None = None


def create_db_engine(database_url: str):
    """Create SQLAlchemy engine. Handles SQLite WAL mode for concurrency."""
    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(
        database_url,
        connect_args=connect_args,
        echo=False,  # set True to see SQL queries
    )

    # Enable WAL mode for SQLite (better concurrent reads)
    if database_url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def create_session_factory(engine):
    """Create a sessionmaker bound to the engine."""
    global SessionLocal
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal


def init_db(engine) -> None:
    """Create all tables. Safe to call multiple times (no-op if tables exist)."""
    Base.metadata.create_all(bind=engine)


def seed_admin_user(db: Session) -> None:
    """Seed Marcel as admin user if not already present."""
    from passlib.context import CryptContext

    existing = db.query(User).filter_by(email="marcel@lebergott.de").first()
    if existing:
        return

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user = User(
        email="marcel@lebergott.de",
        password_hash=pwd_context.hash("lebergott2024"),
        role="admin",
        onboarding_data="{}",
    )
    db.add(user)
    db.commit()


def seed_demo_vault(db: Session, vault_path: str) -> None:
    """Seed the Lebergott demo vault into registry if not already registered."""
    from pathlib import Path

    existing = db.query(VaultRegistry).filter_by(vault_id="lebergott").first()
    if existing:
        return

    file_count = len(list(Path(vault_path).rglob("*.md"))) if Path(vault_path).exists() else 0

    registry = VaultRegistry(
        vault_id="lebergott",
        name="Lebergott Gesundheits-Workbook",
        vault_path=vault_path,
        industry="Health & Wellness",
        file_count=file_count,
    )
    db.add(registry)
    db.commit()
