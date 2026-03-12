"""
PDF to Images Converter
Converts PDF pages to PNG images for display in the frontend
"""

import sys
import os
import json
import fitz  # PyMuPDF
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

def pdf_to_images(pdf_path: str, output_dir: str) -> list[str]:
    """
    Convert PDF pages to PNG images.

    Args:
        pdf_path (str): Path to the PDF file.
        output_dir (str): Directory to save the images.

    Returns:
        List[str]: List of image file paths.

    Raises:
        FileNotFoundError: If the PDF file does not exist.
        RuntimeError: If conversion fails.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    try:
        os.makedirs(output_dir, exist_ok=True)
        
        # Open the PDF
        doc = fitz.open(pdf_path)
        image_paths = []
        
        for i in range(len(doc)):
            page = doc[i]
            # Create a higher resolution image for better quality
            mat = fitz.Matrix(2, 2)  # Scale factor for better quality
            pix = page.get_pixmap(matrix=mat)
            
            # Save as PNG
            img_path = os.path.join(output_dir, f"page_{i+1}.png")
            pix.save(img_path)
            image_paths.append(img_path)
        
        doc.close()
        return image_paths
        
    except Exception as e:
        raise RuntimeError(f"Failed to convert PDF to images: {str(e)}")


def generate_pdf_images(file_path: str, output_dir: str) -> list[str]:
    os.makedirs(output_dir, exist_ok=True)
    image_paths = pdf_to_images(file_path, output_dir)
    return [os.path.basename(p) for p in image_paths]



