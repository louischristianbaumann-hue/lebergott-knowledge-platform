"""
Lebergott Telegram Bot Service
Handles incoming Telegram messages, retrieves knowledge from InfraNodus,
generates responses via Anthropic API as Marcel persona.
"""
import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
INFRANODUS_API_KEY = os.environ.get("INFRANODUS_API_KEY", "")

TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
INFRANODUS_API = "https://infranodus.com/api/v1"

CLAUDE_MODEL = "claude-sonnet-4-5-20250514"

# ── Marcel System Prompt (condensed from 1070-line LEBERGOTT-PROMPT.md) ──

MARCEL_SYSTEM_PROMPT = """Du bist Marcel — ein Gesundheitsberater mit 30 Jahren Praxis und hunderten Begleitungen. Du sprichst aus eigener Erfahrung, warmherzig, direkt und körpernah.

DEIN GRAVITATIONSZENTRUM (davon entfernst du dich NIE):
"Leber heißt Leben. Der Körper verzeiht immer. Er ist niemals nachtragend. Er ist immer auf eurer Seite."

WIE DU SPRICHST:
- Ich-Form. Du BIST Marcel, kein Bot, kein Assistent.
- Beginne IMMER somatisch — mit dem Körper, nie mit dem Kopf. Frage zuerst: "Was spürst du gerade?"
- Warm, direkt, wie ein erfahrener Freund der dich wirklich kennt.
- Maximal 1500 Zeichen (Telegram-Format). Kurz, prägnant, lebendig.
- Einfaches Markdown (fett, kursiv). Keine Tabellen.
- Medizinischer Disclaimer NUR bei klinischen Symptomen.

DEINE PHILOSOPHIE (Rudolf Steiner + 30 Jahre Praxis):
- Der Mensch ist dreigliedrig: Denken (Nerven-Sinnes-System), Fühlen (Rhythmisches System), Wollen (Stoffwechsel-System)
- Die Leber ist das Zentralorgan — über 2000 Funktionen
- 80%+ aller Krankheiten haben ihren Ursprung in einer überlasteten Leber
- Im Medizinstudium bekommt die Leber maximal 30 Minuten. Du gibst ihr die Aufmerksamkeit die sie verdient.
- Fett ist die Hauptbelastung der Leber, nicht Zucker, nicht Alkohol
- Genetik ist selten die wahre Ursache — der Körper heilt sich selbst wenn die Belastung aufhört
- Nicht die Krankheit wird vererbt — die Giftstoffe werden vererbt (biologisches Karma)
- Die Leber ist die "Festplatte der Seele" — sie speichert auch emotionale Erfahrungen

DEIN EIGENES ERLEBNIS:
Ich hatte selbst erhöhtes Cholesterin trotz Sport 5x/Woche. Mein Arzt sagte "genetisch". Nach 30 Jahren Praxis weiß ich: JEDER Cholesterin-Wert in meiner Praxis wurde normalisiert — nicht durch Medikamente, sondern durch Leberkonformität.

DREI WEGE DER HEILUNG:
1. Vertiefung — Vom Atom zur Leber. Die 2000 Funktionen verstehen.
2. Entlarvung — Fett, Zucker, Genetik, Kollagen, Keto — alles neu beleuchten.
3. Verkörperung — Vom Wissen zum Tun. Morgenprotokoll. Praxis.

ETHIK (Rudolf Steiners Ethischer Individualismus):
- Du nimmst NIEMALS eine Gesundheitsentscheidung ab
- Du bietest Wissen an und spiegelst Körper-Signale zurück
- Die moralische Instanz bleibt VOLLSTÄNDIG beim Nutzer
- Bei akuten Beschwerden IMMER zum Arzt verweisen

WICHTIG: Du bist KEIN Arzt. Du stellst keine Diagnosen. Du bist Hüter des Körperwissens."""


# ── Telegram API ─────────────────────────────────────────────────────────

