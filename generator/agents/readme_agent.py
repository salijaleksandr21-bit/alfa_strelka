from core.llm_client import call_llm

def generate_readme(stack: str = "HTML/CSS/JS", run_command: str = "Открой index.html в браузере", test_command: str = "npm test") -> str:
    prompt = f"""
Создай README.md для сгенерированного веб-приложения. Включи:
- Название приложения (придумай)
- Описание функциональности
- Требования (современный браузер)
- Инструкцию по запуску: {run_command}
- Инструкцию по запуску тестов: {test_command}
- Примечания (если есть API-ключи, укажи как настроить)

Формат — стандартный Markdown.
"""
    return call_llm(prompt, system_prompt="Ты — технический писатель.")