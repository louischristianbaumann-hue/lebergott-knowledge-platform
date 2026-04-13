"""
SYNODEA NEXT — Analysis Service
Wraps SynodeaAnalysis and SynodeaBridge for API use.
Handles engine import path resolution and DB persistence.
"""
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..models.database import Analysis, Customer, DimensionScore, VaultRegistry
from ..models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisStatus,
    BridgeRequest,
    BridgeResponse,
    DimensionScoreOut,
)


def _find_mcp_servers_path() -> Optional[str]:
    """
    Locate the mcp-servers directory containing lautlos_paths.py.
    Searches common locations before giving up.
    """
    candidates = [
        Path.home() / ".claude" / "mcp-servers",
        Path.home() / ".claude" / "_engine" / "mcp-servers",
        Path.home() / ".claude" / "engine" / "mcp-servers",
    ]
    for candidate in candidates:
        if (candidate / "lautlos_paths.py").exists():
            return str(candidate)
    # Last resort: search under ~/.claude
    try:
        for match in (Path.home() / ".claude").rglob("lautlos_paths.py"):
            return str(match.parent)
    except Exception:
        pass
    return None


def _ensure_engine_on_path() -> None:
    """Add SYNODEA engine folder to sys.path so we can import analysis.py + config.py."""
    settings = get_settings()
    engine_path = str(settings.engine_path)

    # Locate mcp-servers dir with lautlos_paths.py
    mcp_path = _find_mcp_servers_path()

    for p in filter(None, [engine_path, mcp_path]):
        if p not in sys.path:
            sys.path.insert(0, p)


def _import_engine():
    """Lazily import SynodeaAnalysis — only when engine path is available."""
    _ensure_engine_on_path()
    try:
        from analysis import SynodeaAnalysis
        return SynodeaAnalysis
    except ImportError as e:
        raise RuntimeError(
            f"Cannot import SynodeaAnalysis from engine path. "
            f"Check SYNODEA_ENGINE_PATH setting. Error: {e}"
        ) from e


def _import_bridge():
    """Lazily import SynodeaBridge."""
    _ensure_engine_on_path()
    try:
        from bridge import SynodeaBridge
        return SynodeaBridge
    except ImportError as e:
        raise RuntimeError(
            f"Cannot import SynodeaBridge from engine path. Error: {e}"
        ) from e


# ── Analysis Service ─────────────────────────────────────────────────────


