#!/usr/bin/env python3

from __future__ import annotations

import argparse
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT_DIR = Path(__file__).resolve().parents[1]
EXPORT_DIR = ROOT_DIR / "site" / "out"


class ExportHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def translate_path(self, path: str) -> str:
        parsed_path = urlparse(path).path
        normalized = posixpath.normpath(unquote(parsed_path))
        relative_path = normalized.lstrip("/")

        candidate = EXPORT_DIR / relative_path
        if candidate.is_dir():
            candidate = candidate / "index.html"
        elif not candidate.exists() and not Path(relative_path).suffix:
            html_candidate = EXPORT_DIR / f"{relative_path}.html"
            if html_candidate.exists():
                candidate = html_candidate

        return str(candidate)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the static Next.js export with clean route fallbacks.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3000)
    args = parser.parse_args()

    if not EXPORT_DIR.exists():
        raise SystemExit("site/out does not exist. Run npm run build first.")

    server = ThreadingHTTPServer((args.host, args.port), ExportHandler)
    print(f"Serving {EXPORT_DIR} at http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
