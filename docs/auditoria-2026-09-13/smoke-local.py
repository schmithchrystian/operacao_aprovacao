"""Smoke somente contra 127.0.0.1:3107 em DATA_SOURCE=mock.

Usa credenciais públicas de demonstração, nunca contas reais. Não imprime cookies,
tokens CSRF, respostas de páginas ou dados de usuários. A reprodução de lockout
espera o comportamento inseguro do commit auditado; não certifica segurança.
Iniciar previamente o build local com segredos efêmeros e modo mock explícito.
"""
import http.cookiejar
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:3107"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def client():
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()), NoRedirect()
    )


def request(opener, path, data=None, as_json=False):
    headers = {"X-Auth-Return-Redirect": "1"}
    body = None
    if data is not None:
        if as_json:
            body = json.dumps(data).encode()
            headers["Content-Type"] = "application/json"
        else:
            body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(BASE + path, data=body, headers=headers)
    try:
        response = opener.open(req, timeout=30)
    except urllib.error.HTTPError as error:
        response = error
    return response.status, response.headers, response.read().decode()


def login(opener, email, password, csrf):
    return request(opener, "/api/auth/callback/credentials", {
        "csrfToken": csrf, "email": email, "password": password,
        "callbackUrl": BASE + "/dashboard",
    })


def main():
    results = []
    opener = client()
    for path in ["/login", "/dashboard", "/admin", "/api/cron/ranking-recalc"]:
        status, headers, _ = request(opener, path)
        results.append({"anonymous_path": path, "status": status, "location": headers.get("Location")})
    for path in ["/api/progress/heartbeat", "/api/focus/heartbeat"]:
        status, _, _ = request(opener, path, {}, as_json=True)
        results.append({"anonymous_post": path, "status": status})

    _, _, body = request(opener, "/api/auth/csrf")
    csrf = json.loads(body)["csrfToken"]
    for number in range(1, 9):
        status, _, body = login(opener, "diego.admin@example.com", "audit-invalid-password", csrf)
        results.append({"invalid_direct_login": number, "status": status, "result": json.loads(body)})
    status, _, _ = login(opener, "diego.admin@example.com", "senha123", csrf)
    _, _, body = request(opener, "/api/auth/session")
    user = json.loads(body).get("user", {})
    results.append({"valid_login_after_8_failures": status, "authenticated": bool(user.get("id")), "role": user.get("role")})

    root = Path(__file__).resolve().parents[2]
    routes = set()
    for page in (root / "src/app").rglob("page.tsx"):
        parts = [part for part in page.relative_to(root / "src/app").parts[:-1] if not part.startswith("(")]
        if any("[" in part for part in parts):
            continue
        routes.add("/" + "/".join(parts))
    for path in sorted(routes):
        status, _, _ = request(opener, path)
        results.append({"admin_authenticated_page": path, "status": status})

    student = client()
    _, _, body = request(student, "/api/auth/csrf")
    login(student, "ana.recruta@example.com", "senha123", json.loads(body)["csrfToken"])
    for path in ["/dashboard", "/admin", "/modo-foco", "/montar-estudo"]:
        status, headers, _ = request(student, path)
        results.append({"student_page": path, "status": status, "location": headers.get("Location")})
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
