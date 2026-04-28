import re
import json


class Validator:
    def __init__(self):
        pass

    @classmethod
    def code(self, response):
        try:
            return json.loads(response)
        except:
            # fallback: пытаемся найти JSON в ответе
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            raise ValueError("LLM не вернул валидный JSON с кодом")

    @classmethod
    def test(self, response):
        try:
            return self.code(response)
        except ValueError:
            return {"tests/app.test.js": "// No tests generated"}
