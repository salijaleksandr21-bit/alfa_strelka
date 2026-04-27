import argparse
from core.orchestrator import Orchestrator

def main():
    parser = argparse.ArgumentParser(description="Application Generator")
    parser.add_argument("--input", required=True, help="Directory with input files (БТ.md, БП.md, [Features.md])")
    parser.add_argument("--output", default="./output", help="Directory for generated artifacts")
    parser.add_argument("--refine", help="Refinement comment for iterative improvement")
    args = parser.parse_args()
    
    print(f"Starting generation from {args.input} to {args.output}")
    orchestrator = Orchestrator(args.input, args.output, args.refine)
    orchestrator.run()
    print("Generation finished!")

if __name__ == "__main__":
    main()