#!/usr/bin/env python3
"""
Setup script for Inkingi Smart School API
This script helps set up the environment and run the application
"""

import os
import subprocess
import sys

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return False

def main():
    print("🚀 Setting up Inkingi Smart School API...")
    
    # Check if Python is available
    if not run_command("python3 --version", "Checking Python version"):
        print("❌ Python 3 is required but not found!")
        sys.exit(1)
    
    # Install dependencies
    if not run_command("pip3 install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Failed to install dependencies!")
        sys.exit(1)
    
    # Start Docker services
    if not run_command("docker-compose up -d", "Starting PostgreSQL and Redis services"):
        print("❌ Failed to start Docker services!")
        print("Make sure Docker and Docker Compose are installed and running.")
        sys.exit(1)
    
    print("\n⏳ Waiting for services to be ready...")
    import time
    time.sleep(10)  # Wait for services to start
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Run the application: python3 main.py")
    print("2. Visit http://localhost:8000 for the API")
    print("3. Visit http://localhost:8000/docs for API documentation")
    print("4. Test the health endpoint: http://localhost:8000/health")

if __name__ == "__main__":
    main()
