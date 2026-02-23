import platform
import sys
import os
from datetime import datetime

def main():
    print("--- System Information ---")
    print(f"OS: {platform.system()} {platform.release()}")
    print(f"Python Version: {sys.version.split()[0]}")
    print(f"Current Directory: {os.getcwd()}")
    print(f"Time: {datetime.now().isoformat()}")
    print("--------------------------")

if __name__ == "__main__":
    main()
