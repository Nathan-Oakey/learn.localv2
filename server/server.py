from flask import Flask, request, send_from_directory, jsonify, abort, session, redirect
from flask_cors import CORS
import os
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import random

conn = sqlite3.connect("users.db")
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    uploader TEXT NOT NULL,
    upload_time TEXT NOT NULL
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
)



""")

# cur.execute("""
# CREATE TABLE IF NOT EXISTS firstboot (
#     isFirstBoot INTEGER,
#     username TEXT,
#     password TEXT
# )
# """)
# print(cur.execute("select * from firstboot").fetchall())
# if len(cur.execute("select * from firstboot").fetchall()) < 1:
#     passw = str(random.randint(0,1000000))
#     uname = "admin"
#     cur.execute(
#         "INSERT INTO firstboot (isFirstBoot, username, password) VALUES (?, ?, ?)",
#         ("1", uname, passw)
#     )


conn.commit()
conn.close()

app = Flask(__name__, static_folder='./frontend/dist')

UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

def get_db():
    conn = sqlite3.connect("users.db")
    conn.row_factory = sqlite3.Row
    return conn



#app = Flask(__name__)
CORS(
    app,
    supports_credentials=True,
    # origins=["http://localhost:5173"]
)  # Enable CORS for all routes

UPLOAD_FOLDER = "uploads"
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Simple authentication (you can expand this)
VALID_TOKEN = "adfjasdfkjhasdkfjha"
with open("token.txt", "r") as f:

    VALID_TOKEN = f.read()  # Change this in production
    app.secret_key = VALID_TOKEN

def check_auth():
    auth_header = request.headers.get('Authorization')
    return auth_header and auth_header == f"Bearer {VALID_TOKEN}"

# @app.route("/isfirstboot", methods=["GET"])
# def isfirstboot():
#     db = get_db()
#     therow = db.execute("select * from firstboot;").fetchall()
#     if(therow[0] == "1"):
#         return jsonify({"status": "true", "logdets":therow[1:]}), 200
#     else:
#         return jsonify({"status": "false"}), 200

@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        hashed_password = generate_password_hash(password)

        db = get_db()

        try:
            db.execute(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                (username, hashed_password, "user")
            )
            db.commit()
        except:
            return jsonify({"error": "User Already Exists"}), 409

        # return redirect("/login")

    return jsonify({"success" : "true"}), 200

@app.route("/isadmin")
def is_admin():
    if session.get("role") != "admin":
        return jsonify({"status": "false"}), 200
    else:
        return jsonify({"status": "true"}), 200

@app.route("/admin")
def admin_dashboard():

    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    db = get_db()

    users = db.execute(
        "SELECT id, username, role FROM users"
    ).fetchall()

    files = os.listdir(app.config["UPLOAD_FOLDER"])

    return jsonify({"success" : "true", "users": users, "files": files}), 200

@app.route("/promote/<int:user_id>")
def promote_user(user_id):

    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    db = get_db()

    db.execute(
        "UPDATE users SET role='admin' WHERE id=?",
        (user_id,)
    )

    db.commit()

    return jsonify({"success" : "true"}), 200

@app.route("/delete_user/<int:user_id>")
def delete_user(user_id):

    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    db = get_db()

    db.execute(
        "DELETE FROM users WHERE id=?",
        (user_id,)
    )

    db.commit()

    return jsonify({"success" : "true"}), 200

@app.route("/create_user", methods=["POST"])
def create_user():

    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    username = request.form["username"]
    password = generate_password_hash(request.form["password"])
    role = request.form["role"]

    db = get_db()

    db.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        (username, password, role)
    )

    db.commit()

    return jsonify({"success" : "true"}), 200

@app.route("/create_admin", methods=["GET", "POST"])
def create_admin():

    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        hashed_password = generate_password_hash(password)

        db = get_db()

        db.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            (username, hashed_password, "admin")
        )

        db.commit()

        return jsonify({"success" : "true"}), 200

    return jsonify({"error": "idk"}), 500

@app.route("/logout", methods=["GET", "POST"])
def logout():
    session.clear()
    return jsonify({"success" : "true"}), 200

