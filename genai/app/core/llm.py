import os
from functools import lru_cache

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

SYSTEM_PROMPT = """You are Cooper's finance assistant.

Cooper is a group finance app: people pool money into shared group wallets,
split expenses between members, settle up, and track spending.

Answer questions about splitting bills, settling balances, budgeting and
group spending. Be concrete and brief - a couple of short paragraphs at most,
and prefer plain numbers over hedging. All amounts are Indian rupees.

If a question needs data you were not given, say what you would need rather
than inventing figures."""


class LLMNotConfigured(RuntimeError):
    """Raised when HF_TOKEN is absent, instead of handing back a None model."""


@lru_cache(maxsize=1)
def get_llm() -> ChatOpenAI:
    """
    Build the chat model once and reuse it.

    This used to return None when HF_TOKEN was missing, which turned a
    configuration problem into an AttributeError deep inside the graph. It now
    raises something the API layer can report properly, and the instance is
    cached rather than rebuilt on every request.
    """
    hf_token = os.environ.get("HF_TOKEN")

    if not hf_token:
        raise LLMNotConfigured(
            "HF_TOKEN is not set; the AI chat service cannot start a model."
        )

    return ChatOpenAI(
        model="deepseek-ai/DeepSeek-V3.2:novita",
        openai_api_key=hf_token,
        openai_api_base="https://router.huggingface.co/v1",
        max_tokens=1024,
        timeout=60,
        max_retries=2,
    )
