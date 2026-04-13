"""
SYNODEA NEXT — Pydantic Schemas
All request/response models for the API.
"""
from __future__ import annotations

import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ── Auth ───────────────────────────────────────────────────────────────────


class UserRole(str, Enum):
    admin = "admin"
    staff = "staff"
    client = "client"


class UserCreate(BaseModel):
    email: str = Field(..., example="klient@lebergott.de")
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.client


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    onboarding_data: Any = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("onboarding_data", mode="before")
    @classmethod
    def parse_onboarding(cls, v: Any) -> dict:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v or {}


# ── Enums ──────────────────────────────────────────────────────────────────


class AnalysisMode(str, Enum):
    brand = "brand"
    thought_leader = "thought_leader"


class AnalysisStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


# ── Customer ───────────────────────────────────────────────────────────────


class CustomerCreate(BaseModel):
    name: str = Field(..., description="Customer/brand name", example="Lebergott")
    industry: str = Field(default="", description="Industry vertical", example="Health & Wellness")
    vault_path: str = Field(
        default="",
        description="Absolute path to the markdown vault folder",
        example="/Users/lautlos/Obsidian/go to/local/Efforts/Ongoing ♻️/lebergott/analyse 1.0 workbook",
    )


class CustomerResponse(BaseModel):
    id: int
    name: str
    industry: str
    vault_path: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Analysis ───────────────────────────────────────────────────────────────


class AnalysisRequest(BaseModel):
    subject: str = Field(..., description="Name of the brand or thought leader to analyze", example="Lebergott")
    content: str = Field(
        ...,
        description="Primary text content to analyze (website copy, mission, posts, etc.)",
        min_length=50,
    )
    industry: str = Field(default="", description="Industry context for comparative analysis")
    mode: AnalysisMode = Field(default=AnalysisMode.brand, description="Analysis mode")
    competitors: list[str] = Field(default_factory=list, description="Competitor brand names for differential analysis")
    customer_id: Optional[int] = Field(default=None, description="Link to existing customer record")
    vault_id: Optional[str] = Field(default=None, description="Vault ID for graph-linked analysis")


class DimensionScoreOut(BaseModel):
    dimension_id: str
    dimension_name: str
    score: float = Field(..., ge=1.0, le=5.0)
    label: str
    justification: str
    evidence: str
    recommendation: str


class FreiheitsprofilOut(BaseModel):
    analysis_id: int
    subject: str
    freiheitsindex: float = Field(..., ge=1.0, le=5.0, description="Overall Freiheitsindex (avg of 7 dimensions)")
    archetype: str = Field(..., description="Steiner archetype based on index score")
    dimension_scores: list[DimensionScoreOut]
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalysisResponse(BaseModel):
    id: int
    subject: str
    mode: AnalysisMode
    status: AnalysisStatus
    customer_id: Optional[int]
    vault_prime_spec: Optional[dict] = Field(None, description="Lens 1: SC query specs")
    discourse_spec: Optional[dict] = Field(None, description="Lens 2: InfraNodus op specs")
    steiner_prompts: Optional[dict] = Field(None, description="Lens 3: Scoring prompts")
    freiheitsindex: Optional[float] = None
    archetype: Optional[str] = None
    dimension_scores: list[DimensionScoreOut] = Field(default_factory=list)
    error: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Bridge ─────────────────────────────────────────────────────────────────


class BridgeRequest(BaseModel):
    topic: str = Field(..., description="Topic/concept to run bridge analysis on", example="Leber Detox")
    vault_id: Optional[str] = Field(default=None, description="Vault to search for gaps")


class WikilinkOut(BaseModel):
    from_note: str
    to_note: str
    to_path: str
    reason: str
    wikilink: str


class NewNoteOut(BaseModel):
    title: str
    suggested_path: str
    reason: str
    link_candidates: list[str]
    tags: list[str]


class BridgeResponse(BaseModel):
    topic: str
    pipeline_spec: dict = Field(..., description="Full sequenced pipeline spec for agent execution")
    wikilinks: list[WikilinkOut] = Field(default_factory=list)
    new_notes: list[NewNoteOut] = Field(default_factory=list)
    stats: dict = Field(default_factory=dict)
    reasoning: str = ""


