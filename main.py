import argparse
from time import time
from core.orchestrator import Orchestrator

def main():
    parser = argparse.ArgumentParser(description="Application Generator")
    parser.add_argument("--input", required=True, help="Directory with input files (БТ.md, БП.md, [Features.md])")
    parser.add_argument("--output", default="./output", help="Directory for generated artifacts")
    args = parser.parse_args()
    
    print(f"Starting generation from {args.input} to {args.output}")
    orchestrator = Orchestrator(args.input, args.output)
    start_time = time()
    orchestrator.run()
    ellapsed = time() - start_time
    minutes, seconds = int(ellapsed // 60), int(ellapsed % 60)
    print(f"Ellapsed {minutes:02d}:{seconds:02d}")
    print("Generation finished!")

if __name__ == "__main__":
    main()