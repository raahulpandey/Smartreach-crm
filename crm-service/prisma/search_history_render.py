import os
import shutil
import sqlite3
import tempfile

def main():
    history_path = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\History')
    if not os.path.exists(history_path):
        print("History file not found")
        return

    temp_dir = tempfile.gettempdir()
    temp_history = os.path.join(temp_dir, 'chrome_history_temp_2')
    
    try:
        shutil.copy2(history_path, temp_history)
        conn = sqlite3.connect(temp_history)
        cursor = conn.cursor()
        
        # Query URLs containing 'render.com'
        cursor.execute("SELECT url, title FROM urls WHERE url LIKE '%render.com%' ORDER BY last_visit_time DESC LIMIT 100")
        rows = cursor.fetchall()
        
        print("--- CHROME HISTORY (render.com) found ---")
        for row in rows:
            url = row[0]
            title = row[1] if row[1] else ""
            try:
                print(f"URL: {url}")
                print(f"Title: {title.encode('ascii', 'ignore').decode('ascii')}")
                print("---")
            except Exception as pe:
                print(f"Error printing row: {pe}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if os.path.exists(temp_history):
            try:
                os.remove(temp_history)
            except:
                pass

if __name__ == '__main__':
    main()
