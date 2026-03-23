"""Parse Content-Disposition headers for download filenames."""
from __future__ import annotations

import urllib.parse


def extract_filename(content_disposition: str, fallback: str) -> str:
    """
    Extract a human-friendly filename from Content-Disposition.
    Handles RFC 5987 (filename*=) and plain filename=.
    """
    if not content_disposition:
        return fallback

    if "filename*=" in content_disposition:
        part = content_disposition.split("filename*=", 1)[1]
        part = part.split(";")[0].strip()
        if "''" in part:
            part = part.split("''", 1)[1]
        return urllib.parse.unquote(part.strip('"; '))

    if "filename=" in content_disposition:
        part = content_disposition.split("filename=", 1)[1]
        part = part.split(";")[0].strip().strip('"')
        return part or fallback

    return fallback
