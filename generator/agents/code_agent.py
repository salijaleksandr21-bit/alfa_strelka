from core.llm_client import call_llm
import json

def generate_code(bt: str, bp: str, features: str, functional_req: str) -> dict:
    prompt = f"""
Ты — senior frontend-разработчик. На основе требований создай работающее веб-приложение (HTML/CSS/JS) с использованием современных стандартов.

Бизнес-требования:
{bt}

Бизнес-процесс:
{bp}

Features:
{features}

Функциональные требования:
{functional_req}

Требования к коду:
- Структура: отдельные файлы index.html, style.css, app.js (или всё в одном, но лучше разделить).
- Код должен быть самодостаточным, без внешних зависимостей (кроме возможно fetch для API — если нужно).
- Добавь комментарии с ID ФТ, которые реализует каждый блок кода.
- UI — адаптивный, современный, тёмная/светлая тема по желанию Features.
- Обрабатывай ошибки (деление на ноль, пустые поля, недоступность API).

Выдай только JSON-объект с ключами — относительными путями к файлам (например, "src/index.html": "...", "src/style.css": "...", "src/app.js": "...") и значениями — содержимым файлов. Никаких пояснений вне JSON.
Пример:
{{"src/index.html": "<!DOCTYPE html>...", "src/style.css": "body {{...}}", "src/app.js": "..."}}
"""
    response = call_llm(prompt, system_prompt="Ты — эксперт по генерации кода.")
    # Парсим JSON
    try:
        return json.loads(response)
    except:
        # fallback: пытаемся найти JSON в ответе
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            raise ValueError("LLM не вернул валидный JSON с кодом")