class AnalysisService:
    """
    API wrapper around SynodeaAnalysis.

    The existing engine returns SPECS (query/op descriptors) rather than
    executing MCP calls directly. This service:
      1. Creates the DB record
      2. Calls the engine to generate all 3 lens specs
      3. Stores specs in DB for agent pickup
      4. Returns the response schema

    Actual MCP execution (SC + InfraNodus) happens via Claude Code agents
    that read the stored specs and POST results back via the analysis update endpoint.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_analysis(self, request: AnalysisRequest) -> AnalysisResponse:
        """
        Create a new analysis record and generate the 3-lens specs.

        Step 1: Vault Prime spec (SC query descriptors)
        Step 2: Discourse spec (InfraNodus op descriptors)
        Step 3: Steiner scoring prompts (ready for Opus evaluation)
        """
        SynodeaAnalysis = _import_engine()

        # Instantiate engine
        engine = SynodeaAnalysis(
            subject=request.subject,
            content=request.content,
            industry=request.industry,
            mode=request.mode.value,
            competitors=request.competitors,
        )

        # Generate all 3 lens specs
        vault_prime_spec = engine.vault_prime()
        discourse_spec = engine.discourse_analyze()
        # For steiner prompts we pass empty dicts — actual context comes from MCP execution
        steiner_prompts = engine.steiner_score(vault_context={}, discourse_results={})

        # Persist to DB
        analysis = Analysis(
            subject=request.subject,
            content=request.content,
            industry=request.industry,
            mode=request.mode.value,
            status=AnalysisStatus.pending.value,
            customer_id=request.customer_id,
        )
        analysis.competitors = request.competitors
        analysis.vault_prime_spec = vault_prime_spec
        analysis.discourse_spec = discourse_spec
        analysis.steiner_prompts = steiner_prompts

        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)

        return self._to_response(analysis)

    def get_analysis(self, analysis_id: int) -> Optional[AnalysisResponse]:
        """Fetch analysis by ID."""
        analysis = self.db.query(Analysis).filter_by(id=analysis_id).first()
        if not analysis:
            return None
        return self._to_response(analysis)

    def update_scores(
        self, analysis_id: int, scores: list[dict]
    ) -> Optional[AnalysisResponse]:
        """
        Update an analysis with scored dimension results.
        Called when Claude agents complete Steiner scoring.

        Args:
            scores: List of dicts with keys:
                    dimension_id, dimension_name, score, label,
                    justification, evidence, recommendation
        """
        analysis = self.db.query(Analysis).filter_by(id=analysis_id).first()
        if not analysis:
            return None

        # Clear existing scores
        self.db.query(DimensionScore).filter_by(analysis_id=analysis_id).delete()

        # Add new scores
        for s in scores:
            dim_score = DimensionScore(
                analysis_id=analysis_id,
                dimension_id=s.get("dimension_id", ""),
                dimension_name=s.get("dimension_name", ""),
                score=float(s.get("score", 1.0)),
                label=s.get("label", ""),
                justification=s.get("justification", ""),
                evidence=s.get("evidence", ""),
                recommendation=s.get("recommendation", ""),
            )
            self.db.add(dim_score)

        # Calculate Freiheitsindex
        SynodeaAnalysis = _import_engine()
        engine = SynodeaAnalysis(subject=analysis.subject, content="", mode=analysis.mode)
        scores_dict = {s["dimension_id"]: {"score": float(s["score"])} for s in scores}
        fi = engine.calculate_freiheitsindex(scores_dict)

        analysis.freiheitsindex = fi["index"]
        analysis.archetype = fi["archetype"]
        analysis.status = AnalysisStatus.completed.value
        analysis.completed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(analysis)
        return self._to_response(analysis)

    def get_freiheitsprofil(self, analysis_id: int) -> Optional[dict]:
        """Return full Freiheitsprofil — 7-dimension scores + archetype + index."""
        analysis = self.db.query(Analysis).filter_by(id=analysis_id).first()
        if not analysis:
            return None

        dim_scores = self.db.query(DimensionScore).filter_by(analysis_id=analysis_id).all()

        return {
            "analysis_id": analysis_id,
            "subject": analysis.subject,
            "freiheitsindex": analysis.freiheitsindex,
            "archetype": analysis.archetype,
            "dimension_scores": [
                {
                    "dimension_id": ds.dimension_id,
                    "dimension_name": ds.dimension_name,
                    "score": ds.score,
                    "label": ds.label,
                    "justification": ds.justification,
                    "evidence": ds.evidence,
                    "recommendation": ds.recommendation,
                }
                for ds in dim_scores
            ],
            "created_at": analysis.created_at.isoformat(),
        }

    # ── Internal ─────────────────────────────────────────────────────────

    def _to_response(self, analysis: Analysis) -> AnalysisResponse:
        """Convert DB model to response schema."""
        dim_scores = (
            self.db.query(DimensionScore).filter_by(analysis_id=analysis.id).all()
        )

        return AnalysisResponse(
            id=analysis.id,
            subject=analysis.subject,
            mode=analysis.mode,
            status=analysis.status,
            customer_id=analysis.customer_id,
            vault_prime_spec=analysis.vault_prime_spec,
            discourse_spec=analysis.discourse_spec,
            steiner_prompts=analysis.steiner_prompts,
            freiheitsindex=analysis.freiheitsindex,
            archetype=analysis.archetype,
            dimension_scores=[
                DimensionScoreOut(
                    dimension_id=ds.dimension_id,
                    dimension_name=ds.dimension_name,
                    score=ds.score,
                    label=ds.label,
                    justification=ds.justification,
                    evidence=ds.evidence,
                    recommendation=ds.recommendation,
                )
                for ds in dim_scores
            ],
            error=analysis.error,
            created_at=analysis.created_at,
        )


# ── Bridge Service ───────────────────────────────────────────────────────


class BridgeService:
    """API wrapper around SynodeaBridge."""

    def run_bridge(self, request: BridgeRequest) -> BridgeResponse:
        """
        Generate the full bridge pipeline spec for a topic.

        Returns the complete sequenced plan for agent execution.
        Agents execute the spec via MCP tools and POST results back.
        """
        SynodeaBridge = _import_bridge()
        bridge = SynodeaBridge(topic=request.topic)
        pipeline_spec = bridge.full_pipeline(request.topic)

        # Return spec — execution happens via agents
        return BridgeResponse(
            topic=request.topic,
            pipeline_spec=pipeline_spec,
            wikilinks=[],
            new_notes=[],
            stats={},
            reasoning=(
                f"Bridge pipeline spec generated for topic '{request.topic}'. "
                f"Execute steps 1-4 via SC + InfraNodus MCP tools, then POST results "
                f"to /api/v1/bridge/results to get synthesized wikilinks and new notes."
            ),
        )

    def synthesize_results(
        self, topic: str, sc_gaps: list[dict], infranodus_bridges: list[dict]
    ) -> BridgeResponse:
        """
        Synthesize bridge results after MCP execution.
        Call this after agents have run SC + InfraNodus steps.
        """
        SynodeaBridge = _import_bridge()
        bridge = SynodeaBridge(topic=topic)

        synthesis = bridge.synthesize_wikilinks(sc_gaps, infranodus_bridges)

        return BridgeResponse(
            topic=topic,
            pipeline_spec={},  # already executed
            wikilinks=synthesis.get("wikilinks", []),
            new_notes=synthesis.get("new_notes", []),
            stats=synthesis.get("stats", {}),
            reasoning=synthesis.get("reasoning", ""),
        )


# ── Vault Registry Service ───────────────────────────────────────────────


class VaultRegistryService:
    """Manage vault registrations."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def register(
        self,
        vault_id: str,
        name: str,
        vault_path: str,
        industry: str = "",
        customer_id: Optional[int] = None,
    ) -> VaultRegistry:
        """Register a new vault or update existing."""
        from pathlib import Path as PPath

        vault_p = PPath(vault_path).expanduser().resolve()
        file_count = len(list(vault_p.rglob("*.md"))) if vault_p.exists() else 0

        existing = self.db.query(VaultRegistry).filter_by(vault_id=vault_id).first()
        if existing:
            existing.name = name
            existing.vault_path = str(vault_p)
            existing.industry = industry
            existing.customer_id = customer_id
            existing.file_count = file_count
            existing.last_indexed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing)
            return existing

        registry = VaultRegistry(
            vault_id=vault_id,
            name=name,
            vault_path=str(vault_p),
            industry=industry,
            customer_id=customer_id,
            file_count=file_count,
        )
        self.db.add(registry)
        self.db.commit()
        self.db.refresh(registry)
        return registry

    def get_vault_path(self, vault_id: str) -> Optional[str]:
        """Resolve vault path from registry, fall back to demo vault."""
        settings = get_settings()

        if vault_id == settings.demo_vault_id:
            return str(settings.lebergott_path)

        record = self.db.query(VaultRegistry).filter_by(vault_id=vault_id).first()
        return record.vault_path if record else None
