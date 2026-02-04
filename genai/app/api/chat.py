from fastapi import APIRouter, HTTPException, Depends
from langchain_core.messages import HumanMessage, SystemMessage
from app.schemas.chat import ChatRequest, ChatResponse
from app.core.llm import get_llm

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    llm = get_llm()
    if not llm:
        raise HTTPException(status_code=500, detail="HF_TOKEN not set in environment")

    try:
        messages = [
            SystemMessage(content="You are a helpful assistant."),
            HumanMessage(content=request.message),
        ]
        
        response = llm.invoke(messages)
        return ChatResponse(response=response.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
