# check_env.py
import os
from dotenv import load_dotenv
from pathlib import Path

# Пробуем загрузить .env
env_path = Path(__file__).parent / '.env'
print(f"Looking for .env at: {env_path}")
print(f"File exists: {env_path.exists()}")

load_dotenv(dotenv_path=env_path)

api_key = os.getenv("OPENROUTER_API_KEY")
print(f"OPENROUTER_API_KEY: {api_key[:20] if api_key else 'NOT FOUND'}...")