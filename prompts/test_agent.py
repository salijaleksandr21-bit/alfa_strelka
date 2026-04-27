from core.llm_client import call_llm
import json

def generate_tests(functional_req: str, code_files: dict) -> dict:
    # Передаём сгенерированный код, чтобы агент знал имена функций/компонентов
    code_snippet = "\n".join([f"{path}:\n{content[:1000]}" for path, content in list(code_files.items())[:2]])

    prompt = f"""
На основе функциональных требований и кода напиши unit-тесты на Jest (JavaScript). 
Тесты должны покрывать каждое ФТ хотя бы одним позитивным сценарием.

Функциональные требования:
{functional_req}

Код приложения (частично):
{code_snippet}

Верни JSON с ключом "tests/app.test.js" и содержимым тестового файла. Используй describe/it, мокируй внешние зависимости.
Пример:
{{"tests/app.test.js": "import {{ add }} from '../src/app.js'; test('adds 1+2 to equal 3', () => {{ expect(add(1,2)).toBe(3); }});"}}
"""
    response = call_llm(prompt, system_prompt="Ты — эксперт по тестированию.")
    try:
        return json.loads(response)
    except:
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            # Дефолтный тест-заглушка
            return {"tests/app.test.js": "// No tests generated"}