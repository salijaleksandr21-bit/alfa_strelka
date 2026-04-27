from openai import OpenAI
from config.settings import settings

# Инициализируем клиент один раз
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
)

def call_llm(prompt: str, system_prompt: str = "You are a helpful software architect and developer.") -> str:
    """Вызов DeepSeek V4 Flash (или любой другой модели из settings.DEFAULT_MODEL)"""
    for attempt in range(settings.MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=settings.DEFAULT_MODEL,
                temperature=settings.TEMPERATURE,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ]
            )
            # Логируем расход токенов (полезно для контроля бюджета)
            print(f"[LLM] Used {response.usage.prompt_tokens} prompt + {response.usage.completion_tokens} completion tokens")
            return response.choices[0].message.content
        except Exception as e:
            print(f"Attempt {attempt+1} failed: {e}")
    raise Exception(f"LLM call failed after {settings.MAX_RETRIES} attempts")