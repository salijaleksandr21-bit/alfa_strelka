import os
from pathlib import Path


def read_file(file_path: str) -> str:
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

def write_file(file_path: str, content: str):
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content)

def read_input_files(input_dir: str):
    bt = read_file(os.path.join(input_dir, 'БТ.md'))
    bp = read_file(os.path.join(input_dir, 'БП.md'))
    features = ''
    try:
        features = read_file(os.path.join(input_dir, 'Features.md'))
    except FileNotFoundError:
        print("Features not found, continue...")
    return {'bt': bt, 'bp': bp, 'features': features}
