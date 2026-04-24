import urllib.request
import urllib.error
import json

BASE = "https://school-management-api-6i2r.onrender.com"

def get(path):
    try:
        req = urllib.request.urlopen(BASE + path, timeout=30)
        return req.status, req.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

def post(path, data):
    try:
        body = json.dumps(data).encode()
        req = urllib.request.Request(BASE + path, data=body, headers={"Content-Type": "application/json"}, method="POST")
        resp = urllib.request.urlopen(req, timeout=30)
        return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return None, str(e)

print("=== GET /health ===")
status, body = get("/health")
print(f"Status: {status}")
print(f"Body: {body}")
print()

print("=== POST /auth/login (admin/admin123) ===")
status, body = post("/auth/login", {"username": "admin", "password": "admin123"})
print(f"Status: {status}")
print(f"Body: {body}")
print()

print("=== GET /docs ===")
status, body = get("/docs")
print(f"Status: {status}")
print(f"Body (first 200): {body[:200]}")
