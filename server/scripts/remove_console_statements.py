#!/usr/bin/env python3
"""Script to remove all console statements from frontend files"""
import re
import os
from pathlib import Path

def remove_console_statements(file_path):
    """Remove console.log, console.error, console.warn, console.info, console.debug statements"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remove console.log statements (single line)
        content = re.sub(r'\s*console\.log\([^)]*\);\s*\n?', '', content)
        
        # Remove console.error statements (single line)
        content = re.sub(r'\s*console\.error\([^)]*\);\s*\n?', '', content)
        
        # Remove console.warn statements (single line)
        content = re.sub(r'\s*console\.warn\([^)]*\);\s*\n?', '', content)
        
        # Remove console.info statements (single line)
        content = re.sub(r'\s*console\.info\([^)]*\);\s*\n?', '', content)
        
        # Remove console.debug statements (single line)
        content = re.sub(r'\s*console\.debug\([^)]*\);\s*\n?', '', content)
        
        # Remove multi-line console statements (more complex pattern)
        # Pattern for console.X( ... ) where ... can span multiple lines
        content = re.sub(
            r'\s*console\.(log|error|warn|info|debug)\([^)]*(?:\([^)]*\)[^)]*)*\);\s*\n?',
            '',
            content,
            flags=re.MULTILINE | re.DOTALL
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to process all TypeScript/TSX files"""
    client_dir = Path(__file__).parent.parent.parent / "client" / "src"
    
    if not client_dir.exists():
        print(f"Client directory not found: {client_dir}")
        return
    
    # Find all .tsx and .ts files
    files = list(client_dir.rglob("*.tsx")) + list(client_dir.rglob("*.ts"))
    
    modified_count = 0
    for file_path in files:
        if remove_console_statements(file_path):
            modified_count += 1
            print(f"✅ Removed console statements from: {file_path.relative_to(client_dir.parent.parent)}")
    
    print(f"\n✅ Processed {len(files)} files, modified {modified_count} files")

if __name__ == "__main__":
    main()

