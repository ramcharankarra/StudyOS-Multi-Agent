import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.material import Material
from app.schemas.material import MaterialResponse, MaterialUpdate
from app.services.storage import StorageService

logger = logging.getLogger("materials_api")

router = APIRouter(prefix="/materials", tags=["materials"])

from app.services.pdf_processing_service import PDFProcessingService

@router.post("/upload", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def upload_course_material(
    course_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    force_upload: Optional[bool] = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    """
    Teacher uploads course learning resource (PDF, PPT, DOCX, TXT, IMAGE).
    """
    logger.info(
        f"[Upload Request] User '{current_user.email}' (ID: {current_user.id}, Role: {current_user.role}) "
        f"uploading file '{file.filename}' for course_id: '{course_id}'"
    )

    # 1. Validate course_id UUID format
    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        logger.error(f"[Upload Error] Invalid UUID format for course_id: '{course_id}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid course_id UUID format: '{course_id}'"
        )

    # 2. Verify course exists
    course = db.query(Course).filter(Course.id == c_uuid).first()
    if not course:
        logger.error(f"[Upload Error] Course '{course_id}' not found in database")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course not found for ID: '{course_id}'"
        )
        
    # 3. Ownership check (Teacher must own course)
    if str(course.teacher_id) != str(current_user.id):
        logger.error(
            f"[Upload Error] User '{current_user.id}' does not own course '{course.id}' "
            f"(Owner Teacher ID: '{course.teacher_id}')"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: You can only upload materials to courses you teach."
        )

    # 3.5 Subject Mismatch Validation
    contents = await file.read()
    await file.seek(0)
    
    extracted_text = PDFProcessingService.extract_text(contents, file.filename)
    if not force_upload:
        subject_check = PDFProcessingService.validate_subject_alignment(extracted_text, course.title, file.filename)
        if subject_check["is_mismatch"]:
            logger.warning(f"[Upload Warning] Subject Mismatch: {subject_check['warning']}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=subject_check["warning"]
            )

    # 4. Storage upload
    try:
        file_url, file_type, file_size = await StorageService.upload_file(file)
        logger.info(f"[Upload Storage] File stored successfully: url='{file_url}', type='{file_type}', size={file_size} bytes")
    except Exception as e:
        logger.exception(f"[Upload Storage Error] StorageService.upload_file failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File storage failed: {str(e)}"
        )

    # 5. Database record creation
    try:
        material = Material(
            course_id=c_uuid,
            uploaded_by=current_user.id,
            title=title,
            description=description,
            file_url=file_url,
            file_type=file_type,
            file_size=file_size,
            processing_status="INDEXED"
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        logger.info(f"[Upload Success] Material database row created (ID: {material.id}, Title: '{material.title}')")
        return material
    except Exception as e:
        db.rollback()
        logger.exception(f"[Upload DB Error] Failed to insert material into database: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database record creation failed: {str(e)}"
        )

@router.get("/course/{course_id}", response_model=List[MaterialResponse])
def get_course_materials(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all learning materials for a course (Accessible by Course Teacher or Enrolled Students).
    """
    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course_id UUID format")

    course = db.query(Course).filter(Course.id == c_uuid).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Authorization check
    is_teacher = str(course.teacher_id) == str(current_user.id)
    is_enrolled = db.query(Enrollment).filter(
        Enrollment.course_id == c_uuid,
        Enrollment.student_id == current_user.id
    ).first() is not None

    if not (is_teacher or is_enrolled or course.visibility == "public"):
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")

    materials = db.query(Material).filter(Material.course_id == c_uuid).order_by(Material.created_at.desc()).all()
    return materials

@router.get("/{material_id}", response_model=MaterialResponse)
def get_material_detail(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        m_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid material_id UUID format")

    material = db.query(Material).filter(Material.id == m_uuid).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.put("/{material_id}", response_model=MaterialResponse)
def update_material_details(
    material_id: str,
    material_in: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    try:
        m_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid material_id UUID format")

    material = db.query(Material).filter(Material.id == m_uuid).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    if str(material.uploaded_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only edit materials you uploaded")

    if material_in.title is not None:
        material.title = material_in.title
    if material_in.description is not None:
        material.description = material_in.description

    db.add(material)
    db.commit()
    db.refresh(material)
    return material

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    try:
        m_uuid = uuid.UUID(material_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid material_id UUID format")

    material = db.query(Material).filter(Material.id == m_uuid).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    if str(material.uploaded_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only delete materials you uploaded")

    # Delete storage file
    StorageService.delete_file(material.file_url)

    db.delete(material)
    db.commit()
    return None
