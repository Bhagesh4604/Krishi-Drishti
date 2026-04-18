"""
Cloudinary Upload Service — Krishi-Drishti
Handles all file uploads (carbon evidence photos, profile photos) to Cloudinary.

Setup:
  1. Create a free account at https://cloudinary.com (25 GB free storage)
  2. Add to your .env file:
       CLOUDINARY_CLOUD_NAME=your_cloud_name
       CLOUDINARY_API_KEY=your_api_key
       CLOUDINARY_API_SECRET=your_api_secret

Cloudinary free tier limits:
  - 25 GB managed storage
  - 25 GB monthly bandwidth
  - Sufficient for 500–1000 farmer evidence photos per month
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

_CONFIGURED = False

try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api

    _cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    _api_key = os.getenv("CLOUDINARY_API_KEY", "")
    _api_secret = os.getenv("CLOUDINARY_API_SECRET", "")

    if _cloud_name and _api_key and _api_secret:
        cloudinary.config(
            cloud_name=_cloud_name,
            api_key=_api_key,
            api_secret=_api_secret,
            secure=True,
        )
        _CONFIGURED = True
        print("[Cloudinary] Configured successfully.")
    else:
        print(
            "[Cloudinary] WARNING: CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET not set. "
            "File uploads will be unavailable. Add credentials to .env to enable."
        )
except ImportError:
    print(
        "[Cloudinary] WARNING: 'cloudinary' package not installed. "
        "Run: pip install cloudinary"
    )


ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def is_configured() -> bool:
    """Returns True if Cloudinary credentials are set and the SDK is available."""
    return _CONFIGURED


def upload_evidence_photo(
    file_bytes: bytes,
    content_type: str,
    farmer_id: int,
    project_id: int,
) -> dict:
    """
    Uploads a carbon evidence photo to Cloudinary.

    Args:
        file_bytes:   Raw bytes of the image file.
        content_type: MIME type (e.g., "image/jpeg").
        farmer_id:    ID of the farmer uploading (for folder organisation).
        project_id:   ID of the carbon project this evidence belongs to.

    Returns:
        dict with keys:
          - url (str): Public HTTPS URL of the uploaded image
          - public_id (str): Cloudinary identifier for deletion/management
          - width, height (int): Image dimensions
          - format (str): "jpg", "png", etc.
          - bytes (int): File size

    Raises:
        ValueError: If file type is not allowed or file is too large.
        RuntimeError: If Cloudinary is not configured or upload fails.
    """
    if not _CONFIGURED:
        raise RuntimeError(
            "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file."
        )

    # Validate file type
    if content_type not in ALLOWED_TYPES:
        raise ValueError(
            f"File type '{content_type}' is not allowed. "
            f"Accepted types: JPEG, PNG, WebP."
        )

    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise ValueError(
            f"File is too large ({size_mb:.1f} MB). Maximum allowed size is 10 MB."
        )

    # Upload to Cloudinary
    folder = f"krishidrishti/evidence/farmer_{farmer_id}/project_{project_id}"

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="image",
            quality="auto:good",        # Auto-optimize quality
            fetch_format="auto",        # Serve WebP to modern browsers
            flags="attachment",
            context=f"farmer_id={farmer_id}|project_id={project_id}",
            tags=["evidence", f"farmer_{farmer_id}", f"project_{project_id}"],
        )
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
            "bytes": result.get("bytes"),
        }
    except Exception as e:
        raise RuntimeError(f"Cloudinary upload failed: {e}")


def upload_profile_photo(file_bytes: bytes, content_type: str, farmer_id: int) -> str:
    """
    Uploads a farmer profile photo. Returns the public URL.
    """
    if not _CONFIGURED:
        raise RuntimeError("Cloudinary is not configured.")

    if content_type not in ALLOWED_TYPES:
        raise ValueError(f"File type '{content_type}' is not allowed.")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise ValueError("File too large. Maximum 10 MB.")

    result = cloudinary.uploader.upload(
        file_bytes,
        folder=f"krishidrishti/profiles",
        public_id=f"farmer_{farmer_id}_profile",
        resource_type="image",
        overwrite=True,
        quality="auto:good",
        width=400,
        height=400,
        crop="fill",
        gravity="face",
    )
    return result["secure_url"]


def delete_photo(public_id: str) -> bool:
    """
    Deletes a photo from Cloudinary by its public_id.
    Returns True on success, False if not configured or failed.
    """
    if not _CONFIGURED:
        return False
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception:
        return False
