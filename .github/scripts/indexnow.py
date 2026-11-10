#!/usr/bin/env python3
"""Send changed, already-live HTML URLs to IndexNow, without any paid service."""
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

HOST = "ombereg.art"
BASE = f"https://{HOST}"
KEY = "c19bb00d76c34916a26c972167f4665e"
KEY_URL = f"{BASE}/{KEY}.txt"


def read_url(url, timeout=15):
    with urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": "OMBEREG-IndexNow/1.0"}),
        timeout=timeout,
    ) as response:
        return response.status, response.read()


def changed_files():
    try:
        return subprocess.check_output(
            ["git", "diff", "--name-only", "HEAD^", "HEAD"], text=True
        ).splitlines()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return []


def sitemap_urls():
    namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.parse("sitemap.xml").getroot()
    return [
        x.text for x in root.findall("s:url/s:loc", namespace)
        if x.text and x.text.startswith(BASE + "/")
    ]


def main():
    files = changed_files()
    if not files or "sitemap.xml" in files or ".github/workflows/indexnow.yml" in files:
        urls = sitemap_urls()
    else:
        urls = []
        for p in files:
            if p == "index.html":
                urls.append(BASE + "/")
            elif p.endswith("/index.html") and (p.startswith("portfolio/") or p.startswith("services/") or p.startswith("en/")):
                urls.append(BASE + "/" + p[:-10])
        urls = list(dict.fromkeys(urls))

    if not urls:
        print("No search-indexable page changes.")
        return

    # GitHub Pages deploys separately; do not ping old or nonexistent pages.
    for attempt in range(16):
        try:
            status, data = read_url(KEY_URL)
            if status == 200 and data.decode().strip() == KEY:
                break
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(12)
    else:
        print("IndexNow key is not publicly available, skipping.", file=sys.stderr)
        sys.exit(1)

    # The changed page must actually be publicly available before notifying.
    available = []
    for url in urls:
        try:
            code, body = read_url(url)
            if code == 200 and len(body) > 50:
                available.append(url)
            else:
                print(f"Skipping {url}: HTTP {code}")
        except (urllib.error.URLError, TimeoutError) as exc:
            print(f"Skipping {url}: {exc}")
    if not available:
        print("No changed pages are publicly available yet.", file=sys.stderr)
        sys.exit(1)

    payload = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_URL,
        "urlList": available,
    }).encode()
    request = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "OMBEREG-IndexNow/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            print(f"IndexNow response: {response.status}. Submitted {len(available)} changed URLs.")
    except urllib.error.HTTPError as exc:
        if exc.code == 202:
            print(f"IndexNow accepted {len(available)} URLs; verification pending.")
        else:
            raise


if __name__ == "__main__":
    main()