# ── Graph ──────────────────────────────────────────────────────────────────


class GraphNode(BaseModel):
    id: str
    label: str
    group: str = ""
    cluster: str = ""
    size: int = Field(default=1, description="Node size based on connection count")
    is_hub: bool = False
    is_gap: bool = False
    word_count: int = 0
    tags: list[str] = Field(default_factory=list)
    path: str = ""


class GraphLink(BaseModel):
    source: str
    target: str
    strength: float = Field(default=1.0, ge=0.0, le=1.0)


class GraphCluster(BaseModel):
    id: str
    label: str
    node_ids: list[str]
    color: str = "#888888"


class GraphGap(BaseModel):
    node_id: str
    label: str
    reason: str
    connection_count: int


class GraphResponse(BaseModel):
    vault_id: str
    nodes: list[GraphNode]
    links: list[GraphLink]
    clusters: list[GraphCluster]
    gaps: list[GraphGap]
    stats: dict[str, Any] = Field(default_factory=dict)


# ── Gap Analysis ────────────────────────────────────────────────────────────


class GapItem(BaseModel):
    title: str
    path: str
    gap_type: str  # "dark_zone" | "dead_end" | "orphan"
    connection_count: int
    excerpt: str = ""
    suggested_links: list[str] = Field(default_factory=list)


class GapAnalysisResponse(BaseModel):
    vault_id: str
    total_files: int
    gap_count: int
    gaps: list[GapItem]
    hub_nodes: list[GraphNode]
    coverage_percent: float = Field(..., description="% of files with 2+ connections")


# ── Vault ──────────────────────────────────────────────────────────────────


class VaultFileOut(BaseModel):
    path: str
    title: str
    folder: str
    word_count: int
    tags: list[str]
    wikilinks: list[str]
    frontmatter: dict[str, Any] = Field(default_factory=dict)
    connection_count: int = 0


class VaultFilesResponse(BaseModel):
    vault_id: str
    total: int
    files: list[VaultFileOut]


class VaultFileContentResponse(BaseModel):
    vault_id: str
    path: str
    title: str
    content: str
    word_count: int
    tags: list[str]
    wikilinks: list[str]
    frontmatter: dict[str, Any]


class VaultRegisterRequest(BaseModel):
    vault_id: str = Field(..., description="Unique slug identifier for this vault", example="lebergott")
    name: str = Field(..., description="Human-readable vault name", example="Lebergott Workbook")
    vault_path: str = Field(..., description="Absolute path to the vault folder")
    industry: str = Field(default="")
    customer_id: Optional[int] = None


class VaultRegisterResponse(BaseModel):
    vault_id: str
    name: str
    vault_path: str
    file_count: int
    registered_at: datetime


# ── Onboarding ─────────────────────────────────────────────────────────────


class OnboardingAnswers(BaseModel):
    beschwerden: List[str] = Field(
        ...,
        description="Welche Beschwerden haben Sie? (Müdigkeit/Verdauung/Hautprobleme/Übergewicht/Energiemangel)",
    )
    dauer: str = Field(..., description="Wie lange bestehen diese?")
    massnahmen: str = Field(default="", description="Haben Sie schon Maßnahmen ergriffen?")
    hauptziel: str = Field(
        ...,
        description="Was ist Ihr Hauptziel? (Entgiftung/Energie/Gewicht/Haut/Allgemein)",
    )
    vertrautheit: int = Field(..., ge=1, le=5, description="Wie vertraut sind Sie mit Lebergesundheit? (1–5)")


class OnboardingSubmitRequest(BaseModel):
    answers: OnboardingAnswers


class GapRecommendation(BaseModel):
    topic: str
    reason: str
    relevance_score: float = Field(..., ge=0.0, le=1.0)


class OnboardingProfileResponse(BaseModel):
    user_id: int
    email: str
    role: str
    answers: Optional[OnboardingAnswers]
    gap_recommendations: List[GapRecommendation]
    completed_at: Optional[datetime]


# ── Demo ───────────────────────────────────────────────────────────────────


class DemoResponse(BaseModel):
    vault_id: str
    description: str
    graph: GraphResponse
    gap_summary: GapAnalysisResponse
    analysis_spec: Optional[dict] = None
