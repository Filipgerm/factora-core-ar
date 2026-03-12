import urllib.parse
from typing import Optional

def extract_filename(content_disposition: str, fallback: str) -> str:
    """
    Extract a human-friendly filename from Content-Disposition.
    Handles RFC 5987 (filename*=) and plain filename=.
    """
    if not content_disposition:
        return fallback

    # Prefer filename*=
    if "filename*=" in content_disposition:
        # e.g. filename*=UTF-8''%CE%95%CF%84%CE%B7%CF%83%CE%B9%CE%B1.pdf
        part = content_disposition.split("filename*=", 1)[1]
        # split on semicolon or whitespace end
        part = part.split(";")[0].strip()
        # typically "<charset>''<urlencoded>"
        if "''" in part:
            part = part.split("''", 1)[1]
        return urllib.parse.unquote(part.strip('"; '))

    # Fallback filename=
    if "filename=" in content_disposition:
        part = content_disposition.split("filename=", 1)[1]
        part = part.split(";")[0].strip().strip('"')
        return part or fallback

    return fallback