@app.route("/login", methods=["POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        db = get_db()
        user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

        if user and check_password_hash(user["password"], password):
            print(user)
            session["username"] = user["username"]
            session["role"] = user["role"]
            return jsonify({"success" : "true"}), 200
    else:
        return jsonify({"error": "you fucked up"}), 500

    return jsonify({"error": "Username or Password incorrect"}), 500


@app.route("/")
def index():
    # user_agent = request.headers.get('User-Agent', '')
    print("Indexing")
    return jsonify({"success": True}), 200
    # if 'Electron' in user_agent or "axios" in user_agent:
    #     print("This request came from an Electron app")
        
    # else:
    #     print(f"This request came from: {user_agent}")
    #     # Call the serve function with empty path
    #     return serve('')

# @app.route('/', defaults={'path': ''})
# @app.route('/<path:path>')
# def serve(path):
#     print(f"Serving app... Path: {path}")
    
#     # Check if the file exists in the app's root directory
#     if path != "" and os.path.exists(path):
#         # If it's a file in the root directory, serve it from current directory
#         return send_from_directory('.', path)
#     else:
#         # Otherwise serve index.html from the root directory
#         return send_from_directory('../frontend/dist/', 'index.html')


@app.route("/files", methods=["GET"])
def list_files():
    """List all files in the upload folder"""
    try:
        db = get_db()
        files = os.listdir(app.config["UPLOAD_FOLDER"])
        # Get file details
        file_details = []
        for filename in files:
            file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            if os.path.isfile(file_path):  # Only include files, not directories
                # Check uploader from DB
                file_row = db.execute("Select uploader, upload_time FROM files WHERE filename = ?", (filename,)).fetchone()

                # Skip file if not uploaded by admin and user is not admin
                if file_row and file_row["uploader"] == session.get("username"):
                    i = 1
                elif session.get("role") != "admin" and file_row and file_row["uploader"] != "admin":
                    continue

                stat = os.stat(file_path)
                file_details.append({
                    "name": filename,
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                    "url": f"/files/{filename}"
                })
        return jsonify(file_details)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/files", methods=["POST"])
def upload_file():
    """Upload a file"""
    # Optional: Add authentication
    # if not check_auth():
    #     return jsonify({"error": "Unauthorized"}), 401
    # if not session.get("role"): # only logged-in users
    #     return jsonify({"error": "Unauthorized"}), 403

    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Save the file
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename) # type: ignore
        file.save(file_path)
        
        # Record uploader in DB
        uploader = session.get("username")
        if session.get("role") == "admin":
            uploader = "admin"
        print(uploader)
        db = get_db()
        db.execute(
            "INSERT INTO files (filename, uploader, upload_time) VALUES (?, ?, ?)",
            (file.filename, uploader, str(int(os.stat(file_path).st_mtime)))
        )
        db.commit()

        return jsonify({
            "message": f"Uploaded {file.filename}",
            "filename": file.filename,
            "size": os.path.getsize(file_path)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route("/files/<filename>", methods=["GET"])
def get_file(filename):
    """Download a specific file"""
    db = get_db()
    file_row = db.execute(
        "SELECT uploader FROM files WHERE filename = ?", 
        (filename,)
    ).fetchone()

    if not file_row:
        return jsonify({"error": "File not found"}), 404
    
    try:
        return send_from_directory(
            app.config["UPLOAD_FOLDER"], 
            filename, 
            as_attachment=False  # Set to True to force download
        )
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route("/files/<filename>", methods=["DELETE"])
def delete_file(filename):
    """Delete a specific file"""
    # Optional: Add authentication
    # if not check_auth():
    #     return jsonify({"error": "Unauthorized"}), 401
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": f"Deleted {filename}"})
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    # finally:
    #     db.close()

def get_local_ip():
    """Get the local network IP address"""
    try:
        # Create a socket connection to an external server (doesn't actually connect)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"  # Fallback to localhost

@app.route('/get-ip')
def get_ip():
    ip_address = get_local_ip()
    return jsonify({
        'local_ip': ip_address,
        'port': 5001,  # or get from app.config
        'url': f'http://{ip_address}:5001'
    })


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "uploads_dir": os.path.exists(UPLOAD_FOLDER)})

if __name__ == "__main__":
    print(f"🚀 File server starting...")
    print(f"📁 Uploads directory: {os.path.abspath(UPLOAD_FOLDER)}")
    print(f"🌎 Server running at: http://localhost:5001")
    print(f"\nEndpoints:")
    print(f"  GET    /files        - List all files")
    print(f"  POST   /files        - Upload a file")
    print(f"  GET    /files/name   - Download a file")
    print(f"  DELETE /files/name   - Delete a file")
    print(f"  GET    /health       - Health check")
    app.run(host="0.0.0.0", port=5001, debug=True)
