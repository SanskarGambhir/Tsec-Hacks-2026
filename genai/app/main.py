from fastapi import FastAPI
from app.api import chat, workflow

app = FastAPI()

app.include_router(chat.router)
app.include_router(workflow.router)

@app.get("/")
async def root():
    return {"message": "server is running"}
