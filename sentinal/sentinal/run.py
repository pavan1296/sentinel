#!/usr/bin/env python3
"""
SENTINEL — Quick start script
Installs dependencies and launches the server from the correct directory.
"""

import subprocess
import sys
import os
from pathlib import Path

# Always run from the backend directory so relative imports work
BACKEND_DIR = Path(__file__).resolve().parent / "backend"
os.chdir(BACKEND_DIR)

print("=" * 55)
print("  SENTINEL — Global Intelligence Dashboard")
print("=" * 55)
print(f"\n  Backend dir : {BACKEND_DIR}")
print(f"  URL         : http://localhost:8000\n")

# Install dependencies
print("[1/2] Installing Python dependencies...")
subprocess.check_call([
    sys.executable, "-m", "pip", "install",
    "-r", "requirements.txt", "-q"
])

# Start server
print("[2/2] Starting FastAPI server...\n")
subprocess.run([
    sys.executable, "-m", "uvicorn", "main:app",
    "--host", "0.0.0.0",
    "--port", "8000",
    "--reload",
    "--log-level", "info",
])