"""
SYNODEA NEXT — API Routes
All endpoints for the Knowledge Intelligence Platform.
"""
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..models.database import VaultRegistry
from ..models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    BridgeRequest,
    BridgeResponse,
    CustomerCreate,
    CustomerResponse,
    DemoResponse,
    FreiheitsprofilOut,
    GapAnalysisResponse,
    GapItem,
    GraphGap,
    GraphLink,
    GraphNode,
    GraphResponse,
    GapRecommendation,
    OnboardingAnswers,
    OnboardingProfileResponse,
    OnboardingSubmitRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
    VaultFileContentResponse,
    VaultFilesResponse,
    VaultRegisterRequest,
    VaultRegisterResponse,
)
from ..services.analysis_service import AnalysisService, BridgeService, VaultRegistryService
from ..services.graph_service import GraphService
from ..services.infranodus_service import InfraNodusService
from ..services.vault_loader import VaultLoader

router = APIRouter(prefix="/api/v1")

# ── Auth Utilities ────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def _create_token(user_id: int) -> str:
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(days=settings.jwt_expire_days)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


# ── DB Dependency ────────────────────────────────────────────────────────


def get_db():
    """FastAPI dependency — yields a DB session per request."""
    from ..models.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        settings = get_settings()
        payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    from ..models.database import User
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ── Auth Endpoints ───────────────────────────────────────────────────────


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, tags=["auth"])
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """Register a new user (client, staff, or admin)."""
    from ..models.database import User
    if db.query(User).filter_by(email=payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        password_hash=pwd_context.hash(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=Token, tags=["auth"])
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Login and receive a JWT access token."""
    from ..models.database import User
    user = db.query(User).filter_by(email=payload.email).first()
    if not user or not pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return Token(access_token=_create_token(user.id))


@router.get("/auth/me", response_model=UserResponse, tags=["auth"])
def get_me(current_user=Depends(get_current_user)):
    """Get the currently authenticated user."""
    return current_user


@router.get("/auth/users", response_model=List[UserResponse], tags=["auth"])
def list_users(
    role: Optional[str] = Query(None, description="Filter by role: admin, staff, client"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List users. Admins can see all; staff can only list clients."""
    from ..models.database import User

    is_admin = current_user.role == "admin"
    is_staff = current_user.role in ("admin", "staff")

    if not is_staff:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")

    # Staff can only list clients — not other staff or admins
    if not is_admin:
        if role and role != "client":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff can only view client list")
        role = "client"

    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()


# ── Helper ────────────────────────────────────────────────────────────────


def _resolve_vault_path(vault_id: str, db: Session) -> str:
    """Resolve vault path or raise 404."""
    svc = VaultRegistryService(db)
    vault_path = svc.get_vault_path(vault_id)
    if not vault_path or not Path(vault_path).exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vault '{vault_id}' not found or path does not exist.",
        )
    return vault_path


