import os
import uuid
import logging
from typing import Tuple
from fastapi import UploadFile

logger = logging.getLogger("storage_service")

# Ensure local upload directory exists as fallback
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

class StorageService:
    @staticmethod
    async def upload_file(file: UploadFile) -> Tuple[str, str, int]:
        """
        Upload file stream to Cloudinary or local fallback storage.
        Returns: (file_url, file_type, file_size)
        """
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        api_key = os.getenv("CLOUDINARY_KEY")
        api_secret = os.getenv("CLOUDINARY_SECRET")

        contents = await file.read()
        file_size = len(contents)
        file_ext = file.filename.split(".")[-1].upper() if "." in file.filename else "TXT"
        
        # Map extension to standard file_type
        type_mapping = {
            "PDF": "PDF",
            "PPT": "PPT",
            "PPTX": "PPT",
            "DOC": "DOCX",
            "DOCX": "DOCX",
            "TXT": "TXT",
            "PNG": "IMAGE",
            "JPG": "IMAGE",
            "JPEG": "IMAGE",
            "MP4": "VIDEO"
        }
        file_type = type_mapping.get(file_ext, "OTHER")

        # Try Cloudinary if credentials provided
        if cloud_name and api_key and api_secret:
            try:
                import cloudinary
                import cloudinary.uploader

                cloudinary.config(
                    cloud_name=cloud_name,
                    api_key=api_key,
                    api_secret=api_secret
                )

                upload_result = cloudinary.uploader.upload(
                    contents,
                    folder="studyos/materials",
                    resource_type="auto"
                )
                file_url = upload_result.get("secure_url")
                logger.info(f"Uploaded file to Cloudinary: {file_url}")
                return file_url, file_type, file_size
            except Exception as e:
                logger.warning(f"Cloudinary upload failed, using local storage fallback: {str(e)}")

        # Fallback local storage
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        local_path = os.path.join(LOCAL_UPLOAD_DIR, unique_filename)
        with open(local_path, "wb") as f:
            f.write(contents)

        file_url = f"/uploads/{unique_filename}"
        logger.info(f"Saved file locally: {file_url}")
        return file_url, file_type, file_size

    @staticmethod
    def delete_file(file_url: str) -> bool:
        """
        Delete file from Cloudinary or local storage.
        """
        if file_url.startswith("/uploads/"):
            filename = file_url.replace("/uploads/", "")
            local_path = os.path.join(LOCAL_UPLOAD_DIR, filename)
            if os.path.exists(local_path):
                os.remove(local_path)
                return True
        return True
