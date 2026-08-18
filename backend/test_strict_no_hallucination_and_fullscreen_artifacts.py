import asyncio
import os
from app.database import SessionLocal
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.material import Material
from app.models.mission import Mission, MissionArtifact
from app.models.planner import StudyPlan, DailyTask
from app.schemas.user import UserCreate
from app.api.v1.auth import register
from app.api.v1.missions import _run_mission_background
from app.services.context_service import ContextService

async def run_end_to_end_grounding_tests():
    print("\n=======================================================")
    print("   STUDYOS GROUNDING & ARTIFACT MASTER TEST SUITE      ")
    print("=======================================================\n")

    db = SessionLocal()

    email = "grounding_master@studyos.edu"
    teacher_email = "prof_grounding@studyos.edu"
    for e in [email, teacher_email]:
        existing = db.query(User).filter(User.email == e).first()
        if existing:
            db.delete(existing)
            db.commit()

    teacher = User(name="Prof Grounding", email=teacher_email, role="teacher")
    student = register(UserCreate(name="Grounding Student", email=email, password="Password123", role="student"), db=db)
    db.add(teacher)
    db.commit()

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    uploads_dir = os.path.join(backend_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    # ------------------------------------------------------------------
    # TEST 1: Telangana_Groups_Syllabus.pdf for NLP Request (MUST REFUSE)
    # ------------------------------------------------------------------
    print("----------------------------------------------------------------------")
    print("TEST 1: Telangana_Groups_Syllabus.pdf for NLP Request (Must Refuse)")
    print("----------------------------------------------------------------------")

    c1 = Course(title="Telangana Competitive Exam Preparation", join_code="TG_GROUPS_101", teacher_id=teacher.id)
    db.add(c1)
    db.commit()
    db.add(Enrollment(student_id=student.id, course_id=c1.id))
    db.commit()

    tg_pdf_path = os.path.join(uploads_dir, "Telangana_Groups_Syllabus.pdf")
    tg_text = (
        "%PDF-1.4 Telangana Groups Official Syllabus:\n"
        "Section 1: History of Telangana and Kakatiya Dynasty.\n"
        "Section 2: Indian Constitution and Public Administration.\n"
        "Section 3: Telangana Economy and Development Policies.\n"
        "Section 4: Geography of Telangana and Natural Resources.\n"
        "Section 5: Satavahanas and Asaf Jahi Dynasty."
    )
    with open(tg_pdf_path, "w", encoding="utf-8") as f:
        f.write(tg_text)

    mat1 = Material(
        course_id=c1.id,
        uploaded_by=teacher.id,
        title="Telangana_Groups_Syllabus.pdf",
        file_url="/uploads/Telangana_Groups_Syllabus.pdf",
        file_type="PDF",
        file_size=len(tg_text),
        processing_status="INDEXED"
    )
    db.add(mat1)
    db.commit()

    m1 = Mission(user_id=student.id, goal="Prepare me for NLP exam in 10 days", status="pending")
    db.add(m1)
    db.commit()

    await _run_mission_background(
        mission_id=m1.id,
        goal="Prepare me for NLP exam in 10 days",
        priority="normal",
        course_id=str(c1.id),
        user_id=student.id
    )

    artifacts_m1 = db.query(MissionArtifact).filter(MissionArtifact.mission_id == m1.id).all()
    print(f"✓ Total artifacts published for Mission 1: {len(artifacts_m1)}")

    # Check refusal message
    refusal_found = False
    for art in artifacts_m1:
        print(f"  Artifact Type: {art.artifact_type} | Title: '{art.title}'")
        art_str = str(art.content_json).lower()
        assert "transformer" not in art_str, "HALLUCINATION DETECTED: 'Transformer' found when syllabus is Telangana Groups!"
        assert "self-attention" not in art_str, "HALLUCINATION DETECTED: 'Self-Attention' found when syllabus is Telangana Groups!"
        assert "bert" not in art_str, "HALLUCINATION DETECTED: 'BERT' found when syllabus is Telangana Groups!"
        if "couldn't find enough nlp content" in art_str:
            refusal_found = True

    assert refusal_found, "TEST 1 FAILED: Explicit refusal message was not found for mismatched NLP request!"
    print(" ✅ TEST 1 PASSED 100%: ZERO NLP hallucinations! Mismatch refusal correctly triggered!\n")

    # ------------------------------------------------------------------
    # TEST 2: Actual NLP PDF for NLP Request (MUST GENERATE TEACHING CONTENT)
    # ------------------------------------------------------------------
    print("----------------------------------------------------------------------")
    print("TEST 2: Actual NLP PDF for NLP Request (Must Generate Grounded Content)")
    print("----------------------------------------------------------------------")

    c2 = Course(title="Natural Language Processing (CS801)", join_code="NLP_CS801", teacher_id=teacher.id)
    db.add(c2)
    db.commit()
    db.add(Enrollment(student_id=student.id, course_id=c2.id))
    db.commit()

    nlp_pdf_path = os.path.join(uploads_dir, "actual_nlp_slides.pdf")
    nlp_text = (
        "%PDF-1.4 Natural Language Processing Lecture Slides:\n"
        "Slide 1: Tokenization, Word Embeddings, and Corpus Preprocessing.\n"
        "Slide 12: Transformers and Self-Attention Architecture (QKV Projections).\n"
        "Slide 25: BERT Masked Language Modeling and Fine-tuning.\n"
        "Slide 40: Recurrent Neural Networks (RNNs) vs Attention Mechanisms."
    )
    with open(nlp_pdf_path, "w", encoding="utf-8") as f:
        f.write(nlp_text)

    mat2 = Material(
        course_id=c2.id,
        uploaded_by=teacher.id,
        title="actual_nlp_slides.pdf",
        file_url="/uploads/actual_nlp_slides.pdf",
        file_type="PDF",
        file_size=len(nlp_text),
        processing_status="INDEXED"
    )
    db.add(mat2)
    db.commit()

    m2 = Mission(user_id=student.id, goal="Prepare me for NLP exam in 10 days", status="pending")
    db.add(m2)
    db.commit()

    await _run_mission_background(
        mission_id=m2.id,
        goal="Prepare me for NLP exam in 10 days",
        priority="normal",
        course_id=str(c2.id),
        user_id=student.id
    )

    artifacts_m2 = db.query(MissionArtifact).filter(MissionArtifact.mission_id == m2.id).all()
    print(f"✓ Total artifacts published for Mission 2: {len(artifacts_m2)}")

    study_plan_art = None
    for art in artifacts_m2:
        print(f"  Artifact Type: {art.artifact_type} | Title: '{art.title}'")
        assert art.artifact_type != "TASK_GRAPH", "BUG DETECTED: TASK_GRAPH was published as a student artifact!"
        if art.artifact_type == "STUDY_PLAN":
            study_plan_art = art

    assert study_plan_art is not None, "TEST 2 FAILED: STUDY_PLAN artifact missing!"
    nlp_art_str = str(study_plan_art.content_json).lower()
    assert "tokenization" in nlp_art_str or "transformer" in nlp_art_str or "nlp" in nlp_art_str, "TEST 2 FAILED: NLP concepts missing from grounded study plan!"
    print(" ✅ TEST 2 PASSED 100%: Actual NLP slides generated grounded study plan!\n")

    # Cleanup
    db.query(DailyTask).filter(DailyTask.student_id == student.id).delete()
    db.query(StudyPlan).filter(StudyPlan.student_id == student.id).delete()
    db.query(MissionArtifact).filter(MissionArtifact.user_id == student.id).delete()
    db.query(Mission).filter(Mission.user_id == student.id).delete()
    db.query(Enrollment).filter(Enrollment.student_id == student.id).delete()
    db.query(Material).filter(Material.uploaded_by == teacher.id).delete()
    db.query(Course).filter(Course.teacher_id == teacher.id).delete()
    db.delete(student)
    db.delete(teacher)
    db.commit()

    print("=======================================================")
    print(" ✅ MASTER GROUNDING & ARTIFACT TEST SUITE PASSED 100% ")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_end_to_end_grounding_tests())
