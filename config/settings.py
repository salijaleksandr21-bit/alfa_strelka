import os
from typing_extensions import Literal
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class Settings:
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "deepseek/deepseek-v4-flash")
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.2"))
    EXPERT_LEVEL: Literal["lite", "default", "strict"] = os.getenv("EXPERT_LEVEL", "default")
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))

settings = Settings()
