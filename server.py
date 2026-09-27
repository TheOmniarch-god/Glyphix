#!/usr/bin/env python3
"""Dedicated HTTP & API Server for Reverend Insanity Community Lab.

Serves the identical site with:
- Clean URL routing (.html fallback)
- Real persistent JSON database storage (data/users.json, data/reviews.json, data/codes.json)
- Webnovel Email Verification OTP flow
- Webnovel Google OAuth simulation
- Live reviews, dynamic ratings aggregation, and upvotes

Listens on port 3001.
"""
import http.server
import json
import mimetypes
import os
import random
import re
import socketserver
import sys
import time
import hashlib
import uuid

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
CODES_FILE = os.path.join(DATA_DIR, "codes.json")
REVIEWS_FILE = os.path.join(DATA_DIR, "reviews.json")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")
PORT = 3001

os.makedirs(DATA_DIR, exist_ok=True)


def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()


def read_json(path, default):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return default


def write_json(path, data):
    try:
        temp_path = path + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp_path, path)
    except Exception as e:
        sys.stderr.write(f"Error writing {path}: {e}\n")


def calculate_summary(reviews):
    if not reviews:
        return {
            "avg": 5.0,
            "count": 0,
            "categories": {
                "story": 5.0,
                "characters": 5.0,
                "world": 5.0,
                "translation": 5.0,
            },
        }
    total_rating = sum(r.get("rating", 5.0) for r in reviews)
    count = len(reviews)
    avg_rating = round(total_rating / max(1, count), 1)

    cats = {"story": 0.0, "characters": 0.0, "world": 0.0, "translation": 0.0}
    cat_counts = {"story": 0, "characters": 0, "world": 0, "translation": 0}

    for r in reviews:
        rcats = r.get("categories", {})
        for k in cats.keys():
            if k in rcats:
                cats[k] += float(rcats[k])
                cat_counts[k] += 1

    cat_summary = {}
    for k, s in cats.items():
        c = cat_counts[k]
        cat_summary[k] = round(s / max(1, c), 1) if c > 0 else 5.0

    return {
        "avg": avg_rating,
        "count": count,
        "categories": cat_summary,
    }


class LabRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and no-cache for APIs
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def parse_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw = self.wfile.read(content_length) if hasattr(self.rfile, "read") else b""
                # Actually read from rfile
                return json.loads(self.rfile.read(content_length).decode("utf-8"))
        except Exception:
            pass
        return {}

    def get_auth_user(self):
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:].strip()
            sessions = read_json(SESSIONS_FILE, {})
            user_id = sessions.get(token)
            if user_id:
                users = read_json(USERS_FILE, [])
                for u in users:
                    if u.get("id") == user_id:
                        return u
        return None

    def translate_path(self, path):
        clean = path.split('?', 1)[0].split('#', 1)[0]
        local = os.path.join(BASE_DIR, clean.lstrip('/'))
        if clean.endswith('/'):
            if os.path.isdir(local):
                return os.path.join(local, 'index.html')
            return local
        if not os.path.splitext(local)[1] and os.path.exists(local + '.html'):
            return local + '.html'
        if os.path.isdir(local):
            return os.path.join(local, 'index.html')
        return super().translate_path(path)

    def do_GET(self):
        # Handle API routes
        if self.path == "/api/status":
            users = read_json(USERS_FILE, [])
            reviews = read_json(REVIEWS_FILE, [])
            self.send_json({
                "ok": True,
                "environment": "Reverend Insanity Community Lab",
                "storage": "Persistent JSON Storage Active",
                "users_count": len(users),
                "reviews_count": len(reviews),
                "time": time.time()
            })
            return

        if self.path == "/api/reviews":
            reviews = read_json(REVIEWS_FILE, [])
            summary = calculate_summary(reviews)
            self.send_json({"ok": True, "reviews": reviews, "summary": summary})
            return

        if self.path == "/api/auth/me":
            user = self.get_auth_user()
            if user:
                safe_user = {k: v for k, v in user.items() if k != "password_hash"}
                self.send_json({"ok": True, "user": safe_user})
            else:
                self.send_json({"ok": False, "error": "Not authenticated"}, status=401)
            return

        # Clean URL rewrite support: e.g. /chapter-1 -> /chapter-1.html, /about -> /about.html
        path = self.path.split("?")[0].rstrip("/")
        if not path:
            self.path = "/index.html"
        else:
            local_path = os.path.join(BASE_DIR, path.lstrip("/"))
            if not os.path.exists(local_path):
                if os.path.exists(local_path + ".html"):
                    self.path = path + ".html"
                elif os.path.exists(os.path.join(local_path, "index.html")):
                    self.path = path + "/index.html"

        super().do_GET()

    def do_POST(self):
        # API Routes
        body = {}
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw = self.rfile.read(content_length).decode("utf-8")
                body = json.loads(raw)
        except Exception as e:
            sys.stderr.write(f"Parse error: {e}\n")

        # 1. SEND VERIFICATION CODE (Sign-up step 1)
        if self.path == "/api/auth/register-send-code":
            email = body.get("email", "").strip().lower()
            name = body.get("name", "").strip()
            password = body.get("password", "").strip()

            if not email or "@" not in email:
                self.send_json({"ok": False, "error": "Valid email address required."}, status=400)
                return
            if not name:
                self.send_json({"ok": False, "error": "Reader handle/nickname is required."}, status=400)
                return
            if len(password) < 6:
                self.send_json({"ok": False, "error": "Password must be at least 6 characters."}, status=400)
                return

            # Check if user already exists
            users = read_json(USERS_FILE, [])
            for u in users:
                if u.get("email") == email and u.get("emailVerified"):
                    self.send_json({"ok": False, "error": "An account with this email already exists. Please Sign In."}, status=400)
                    return

            # Generate 6-digit OTP code
            code = f"{random.randint(100000, 999999):06d}"
            expires = time.time() + 900  # 15 minutes

            codes = read_json(CODES_FILE, {})
            codes[email] = {
                "code": code,
                "name": name,
                "password_hash": hash_pw(password),
                "expires": expires,
                "created": time.time()
            }
            write_json(CODES_FILE, codes)

            # In staging/test lab, return code in response and print to log
            print(f"📧 [TEST DISPATCH] Verification code for {email}: {code}", flush=True)
            self.send_json({
                "ok": True,
                "message": f"Verification code dispatched to {email}.",
                "email": email,
                "code_hint": code  # Clear display for test lab
            })
            return

        # 2. VERIFY CODE & CREATE USER (Sign-up step 2)
        if self.path == "/api/auth/verify-code":
            email = body.get("email", "").strip().lower()
            submitted_code = body.get("code", "").strip()

            codes = read_json(CODES_FILE, {})
            record = codes.get(email)

            if not record:
                self.send_json({"ok": False, "error": "No pending verification found for this email. Please request a new code."}, status=400)
                return

            if time.time() > record.get("expires", 0):
                self.send_json({"ok": False, "error": "Verification code has expired. Please request a new one."}, status=400)
                return

            if str(record.get("code")) != str(submitted_code):
                self.send_json({"ok": False, "error": "Invalid verification code. Please check and try again."}, status=400)
                return

            # Code matches! Register user persistently in users.json
            users = read_json(USERS_FILE, [])
            user_id = f"usr_{uuid.uuid4().hex[:8]}"
            user = {
                "id": user_id,
                "name": record.get("name"),
                "email": email,
                "password_hash": record.get("password_hash"),
                "provider": "email",
                "emailVerified": True,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "avatarBg": random.choice(["#b8860b", "#4a7a96", "#7c5295", "#8c6239", "#2e7d32", "#c0392b"])
            }
            # Remove any older unverified records for this email
            users = [u for u in users if u.get("email") != email]
            users.append(user)
            write_json(USERS_FILE, users)

            # Consume code
            del codes[email]
            write_json(CODES_FILE, codes)

            # Create persistent session
            token = f"tok_{uuid.uuid4().hex}"
            sessions = read_json(SESSIONS_FILE, {})
            sessions[token] = user_id
            write_json(SESSIONS_FILE, sessions)

            safe_user = {k: v for k, v in user.items() if k != "password_hash"}
            self.send_json({
                "ok": True,
                "message": "Email verified successfully! You are now logged in.",
                "user": safe_user,
                "token": token
            })
            return

        # 3. RESEND CODE
        if self.path == "/api/auth/resend-code":
            email = body.get("email", "").strip().lower()
            codes = read_json(CODES_FILE, {})
            record = codes.get(email)
            if not record:
                self.send_json({"ok": False, "error": "No pending registration found."}, status=400)
                return

            code = f"{random.randint(100000, 999999):06d}"
            record["code"] = code
            record["expires"] = time.time() + 900
            codes[email] = record
            write_json(CODES_FILE, codes)

            print(f"📧 [TEST DISPATCH RESEND] Verification code for {email}: {code}", flush=True)
            self.send_json({
                "ok": True,
                "message": f"Fresh verification code dispatched to {email}.",
                "email": email,
                "code_hint": code
            })
            return

        # 4. EMAIL SIGN IN
        if self.path == "/api/auth/login":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "").strip()

            users = read_json(USERS_FILE, [])
            user = None
            for u in users:
                if u.get("email") == email:
                    user = u
                    break

            if not user:
                self.send_json({"ok": False, "error": "No account found with this email. Please create an account."}, status=400)
                return

            if user.get("provider") == "google" and not user.get("password_hash"):
                self.send_json({"ok": False, "error": "This account was registered via Google. Please use 'Continue with Google'."}, status=400)
                return

            if user.get("password_hash") != hash_pw(password):
                self.send_json({"ok": False, "error": "Incorrect password. Please try again."}, status=400)
                return

            if not user.get("emailVerified", False):
                self.send_json({"ok": False, "error": "Email has not been verified yet."}, status=403)
                return

            # Create persistent session
            token = f"tok_{uuid.uuid4().hex}"
            sessions = read_json(SESSIONS_FILE, {})
            sessions[token] = user["id"]
            write_json(SESSIONS_FILE, sessions)

            safe_user = {k: v for k, v in user.items() if k != "password_hash"}
            self.send_json({
                "ok": True,
                "message": "Signed in successfully.",
                "user": safe_user,
                "token": token
            })
            return

        # 5. GOOGLE AUTH FAST-PASS
        if self.path == "/api/auth/google":
            email = body.get("email", "").strip().lower() or "cultivator@gmail.com"
            name = body.get("name", "").strip() or "Cultivator FY"
            avatar = body.get("avatar", "")

            users = read_json(USERS_FILE, [])
            user = None
            for u in users:
                if u.get("email") == email:
                    user = u
                    break

            if not user:
                user_id = f"usr_{uuid.uuid4().hex[:8]}"
                user = {
                    "id": user_id,
                    "name": name,
                    "email": email,
                    "provider": "google",
                    "emailVerified": True,
                    "avatar": avatar,
                    "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "avatarBg": "#4285F4"
                }
                users.append(user)
                write_json(USERS_FILE, users)

            # Create persistent session
            token = f"tok_{uuid.uuid4().hex}"
            sessions = read_json(SESSIONS_FILE, {})
            sessions[token] = user["id"]
            write_json(SESSIONS_FILE, sessions)

            safe_user = {k: v for k, v in user.items() if k != "password_hash"}
            self.send_json({
                "ok": True,
                "message": "Signed in with Google.",
                "user": safe_user,
                "token": token
            })
            return

        # 6. LOGOUT
        if self.path == "/api/auth/logout":
            auth = self.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                token = auth[7:].strip()
                sessions = read_json(SESSIONS_FILE, {})
                if token in sessions:
                    del sessions[token]
                    write_json(SESSIONS_FILE, sessions)
            self.send_json({"ok": True})
            return

        # 7. SUBMIT REVIEW
        if self.path == "/api/reviews":
            user = self.get_auth_user()
            # If not authorized via header, check body fallback
            user_name = body.get("userName") or (user.get("name") if user else "Anonymous Reader")
            user_email = body.get("userEmail") or (user.get("email") if user else "reader@community.lab")
            user_id = (user.get("id") if user else f"usr_guest_{uuid.uuid4().hex[:6]}")
            is_verified = (user.get("emailVerified", True) if user else True)

            rating = float(body.get("rating", 5.0))
            cats = body.get("categories", {
                "story": 5.0,
                "characters": 5.0,
                "world": 5.0,
                "translation": 5.0
            })
            title = body.get("title", "").strip() or "A Remarkable Cultivation Epic"
            review_text = body.get("body", "").strip()
            chapter = body.get("chapter", "").strip() or "Chapter 1"
            spoiler = bool(body.get("spoiler", False))

            if not review_text or len(review_text) < 10:
                self.send_json({"ok": False, "error": "Please write at least 10 characters for your review."}, status=400)
                return

            reviews = read_json(REVIEWS_FILE, [])
            new_rev = {
                "id": f"rev_{uuid.uuid4().hex[:8]}",
                "userId": user_id,
                "userName": user_name,
                "userAvatar": (user_name[0].upper() if user_name else "R"),
                "userEmail": user_email,
                "userProvider": (user.get("provider", "email") if user else "email"),
                "verified": is_verified,
                "rating": rating,
                "categories": {
                    "story": float(cats.get("story", 5.0)),
                    "characters": float(cats.get("characters", 5.0)),
                    "world": float(cats.get("world", 5.0)),
                    "translation": float(cats.get("translation", 5.0)),
                },
                "title": title,
                "body": review_text,
                "chapter": chapter,
                "spoiler": spoiler,
                "likes": 0,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

            reviews.insert(0, new_rev)
            write_json(REVIEWS_FILE, reviews)
            summary = calculate_summary(reviews)

            self.send_json({
                "ok": True,
                "message": "Review published successfully!",
                "review": new_rev,
                "summary": summary
            })
            return

        # 8. UPVOTE / LIKE REVIEW
        if self.path == "/api/reviews/vote":
            rev_id = body.get("reviewId")
            reviews = read_json(REVIEWS_FILE, [])
            updated_likes = 0
            for r in reviews:
                if r.get("id") == rev_id:
                    r["likes"] = int(r.get("likes", 0)) + 1
                    updated_likes = r["likes"]
                    break
            write_json(REVIEWS_FILE, reviews)
            self.send_json({"ok": True, "likes": updated_likes})
            return

        # 9. DELETE REVIEW
        if self.path == "/api/reviews/delete":
            rev_id = body.get("reviewId")
            reviews = read_json(REVIEWS_FILE, [])
            reviews = [r for r in reviews if r.get("id") != rev_id]
            write_json(REVIEWS_FILE, reviews)
            summary = calculate_summary(reviews)
            self.send_json({"ok": True, "summary": summary})
            return

        # 10. LAB DATABASE RESET
        if self.path == "/api/lab/reset":
            # Resets to default initial demo seed
            seed_users = [
                {
                    "id": "usr_01",
                    "name": "Heaven Refining",
                    "email": "venerable@gmail.com",
                    "password_hash": hash_pw("password123"),
                    "provider": "google",
                    "emailVerified": True,
                    "createdAt": "2026-09-01T12:00:00Z",
                    "avatarBg": "#b8860b"
                },
                {
                    "id": "usr_02",
                    "name": "Bai Ning Bing",
                    "email": "icemuscle@qingmao.net",
                    "password_hash": hash_pw("password123"),
                    "provider": "email",
                    "emailVerified": True,
                    "createdAt": "2026-09-10T15:30:00Z",
                    "avatarBg": "#4a7a96"
                }
            ]
            write_json(USERS_FILE, seed_users)
            write_json(CODES_FILE, {})
            write_json(SESSIONS_FILE, {})
            self.send_json({"ok": True, "message": "Lab storage reset to seed state."})
            return

        self.send_error(404)

    def log_message(self, fmt, *args):
        # Clean logging
        pass


class ThreadedServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    print(f"Starting Reverend Insanity Community Lab on http://0.0.0.0:{PORT}...", flush=True)
    with ThreadedServer(("0.0.0.0", PORT), LabRequestHandler) as httpd:
        print(f"Serving Lab site from {BASE_DIR} on port {PORT}", flush=True)
        httpd.serve_forever()
