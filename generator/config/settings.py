import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "deepseek/deepseek-v4-flash")
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.2"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))

settings = Settings()