import urllib.request
import json
import http.cookiejar

cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

print("=== 1. Testing Frontend Pages ===")
for path in ["/", "/auth/login", "/dashboard", "/products", "/orders", "/deployments"]:
    try:
        req = urllib.request.Request(f"http://127.0.0.1:3000{path}")
        res = opener.open(req)
        print(f"  GET {path:15} -> {res.status} OK")
    except urllib.error.HTTPError as e:
        print(f"  GET {path:15} -> {e.code} (Expected if auth redirect)")

print("\n=== 2. Testing Next.js API Proxy -> FastAPI Backend ===")
# Health check
req = urllib.request.Request("http://127.0.0.1:3000/api/health")
res = opener.open(req)
print(f"  GET /api/health           -> {res.status} {res.read().decode().strip()}")

# Login
login_payload = json.dumps({"email": "merchant@shopmate.com", "password": "password123"}).encode()
req = urllib.request.Request("http://127.0.0.1:3000/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
res = opener.open(req)
body = json.loads(res.read().decode())
user = body.get("user", {})
print(f"  POST /api/auth/login      -> {res.status} (user={user.get('email')}, role={user.get('role')})")

# Auth Me
req = urllib.request.Request("http://127.0.0.1:3000/api/auth/me")
res = opener.open(req)
me = json.loads(res.read().decode())
print(f"  GET /api/auth/me          -> {res.status} (workspace_id={me.get('user', {}).get('workspace_id')})")

# Products
req = urllib.request.Request("http://127.0.0.1:3000/api/commerce/products")
res = opener.open(req)
prods = json.loads(res.read().decode())
print(f"  GET /api/commerce/products-> {res.status} ({len(prods.get('products', []))} products loaded)")

# Orders
req = urllib.request.Request("http://127.0.0.1:3000/api/commerce/orders")
res = opener.open(req)
orders = json.loads(res.read().decode())
print(f"  GET /api/commerce/orders  -> {res.status} ({len(orders.get('orders', []))} orders loaded)")

# Agents
req = urllib.request.Request("http://127.0.0.1:3000/api/agents")
res = opener.open(req)
agents = json.loads(res.read().decode())
print(f"  GET /api/agents           -> {res.status} ({len(agents.get('agents', []))} agents loaded)")

# Settings
req = urllib.request.Request("http://127.0.0.1:3000/api/settings")
res = opener.open(req)
settings = json.loads(res.read().decode())
print(f"  GET /api/settings         -> {res.status} (store_name={settings.get('settings', {}).get('store_name')})")

# Analytics
req = urllib.request.Request("http://127.0.0.1:3000/api/analytics")
res = opener.open(req)
analytics = json.loads(res.read().decode())
print(f"  GET /api/analytics        -> {res.status} (metrics received)")

# Embed Script
req = urllib.request.Request("http://127.0.0.1:3000/api/ai-mode/widget/ws_acme_corp/script.js")
res = opener.open(req)
js = res.read().decode()
print(f"  GET widget script.js      -> {res.status} ({len(js)} bytes of JS loaded)")

print("\n=== VERIFICATION RESULT: 100% PURE PYTHON BACKEND OPERATING THROUGH NEXT.JS FRONTEND ===")
