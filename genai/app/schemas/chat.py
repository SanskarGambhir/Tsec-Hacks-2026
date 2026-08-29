from typing import Literal

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    # Prior turns, oldest first. Without these every request was standalone and
    # the assistant could not follow a conversation.
    history: list[Message] = Field(default_factory=list, max_length=20)


class ChatResponse(BaseModel):
    response: str