# ── Customer Endpoints ───────────────────────────────────────────────────


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED, tags=["customers"])
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    """Register a new customer/brand."""
    from ..models.database import Customer
    customer = Customer(
        name=payload.name,
        industry=payload.industry,
        vault_path=payload.vault_path,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/customers/{customer_id}", response_model=CustomerResponse, tags=["customers"])
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get customer by ID."""
    from ..models.database import Customer
    customer = db.query(Customer).filter_by(id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


# ── Analysis Endpoints ───────────────────────────────────────────────────


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["analysis"],
    summary="Start full 3-lens analysis",
)
def start_analysis(payload: AnalysisRequest, db: Session = Depends(get_db)):
    """
    Start a full Synodea 3-lens analysis for a brand or thought leader.

    Returns:
    - **vault_prime_spec**: Smart Connections query specs (Lens 1)
    - **discourse_spec**: InfraNodus operation specs (Lens 2)
    - **steiner_prompts**: Steiner scoring prompts for Claude (Lens 3)

    The specs are returned immediately for agent execution.
    POST scored results to `/analyze/{id}/scores` to complete the analysis.
    """
    svc = AnalysisService(db)
    try:
        return svc.create_analysis(payload)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/analysis/{analysis_id}",
    response_model=AnalysisResponse,
    tags=["analysis"],
    summary="Get analysis results",
)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """Get full analysis record including all 3 lens specs and scores if available."""
    svc = AnalysisService(db)
    result = svc.get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} not found")
    return result


@router.post(
    "/analysis/{analysis_id}/scores",
    response_model=AnalysisResponse,
    tags=["analysis"],
    summary="Submit dimension scores",
)
def submit_scores(
    analysis_id: int,
    scores: list[dict] = Body(...),
    db: Session = Depends(get_db),
):
    """
    Submit Steiner dimension scores for an analysis.

    Each score dict must have:
    - dimension_id, dimension_name, score (1.0-5.0), label,
      justification, evidence, recommendation
    """
    svc = AnalysisService(db)
    result = svc.update_scores(analysis_id, scores)
    if not result:
        raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} not found")
    return result


# ── Freiheitsprofil ──────────────────────────────────────────────────────


@router.get(
    "/freiheitsprofil/{analysis_id}",
    response_model=FreiheitsprofilOut,
    tags=["analysis"],
    summary="Get 7-dimension Freiheitsprofil",
)
def get_freiheitsprofil(analysis_id: int, db: Session = Depends(get_db)):
    """
    Get the full Freiheitsprofil for a completed analysis.
    Returns all 7 Steiner dimension scores + Freiheitsindex + archetype.
    """
    svc = AnalysisService(db)
    result = svc.get_freiheitsprofil(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} not found")
    if result["freiheitsindex"] is None:
        raise HTTPException(
            status_code=409,
            detail="Analysis not yet scored. POST scores to /analysis/{id}/scores first.",
        )
    return result


# ── Graph Endpoints ──────────────────────────────────────────────────────


@router.get(
    "/graph/{vault_id}",
    response_model=GraphResponse,
    tags=["graph"],
    summary="Get D3.js graph data",
)
def get_graph(vault_id: str, db: Session = Depends(get_db)):
    """
    Get D3.js-compatible knowledge graph data from a vault.

    Returns:
    - **nodes**: One per markdown file (id, label, cluster, size, is_hub, is_gap)
    - **links**: One per wikilink (source, target, strength)
    - **clusters**: Folder-based groupings with colors
    - **gaps**: Dark zone files with 0-1 connections
    - **stats**: Coverage, hub count, avg connections
    """
    vault_path = _resolve_vault_path(vault_id, db)
    try:
        svc = GraphService(vault_path)
        data = svc.build_graph()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph build failed: {e}")

    return GraphResponse(
        vault_id=vault_id,
        nodes=[GraphNode(**n) for n in data["nodes"]],
        links=[GraphLink(**l) for l in data["links"]],
        clusters=data["clusters"],
        gaps=[GraphGap(**g) for g in data["gaps"]],
        stats=data["stats"],
    )


# ── Gap Analysis Endpoints ───────────────────────────────────────────────


@router.get(
    "/gaps/{vault_id}",
    response_model=GapAnalysisResponse,
    tags=["graph"],
    summary="Get gap analysis",
)
def get_gaps(vault_id: str, db: Session = Depends(get_db)):
    """
    Get structural gap analysis for a vault.

    Identifies:
    - **Dark zones**: Files with zero connections
    - **Dead ends**: Files with only outbound links (no inbound)
    - **Orphans**: Files referenced but not yet in vault
    - **Hubs**: Highly connected nodes (5+ connections)
    """
    vault_path = _resolve_vault_path(vault_id, db)
    try:
        graph_svc = GraphService(vault_path)
        data = graph_svc.build_graph()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {e}")

    nodes = data["nodes"]
    gaps_raw = data["gaps"]
    stats = data["stats"]

    gap_items = [
        GapItem(
            title=g["label"],
            path=next((n["path"] for n in nodes if n["id"] == g["node_id"]), ""),
            gap_type="dark_zone" if g["connection_count"] == 0 else "dead_end",
            connection_count=g["connection_count"],
            excerpt="",
            suggested_links=[],
        )
        for g in gaps_raw
    ]

    hub_nodes = [
        GraphNode(**n) for n in nodes if n.get("is_hub", False)
    ]

    return GapAnalysisResponse(
        vault_id=vault_id,
        total_files=stats.get("total_files", 0),
        gap_count=len(gap_items),
        gaps=gap_items,
        hub_nodes=hub_nodes,
        coverage_percent=stats.get("coverage_percent", 0.0),
    )


# ── Bridge Endpoints ─────────────────────────────────────────────────────


@router.post(
    "/bridge",
    response_model=BridgeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["bridge"],
    summary="Run SC ↔ InfraNodus bridge analysis",
)
def run_bridge(payload: BridgeRequest):
    """
    Generate a SC ↔ InfraNodus bridge pipeline spec for a topic.

    Returns the complete sequenced plan for agent execution:
    1. SC gap detection queries
    2. InfraNodus bridge discovery ops
    3. Wikilink synthesis method
    4. Report generation spec

    Execute the spec via MCP tools, then POST results to /bridge/synthesize.
    """
    svc = BridgeService()
    try:
        return svc.run_bridge(payload)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/bridge/synthesize",
    response_model=BridgeResponse,
    tags=["bridge"],
    summary="Synthesize bridge results after MCP execution",
)
def synthesize_bridge(
    topic: str = Body(),
    sc_gaps: list[dict] = Body(),
    infranodus_bridges: list[dict] = Body(),
):
    """
    Synthesize bridge results after agents have executed the pipeline spec.

    Args:
    - **topic**: The analyzed topic
    - **sc_gaps**: Actual SC MCP results (list of gap note dicts)
    - **infranodus_bridges**: Actual InfraNodus results (list of bridge concept dicts)
    """
    svc = BridgeService()
    try:
        return svc.synthesize_results(topic, sc_gaps, infranodus_bridges)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Vault Endpoints ──────────────────────────────────────────────────────


@router.post(
    "/vault",
    response_model=VaultRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["vault"],
    summary="Register a new vault",
)
def register_vault(payload: VaultRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new vault (customer onboarding step).
    Indexes all markdown files and stores metadata.
    """
    vault_p = Path(payload.vault_path).expanduser().resolve()
    if not vault_p.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Vault path does not exist: {vault_p}",
        )

    svc = VaultRegistryService(db)
    registry = svc.register(
        vault_id=payload.vault_id,
        name=payload.name,
        vault_path=str(vault_p),
        industry=payload.industry,
        customer_id=payload.customer_id,
    )

    return VaultRegisterResponse(
        vault_id=registry.vault_id,
        name=registry.name,
        vault_path=registry.vault_path,
        file_count=registry.file_count,
        registered_at=registry.registered_at,
    )


