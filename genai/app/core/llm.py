import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

def get_llm():
    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        # We return None or raise an error depending on preference. 
        # Returning None allows the API endpoint to handle the 500 error gracefully.
        return None

    return ChatOpenAI(
        model="deepseek-ai/DeepSeek-V3.2:novita",
        openai_api_key=hf_token,
        openai_api_base="https://router.huggingface.co/v1",
        max_tokens=1024
    )
