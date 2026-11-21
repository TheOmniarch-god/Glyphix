#!/usr/bin/env python3
"""
Discord image exporter — pulls every image attachment out of a channel,
thread, or forum post and saves it locally, with a JSON manifest.

Standard library only (no pip installs). Your token is read from a prompt or
an environment variable and is NEVER written to disk or logged.

------------------------------------------------------------------------
QUICK START
------------------------------------------------------------------------
    # token via prompt (this is the safe way — nothing stored)
    python3 tools/discord_exporter.py 1564666170026758145 --out _discord_export

    # token from an env var instead
    DISCORD_TOKEN='your-token' python3 tools/discord_exporter.py 1564666170026758145

    # images usually sit inside a thread/forum post — crawl those too
    python3 tools/discord_exporter.py 1533739700941095036 --include-threads

    # see what would be downloaded without downloading anything
    python3 tools/discord_exporter.py 1564666170026758145 --dry-run

------------------------------------------------------------------------
HOW TO GET A TOKEN  (use the throwaway account you are creating)
------------------------------------------------------------------------
1. Log in to Discord **in a browser** with that account.
2. Open DevTools (F12) -> Network tab -> send any message or click any channel.
3. Click any request to `discord.com/api/v9/...`, open Headers, and copy the
   value of the `authorization` header ("Request Headers").
4. Use it here. Do not paste it into chat, and do not commit it.

Because you have a **second, disposable** account that is already a member of
the server, this reads that account's view of the channel: no bot invite, no
admin consent, nothing installed in the server. Revoke afterwards by changing
the account's password (that invalidates every session token).

Note: `--include-threads` sends a *request* to the API for active threads,
which technically pings the server. Plain message reading does not.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://discord.com/api/v10"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

IMAGE_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif",
    ".bmp", ".svg", ".heic", ".heif", ".tif", ".tiff",
}

THREAD_TYPES = {10, 11, 12}  # announcement / public / private thread


class Fatal(Exception):
    """Unrecoverable problem (bad token, no access, wrong channel ID)."""
FORUM_TYPES = {15, 16}       # forum / media channel


# ----------------------------------------------------------------------
# tiny HTTP helper with 429 back-off
# ----------------------------------------------------------------------
def _request(url: str, token: str, *, tries: int = 5) -> bytes:
    for attempt in range(1, tries + 1):
        req = urllib.request.Request(url, headers={
            "Authorization": token,
            "User-Agent": UA,
            "Accept": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read()
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", "replace")
            if err.code == 429:
                try:
                    wait = float(json.loads(body).get("retry_after", 2.0))
                except Exception:
                    wait = 2.0
                print(f"    rate limited, waiting {wait:.1f}s ...", flush=True)
                time.sleep(wait + 0.25)
                continue
            if err.code == 401:
                die("401 Unauthorized — token is wrong, expired, or a bot token "
                    "used without the 'Bot ' prefix.")
            if err.code == 403:
                die(f"403 Forbidden — that account cannot read this channel.\n"
                    f"    Make sure the throwaway account is a member of the server\n"
                    f"    and can actually open the channel in the Discord client.\n"
                    f"    {body[:300]}")
            if err.code == 404:
                die(f"404 Not Found — wrong channel ID, or the channel is a\n"
                    f"    thread/forum post (pass its own ID), or it was deleted.\n"
                    f"    {body[:300]}")
            die(f"HTTP {err.code} from {url}\n    {body[:400]}")
        except urllib.error.URLError as err:
            if attempt == tries:
                die(f"Network error talking to {url}: {err.reason}")
            print(f"    network hiccup ({err.reason}), retry {attempt}/{tries} ...")
            time.sleep(2 * attempt)
    die("gave up after repeated failures")


def api_get(path: str, token: str, **params) -> object:
    url = f"{API}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    return json.loads(_request(url, token))


def die(msg: str) -> None:
    raise Fatal(msg)


# ----------------------------------------------------------------------
# discovery
# ----------------------------------------------------------------------
def fetch_messages(channel_id: str, token: str, limit: int | None) -> list[dict]:
    """Walk the channel history newest -> oldest, 100 per page."""
    out: list[dict] = []
    before = None
    while True:
        page = api_get(f"/channels/{channel_id}/messages",
                       token, limit=100, **({"before": before} if before else {}))
        if not page:
            break
        out.extend(page)
        print(f"    ... {len(out)} messages read", flush=True)
        if limit and len(out) >= limit:
            out = out[:limit]
            break
        if len(page) < 100:
            break
        before = page[-1]["id"]
        time.sleep(0.4)  # be polite
    return out


def list_threads(channel_id: str, token: str) -> list[dict]:
    """Active + public archived threads under a channel."""
    threads: list[dict] = []
    try:
        guild_side = api_get(f"/channels/{channel_id}/threads/archived/public",
                             token, limit=100)
        threads.extend(guild_side.get("threads", []))
    except Fatal:
        pass  # endpoint unavailable for this channel type — fine

    try:
        info = api_get(f"/channels/{channel_id}", token)
        if info.get("guild_id"):
            active = api_get(f"/guilds/{info['guild_id']}/threads/active", token)
            threads.extend(t for t in active.get("threads", [])
                           if t.get("parent_id") == channel_id)
    except Fatal:
        pass
    return threads


def message_files(msg: dict) -> list[dict]:
    """Every image in a message: attachments first, then embed images."""
    found: list[dict] = []

    for att in msg.get("attachments", []) or []:
        name = att.get("filename") or "file"
        ctype = (att.get("content_type") or "").lower()
        if ctype.startswith("image/") or Path(name).suffix.lower() in IMAGE_EXTS:
            found.append({"url": att["url"], "name": name,
                          "size": att.get("size"), "kind": "attachment"})

    for emb in msg.get("embeds", []) or []:
        for key in ("image", "thumbnail"):
            node = emb.get(key) or {}
            src = node.get("url") or node.get("proxy_url")
            if src:
                base = urllib.parse.urlparse(src).path.rsplit("/", 1)[-1] or "embed"
                if not Path(base).suffix and not src.split("?")[0].lower().endswith(
                        tuple(IMAGE_EXTS)):
                    base += ".png"
                found.append({"url": src, "name": base, "size": None,
                              "kind": f"embed-{key}"})
    return found


def safe_name(text: str, fallback: str) -> str:
    text = re.sub(r"[^\w.\-]+", "_", text or "").strip("._")
    return (text or fallback)[:120]


# ----------------------------------------------------------------------
# download
# ----------------------------------------------------------------------
def download(item: dict, dest: Path, *, dry_run: bool, overwrite: bool) -> str:
    if dest.exists() and not overwrite:
        return "exists"
    if dry_run:
        return "would-fetch"
    req = urllib.request.Request(item["url"], headers={"User-Agent": UA})
    tmp = dest.with_suffix(dest.suffix + ".part")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp, open(tmp, "wb") as fh:
            while chunk := resp.read(1 << 16):
                fh.write(chunk)
        tmp.replace(dest)
        return "ok"
    except Exception as err:  # noqa: BLE001 - keep going, record the failure
        tmp.unlink(missing_ok=True)
        print(f"    ! failed {item['name']}: {err}")
        return f"failed: {err}"


# ----------------------------------------------------------------------
def main() -> None:
    global API

    ap = argparse.ArgumentParser(
        description="Export image attachments from a Discord channel/thread.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__)
    ap.add_argument("channel_id",
                    help="channel / thread / forum-post ID (the first long "
                         "number in the URL you already have)")
    ap.add_argument("--out", default="_discord_export",
                    help="output folder (default: _discord_export)")
    ap.add_argument("--token", help="token (prefer the DISCORD_TOKEN env var or "
                                   "the prompt — this flag leaks into shell history)")
    ap.add_argument("--all-files", action="store_true",
                    help="also grab non-image attachments (pdf, zip, mp4 ...)")
    ap.add_argument("--include-threads", action="store_true",
                    help="also crawl threads/forum posts hanging off the channel")
    ap.add_argument("--max", type=int, help="stop after N messages (newest first)")
    ap.add_argument("--overwrite", action="store_true", help="re-download existing files")
    ap.add_argument("--dry-run", action="store_true",
                    help="list what would be downloaded, download nothing")
    ap.add_argument("--api-base", default=os.environ.get("DISCORD_API_BASE", API),
                    help=argparse.SUPPRESS)  # used by the test suite
    args = ap.parse_args()

    API = args.api_base.rstrip("/")

    token = args.token or os.environ.get("DISCORD_TOKEN") or ""
    if not token:
        try:
            token = getpass.getpass(
                "Discord token (input hidden, not stored anywhere): ").strip()
        except (EOFError, OSError):
            die("no token supplied. Pass DISCORD_TOKEN=... , use --token, or "
                "run interactively so the hidden prompt can appear.")
    if not token:
        die("no token supplied")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    targets = [(args.channel_id, "channel")]
    if args.include_threads:
        print("Looking for threads / forum posts ...")
        for th in list_threads(args.channel_id, token):
            if th.get("type") in THREAD_TYPES or th.get("type") in FORUM_TYPES:
                targets.append((th["id"], th.get("name") or th["id"]))

    manifest: list[dict] = []
    seen: set[str] = set()
    failures = 0

    for chan_id, label in targets:
        print(f"\n[{label}] id={chan_id}")
        try:
            msgs = fetch_messages(chan_id, token, args.max)
        except Fatal as err:
            if chan_id == args.channel_id:
                raise  # the channel the user asked for: hard stop
            print(f"    skipped ({err})")
            continue

        msgs.reverse()  # oldest -> newest, so numbering reads naturally
        for msg in msgs:
            files = message_files(msg)
            if args.all_files:
                named = {f["url"] for f in files}
                for att in msg.get("attachments", []) or []:
                    if att["url"] not in named:
                        files.append({"url": att["url"],
                                      "name": att.get("filename", "file"),
                                      "size": att.get("size"),
                                      "kind": "attachment"})
            for idx, item in enumerate(files):
                if item["url"] in seen:
                    continue
                seen.add(item["url"])

                stamp = msg["id"]
                name = safe_name(item["name"], f"file{idx}")
                fname = f"{stamp}_{idx}_{name}"
                result = download(item, out_dir / fname,
                                  dry_run=args.dry_run, overwrite=args.overwrite)
                if result.startswith("failed"):
                    failures += 1
                manifest.append({
                    "saved_as": fname if result in ("ok", "exists") else None,
                    "original_name": item["name"],
                    "kind": item["kind"],
                    "bytes": item.get("size"),
                    "message_id": msg["id"],
                    "channel_id": chan_id,
                    "author": (msg.get("author") or {}).get("username"),
                    "timestamp": msg.get("timestamp"),
                    "content": (msg.get("content") or "")[:500],
                    "source_url": item["url"],
                    "status": result,
                })
                print(f"    {result:<12} {fname}")

    if not args.dry_run:
        (out_dir / "manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    got = sum(1 for m in manifest if m["status"] in ("ok", "exists"))
    print(f"\nDone. {got} file(s) in {out_dir}/"
          + (f", {failures} failed" if failures else ""))
    if args.dry_run:
        print("(dry run — nothing was written)")
    else:
        print(f"Manifest: {out_dir}/manifest.json")


if __name__ == "__main__":
    try:
        main()
    except Fatal as err:
        print(f"\n  ERROR: {err}\n", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n  interrupted — partial files kept, rerun to resume.", file=sys.stderr)
        sys.exit(130)
