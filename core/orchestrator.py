import os
from shutil import rmtree
from config.settings import settings
from core.validator import Validator
from core.file_utils import read_input_files, write_file
from core.llm_client import call_llm


class Orchestrator:
    def __init__(self, input_dir: str, output_dir: str, refine_comment: str = None):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.refine_comment = refine_comment

    def run(self):
        print(f"Running generator with input={self.input_dir}, output={self.output_dir}")
        
        inputs = read_input_files(self.input_dir)
        bt = inputs['bt']
        bp = inputs['bp']
        features = inputs['features']
        
        os.makedirs(os.path.join(self.output_dir, 'docs'), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, 'src'), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, 'tests'), exist_ok=True)
        
        # 1. Use cases
        print("1 / 7 | Generating use cases...")
        use_cases = call_llm(f"{bt}\n{bp}", "use_cases.txt")
        write_file(os.path.join(self.output_dir, 'docs', 'use-cases.md'), use_cases)
        
        # 2. Non-functional requirements
        print("2 / 7 | Generating non-functional requirements...")
        nft = call_llm(f"{bt}\n{bp}", "non_func.txt")
        write_file(os.path.join(self.output_dir, 'docs', 'non-functional-req.md'), nft)
        
        # 3. Functional requirements (с передачей ранее созданных артефактов)
        print("3 / 7 | Generating functional requirements...")
        ft = call_llm(f"{bt}\n{bp}\n{features}\n{use_cases}", "func.txt")
        write_file(os.path.join(self.output_dir, 'docs', 'functional-req.md'), ft)
        
        # 4. Code
        print("4 / 7 | Generating source code...")
        code_files = Validator.code(call_llm(f"{bp}\n{features}\n{ft}", "code.txt"))
        for path, content in code_files.items():
            full_path = os.path.join(self.output_dir, path)
            write_file(full_path, content)

        # 5. Tests
        print("5 / 7 | Generating tests...")
        test_files = Validator.test(call_llm(f"{ft}\n{code_files}", "test.txt"))
        for path, content in test_files.items():
            full_path = os.path.join(self.output_dir, path)
            write_file(full_path, content)

        # 6. README
        print("6 / 7 | Generating README...")
        readme = call_llm(f"{ft}\n{nft}\n{code_files}", "readme.txt")
        write_file(os.path.join(self.output_dir, 'README.md'), readme)

        artifacts = {
            "bt": bt,
            "bp": bp,
            "features": features,
            "use_cases": use_cases,
            "non_func": nft,
            "func": ft,
            "code": code_files,
            "test": test_files
        }
        # 7. Expert
        print(f"7 / 7 | Testing by {settings.EXPERT_LEVEL} Expert...")
        for iteration in range(settings.MAX_RETRIES):
            print(f"🔄 Iteration {iteration+1}: running tests...")
            expert = Validator.expert(call_llm(str(artifacts), f"{settings.EXPERT_LEVEL}_expert.txt"))
            if expert["approved"]:
                print("✅ All tests passed!")
                break
            else:
                print(f"❌ Tests failed:\n{expert["feedback"][:350]}")
                if iteration == settings.MAX_RETRIES - 1:
                    print("⚠️ Max iterations reached, keeping last code version.")
                    break
                print("🔁 Regenerating code with test failures as feedback...")
                new_content = call_llm(
                    prompt=f"{bt}\n{bp}\n{features}\n{ft}\n\n"
                           f"Код:\n{code_files}\n\n"
                           f"Предоставь новое решение, учитывая новые замечания:\n{expert['feedback']}\n\n",
                    system_prompt_filename=f"{expert['target_agent']}.txt"
                )
                match expert['target_agent']:
                    case "use_cases":
                        write_file(os.path.join(self.output_dir, 'docs', 'use-cases.md'), new_content)
                    case "non_func" | "func":
                        write_file(os.path.join(self.output_dir, 'docs', f'{expert["target_agent"]}tional-req.md'.replace("_", "-")), new_content)
                    case "code":
                        rmtree(os.path.join(self.output_dir, 'src'))
                        os.makedirs(os.path.join(self.output_dir, 'src'), exist_ok=True)
                        code_files = Validator.code(new_content)
                        for path, content in code_files.items():
                            full_path = os.path.join(self.output_dir, path)
                            write_file(full_path, content)
                    case "test":
                        rmtree(os.path.join(self.output_dir, 'tests'))
                        os.makedirs(os.path.join(self.output_dir, 'tests'), exist_ok=True)
                        code_files = Validator.code(new_content)
                        for path, content in code_files.items():
                            full_path = os.path.join(self.output_dir, path)
                            write_file(full_path, content)
                    
                artifacts[expert["target_agent"]] = new_content
