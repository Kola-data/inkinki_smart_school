#!/usr/bin/env python3
"""
Startup script to run both FastAPI server and Celery worker with logging
"""
import subprocess
import sys
import os
import signal
import time
from pathlib import Path

def start_celery_worker():
    """Start Celery worker in background"""
    try:
        # Start Celery worker
        celery_process = subprocess.Popen([
            sys.executable, "-m", "celery", "-A", "celery_app", "worker", 
            "--loglevel=info", "--concurrency=2"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print("🌱 Celery worker started with PID:", celery_process.pid)
        return celery_process
    except Exception as e:
        print(f"❌ Failed to start Celery worker: {e}")
        return None

def start_fastapi_server():
    """Start FastAPI server"""
    try:
        # Start FastAPI server
        server_process = subprocess.Popen([
            sys.executable, "main.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print("🚀 FastAPI server started with PID:", server_process.pid)
        return server_process
    except Exception as e:
        print(f"❌ Failed to start FastAPI server: {e}")
        return None

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    print("\n🛑 Shutting down services...")
    sys.exit(0)

def main():
    """Main function to start all services"""
    print("🎯 Starting Inkinki Smart School API with Logging System")
    print("=" * 60)
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Change to server directory
    server_dir = Path(__file__).parent
    os.chdir(server_dir)
    
    # Start Celery worker
    print("📋 Starting Celery worker...")
    celery_process = start_celery_worker()
    if not celery_process:
        print("❌ Failed to start Celery worker. Exiting.")
        sys.exit(1)
    
    # Wait a moment for Celery to start
    time.sleep(3)
    
    # Start FastAPI server
    print("🌐 Starting FastAPI server...")
    server_process = start_fastapi_server()
    if not server_process:
        print("❌ Failed to start FastAPI server. Exiting.")
        if celery_process:
            celery_process.terminate()
        sys.exit(1)
    
    print("\n✅ All services started successfully!")
    print("📊 API Documentation: http://localhost:8000/docs")
    print("📈 Logs directory: ./logs/")
    print("🔄 Celery worker: Running in background")
    print("\nPress Ctrl+C to stop all services")
    print("=" * 60)
    
    try:
        # Wait for processes
        while True:
            # Check if processes are still running
            if celery_process.poll() is not None:
                print("❌ Celery worker stopped unexpectedly")
                break
            if server_process.poll() is not None:
                print("❌ FastAPI server stopped unexpectedly")
                break
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Received interrupt signal")
    
    finally:
        # Cleanup
        print("🧹 Cleaning up processes...")
        if celery_process:
            celery_process.terminate()
            celery_process.wait()
        if server_process:
            server_process.terminate()
            server_process.wait()
        print("✅ All services stopped")

if __name__ == "__main__":
    main()
