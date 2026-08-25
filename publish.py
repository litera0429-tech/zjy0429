#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""肘子鱼独立站 · 发布脚本（本地后台 + OSS 图床直连 + Netlify 静态部署）

做五件事：
  1) 母版：works.json / site.json 引用的图片做成高清 JPG 母版（长边 ≤5000px、q92，约 3-4MB）
  2) 占位：生成 24px LQIP 占位图
  3) 上传：母版/占位图直传腾讯云 COS（public-read + 1 年缓存 + 版本号）
  4) 改写：JSON/HTML/JS 里的图片引用统一改为 COS 绝对地址 + 版本号
  5) 发布：提交内容到 git 并 push，Netlify 自动重新部署

前端展示由 COS 图片处理（数据万象）按场景实时等比缩放并转 WebP（quality/80），
不再预生成固定尺寸文件，也不以固定体积作为压缩条件。

用法：
  python3 publish.py --dry-run       只预览要做什么，不改任何文件
  python3 publish.py                 完整发布（压缩 + 变体 + 上传 COS + 改写引用 + git push）
  python3 publish.py --skip-upload   只压缩/改写/提交，不上传 COS
  python3 publish.py --force         强制重新生成 JPG 母版
  python3 publish.py --clean-only    只删除未被网站引用的本地图片，不做其他事
  python3 publish.py --hotlink       给 OSS 设置 Referer 防盗链白名单
  python3 publish.py --cache         给 OSS 上所有对象补长缓存头（仅历史备份用）
