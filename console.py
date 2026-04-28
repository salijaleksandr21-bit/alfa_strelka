import argparse
from time import time
from config.settings import settings
from core.orchestrator import Orchestrator

def main():
    parser = argparse.ArgumentParser(description="Application Generator")
    parser.add_argument("--input", required=True, help="Directory with input files (БТ.md, БП.md, [Features.md])")
    parser.add_argument("--output", default="./output", help="Directory for generated artifacts")
    args = parser.parse_args()
    
    if not settings.OPENROUTER_API_KEY:
        print("❌ Set the value of the OPENROUTER_API_KEY field in the .env file.")
        quit()

    print("⚙ Settings")
    print(f"Model: {settings.DEFAULT_MODEL}")
    print(f"Temperature: {settings.TEMPERATURE}")
    print(f"Expert level: {settings.EXPERT_LEVEL} (lite/default/strict)")
    print(f"Max retries: {settings.MAX_RETRIES}")
    print("\nTo change the values, go to the .env file.\n")

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