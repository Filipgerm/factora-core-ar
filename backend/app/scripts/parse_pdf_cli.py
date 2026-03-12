def main():
    parser = argparse.ArgumentParser(
        description="Parse PDF and extract text using PyPDF2 and OCR fallback"
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