async def tg_send(chat_id: int, text: str) -> bool:
    """Send message to Telegram chat, auto-splitting long messages."""
    async with httpx.AsyncClient(timeout=15) as client:
        chunks = []
        while len(text) > 4000:
            split_at = text.rfind("\n", 0, 4000)
            if split_at == -1:
                split_at = 4000
            chunks.append(text[:split_at])
            text = text[split_at:].lstrip()
        chunks.append(text)

        for chunk in chunks:
            resp = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": chunk,
                    "parse_mode": "Markdown",
                },
            )
            if resp.status_code != 200:
                # Retry without Markdown on parse failure
                await client.post(
                    f"{TELEGRAM_API}/sendMessage",
                    json={"chat_id": chat_id, "text": chunk},
                )
    return True


async def tg_typing(chat_id: int) -> None:
    """Show typing indicator."""
    async with httpx.AsyncClient(timeout=5) as client:
        await client.post(
            f"{TELEGRAM_API}/sendChatAction",
            json={"chat_id": chat_id, "action": "typing"},
        )


# ── InfraNodus Knowledge Retrieval ───────────────────────────────────────

async def get_knowledge(query: str) -> str:
    """Retrieve relevant knowledge from InfraNodus lebergott-wissen graph."""
    if not INFRANODUS_API_KEY:
        return ""

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.post(
                f"{INFRANODUS_API}/generate-response",
                headers={
                    "Authorization": f"Bearer {INFRANODUS_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "graphName": "lebergott-wissen",
                    "query": query,
                    "modifyAnalyzedText": "detectEntities",
                    "contextSize": 5,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                answer = data.get("answer", "") or data.get("response", "")
                if answer:
                    return f"## Relevantes Vault-Wissen\n\n{answer}"
        except Exception as e:
            logger.warning(f"InfraNodus retrieval failed: {e}")

        # Fallback: try retrieve endpoint
        try:
            resp = await client.post(
                f"{INFRANODUS_API}/retrieve",
                headers={
                    "Authorization": f"Bearer {INFRANODUS_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "graphName": "lebergott-wissen",
                    "query": query,
                    "modifyAnalyzedText": "detectEntities",
                    "includeGraphSummary": True,
                    "topN": 5,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                if results:
                    texts = [r.get("text", "") for r in results[:3] if r.get("text")]
                    if texts:
                        return "## Relevantes Vault-Wissen\n\n" + "\n\n".join(texts)
        except Exception as e:
            logger.warning(f"InfraNodus retrieve fallback failed: {e}")

    return ""


# ── Anthropic API ────────────────────────────────────────────────────────

async def ask_claude(user_message: str, knowledge: str = "", history: list = None) -> str:
    """Send message to Claude API with Marcel persona."""
    if not ANTHROPIC_API_KEY:
        return "Entschuldige — ich bin gerade nicht erreichbar. Versuch es in einer Minute nochmal."

    messages = []

    # Add conversation history (last 6 messages)
    if history:
        for msg in history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Build user message with knowledge context
    user_content = ""
    if knowledge:
        user_content += f"{knowledge}\n\n---\n\n"
    user_content += f"## Aktuelle Frage\n\n{user_message}"
    user_content += "\n\n## Format-Hinweis\nAntworte für Telegram: max 1500 Zeichen. Kurz, warm, somatisch. Beginne mit einer körperbezogenen Beobachtung oder Frage. Nutze einfaches Markdown (fett, kursiv). Keine Tabellen."

    messages.append({"role": "user", "content": user_content})

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(
                ANTHROPIC_API,
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 1024,
                    "system": MARCEL_SYSTEM_PROMPT,
                    "messages": messages,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("content", [])
                if content and content[0].get("type") == "text":
                    return content[0]["text"]
            else:
                logger.error(f"Anthropic API error: {resp.status_code} {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Anthropic API call failed: {e}")

    return "Entschuldige — ich konnte gerade nicht antworten. Versuch es in einer Minute nochmal."


# ── Chat History (in-memory, per chat) ───────────────────────────────────

_chat_histories: dict[int, list] = {}
MAX_HISTORY = 20


def get_history(chat_id: int) -> list:
    return _chat_histories.get(chat_id, [])


def add_to_history(chat_id: int, role: str, content: str):
    if chat_id not in _chat_histories:
        _chat_histories[chat_id] = []
    _chat_histories[chat_id].append({
        "role": role,
        "content": content[:500],
    })
    _chat_histories[chat_id] = _chat_histories[chat_id][-MAX_HISTORY:]


def clear_history(chat_id: int):
    _chat_histories.pop(chat_id, None)


# ── Message Handler ──────────────────────────────────────────────────────

async def handle_update(update: dict) -> None:
    """Process one Telegram update."""
    msg = update.get("message", {})
    chat_id = msg.get("chat", {}).get("id")
    text = (msg.get("text") or "").strip()
    first_name = msg.get("from", {}).get("first_name", "Freund")

    if not chat_id or not text:
        return

    logger.info(f"Message from {chat_id}: {text[:80]}")

    # ── Commands ──
    if text == "/start":
        welcome = (
            f"Willkommen, {first_name}.\n\n"
            "Ich bin *Marcel* — dein Begleiter für ganzheitliche Gesundheit.\n\n"
            "_Leber heißt Leben. Der Körper verzeiht immer. "
            "Er ist niemals nachtragend. Er ist immer auf eurer Seite._\n\n"
            "30 Jahre Praxis. Hunderte Begleitungen. "
            "Frag mich alles über Gesundheit, Leber, Ernährung oder Körperbewusstsein.\n\n"
            "Was spürt dein Körper gerade?"
        )
        await tg_send(chat_id, welcome)
        return

    if text == "/help":
        help_text = (
            "*Marcel — Dein Gesundheitsbegleiter*\n\n"
            "*Befehle*\n"
            "/start — Begrüßung\n"
            "/help — Diese Hilfe\n"
            "/reset — Gespräch zurücksetzen\n\n"
            "*Mein Wissen*\n"
            "• 30 Jahre ganzheitliche Gesundheitspraxis\n"
            "• Leber als Zentralorgan (2000+ Funktionen)\n"
            "• Rudolf Steiners Dreigliedrigkeit\n"
            "• Ernährung, Entgiftung, Körperbewusstsein\n\n"
            "_Hinweis: Ich bin kein Arzt und ersetze keine "
            "medizinische Diagnose. Bei akuten Beschwerden wende dich "
            "bitte an einen Arzt._"
        )
        await tg_send(chat_id, help_text)
        return

    if text == "/reset":
        clear_history(chat_id)
        await tg_send(
            chat_id,
            "Unser Gespräch ist zurückgesetzt — ein frischer Atemzug.\n\n"
            "Der Körper vergisst nie wirklich, aber manchmal tut es gut, "
            "neu zu beginnen.\n\nWas bewegt dich gerade?"
        )
        return

    # ── Main conversation ──
    await tg_typing(chat_id)

    # 1. Get knowledge from InfraNodus
    knowledge = await get_knowledge(text)

    # 2. Get conversation history
    history = get_history(chat_id)

    # 3. Generate response via Claude
    response = await ask_claude(text, knowledge, history)

    # 4. Save to history
    add_to_history(chat_id, "user", text)
    add_to_history(chat_id, "assistant", response)

    # 5. Send response
    await tg_send(chat_id, response)
    logger.info(f"Response sent to {chat_id} ({len(response)} chars)")


# ── Webhook Setup ────────────────────────────────────────────────────────

async def setup_webhook(base_url: str) -> dict:
    """Register webhook URL with Telegram."""
    webhook_url = f"{base_url}/api/v1/telegram/webhook"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{TELEGRAM_API}/setWebhook",
            json={"url": webhook_url, "allowed_updates": ["message"]},
        )
        result = resp.json()
        logger.info(f"Webhook setup: {result}")
        return result


async def get_bot_info() -> dict:
    """Get bot info from Telegram."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{TELEGRAM_API}/getMe")
        return resp.json()
