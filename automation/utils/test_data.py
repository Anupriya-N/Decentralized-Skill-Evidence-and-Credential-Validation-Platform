import time
import hashlib
import io

def generate_timestamped_email(prefix="test.student"):
    ts = int(time.time() * 1000)
    return f"{prefix}.{ts}@certitrust-test.edu"

def generate_student_payload():
    email = generate_timestamped_email("auto.student")
    return {
        "email": email,
        "password": "Password123!",
        "name": f"Automation Student {email.split('@')[0]}",
        "role": "STUDENT"
    }

def generate_institution_payload():
    email = generate_timestamped_email("auto.inst")
    return {
        "email": email,
        "password": "Password123!",
        "name": "Automation Technical Institute",
        "role": "INSTITUTION",
        "institutionName": "Automation Technical Institute"
    }

def generate_valid_pdf_bytes():
    # Valid PDF with unique timestamp to ensure unique SHA-256 hash per test run
    ts = time.time()
    header = f"%PDF-1.4\n% Timestamp: {ts}\n".encode("utf-8")
    body = (
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    )
    return header + body

def compute_sha256(byte_data):
    return hashlib.sha256(byte_data).hexdigest()
