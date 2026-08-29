import operator
from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.core.llm import SYSTEM_PROMPT, get_llm


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]


def call_model(state: AgentState) -> dict:
    # get_llm() raises LLMNotConfigured rather than returning None, so this can
    # no longer fail with an AttributeError on a missing token.
    llm = get_llm()

    # The system prompt is prepended per call rather than stored in state, so
    # it cannot be duplicated as the conversation accumulates.
    messages = [SystemMessage(content=SYSTEM_PROMPT), *state["messages"]]

    return {"messages": [llm.invoke(messages)]}


def create_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("agent", call_model)
    workflow.set_entry_point("agent")
    workflow.add_edge("agent", END)

    return workflow.compile()
