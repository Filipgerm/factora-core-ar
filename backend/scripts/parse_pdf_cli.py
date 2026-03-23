"""CLI: extract text from a PDF using pypdf (embedded text layers)."""
from __future__ import annotations

import argparse
import json
import os
import sys


def is_pdf_file(path: str) -> bool:
    return bool(path) and path.lower().endswith(".pdf") and os.path.isfile(path)


def extract_pdf_text(file_path: str) -> dict:
    try:
        from pypdf import PdfReader
    except ImportError:
        return {"success": False, "error": "pypdf is not installed"}

    try:
        reader = PdfReader(file_path)
        parts: list[str] = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        text = "\n".join(parts).strip()
        return {"success": True, "text": text, "pages": len(reader.pages)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse PDF and extract text using pypdf"
    )
    parser.add_argument("file_path", help="Path to the PDF file to parse")
    args = parser.parse_args()
    file_path = args.file_path
    if not os.path.exists(file_path):
        print(
            json.dumps(
                {"success": False, "error": f"File not found: {file_path}"}, indent=2
            )
        )
        sys.exit(1)
    if not is_pdf_file(file_path):
        print(
            json.dumps({"success": False, "error": "File is not a valid PDF"}, indent=2)
        )
        sys.exit(1)
    result = extract_pdf_text(file_path)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
