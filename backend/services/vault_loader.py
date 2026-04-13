"""
SYNODEA NEXT — Vault Loader Service
Reads markdown vault files, extracts wikilinks, YAML frontmatter, tags, and metadata.
Handles Obsidian-style vaults with nested folders.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Optional, Union

import yaml


# ── Regex Patterns ──────────────────────────────────────────────────────────

# Matches [[Note Title]] and [[Note Title|Alias]]
WIKILINK_PATTERN = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]")

# Matches #tag (not ## headings)
INLINE_TAG_PATTERN = re.compile(r"(?<!\S)#([A-Za-z][A-Za-z0-9_/-]*)")

# Matches YAML frontmatter block
FRONTMATTER_PATTERN = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


# ── Core Functions ──────────────────────────────────────────────────────────


def parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """
    Extract YAML frontmatter from markdown content.

    Returns:
        (frontmatter_dict, content_without_frontmatter)
    """
    match = FRONTMATTER_PATTERN.match(content)
    if not match:
        return {}, content

    yaml_str = match.group(1)
    body = content[match.end():]

    try:
        data = yaml.safe_load(yaml_str) or {}
        if not isinstance(data, dict):
            data = {}
    except yaml.YAMLError:
        data = {}

    return data, body


def extract_wikilinks(content: str) -> list[str]:
    """
    Extract all [[wikilink]] targets from content.
    Returns deduplicated list, preserving order.
    """
    seen: set[str] = set()
    links: list[str] = []
    for match in WIKILINK_PATTERN.finditer(content):
        target = match.group(1).strip()
        if target and target not in seen:
            seen.add(target)
            links.append(target)
    return links


def extract_tags(frontmatter: dict[str, Any], content: str) -> list[str]:
    """
    Extract tags from both YAML frontmatter and inline #tags.
    Frontmatter tags can be list or space-separated string.
    """
    tags: set[str] = set()

    # From frontmatter
    fm_tags = frontmatter.get("tags", frontmatter.get("tag", []))
    if isinstance(fm_tags, list):
        for t in fm_tags:
            if isinstance(t, str):
                tags.add(t.strip().lstrip("#"))
    elif isinstance(fm_tags, str):
        for t in fm_tags.split():
            tags.add(t.strip().lstrip("#"))

    # From inline content
    for match in INLINE_TAG_PATTERN.finditer(content):
        tags.add(match.group(1))

    return sorted(tags)


def extract_title(frontmatter: dict[str, Any], file_path: Path) -> str:
    """
    Determine the note title.
    Priority: frontmatter 'title' > first H1 heading > filename stem.
    """
    if "title" in frontmatter and frontmatter["title"]:
        return str(frontmatter["title"])
    return file_path.stem


def count_words(content: str) -> int:
    """Count approximate word count (strip frontmatter first)."""
    # Remove code blocks
    no_code = re.sub(r"```.*?```", "", content, flags=re.DOTALL)
    # Remove wikilinks (keep label)
    no_wikilinks = WIKILINK_PATTERN.sub(lambda m: m.group(1), no_code)
    # Remove markdown syntax
    clean = re.sub(r"[#*_`\[\]()]", " ", no_wikilinks)
    words = [w for w in clean.split() if w]
    return len(words)


def get_folder_group(file_path: Path, vault_root: Path) -> str:
    """
    Determine the top-level folder group for clustering.
    E.g. 'Atlas', 'Kapitel', 'Transkripte', etc.
    """
    try:
        rel = file_path.relative_to(vault_root)
        parts = rel.parts
        if len(parts) > 1:
            return parts[0]
        return "root"
    except ValueError:
        return "unknown"


# ── VaultFile ───────────────────────────────────────────────────────────────


class VaultFile:
    """Parsed representation of a single markdown note."""

    __slots__ = (
        "path", "title", "folder", "frontmatter",
        "wikilinks", "tags", "word_count", "content", "raw_content",
    )

    def __init__(
        self,
        path: Path,
        vault_root: Path,
        raw_content: str,
    ) -> None:
        self.path = path
        self.raw_content = raw_content

        frontmatter, body = parse_frontmatter(raw_content)
        self.frontmatter = frontmatter
        self.content = body
        self.title = extract_title(frontmatter, path)
        self.folder = get_folder_group(path, vault_root)
        self.wikilinks = extract_wikilinks(body)
        self.tags = extract_tags(frontmatter, body)
        self.word_count = count_words(body)

    @property
    def relative_path(self) -> str:
        """Slash-separated path string, suitable for API responses."""
        return self.path.as_posix()

    def __repr__(self) -> str:
        return f"<VaultFile title={self.title!r} links={len(self.wikilinks)}>"


# ── VaultLoader ─────────────────────────────────────────────────────────────


class VaultLoader:
    """
    Loads and indexes all markdown files from a vault folder.

    Usage:
        loader = VaultLoader("/path/to/vault")
        files = loader.load_all()
        graph_data = loader.to_graph()
    """

    def __init__(self, vault_path: Union[str, Path]) -> None:
        self.vault_root = Path(vault_path).expanduser().resolve()
        if not self.vault_root.exists():
            raise FileNotFoundError(f"Vault path does not exist: {self.vault_root}")
        self._files: Optional[list[VaultFile]] = None

    # ── Loading ──────────────────────────────────────────────────────────

    def load_all(self) -> list[VaultFile]:
        """Load and parse all .md files in the vault. Cached after first call."""
        if self._files is not None:
            return self._files

        files: list[VaultFile] = []
        for md_path in sorted(self.vault_root.rglob("*.md")):
            try:
                raw = md_path.read_text(encoding="utf-8", errors="replace")
                files.append(VaultFile(md_path, self.vault_root, raw))
            except OSError:
                continue

        self._files = files
        return files

    def load_file(self, relative_path: str) -> Optional[VaultFile]:
        """Load a single file by relative path (from vault root)."""
        full_path = self.vault_root / relative_path
        if not full_path.exists():
            return None
        try:
            raw = full_path.read_text(encoding="utf-8", errors="replace")
            return VaultFile(full_path, self.vault_root, raw)
        except OSError:
            return None

    # ── Index ────────────────────────────────────────────────────────────

    def build_title_index(self) -> dict[str, VaultFile]:
        """Map lowercase title → VaultFile for wikilink resolution."""
        files = self.load_all()
        index: dict[str, VaultFile] = {}
        for f in files:
            index[f.title.lower()] = f
            # Also index by stem (filename without extension)
            index[f.path.stem.lower()] = f
        return index

    def build_connection_count(self) -> dict[str, int]:
        """
        Count how many times each note is referenced by other notes.
        Key: lowercase title. Value: inbound link count.
        """
        files = self.load_all()
        title_idx = self.build_title_index()
        counts: dict[str, int] = {f.title: 0 for f in files}

        for f in files:
            for link in f.wikilinks:
                target = title_idx.get(link.lower())
                if target and target.title in counts:
                    counts[target.title] += 1

        return counts

    # ── File Listing ─────────────────────────────────────────────────────

    def list_files_meta(self) -> list[dict]:
        """Return lightweight metadata for all files."""
        files = self.load_all()
        conn_counts = self.build_connection_count()

        result = []
        for f in files:
            result.append({
                "path": str(f.path.relative_to(self.vault_root)),
                "title": f.title,
                "folder": f.folder,
                "word_count": f.word_count,
                "tags": f.tags,
                "wikilinks": f.wikilinks,
                "frontmatter": f.frontmatter,
                "connection_count": conn_counts.get(f.title, 0),
            })
        return result
