#!/usr/bin/env python3
"""
Script to view logs in a readable format
"""
import json
import sys
from datetime import datetime, date
from pathlib import Path

def format_log_entry(entry):
    """Format a log entry for display"""
    timestamp = entry.get("timestamp", "unknown")
    level = entry.get("level", "ℹ️")
    action = entry.get("action", "🔧")
    message = entry.get("message", "No message")
    endpoint = entry.get("endpoint", "")
    user_id = entry.get("user_id", "")
    
    # Format timestamp
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        formatted_time = dt.strftime("%H:%M:%S")
    except:
        formatted_time = timestamp
    
    # Format user info
    user_info = f" [User: {user_id}]" if user_id else ""
    endpoint_info = f" [{endpoint}]" if endpoint else ""
    
    return f"{formatted_time} {level} {action} {message}{user_info}{endpoint_info}"

def view_logs(date_str=None, log_type="app", tail=50):
    """View logs for a specific date"""
    if not date_str:
        date_str = date.today().strftime("%Y-%m-%d")
    
    logs_dir = Path("logs")
    log_file = logs_dir / f"{log_type}_{date_str}.log"
    
    if not log_file.exists():
        print(f"❌ No log file found: {log_file}")
        return
    
    print(f"📊 Viewing logs for {date_str}")
    print(f"📁 File: {log_file}")
    print("=" * 80)
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Show last N lines
        if tail:
            lines = lines[-tail:]
        
        for line in lines:
            try:
                entry = json.loads(line.strip())
                formatted = format_log_entry(entry)
                print(formatted)
            except json.JSONDecodeError:
                print(f"⚠️  Invalid JSON: {line.strip()}")
                
    except Exception as e:
        print(f"❌ Error reading log file: {e}")

def show_log_stats(date_str=None, log_type="app"):
    """Show statistics for a log file"""
    if not date_str:
        date_str = date.today().strftime("%Y-%m-%d")
    
    logs_dir = Path("logs")
    log_file = logs_dir / f"{log_type}_{date_str}.log"
    
    if not log_file.exists():
        print(f"❌ No log file found: {log_file}")
        return
    
    stats = {
        "total_entries": 0,
        "by_level": {},
        "by_action": {},
        "by_endpoint": {},
        "api_requests": 0,
        "database_operations": 0,
        "cache_operations": 0,
        "errors": 0
    }
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    stats["total_entries"] += 1
                    
                    # Count by level
                    level = entry.get("level", "unknown")
                    stats["by_level"][level] = stats["by_level"].get(level, 0) + 1
                    
                    # Count by action
                    action = entry.get("action", "unknown")
                    stats["by_action"][action] = stats["by_action"].get(action, 0) + 1
                    
                    # Count by endpoint
                    endpoint = entry.get("endpoint", "unknown")
                    if endpoint != "unknown":
                        stats["by_endpoint"][endpoint] = stats["by_endpoint"].get(endpoint, 0) + 1
                    
                    # Track specific operations
                    message = entry.get("message", "")
                    if "API Request" in message:
                        stats["api_requests"] += 1
                    elif "Database" in message:
                        stats["database_operations"] += 1
                    elif "Cache" in message:
                        stats["cache_operations"] += 1
                    elif level == "❌":
                        stats["errors"] += 1
                        
                except json.JSONDecodeError:
                    continue
        
        print(f"📊 Log Statistics for {date_str}")
        print(f"📁 File: {log_file}")
        print("=" * 50)
        print(f"📈 Total Entries: {stats['total_entries']}")
        print(f"🌐 API Requests: {stats['api_requests']}")
        print(f"🗄️  Database Operations: {stats['database_operations']}")
        print(f"💾 Cache Operations: {stats['cache_operations']}")
        print(f"❌ Errors: {stats['errors']}")
        print("\n📊 By Level:")
        for level, count in stats['by_level'].items():
            print(f"  {level}: {count}")
        print("\n🔧 By Action:")
        for action, count in stats['by_action'].items():
            print(f"  {action}: {count}")
        print("\n🌐 By Endpoint:")
        for endpoint, count in stats['by_endpoint'].items():
            print(f"  {endpoint}: {count}")
            
    except Exception as e:
        print(f"❌ Error reading log file: {e}")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python view_logs.py view [date] [type] [tail]")
        print("  python view_logs.py stats [date] [type]")
        print("\nExamples:")
        print("  python view_logs.py view")
        print("  python view_logs.py view 2025-10-23")
        print("  python view_logs.py view 2025-10-23 app 100")
        print("  python view_logs.py stats")
        return
    
    command = sys.argv[1]
    
    if command == "view":
        date_str = sys.argv[2] if len(sys.argv) > 2 else None
        log_type = sys.argv[3] if len(sys.argv) > 3 else "app"
        tail = int(sys.argv[4]) if len(sys.argv) > 4 else 50
        view_logs(date_str, log_type, tail)
        
    elif command == "stats":
        date_str = sys.argv[2] if len(sys.argv) > 2 else None
        log_type = sys.argv[3] if len(sys.argv) > 3 else "app"
        show_log_stats(date_str, log_type)
        
    else:
        print(f"❌ Unknown command: {command}")

if __name__ == "__main__":
    main()
