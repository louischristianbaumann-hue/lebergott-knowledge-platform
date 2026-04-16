"""
Telegram Bot Webhook Routes
Receives updates from Telegram, processes via Marcel persona.
"""
import logging
from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import JSONResponse

from ..services.telegram_service import handle_update, setup_webhook, get_bot_info

logger = logging.getLogger(__name__)

telegram_router = APIRouter(prefix="/api/v1/telegram", tags=["telegram"])


@telegram_router.post("/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive Telegram webhook updates. Processes message in background."""
    try:
        update = await request.json()
        # Process in background so Telegram gets fast 200 response
        background_tasks.add_task(handle_update, update)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return JSONResponse(status_code=200, content={"ok": True})


@telegram_router.get("/status")
async def telegram_status():
    """Check Telegram bot status."""
    try:
        info = await get_bot_info()
        if info.get("ok"):
            bot = info["result"]
            return {
                "status": "online",
                "bot": f"@{bot.get('username', '?')}",
                "name": bot.get("first_name", "?"),
            }
        return {"status": "error", "detail": info}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@telegram_router.post("/setup-webhook")
async def setup_telegram_webhook(request: Request):
    """Register webhook URL with Telegram. Call once after deployment."""
    # Get base URL from request
    base_url = str(request.base_url).rstrip("/")
    # Use X-Forwarded headers if behind proxy
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    forwarded_host = request.headers.get("x-forwarded-host", "")
    if forwarded_proto and forwarded_host:
        base_url = f"{forwarded_proto}://{forwarded_host}"

    result = await setup_webhook(base_url)
    return result