@router.get(
    "/vault/{vault_id}/files",
    response_model=VaultFilesResponse,
    tags=["vault"],
    summary="List vault files with metadata",
)
def list_vault_files(
    vault_id: str,
    folder: Optional[str] = Query(None, description="Filter by folder/cluster"),
    db: Session = Depends(get_db),
):
    """
    List all markdown files in a vault with metadata.
    Optionally filter by top-level folder (Atlas, Kapitel, etc.)
    """
    vault_path = _resolve_vault_path(vault_id, db)
    try:
        loader = VaultLoader(vault_path)
        files_meta = loader.list_files_meta()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if folder:
        files_meta = [f for f in files_meta if f["folder"].lower() == folder.lower()]

    from ..models.schemas import VaultFileOut
    return VaultFilesResponse(
        vault_id=vault_id,
        total=len(files_meta),
        files=[VaultFileOut(**f) for f in files_meta],
    )


@router.get(
    "/vault/{vault_id}/file/{file_path:path}",
    response_model=VaultFileContentResponse,
    tags=["vault"],
    summary="Read single vault file",
)
def read_vault_file(vault_id: str, file_path: str, db: Session = Depends(get_db)):
    """
    Read content of a single vault file by relative path.
    Returns full content + frontmatter + wikilinks + tags.
    """
    vault_path = _resolve_vault_path(vault_id, db)
    try:
        loader = VaultLoader(vault_path)
        vault_file = loader.load_file(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not vault_file:
        raise HTTPException(
            status_code=404,
            detail=f"File '{file_path}' not found in vault '{vault_id}'",
        )

    return VaultFileContentResponse(
        vault_id=vault_id,
        path=str(vault_file.path.relative_to(loader.vault_root)),
        title=vault_file.title,
        content=vault_file.content,
        word_count=vault_file.word_count,
        tags=vault_file.tags,
        wikilinks=vault_file.wikilinks,
        frontmatter=vault_file.frontmatter,
    )


# ── Demo Endpoint ────────────────────────────────────────────────────────


@router.get(
    "/demo/lebergott",
    tags=["demo"],
    summary="Lebergott demo — graph + gaps + analysis spec",
)
def demo_lebergott(db: Session = Depends(get_db)):
    """
    Demo endpoint: full graph + gap analysis for the Lebergott vault.
    Hardcoded path, no auth required. Perfect for frontend dev.
    """
    settings = get_settings()
    vault_path = str(settings.lebergott_path)

    if not settings.lebergott_path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Demo vault not found at: {vault_path}",
        )

    try:
        graph_svc = GraphService(vault_path)
        graph_data = graph_svc.build_graph()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Demo graph failed: {e}")

    # Build graph response
    nodes = [GraphNode(**n) for n in graph_data["nodes"]]
    links = [GraphLink(**l) for l in graph_data["links"]]
    gaps_raw = graph_data["gaps"]
    stats = graph_data["stats"]

    graph_response = GraphResponse(
        vault_id="lebergott",
        nodes=nodes,
        links=links,
        clusters=graph_data["clusters"],
        gaps=[GraphGap(**g) for g in gaps_raw],
        stats=stats,
    )

    # Build gap summary
    gap_items = [
        GapItem(
            title=g["label"],
            path=next((n.path for n in nodes if n.id == g["node_id"]), ""),
            gap_type="dark_zone" if g["connection_count"] == 0 else "dead_end",
            connection_count=g["connection_count"],
        )
        for g in gaps_raw
    ]

    gap_summary = GapAnalysisResponse(
        vault_id="lebergott",
        total_files=stats.get("total_files", 0),
        gap_count=len(gap_items),
        gaps=gap_items,
        hub_nodes=[n for n in nodes if n.is_hub],
        coverage_percent=stats.get("coverage_percent", 0.0),
    )

    # Demo analysis spec (no DB write)
    try:
        from ..services.analysis_service import _import_engine, _ensure_engine_on_path
        _ensure_engine_on_path()
        SynodeaAnalysis = _import_engine()
        demo_content = (
            "Lebergott ist eine Gesundheitsmarke die sich auf Lebergesundheit und "
            "ganzheitliche Ernährung spezialisiert hat. Die Brand vermittelt tiefes Wissen "
            "über die Leber als Zentralorgan und bietet praktische Gesundheitsstrategien."
        )
        engine = SynodeaAnalysis(
            subject="Lebergott",
            content=demo_content,
            industry="Health & Wellness",
            mode="brand",
        )
        analysis_spec = {
            "vault_prime": engine.vault_prime(),
            "discourse": engine.discourse_analyze(),
            "steiner_prompts": engine.steiner_score({}, {}),
        }
    except Exception:
        analysis_spec = None

    return {
        "vault_id": "lebergott",
        "description": "Lebergott Gesundheits-Workbook — 44 markdown files, 4 Kapitel, Atlas, Gaps, Transkripte",
        "graph": graph_response,
        "gap_summary": gap_summary,
        "analysis_spec": analysis_spec,
    }


