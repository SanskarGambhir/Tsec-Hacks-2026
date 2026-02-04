from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage
from app.schemas.chat import ChatRequest, ChatResponse
from app.core.graph import create_graph

router = APIRouter()
graph = create_graph()

@router.post("/workflow", response_model=ChatResponse)
async def run_workflow(request: ChatRequest):
    try:
        inputs = {"messages": [HumanMessage(content=request.message)]}
        result = graph.invoke(inputs)
        
        # The result['messages'][-1] is the AI's response
        last_message = result['messages'][-1]
        return ChatResponse(response=last_message.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
