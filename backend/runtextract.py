import re
import textract

def clean(s: str) -> str:
    # common PDF ligatures
    s = (s.replace("\ufb01", "fi")
           .replace("\ufb02", "fl")
           .replace("\ufb03", "ffi")
           .replace("\ufb04", "ffl"))
    # remove page markers like "-- 1 of 3 --"
    s = re.sub(r"\n--\s*\d+\s*of\s*\d+\s*--\s*\n", "\n", s)
    # normalize spacing
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

pdf_path = r"c:\Users\mccor\AppData\Roaming\Cursor\User\workspaceStorage\09d91d8f1e5bbf3c7e86ab4206369ea1\pdfs\9348ec71-6ea8-4708-8b2f-31e9472057d8\Gavin_McCormack_Transcript.pdf"
raw = textract.process(pdf_path, method="pdfminer").decode("utf-8", "replace")
text = clean(raw)

print(text[:2000])