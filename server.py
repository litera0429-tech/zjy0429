#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""肘子鱼独立站 · 本地简易后端

功能：
- 继续提供原静态站点预览（所有 HTML/CSS/JS/图片）
- /manage/ 无代码管理后台页面（需管理员登录）
- /manage/login.html 管理员登录页
- /api/data  读取站点设置与作品数据（需登录）
- /api/upload 上传图片到 images/uploads/
- /api/site  保存站点设置（content/site.json）
- /api/works 保存作品列表（content/works.json）
- /api/publish 一键发布：压缩图片 → 上传 OSS → git push（Netlify 自动部署）
- /api/login 管理员登录（密码来自环境变量 ADMIN_PASSWORD 或项目根目录 .env）
- /api/logout 退出登录

用法：python3 server.py [端口，默认 8000]
"""

import hmac
import io
import json
import os
import random
import secrets
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(ROOT, "content")
UPLOAD_DIR = os.path.join(ROOT, "images", "uploads")
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}
MAX_UPLOAD = 60 * 1024 * 1024
MAX_EDGE = 2400  # 大图长边压缩到 2400px（保持原比例）
WEBP_Q = 85       # WebP 质量


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def parse_multipart(body, content_type):
    """解析 multipart/form-data，返回 { 字段名: {filename, data} }。"""
    m = re.search(r'boundary=(?:"([^"]+)"|([^;]+))', content_type or "")
    if not m:
        return {}
    boundary = (m.group(1) or m.group(2)).strip().encode()
    delimiter = b"--" + boundary
    parts = body.split(delimiter)
    fields = {}
    for part in parts[1:]:
        if part[:2] == b"\r\n":
            part = part[2:]
        if part.endswith(b"--"):
            part = part[:-2]
        if part.endswith(b"\r\n"):
            part = part[:-2]
        sep = part.find(b"\r\n\r\n")
        if sep == -1:
            continue
        head = part[:sep].decode("utf-8", "ignore")
        content = part[sep + 4:]
        name = filename = None
        for line in head.split("\r\n"):
            low = line.lower()
            if low.startswith("content-disposition:"):
                m2 = re.search(r'name="([^"]*)"', line)
                if m2:
                    name = m2.group(1)
                m3 = re.search(r'filename="([^"]*)"', line)
                if m3:
                    filename = m3.group(1)
        if name:
            fields[name] = {"filename": filename, "data": content}
    return fields


def safe_rel_path(value):
    """只允许相对路径（如 images/xxx.jpg），禁止绝对路径与 .. 穿越。"""
    s = str(value or "").strip().replace("\\", "/")
    if not s or s.startswith("/") or s.startswith("http://") or s.startswith("https://"):
        return ""
    if ".." in s.split("/"):
        return ""
    return s



# ---------- 管理员登录认证 ----------
# 密码来源：环境变量 ADMIN_PASSWORD → 项目根目录 .env → 自动生成并写入 .env。
# 绝不硬编码在代码里。
ADMIN_PASSWORD = None
SESSIONS = {}
SESSION_TTL = 12 * 3600  # 12 小时，滑动续期
COOKIE_NAME = "zz_admin_session"


def load_env_file(path):
    env = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("export "):
                    line = line[7:].strip()
                if "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key:
                    env[key] = val
    except OSError:
        pass
    return env


def resolve_admin_password():
    global ADMIN_PASSWORD
    pwd = os.environ.get("ADMIN_PASSWORD", "").strip()
    env_path = os.path.join(ROOT, ".env")
    if not pwd:
        pwd = load_env_file(env_path).get("ADMIN_PASSWORD", "").strip()
    if not pwd:
        pwd = secrets.token_urlsafe(9)
        try:
            with open(env_path, "a", encoding="utf-8") as f:
                f.write("\nADMIN_PASSWORD=%s\n" % pwd)
            print("已生成管理员密码：%s（已写入项目根目录 .env）" % pwd)
        except OSError:
            print("已生成管理员密码：%s（仅本次运行有效，未写入 .env）" % pwd)
    ADMIN_PASSWORD = pwd


def make_session_token():
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = time.time() + SESSION_TTL
    return token


def session_valid(token):
    if not token:
        return False
    exp = SESSIONS.get(token)
    if exp is None:
        return False
    if exp < time.time():
        SESSIONS.pop(token, None)
        return False
    SESSIONS[token] = time.time() + SESSION_TTL  # 滑动续期
    return True


def cookie_token(headers):
    cookie = headers.get("Cookie", "")
    for part in cookie.split(";"):
        part = part.strip()
        if part.startswith(COOKIE_NAME + "="):
            return part[len(COOKIE_NAME) + 1:]
    return None

class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _require_auth(self):
        if session_valid(cookie_token(self.headers)):
            return True
        return self._json({"ok": False, "error": "未登录或登录已过期"}, 401)

    def _redirect(self, location, status=302):
        self.send_response(status)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/api/data":
            if not self._require_auth():
                return
            site = read_json(os.path.join(CONTENT_DIR, "site.json"))
            works_data = read_json(os.path.join(CONTENT_DIR, "works.json"))
            works = works_data.get("works", []) if isinstance(works_data, dict) else []
            self._json({"ok": True, "site": site, "works": works})
            return
        if path.startswith("/manage/"):
            if path == "/manage/login.html":
                if session_valid(cookie_token(self.headers)):
                    self._redirect("/manage/")
                    return
            elif not session_valid(cookie_token(self.headers)):
                self._redirect("/manage/login.html")
                return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b""
        if parsed.path == "/api/login":
            return self._handle_login(body)
        if parsed.path == "/api/logout":
            return self._handle_logout()
        if not self._require_auth():
            return
        try:
            if parsed.path == "/api/publish":
                return self._handle_publish(body)
            if parsed.path == "/api/upload":
                return self._handle_upload(body, self.headers.get("Content-Type", ""))
            if parsed.path == "/api/site":
                return self._handle_site(body)
            if parsed.path == "/api/works":
                return self._handle_works(body)
        except Exception as exc:
            self._json({"ok": False, "error": str(exc)}, status=400)
            return
        self._json({"ok": False, "error": "未知接口"}, status=404)

    def _handle_publish(self, body):
        """运行 publish.py（压缩 → OSS → git push），返回完整输出。"""
        try:
            data = json.loads(body.decode("utf-8") or "{}")
        except Exception:
            data = {}
        args = [sys.executable, "publish.py"]
        if data.get("dry_run"):
            args.append("--dry-run")
        try:
            proc = subprocess.run(
                args,
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=1800,
            )
        except subprocess.TimeoutExpired:
            return self._json({"ok": False, "error": "发布超时（超过 30 分钟）"}, 500)
        output = (proc.stdout or "") + (proc.stderr or "")
        return self._json({"ok": True, "output": output})

    def _handle_login(self, body):
        try:
            data = json.loads(body.decode("utf-8") or "{}")
        except Exception:
            data = {}
        pwd = str(data.get("password", ""))
        if not ADMIN_PASSWORD or not hmac.compare_digest(
            pwd.encode("utf-8"), ADMIN_PASSWORD.encode("utf-8")
        ):
            return self._json({"ok": False, "error": "密码错误"}, 401)
        token = make_session_token()
        payload = json.dumps({"ok": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header(
            "Set-Cookie",
            "%s=%s; Path=/; HttpOnly; SameSite=Lax" % (COOKIE_NAME, token),
        )
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def _handle_logout(self):
        token = cookie_token(self.headers)
        if token:
            SESSIONS.pop(token, None)
        payload = json.dumps({"ok": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header(
            "Set-Cookie",
            "%s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" % COOKIE_NAME,
        )
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def _handle_upload(self, body, content_type):
        fields = parse_multipart(body, content_type)
        f = fields.get("file")
        if not f or not f.get("data"):
            return self._json({"ok": False, "error": "没有收到文件"}, 400)
        data = f["data"]
        if len(data) > MAX_UPLOAD:
            return self._json({"ok": False, "error": "文件太大（上限 60MB）"}, 400)
        filename = f.get("filename") or "image.jpg"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXT:
            return self._json({"ok": False, "error": "仅支持 jpg / png / gif / webp 图片"}, 400)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        name = "u_%s_%s" % (
            time.strftime("%Y%m%d_%H%M%S"),
            random.randint(1000, 9999),
        )
        compressed = False

        if ext in (".jpg", ".jpeg", ".png", ".heic", ".heif"):
            # 等比缩放（长边 MAX_EDGE）+ 转 WebP；只有更小才用转换结果
            tmp_in = os.path.join(tempfile.gettempdir(), "zzup_" + name + ext)
            tmp_out = os.path.join(tempfile.gettempdir(), "zzup_out_" + name + ".webp")
            try:
                with open(tmp_in, "wb") as out:
                    out.write(data)
                ok = self._compress_to_webp(tmp_in, tmp_out)
                if ok and os.path.exists(tmp_out) and os.path.getsize(tmp_out) < len(data):
                    final_name = name + ".webp"
                    compressed = True
                else:
                    final_name = name + ext
                final_path = os.path.join(UPLOAD_DIR, final_name)
                with open(tmp_out if compressed else tmp_in, "rb") as fin, open(final_path, "wb") as fout:
                    shutil.copyfileobj(fin, fout)
            finally:
                for p in (tmp_in, tmp_out):
                    try:
                        os.remove(p)
                    except OSError:
                        pass
        else:
            # gif / webp 原样保存
            final_name = name + ext
            final_path = os.path.join(UPLOAD_DIR, final_name)
            with open(final_path, "wb") as out:
                out.write(data)

        return self._json({"ok": True, "path": "images/uploads/" + final_name, "compressed": compressed})

    def _compress_to_webp(self, src, dst):
        """等比缩放 + 转 WebP：优先 PIL；HEIF 等格式 PIL 打不开时用 sips 兜底。"""
        try:
            from PIL import Image, ImageOps
            im = ImageOps.exif_transpose(Image.open(src))
            if max(im.size) > MAX_EDGE:
                im = im.copy()
                im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            data = None
            for q in (WEBP_Q, 80, 72, 64):
                buf = io.BytesIO()
                im.save(buf, "WEBP", quality=q, method=4)
                data = buf.getvalue()
                if len(data) <= 800 * 1024:
                    break
            with open(dst, "wb") as f:
                f.write(data)
            return os.path.exists(dst)
        except Exception:
            try:
                subprocess.run(
                    ["sips", "-Z", str(MAX_EDGE), "-s", "format", "webp", src, "--out", dst],
                    check=True,
                    capture_output=True,
                    timeout=300,
                )
                return os.path.exists(dst)
            except Exception:
                return False

    def _handle_site(self, body):
        data = json.loads(body.decode("utf-8") or "{}")
        if not isinstance(data, dict):
            return self._json({"ok": False, "error": "数据格式错误"}, 400)
        current = read_json(os.path.join(CONTENT_DIR, "site.json"))
        for k, v in data.items():
            if k == "carousel":
                current[k] = self._clean_carousel(v)
            elif isinstance(v, (dict, list)):
                current[k] = v
            else:
                current[k] = v if isinstance(v, str) else str(v)
        write_json(os.path.join(CONTENT_DIR, "site.json"), current)
        return self._json({"ok": True})

    def _clean_carousel(self, items):
        """校验轮播数据：src 只允许相对路径或 http(s)/绝对路径，文字转字符串。"""
        cleaned = []
        if not isinstance(items, list):
            return cleaned
        for it in items:
            if not isinstance(it, dict):
                continue
            src = str(it.get("src", "")).strip()
            if not src:
                continue
            if src.startswith(("http://", "https://", "/")):
                src_ok = src
            else:
                src_ok = safe_rel_path(src)
            if not src_ok:
                continue
            meta = []
            raw_meta = it.get("meta")
            if isinstance(raw_meta, list):
                for row in raw_meta[:8]:
                    if not isinstance(row, dict):
                        continue
                    meta.append(
                        {
                            "label": str(row.get("label", "")).strip(),
                            "value": str(row.get("value", "")).strip(),
                        }
                    )
            cleaned.append(
                {
                    "src": src_ok,
                    "alt": str(it.get("alt", "")).strip(),
                    "title": str(it.get("title", "")).strip(),
                    "subtitle": str(it.get("subtitle", "")).strip(),
                    "meta": meta,
                }
            )
        return cleaned

    def _handle_works(self, body):
        data = json.loads(body.decode("utf-8") or "{}")
        works = data.get("works") if isinstance(data, dict) else None
        if not isinstance(works, list):
            return self._json({"ok": False, "error": "数据格式错误"}, 400)
        cleaned = []
        for w in works:
            if not isinstance(w, dict):
                continue
            title = str(w.get("title", "")).strip()
            if not title:
                title = "未命名作品"
            image = safe_rel_path(w.get("image", ""))
            imgs_raw = w.get("images")
            images = []
            if isinstance(imgs_raw, list):
                images = [safe_rel_path(x) for x in imgs_raw]
                images = [x for x in images if x]
            more_raw = w.get("more")
            more = []
            if isinstance(more_raw, list):
                more = [safe_rel_path(x) for x in more_raw]
                more = [x for x in more if x]
            item = {
                "title": title,
                "group": str(w.get("group", "business")).strip() or "business",
                "category": str(w.get("category", "")).strip() or "未分类",
                "image": image,
                "description": str(w.get("description", "")).strip(),
            }
            if images:
                item["images"] = images
            if more:
                item["more"] = more
            cleaned.append(item)
        write_json(os.path.join(CONTENT_DIR, "works.json"), {"works": cleaned})
        return self._json({"ok": True, "count": len(cleaned)})


def main():
    resolve_admin_password()
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    server = ThreadingHTTPServer(("0.0.0.0", port), SiteHandler)
    print("肘子鱼本地服务器已启动：http://localhost:%d/" % port)
    print("管理后台：http://localhost:%d/manage/（需管理员密码登录）" % port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
