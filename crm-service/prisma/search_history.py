import os
import shutil
import sqlite3
import tempfile

def main():
    # Chrome history path
    history_path = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\History')
    if not os.path.exists(history_path):
        print(f"History file not found at: {history_path}")
        return

    # Copy to temp file to avoid locking issues
    temp_dir = tempfile.gettempdir()
    temp_history = os.path.join(temp_dir, 'chrome_history_temp')
    
    try:
        shutil.copy2(history_path, temp_history)
        
        # Connect to DB
        conn = sqlite3.connect(temp_history)
        cursor = conn.cursor()
        
        # Query URLs containing 'onrender.com'
        cursor.execute("SELECT url, title, visit_count, last_visit_time FROM urls WHERE url LIKE '%onrender.com%' ORDER BY last_visit_time DESC LIMIT 100")
        rows = cursor.fetchall()
        
        print(f"--- CHROME HISTORY (onrender.com) ({len(rows)} found) ---")
        for row in rows:
            print(f"URL: {row[0]}")
            print(f"Title: {row[1]}")
            print("---")
            
    except Exception as e:
        print(f"Error reading history: {e}")
    finally:
        if os.path.exists(temp_history):
            os.remove(temp_history)

if __name__ == '__main__':
    main()
