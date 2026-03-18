#!/usr/bin/env python3
"""SENTINEL — Quick start script"""
import subprocess, sys, os

os.chdir(os.path.dirname(os.path.abspath(__file__)) + '/backend')

subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt', '-q'])

subprocess.run([
    sys.executable, '-m', 'uvicorn', 'main:app',
    '--host', '0.0.0.0',
    '--port', '8000',
    '--reload',
    '--log-level', 'info',
])
