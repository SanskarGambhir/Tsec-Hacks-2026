import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, workflow
from app.core.llm import LLMNotConfigured, get_llm

app = FastAPI(title="Cooper GenAI", version="1.0.0")

# Without this, a browser could not call the service at all.
origins = [
    os.environ.get("FRONTEND_URL", "http://localhost:5173"),
    os.environ.get("SERVER_URL", "http://localhost:8000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(chat.router)
app.include_router(workflow.router)


@app.get("/health")
async def health() -> dict:
    """Reports whether the model is actually configured, not just that the
    process is up."""
    try:
        get_llm()
        return {"status": "ok", "llm": "configured"}
    except LLMNotConfigured:
        return {"status": "degraded", "llm": "missing HF_TOKEN"}


@app.get("/")
async def root() -> dict:
    return {"service": "Cooper GenAI", "status": "running"}
