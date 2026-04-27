import os
from core.file_utils import read_input_files, write_file
from agents.use_case_agent import generate_use_cases
from agents.non_func_agent import generate_nonfunctional
from agents.func_agent import generate_functional
from agents.code_agent import generate_code
from agents.test_agent import generate_tests
from agents.readme_agent import generate_readme

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
        print("Generating use cases...")
        use_cases = generate_use_cases(bt, bp)
        write_file(os.path.join(self.output_dir, 'docs', 'use-cases.md'), use_cases)
        
        # 2. Non-functional requirements
        print("Generating non-functional requirements...")
        nft = generate_nonfunctional(bt, bp, features)
        write_file(os.path.join(self.output_dir, 'docs', 'non-functional-req.md'), nft)
        
        # 3. Functional requirements (с передачей ранее созданных артефактов)
        print("Generating functional requirements...")
        ft = generate_functional(bt, bp, features, use_cases, nft)
        write_file(os.path.join(self.output_dir, 'docs', 'functional-req.md'), ft)
        
        # 4. Code
        print("Generating source code...")
        code_files = generate_code(bt, bp, features, ft)
        for path, content in code_files.items():
            full_path = os.path.join(self.output_dir, path)
            write_file(full_path, content)
        
        # 5. Tests
        print("Generating tests...")
        test_files = generate_tests(ft, code_files)
        for path, content in test_files.items():
            full_path = os.path.join(self.output_dir, path)
            write_file(full_path, content)
        
        # 6. README
        print("Generating README...")
        readme = generate_readme()
        write_file(os.path.join(self.output_dir, 'README.md'), readme)
        
        print("Generator finished successfully.")