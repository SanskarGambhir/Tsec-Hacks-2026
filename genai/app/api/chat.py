from fastapi import APIRouter, HTTPException
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.core.llm import SYSTEM_PROMPT, LLMNotConfigured, get_llm
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()


def build_messages(request: ChatRequest) -> list:
    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    for turn in request.history:
        if turn.role == "user":
            messages.append(HumanMessage(content=turn.content))
        else:
            messages.append(AIMessage(content=turn.content))

    messages.append(HumanMessage(content=request.message))
    return messages


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        llm = get_llm()
    except LLMNotConfigured as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    try:
        response = llm.invoke(build_messages(request))
    except Exception as error:
        # Upstream detail can carry the API key, so it is logged rather than
        # returned to the caller.
        print(f"LLM call failed: {error}")
        raise HTTPException(
            status_code=502, detail="The AI service is unavailable right now."
        ) from error

    return ChatResponse(response=response.content)
