import sqlite3

def migrate():
    conn = sqlite3.connect("hqms_local.db")
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(hospitals)")
    columns = [col[1] for col in cursor.fetchall()]
    print("Existing hospitals columns:", columns)

    migrations = [
        ("logo_url", "VARCHAR(500)"),
        ("primary_color", "VARCHAR(20) DEFAULT '#0d9488'"),
        ("accent_color", "VARCHAR(20) DEFAULT '#14b8a6'"),
        ("tagline", "VARCHAR(255)"),
    ]

    for col_name, col_type in migrations:
        if col_name not in columns:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE hospitals ADD COLUMN {col_name} {col_type}")
    
    conn.commit()
    conn.close()
    print("SQLite columns successfully updated!")

if __name__ == "__main__":
    migrate()
