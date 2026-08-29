from fastapi import APIRouter, HTTPException
from langchain_core.messages import AIMessage, HumanMessage

from app.core.graph import create_graph
from app.core.llm import LLMNotConfigured
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()

# Compiled once at import; compiling per request was pure overhead.
graph = create_graph()


@router.post("/workflow", response_model=ChatResponse)
async def run_workflow(request: ChatRequest) -> ChatResponse:
    history = [
        HumanMessage(content=turn.content)
        if turn.role == "user"
        else AIMessage(content=turn.content)
        for turn in request.history
    ]

    try:
        result = graph.invoke(
            {"messages": [*history, HumanMessage(content=request.message)]}
        )
    except LLMNotConfigured as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        print(f"Workflow failed: {error}")
        raise HTTPException(
            status_code=502, detail="The AI service is unavailable right now."
        ) from error

    return ChatResponse(response=result["messages"][-1].content)
