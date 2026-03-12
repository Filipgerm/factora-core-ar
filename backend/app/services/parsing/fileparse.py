"""
PDF/Text File Parser - Extracts text from PDFs using PyPDF2 and OCR fallback
"""

import sys
import json
import os
from pathlib import Path
from typing import Dict, Any
import argparse

try:
    import PyPDF2
except ImportError:
    print("Error: Please install PyPDF2: pip install PyPDF2")
    sys.exit(1)

# OCR dependencies
try:
    import fitz  # PyMuPDF
    import pytesseract
    from PIL import Image
    import io

    OCR_AVAILABLE = True
    # Try to set tesseract path for conda env
    conda_prefix = os.environ.get("CONDA_PREFIX")
    if conda_prefix:
        tesseract_path = os.path.join(conda_prefix, "Library", "bin", "tesseract.exe")
        if os.path.exists(tesseract_path):
            # Tell pytesseract to use this specific Tesseract executable
            # instead of looking for 'tesseract' in the system PATH
            # This is crucial because conda installs Tesseract in a specific location
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
except ImportError:
    OCR_AVAILABLE = False


def is_pdf_file(file_path: str) -> bool:
    try:
        with open(file_path, "rb") as file:
            # Every valid pdf file starts with %PDF. Check by reading these first 4 bytes
            header = file.read(4)
            return header == b"%PDF"
    except Exception:
        return False


def extract_text_pypdf2(file_path: str) -> Dict[str, Any]:
    try:
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- PAGE {i+1} ---\n{page_text}\n"
            text = text.strip()
            return {
                "success": bool(text),
                "text": text,
                "method": "PyPDF2",
                "page_count": len(reader.pages),
                "issues": (
                    [] if text else ["No text extracted - PDF may be image-based"]
                ),
            }
    except Exception as e:
        return {
            "success": False,
            "text": "",
            "method": "PyPDF2",
            "page_count": 0,
            "issues": [f"PyPDF2 extraction failed: {str(e)}"],
        }


def extract_text_ocr(file_path: str) -> Dict[str, Any]:
    if not OCR_AVAILABLE:
        return {
            "success": False,
            "text": "",
            "method": "OCR",
            "page_count": 0,
            "issues": ["OCR dependencies not available (pytesseract, fitz, PIL)"],
        }
    try:
        doc = fitz.open(file_path)
        text = ""
        for i in range(len(doc)):
            page = doc[i]
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            ocr_text = pytesseract.image_to_string(img, lang="eng+ell") # Specifies english and greek language
            text += f"\n--- PAGE {i+1} (OCR) ---\n{ocr_text}\n"
        text = text.strip()
        return {
            "success": bool(text),
            "text": text,
            "method": "OCR",
            "page_count": len(doc),
            "issues": [] if text else ["OCR did not extract any text"],
        }
    except Exception as e:
        return {
            "success": False,
            "text": "",
            "method": "OCR",
            "page_count": 0,
            "issues": [f"OCR extraction failed: {str(e)}"],
        }


def extract_pdf_text(file_path: str) -> Dict[str, Any]:
    # Try PyPDF2 first
    pypdf2_result = extract_text_pypdf2(file_path)
    if pypdf2_result["success"] and len(pypdf2_result["text"].split()) > 5:
        extracted_text = pypdf2_result["text"]
        method = pypdf2_result["method"]
    else:
        # Fallback to OCR
        ocr_result = extract_text_ocr(file_path)
        extracted_text = ocr_result["text"]
        method = ocr_result["method"]

    # Create comparison data for frontend
    comparison = {
        "similarity_percentage": 100.0,  # Since we only have one extraction method now
        "original_word_count": len(extracted_text.split()),
        "parsed_word_count": len(extracted_text.split()),
        "additions": [],
        "deletions": [],
        "original_text": extracted_text,
        "parsed_text": extracted_text,
    }

    return {
        "method": method,
        "text": extracted_text,
        "page_count": (
            pypdf2_result["page_count"]
            if method == "PyPDF2"
            else ocr_result["page_count"]
        ),
        "issues": (
            pypdf2_result["issues"] if method == "PyPDF2" else ocr_result["issues"]
        ),
        "comparison": comparison,
    }