"""

import io
import hashlib
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

try:
    from PIL import Image
    from PIL import ImageOps
except ImportError:
    Image = None

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(ROOT, "content")
UPLOAD_DIR = os.path.join(ROOT, "images", "uploads")
STATE_PATH = os.path.join(ROOT, ".publish-state.json")

MASTER_EDGE = 5000  # 高清母版长边上限（等比缩放，不放大）
MASTER_Q = 92       # 高清母版 JPEG 质量（约 3-4MB）


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
                env[key.strip()] = val.strip().strip('"').strip("'")
    except OSError:
        pass
    return env


def env():
    if not hasattr(env, "_cache"):
        env._cache = load_env_file(os.path.join(ROOT, ".env"))
        for k, v in os.environ.items():
            if k.startswith("OSS_") or k == "CDN_BASE":
                env._cache[k] = v
    return env._cache


def cdn_base():
    return (env().get("CDN_BASE") or "").strip().rstrip("/")


def cos_base():
    env_ = env()
    bucket = env_.get("COS_BUCKET", "").strip()
    region = env_.get("COS_REGION", "").strip()
    if not (bucket and region):
        return ""
    return "https://%s.cos.%s.myqcloud.com" % (bucket, region)


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def collect_refs(data):
    """递归收集所有 images/ 引用（兼容已转成 OSS 绝对地址的值）。"""
    refs = set()

    def walk(o):
        if isinstance(o, str):
            local = to_local(o)
            if local.startswith("images/") or local == "cover.mp4":
                refs.add(local)
        elif isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for x in o:
                walk(x)

    walk(data)
    return sorted(refs)


def load_state():
    state = read_json(STATE_PATH)
    if not isinstance(state, dict):
        state = {}
    state.setdefault("uploaded", {})
    return state


def save_state(state):
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def content_type(ref):
    return mimetypes.guess_type(ref)[0] or "application/octet-stream"


def optimize(src_path, ref, out_dir, dry_run, force=False):
    """高清母版：等比缩放（长边 MASTER_EDGE）+ 转 JPG（MASTER_Q，约 3-4MB）。
    返回 (final_ref, new_size, converted, changed)。GIF/WebP 不做转换。"""
    ext = os.path.splitext(ref)[1].lower()
    base = os.path.splitext(ref)[0]
    if ext in (".gif", ".webp") or Image is None:
        return ref, None, False, False
    try:
        im = ImageOps.exif_transpose(Image.open(src_path))
    except Exception:
        return ref, None, False, False

    # 已是母版规格的 JPG（长边在范围内）且未强制重压：原样保留
    if not force and ext in (".jpg", ".jpeg") and max(im.size) <= MASTER_EDGE:
        return ref, None, False, False

    # 透明 PNG 合成白底后转 JPG
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        rgba = im.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[-1])
        im2 = bg
    else:
        im2 = im.convert("RGB") if im.mode != "RGB" else im
    if max(im2.size) > MASTER_EDGE:
        im2 = im2.copy()
        im2.thumbnail((MASTER_EDGE, MASTER_EDGE), Image.LANCZOS)

    final = base + ".jpg" if ext != ".jpg" else ref
    buf = io.BytesIO()
    im2.save(buf, "JPEG", quality=MASTER_Q, optimize=True, progressive=True)
    data = buf.getvalue()
    if not dry_run:
        sub = os.path.relpath(final, "images/uploads")
        out = os.path.join(out_dir, sub)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "wb") as f:
            f.write(data)
    return final, len(data), ref != final, True


def to_local(ref):
    """把 COS/OSS 绝对地址（含版本号）还原成本地相对路径。"""
    for base in (cos_base(), cdn_base()):
        if base and ref.startswith(base + "/"):
            ref = ref[len(base) + 1:]
            break
    q = ref.find("?")
    if q != -1:
        ref = ref[:q]
    return ref


def versioned_ref(ref):
    """图片引用 -> COS 绝对地址 + 版本号（?v=文件修改时间，保证更新后缓存立即失效）。"""
    path = os.path.join(ROOT, ref)
    v = int(os.path.getmtime(path)) if os.path.exists(path) else 1
    base = cos_base()
    return ("%s/" % base if base else "") + "%s?v=%d" % (ref, v)


def rewrite_refs(o, ref_map):
    if isinstance(o, dict):
        return {k: rewrite_refs(v, ref_map) for k, v in o.items()}
    if isinstance(o, list):
        return [rewrite_refs(x, ref_map) for x in o]
    if isinstance(o, str):
        local = to_local(o)
        if local.startswith("images/") or local == "cover.mp4":
            final = ref_map.get(local, local)
            return versioned_ref(final)
    return o


TEXT_FILES = [
    "index.html", "about.html", "business.html", "footprint.html",
    "portfolio.html", "preview-coverflow.html",
    "js/main.js", "js/coverflow.js", "js/hero07.js", "js/scroll01.js",
]


def absolutize_text(ref_map, dry_run):
    """把 HTML/JS 里写死的图片/样式/脚本引用统一改成 COS 地址或相对路径 + 版本号。"""
    base = cos_base()
    prefix = (re.escape(base) + "/") if base else ""
    pat = re.compile(
        r'''(["'])((?:%s)?(?:(?:images/[\w./-]+\.(?:jpg|jpeg|png|gif|webp|mp4)|cover\.mp4)|(?:css/[\w./-]+\.css|js/[\w./-]+\.js)))(?:\?v=\d+)?(["'])''' % prefix
    )
    changed = []
    for name in TEXT_FILES:
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()

        def repl(m):
            ref = to_local(m.group(2))
            final = ref_map.get(ref, ref)
            if final.startswith("images/") or final == "cover.mp4":
                return m.group(1) + versioned_ref(final) + m.group(3)
            path = os.path.join(ROOT, final)
            v = int(os.path.getmtime(path)) if os.path.exists(path) else 1
            return m.group(1) + ("%s?v=%d" % (final, v)) + m.group(3)

        new = pat.sub(repl, text)
        if new != text:
            changed.append(name)
            if not dry_run:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new)
    if changed:
        print("[引用] %d 个页面/脚本图片引用已改写：%s" % (
            len(changed), ", ".join(changed)))
    return changed


def upload_to_oss(refs, state, dry_run):
    try:
        import oss2
    except ImportError:
        print("缺少 oss2，未上传。请运行：pip3 install oss2")
        return False
    ak = env().get("OSS_ACCESS_KEY_ID", "").strip()
    sk = env().get("OSS_ACCESS_KEY_SECRET", "").strip()
    bucket_name = env().get("OSS_BUCKET", "").strip()
    endpoint = env().get("OSS_ENDPOINT", "").strip()
    if not (ak and sk and bucket_name and endpoint):
        print("未配置 OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET / OSS_ENDPOINT（.env）")
        return False
    auth = oss2.Auth(ak, sk)
    bucket = oss2.Bucket(auth, endpoint, bucket_name)
    uploaded = state.setdefault("uploaded", {})
    count = 0
    for ref in refs:
        src = os.path.join(ROOT, ref)
        if not os.path.exists(src):
            continue
        with open(src, "rb") as f:
            digest = hashlib.md5(f.read()).hexdigest()
        if (uploaded.get(ref) or "").lower() == digest:
            continue  # 已上传且文件没变
        if dry_run:
            continue
        bucket.put_object_from_file(
            ref,
            src,
            headers={
                "Content-Type": content_type(ref),
                # 长缓存：浏览器本地缓存，重复访问不再产生 OSS 流量
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        )
        uploaded[ref] = digest
        count += 1
        print("[上传] %s" % ref)
    if dry_run:
        def local_digest(p):
            with open(p, "rb") as f:
                return hashlib.md5(f.read()).hexdigest()

        pending = sum(
            1
            for ref in refs
            if os.path.exists(os.path.join(ROOT, ref))
            and (uploaded.get(ref) or "").lower() != local_digest(os.path.join(ROOT, ref))
        )
        print("[预览] 待上传到 OSS：%d 张" % pending)
    else:
        print("[上传] 完成，本次上传 %d 张" % count)
    return True


def media_files(refs):
    """所有要上 OSS 的媒体：JSON 引用的图 + 非 uploads 目录里的默认图 + 封面视频。
    图片不进 git 仓库，全部由 OSS 提供，Netlify 重写 /images/* 与 /cover.mp4。"""
    files = set(refs)
    uploads_dir = os.path.join("images", "uploads") + os.sep
    for dirpath, _dirs, names in os.walk(os.path.join(ROOT, "images")):
        rel_dir = os.path.relpath(dirpath, ROOT).replace(os.sep, "/")
        if rel_dir.startswith(uploads_dir):
            continue
        for n in names:
            if n.startswith("cover-original"):
                continue  # 本地归档原视频，不传 OSS
            files.add(rel_dir + "/" + n)
    if os.path.exists(os.path.join(ROOT, "cover.mp4")):
        files.add("cover.mp4")
    return sorted(f for f in files if os.path.exists(os.path.join(ROOT, f)))


def unreferenced_uploads(final_refs):
    """images/uploads 里没被 works.json / site.json 引用的图片（含转换后废弃的旧扩展名）。"""
    ref_set = set(final_refs)
    found = []
    for dirpath, _dirs, names in os.walk(UPLOAD_DIR):
        for f in sorted(names):
            if not f.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp")):
                continue
            if f.lower().endswith(".lqip.webp"):
                continue  # 低质量占位图由对应原图生成，不算“未引用”
            p = os.path.relpath(os.path.join(dirpath, f), ROOT).replace(os.sep, "/")
            if p not in ref_set:
                found.append(p)
    return found


def make_lqip(ref, dry_run):
    """为图片生成 24px WebP 低质量占位图：<同名>.lqip.webp。"""
    src = os.path.join(ROOT, ref)
    if not os.path.exists(src) or os.path.splitext(ref)[1].lower() in (".gif", ".mp4"):
        return
    base = os.path.splitext(ref)[0]
    out = os.path.join(ROOT, base + ".lqip.webp")
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src):
        return
    if dry_run:
        return
    try:
        from PIL import Image, ImageOps
        im = ImageOps.exif_transpose(Image.open(src))
        im.thumbnail((24, 24), Image.LANCZOS)
        im.save(out, "WEBP", quality=25, method=4)
    except Exception:
        pass


def git_publish(dry_run):
    files = [
        "content", "netlify.toml", "publish.py", "server.py",
        "index.html", "about.html", "business.html", "footprint.html",
        "portfolio.html", "preview-coverflow.html", "404.html", "js",
    ]
    if dry_run:
        print("[预览] git 将提交：%s" % ", ".join(files))
    else:
        subprocess.run(["git", "add", "-A", "--"] + files, cwd=ROOT, check=False)
        diff = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=ROOT,
            check=False,
        )
        if diff.returncode != 0:
            msg = "发布：更新站点内容 %s" % time.strftime("%Y-%m-%d %H:%M:%S")
            subprocess.run(["git", "commit", "-m", msg], cwd=ROOT, check=False)
            print("[git] 已提交：%s" % msg)
        remote = subprocess.run(
            ["git", "remote", "-v"], cwd=ROOT, capture_output=True, text=True, check=False
        ).stdout.strip()
        if remote:
            subprocess.run(["git", "push"], cwd=ROOT, check=False)
            print("[git] 已 push，Netlify 即将自动部署")
        else:
            print("[git] 尚未配置远端仓库，跳过 push。请先：git remote add origin <仓库地址>")


def set_cache_headers():
    """给 OSS 上所有对象补上长缓存头（只改元数据，不重传内容）。"""
    try:
        import oss2
    except ImportError:
        print("缺少 oss2，请先：pip3 install oss2")
        return
    env_ = env()
    ak = env_.get("OSS_ACCESS_KEY_ID", "").strip()
    sk = env_.get("OSS_ACCESS_KEY_SECRET", "").strip()
    bucket_name = env_.get("OSS_BUCKET", "").strip()
    endpoint = env_.get("OSS_ENDPOINT", "").strip()
    if not (ak and sk and bucket_name and endpoint):
        print("未配置 OSS 密钥（.env）")
        return
    auth = oss2.Auth(ak, sk)
    bucket = oss2.Bucket(auth, endpoint, bucket_name)
    count = 0
    for o in oss2.ObjectIterator(bucket, max_keys=1000):
        bucket.copy_object(
            bucket_name,
            o.key,
            o.key,
            headers={
                "x-oss-metadata-directive": "REPLACE",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        )
        count += 1
        if count % 200 == 0:
            print("[缓存] 已处理 %d 个对象" % count)
    print("[缓存] 完成，共 %d 个对象已补上长缓存头" % count)


def set_hotlink():
    """给 OSS 设置 Referer 防盗链：只允许本站与本地预览访问，允许空 Referer。"""
    try:
        import oss2
        from oss2.models import BucketReferer
    except ImportError:
        print("缺少 oss2，请先：pip3 install oss2")
        return
    env_ = env()
    ak = env_.get("OSS_ACCESS_KEY_ID", "").strip()
    sk = env_.get("OSS_ACCESS_KEY_SECRET", "").strip()
    bucket_name = env_.get("OSS_BUCKET", "").strip()
    endpoint = env_.get("OSS_ENDPOINT", "").strip()
    if not (ak and sk and bucket_name and endpoint):
        print("未配置 OSS 密钥（.env）")
        return
    bucket = oss2.Bucket(oss2.Auth(ak, sk), endpoint, bucket_name)
    referers = [
        "https://zjy0429.netlify.app*",
        "http://localhost:8000*",
        "http://127.0.0.1:8000*",
        "http://localhost:8001*",
        "http://127.0.0.1:8001*",
    ]
    bucket.put_bucket_referer(
        BucketReferer(True, referers, allow_truncate_query_string=True)
    )
    print("[防盗链] 已设置：允许空 Referer + 白名单 %s" % "; ".join(referers))


def upload_to_cos(files, state, dry_run):
    """上传 [(key, local_path)] 到腾讯云 COS：public-read + 1 年缓存。"""
    try:
        from qcloud_cos import CosConfig, CosS3Client
    except ImportError:
        print("缺少 qcloud_cos，请先：pip3 install cos-python-sdk-v5")
        return
    env_ = env()
    sid = env_.get("COS_SECRET_ID", "").strip()
    skey = env_.get("COS_SECRET_KEY", "").strip()
    bucket = env_.get("COS_BUCKET", "").strip()
    region = env_.get("COS_REGION", "").strip()
    if not (sid and skey and bucket and region):
        print("未配置 COS 密钥（.env）")
        return
    client = CosS3Client(CosConfig(Region=region, SecretId=sid, SecretKey=skey))
    uploaded = state.setdefault("cos_uploaded", {})
    count = 0
    for key, path in files:
        if not os.path.exists(path):
            continue
        with open(path, "rb") as f:
            digest = hashlib.md5(f.read()).hexdigest()
        try:
            head = client.head_object(Bucket=bucket, Key=key)
            if (head.get("ETag") or "").strip('"').lower() == digest:
                continue  # 已存在且内容一致，跳过
        except Exception:
            pass
        if (uploaded.get(key) or "").lower() == digest:
            continue
        if dry_run:
            continue
        ctype = mimetypes.guess_type(key)[0] or "application/octet-stream"
        with open(path, "rb") as f:
            client.put_object(
                Bucket=bucket,
                Body=f,
                Key=key,
                ContentType=ctype,
                CacheControl="public, max-age=31536000, immutable",
                ACL="public-read",
            )
        uploaded[key] = digest
        count += 1
        if count % 100 == 0:
            print("[上传] COS 进度：%d" % count)
    if not dry_run:
        print("[上传] COS 完成，本次上传 %d 个" % count)


def main():
    dry_run = "--dry-run" in sys.argv
    skip_upload = "--skip-upload" in sys.argv
    clean_only = "--clean-only" in sys.argv
    set_cache = "--cache" in sys.argv
    hotlink = "--hotlink" in sys.argv
    force = "--force" in sys.argv
    if force:
        print("[重压] 强制用同名原图重新压缩（%s）" % ("预览" if dry_run else "执行"))

    if set_cache:
        set_cache_headers()
        return
    if hotlink:
        set_hotlink()
        return

    works = read_json(os.path.join(CONTENT_DIR, "works.json"))
    site = read_json(os.path.join(CONTENT_DIR, "site.json"))
    refs = collect_refs({"works": works.get("works"), "site": site})
    state = load_state()

    missing = [r for r in refs if not os.path.exists(os.path.join(ROOT, r))]
    if missing:
        print("[警告] 本地缺失 %d 张引用图片（线上会 404，不影响发布）：" % len(missing))
        for r in missing[:10]:
            print("   - %s" % r)

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    if clean_only:
        stale = unreferenced_uploads(refs)
        if not stale:
            print("[清理] 没有未引用的图片")
        else:
            print("[清理] 未引用图片 %d 张" % len(stale))
            if dry_run:
                for p in stale[:8]:
                    print("   - %s" % p)
                if len(stale) > 8:
                    print("   … 等 %d 张" % (len(stale) - 8))
            else:
                for p in stale:
                    try:
                        os.remove(os.path.join(ROOT, p))
                    except OSError:
                        pass
                print("[清理] 已删除 %d 张未引用图片" % len(stale))
        print("清理完成")
        return

    ref_map = {}
    pending = []
    total_old = total_new = 0
    attempted_old = attempted_new = 0
    attempted = 0
    for ref in refs:
        src = os.path.join(ROOT, ref)
        if not os.path.exists(src):
            continue
        old = os.path.getsize(src)
        final, new_size, converted, changed = optimize(src, ref, UPLOAD_DIR, dry_run, force)
        if new_size is not None:
            attempted += 1
            attempted_old += old
            attempted_new += min(old, new_size)
        if changed:
            pending.append(final)
            total_old += old
            total_new += new_size or 0
            if converted:
                print("[压缩] %s -> %s（%.1fMB → %.1fMB）" % (
                    ref, final, old / 1e6, (new_size or 0) / 1e6))
        ref_map[ref] = final

    if attempted:
        print("[压缩] 引用图片合计：%.1fMB → 约 %.1fMB（%d 张需要处理）" % (
            attempted_old / 1e6, attempted_new / 1e6, attempted))
    master_sizes = [
        os.path.getsize(os.path.join(ROOT, ref_map[r]))
        for r in refs
        if ref_map[r].endswith((".jpg", ".jpeg")) and os.path.exists(os.path.join(ROOT, ref_map[r]))
    ]
    if master_sizes:
        print("[母版] JPG 母版平均 %.2fMB，最大 %.2fMB" % (
            sum(master_sizes) / len(master_sizes) / 1048576, max(master_sizes) / 1048576))
    if pending:
        print("[压缩] 待压缩/转换 %d 张：约 %.1fMB → %.1fMB" % (
            len(pending), total_old / 1e6, total_new / 1e6))
    else:
        print("[压缩] 没有需要压缩的图片")

    # 更新 JSON：图片引用 -> COS 母版地址 + 版本号；扩展名变化一并处理
    if not dry_run:
        write_json(os.path.join(CONTENT_DIR, "works.json"), rewrite_refs(works, ref_map))
        write_json(os.path.join(CONTENT_DIR, "site.json"), rewrite_refs(site, ref_map))
        absolutize_text(ref_map, dry_run)

    changed_refs = [r for r in refs if ref_map[r] != r]
    if changed_refs:
        print("[JSON] 有 %d 处引用已改地址/转 JPG 母版，works.json / site.json 已同步" % len(changed_refs))

    final_refs = [ref_map[r] for r in refs]
    if not dry_run:
        for ref in final_refs:
            make_lqip(ref, dry_run)
    print("[LQIP] 低质量占位图已生成/更新" if not dry_run else "[LQIP] 预览：将生成占位图")

    stale = unreferenced_uploads(final_refs)
    if stale:
        print("[清理] 未引用图片 %d 张" % len(stale))
        if dry_run or clean_only:
            for p in stale[:8]:
                print("   - %s" % p)
            if len(stale) > 8:
                print("   … 等 %d 张" % (len(stale) - 8))
        else:
            for p in stale:
                try:
                    os.remove(os.path.join(ROOT, p))
                except OSError:
                    pass
            print("[清理] 已删除 %d 张未引用图片" % len(stale))
    if clean_only:
        print("清理完成（预览模式请用 --dry-run）" if dry_run else "清理完成")
        return

    if not skip_upload:
        up_files = []
        for ref in media_files(final_refs):
            up_files.append((ref, os.path.join(ROOT, ref)))
        for ref in final_refs:
            lq = os.path.splitext(ref)[0] + ".lqip.webp"
            if os.path.exists(os.path.join(ROOT, lq)):
                up_files.append((lq, os.path.join(ROOT, lq)))
        upload_to_cos(up_files, state, dry_run)
        if not dry_run:
            save_state(state)
    git_publish(dry_run)

    print("完成%s" % ("（预览，未改动任何文件）" if dry_run else "。图片已直连 COS（带版本号 + 长缓存）"))


if __name__ == "__main__":
    main()