# ── InfraNodus Live Endpoints ─────────────────────────────────────────────


def _infranodus() -> InfraNodusService:
    """Instantiate InfraNodus service with credentials from settings."""
    settings = get_settings()
    return InfraNodusService(
        api_key=settings.infranodus_api_key,
        username=settings.infranodus_username,
    )


@router.get(
    "/graphs/live",
    tags=["graph"],
    summary="Live InfraNodus graph data for all 6 Lebergott graphs",
)
def get_graphs_live():
    """
    Returns live gap + bridge data from all 6 Lebergott InfraNodus graphs.

    Response:
    - **gaps**: Top 10 content gaps across all graphs (sorted by bridge_potential)
    - **bridges**: Top 8 conceptual gateway bridges
    - **clusters**: All topical clusters
    - **stats**: Aggregate node/edge counts
    - **source**: 'live' | 'cached'

    Falls back to infranodus_cache.json when API unavailable.
    """
    svc = _infranodus()
    try:
        data = svc.get_all_lebergott()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"InfraNodus aggregation failed: {e}")


@router.get(
    "/graphs/live/{graph_name}",
    tags=["graph"],
    summary="Live InfraNodus data for a single Lebergott graph",
)
def get_graph_live(graph_name: str):
    """
    Returns live analysis for a single Lebergott InfraNodus graph.

    graph_name must be one of:
      lebergott-wissen | lebergott-gaps | lebergott-konzepte-1 |
      lebergott-konzepte-2 | lebergott-belastungen-krankheiten | lebergott-anatomie-leber
    """
    from ..services.infranodus_service import LEBERGOTT_GRAPHS
    if graph_name not in LEBERGOTT_GRAPHS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown graph. Valid graphs: {LEBERGOTT_GRAPHS}",
        )
    svc = _infranodus()
    try:
        return svc.get_graph_analysis(graph_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph analysis failed: {e}")


@router.get(
    "/lebergott/gaps",
    tags=["graph"],
    summary="Live InfraNodus gaps for Lebergott (all graphs)",
)
def get_lebergott_gaps():
    """
    Returns aggregated content gaps from all 6 Lebergott InfraNodus graphs.
    Each gap includes: id, title, reason, bridge, bridge_potential, graph, source.
    Falls back to cache when API unavailable.
    """
    svc = _infranodus()
    data = svc.get_all_lebergott()
    return {
        "vault_id": "lebergott",
        "source": data.get("source", "cached"),
        "gap_count": len(data.get("gaps", [])),
        "gaps": data.get("gaps", []),
    }


@router.get(
    "/lebergott/bridges",
    tags=["graph"],
    summary="Live InfraNodus bridges for Lebergott (all graphs)",
)
def get_lebergott_bridges():
    """
    Returns conceptual gateway bridges from all 6 Lebergott InfraNodus graphs.
    Each bridge includes: id, title, connects, why, strength, graph, source.
    Falls back to cache when API unavailable.
    """
    svc = _infranodus()
    data = svc.get_all_lebergott()
    return {
        "vault_id": "lebergott",
        "source": data.get("source", "cached"),
        "bridge_count": len(data.get("bridges", [])),
        "bridges": data.get("bridges", []),
    }


# ── Chat Endpoint ────────────────────────────────────────────────────────


@router.post(
    "/chat",
    tags=["chat"],
    summary="Ask questions via n8n Lebergott bot + local graph fallback",
)
def chat(
    vault_id: str = Body(),
    question: str = Body(),
    selected_node_id: Optional[str] = Body(default=None),
    role: str = Body(default='client'),
    history: list = Body(default=[]),
    db: Session = Depends(get_db),
):
    """
    Chat with the knowledge graph.

    Tries n8n Lebergott bot first; falls back to local graph analysis,
    then to a static demo response. If a node is selected, the answer
    is contextualized to that node.

    Returns:
    - **answer**: Synthesized text answer (Markdown with [[wikilinks]])
    - **relevant_nodes**: Nodes matching the question with content previews
    - **gaps**: Related knowledge gaps
    - **bridges**: Cross-cluster bridge opportunities
    - **follow_up_questions**: Suggested next questions to explore
    """
    vault_path = _resolve_vault_path(vault_id, db)
    from ..services.chat_service import ChatService
    try:
        svc = ChatService(vault_path)
        return svc.answer_with_n8n(
            question=question,
            role=role,
            history=history,
            selected_node_id=selected_node_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")


# ── Node Content Endpoint ────────────────────────────────────────────────


@router.get(
    "/node/{vault_id}/{node_id}",
    tags=["graph"],
    summary="Get full content for a graph node",
)
def get_node_content(vault_id: str, node_id: str, db: Session = Depends(get_db)):
    """
    Get full markdown content for a specific graph node.
    Returns content, wikilinks, tags, and connection context.
    """
    vault_path = _resolve_vault_path(vault_id, db)
    try:
        graph_svc = GraphService(vault_path)
        graph_data = graph_svc.build_graph()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Find the node
    node = next((n for n in graph_data["nodes"] if n["id"] == node_id), None)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    # Load full content
    content = ""
    wikilinks = []
    tags = []
    frontmatter = {}
    rel_path = node.get("path", "")
    if rel_path:
        try:
            loader = VaultLoader(vault_path)
            vault_file = loader.load_file(rel_path)
            if vault_file:
                content = vault_file.content
                wikilinks = vault_file.wikilinks
                tags = vault_file.tags
                frontmatter = vault_file.frontmatter
        except Exception:
            pass

    # Find connections
    connections = []
    for link in graph_data["links"]:
        src = link.get("source", "")
        tgt = link.get("target", "")
        if src == node_id:
            other = next((n for n in graph_data["nodes"] if n["id"] == tgt), None)
            if other:
                connections.append({
                    "id": other["id"],
                    "label": other.get("label", ""),
                    "direction": "outgoing",
                    "strength": link.get("strength", 0.5),
                })
        elif tgt == node_id:
            other = next((n for n in graph_data["nodes"] if n["id"] == src), None)
            if other:
                connections.append({
                    "id": other["id"],
                    "label": other.get("label", ""),
                    "direction": "incoming",
                    "strength": link.get("strength", 0.5),
                })

    return {
        "id": node_id,
        "label": node.get("label", ""),
        "content": content,
        "wikilinks": wikilinks,
        "tags": tags,
        "frontmatter": frontmatter,
        "connections": connections,
        "is_hub": node.get("is_hub", False),
        "is_gap": node.get("is_gap", False),
        "cluster": node.get("cluster"),
        "word_count": node.get("word_count", 0),
    }


# ── InfraNodus Endpoints ─────────────────────────────────────────────────

_INFRANODUS_CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "infranodus_cache.json"


def _load_infranodus_cache() -> dict:
    """Load InfraNodus cache from disk. Returns empty dict on failure."""
    try:
        import json
        return json.loads(_INFRANODUS_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


@router.get(
    "/infranodus/lebergott-graphs",
    tags=["infranodus"],
    summary="Get all 6 Lebergott InfraNodus knowledge graphs",
)
def get_lebergott_graphs():
    """
    Returns cached InfraNodus graph data for all 6 Lebergott knowledge graphs.

    Each graph contains:
    - **clusters**: Topical clusters with nodes, labels, colors, and weights
    - **gaps**: Knowledge gaps with bridge potential scores
    - **bridges**: Conceptual bridges between clusters
    - **stats**: Graph metrics (nodes, edges, modularity)
    """
    cache = _load_infranodus_cache()
    if not cache:
        raise HTTPException(status_code=503, detail="InfraNodus cache not available")

    graphs = {key: value for key, value in cache.items() if key != "_meta"}

    return {
        "graphs": graphs,
        "meta": cache.get("_meta", {}),
        "graph_count": len(graphs),
    }


@router.get(
    "/infranodus/gaps",
    tags=["infranodus"],
    summary="Get merged gap list from all 6 Lebergott graphs",
)
def get_lebergott_gaps(
    min_bridge_potential: float = Query(0.0, ge=0.0, le=1.0, description="Minimum bridge potential (0.0–1.0)"),
    gap_type: Optional[str] = Query(None, description="Filter by gap type: missing_connection or weak_cluster"),
):
    """
    Returns a merged, deduplicated list of knowledge gaps from all 6 Lebergott graphs.

    Sorted by bridge_potential descending — highest-value gaps first.
    Useful for the Gap Panel frontend component.
    """
    cache = _load_infranodus_cache()
    if not cache:
        raise HTTPException(status_code=503, detail="InfraNodus cache not available")

    all_gaps = []
    for graph_name, graph_data in cache.items():
        if graph_name == "_meta":
            continue
        for gap in graph_data.get("gaps", []):
            all_gaps.append({
                **gap,
                "source_graph": graph_name,
                "graph_description": graph_data.get("description", ""),
            })

    if min_bridge_potential > 0.0:
        all_gaps = [g for g in all_gaps if g.get("bridge_potential", 0) >= min_bridge_potential]
    if gap_type:
        all_gaps = [g for g in all_gaps if g.get("gap_type") == gap_type]

    all_gaps.sort(key=lambda g: g.get("bridge_potential", 0), reverse=True)

    return {
        "total": len(all_gaps),
        "gaps": all_gaps,
        "filters_applied": {
            "min_bridge_potential": min_bridge_potential,
            "gap_type": gap_type,
        },
    }


# ── Onboarding Endpoints ─────────────────────────────────────────────────

# Keyword → gap topic mapping for personalized recommendations
_BESCHWERDEN_GAPS: dict[str, list[dict]] = {
    "Müdigkeit": [
        {"topic": "Leber & Energiestoffwechsel", "reason": "Chronische Müdigkeit ist häufig mit eingeschränkter Leberentgiftung verbunden", "relevance_score": 0.95},
        {"topic": "Mitochondriale Gesundheit", "reason": "Die Leber steuert den Energiehaushalt auf Zellebene", "relevance_score": 0.85},
    ],
    "Verdauung": [
        {"topic": "Gallen-Leber-Achse", "reason": "Gallenproduktion und Fettverdauung sind direkt mit der Leberfunktion verbunden", "relevance_score": 0.95},
        {"topic": "Darm-Leber-Verbindung", "reason": "Enterohepatischer Kreislauf: Darmgesundheit beeinflusst die Leberbelastung", "relevance_score": 0.90},
    ],
    "Hautprobleme": [
        {"topic": "Leber & Hautreinigung", "reason": "Die Haut als Entgiftungsorgan reagiert auf Leberüberlastung", "relevance_score": 0.90},
        {"topic": "Entgiftungspfade Phase I & II", "reason": "Toxinabbau über Leberenzymsysteme beeinflusst Hautbild", "relevance_score": 0.85},
    ],
    "Übergewicht": [
        {"topic": "Fettleber & Stoffwechsel", "reason": "Nicht-alkoholische Fettleber ist eng mit Übergewicht verknüpft", "relevance_score": 0.95},
        {"topic": "Insulinresistenz & Leber", "reason": "Die Leber reguliert Blutzucker und Fettspeicherung", "relevance_score": 0.88},
    ],
    "Energiemangel": [
        {"topic": "Nährstoffspeicherung in der Leber", "reason": "Glykogen, Vitamine und Mineralien werden in der Leber gespeichert", "relevance_score": 0.92},
        {"topic": "Nebennieren-Leber-Verbindung", "reason": "Chronischer Energiemangel belastet das Stresssystem und die Leber", "relevance_score": 0.80},
    ],
}

_ZIEL_GAPS: dict[str, list[dict]] = {
    "Entgiftung": [
        {"topic": "7-Tage Leberentgiftung", "reason": "Strukturiertes Protokoll für die Entgiftungsphase", "relevance_score": 0.98},
        {"topic": "Entgiftungspfade Phase I & II", "reason": "Biochemische Grundlagen der Leberentgiftung", "relevance_score": 0.92},
    ],
    "Energie": [
        {"topic": "Leber-Optimierungs-Protokoll", "reason": "Gezielte Maßnahmen zur Steigerung der Leberleistung und Energie", "relevance_score": 0.95},
        {"topic": "Mitochondriale Gesundheit", "reason": "Energieproduktion auf zellulärer Ebene optimieren", "relevance_score": 0.88},
    ],
    "Gewicht": [
        {"topic": "Fettleber & Stoffwechsel", "reason": "Lebergesundheit als Schlüssel für nachhaltiges Gewichtsmanagement", "relevance_score": 0.95},
        {"topic": "Ernährungsplan Leber", "reason": "Leberunterstützende Ernährung für Gewichtsregulation", "relevance_score": 0.90},
    ],
    "Haut": [
        {"topic": "Leber & Hautreinigung", "reason": "Klares Hautbild durch optimale Leberentgiftung", "relevance_score": 0.93},
        {"topic": "Antioxidantien & Leberschutz", "reason": "Schutz vor oxidativem Stress für Haut und Leber", "relevance_score": 0.85},
    ],
    "Allgemein": [
        {"topic": "Ganzheitliche Lebergesundheit", "reason": "Umfassender Überblick über alle Dimensionen der Lebergesundheit", "relevance_score": 0.88},
        {"topic": "Lebergesundheit Grundlagen", "reason": "Fundament für alle weiteren Optimierungen", "relevance_score": 0.85},
    ],
}

_VERTRAUTHEIT_GAPS: dict[int, list[dict]] = {
    1: [{"topic": "Lebergesundheit Grundlagen", "reason": "Einstieg: Was macht die Leber und warum ist sie so wichtig?", "relevance_score": 0.98}],
    2: [{"topic": "Lebergesundheit Grundlagen", "reason": "Solide Grundlagen für das Verständnis der Leberfunktionen", "relevance_score": 0.90}],
    3: [{"topic": "Entgiftungspfade Phase I & II", "reason": "Vertiefung der biochemischen Entgiftungsmechanismen", "relevance_score": 0.85}],
    4: [{"topic": "Leber-Optimierungs-Protokoll", "reason": "Fortgeschrittene Protokolle für erfahrene Anwender", "relevance_score": 0.82}],
    5: [{"topic": "Aktuelle Forschung Lebergesundheit", "reason": "Neueste wissenschaftliche Erkenntnisse und Protokolle", "relevance_score": 0.80}],
}


def _build_gap_recommendations(answers: OnboardingAnswers) -> list[GapRecommendation]:
    """Build personalized gap recommendations from symptom keywords."""
    seen: set[str] = set()
    recs: list[GapRecommendation] = []

    for symptom in answers.beschwerden:
        for gap in _BESCHWERDEN_GAPS.get(symptom, []):
            if gap["topic"] not in seen:
                seen.add(gap["topic"])
                recs.append(GapRecommendation(**gap))

    for gap in _ZIEL_GAPS.get(answers.hauptziel, []):
        if gap["topic"] not in seen:
            seen.add(gap["topic"])
            recs.append(GapRecommendation(**gap))

    for gap in _VERTRAUTHEIT_GAPS.get(answers.vertrautheit, []):
        if gap["topic"] not in seen:
            seen.add(gap["topic"])
            recs.append(GapRecommendation(**gap))

    recs.sort(key=lambda r: r.relevance_score, reverse=True)
    return recs[:6]


@router.post(
    "/onboarding/submit",
    response_model=OnboardingProfileResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["onboarding"],
    summary="Submit onboarding answers (5 symptom questions)",
)
def submit_onboarding(
    payload: OnboardingSubmitRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save onboarding answers and return personalized gap recommendations.

    5 questions:
    1. Welche Beschwerden? (Müdigkeit/Verdauung/Hautprobleme/Übergewicht/Energiemangel)
    2. Wie lange bestehen diese?
    3. Maßnahmen ergriffen? (Freitext)
    4. Hauptziel? (Entgiftung/Energie/Gewicht/Haut/Allgemein)
    5. Vertrautheit Lebergesundheit (1–5)
    """
    import json
    from ..models.database import OnboardingSession

    answers_dict = payload.answers.model_dump()
    current_user.onboarding_data = json.dumps(answers_dict)

    session = OnboardingSession(
        user_id=current_user.id,
        answers=json.dumps(answers_dict),
        completed_at=datetime.utcnow(),
    )
    db.add(current_user)
    db.add(session)
    db.commit()
    db.refresh(current_user)

    return OnboardingProfileResponse(
        user_id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        answers=payload.answers,
        gap_recommendations=_build_gap_recommendations(payload.answers),
        completed_at=session.completed_at,
    )


@router.get(
    "/onboarding/my-profile",
    response_model=OnboardingProfileResponse,
    tags=["onboarding"],
    summary="My onboarding profile + personalized gap recommendations",
)
def get_my_onboarding_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return onboarding answers and personalized knowledge gap recommendations for the current user.
    Returns empty recommendations if onboarding not yet completed.
    """
    import json
    from ..models.database import OnboardingSession

    raw = current_user.onboarding_data or "{}"
    try:
        answers_dict = json.loads(raw)
    except Exception:
        answers_dict = {}

    answers: Optional[OnboardingAnswers] = None
    gap_recs: list[GapRecommendation] = []
    completed_at: Optional[datetime] = None

    if answers_dict.get("beschwerden"):
        try:
            answers = OnboardingAnswers(**answers_dict)
            gap_recs = _build_gap_recommendations(answers)
        except Exception:
            pass

    latest = (
        db.query(OnboardingSession)
        .filter_by(user_id=current_user.id)
        .order_by(OnboardingSession.completed_at.desc())
        .first()
    )
    if latest:
        completed_at = latest.completed_at

    return OnboardingProfileResponse(
        user_id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        answers=answers,
        gap_recommendations=gap_recs,
        completed_at=completed_at,
    )


# ── Health Check ─────────────────────────────────────────────────────────


@router.get("/health", tags=["system"], summary="Health check")
def health(db: Session = Depends(get_db)):
    """Extended health check: DB + InfraNodus status."""
    from datetime import datetime

    # Check DB connectivity
    db_ok = False
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    # Check InfraNodus (just config presence, no live ping)
    settings = get_settings()
    infranodus_configured = bool(settings.infranodus_api_key)

    return {
        "status": "ok",
        "service": "synodea-next",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": {
            "database": "ok" if db_ok else "degraded",
            "infranodus": "configured" if infranodus_configured else "cache-only",
        },
    }
