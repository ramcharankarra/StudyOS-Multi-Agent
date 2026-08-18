import asyncio
import os
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.material import Material
from app.models.mission import Mission, MissionArtifact
from app.models.planner import StudyPlan, DailyTask
from app.schemas.user import UserCreate
from app.api.v1.auth import register
from app.api.v1.missions import _run_mission_background
from app.api.v1.planner import get_student_study_plan, get_today_tasks, update_task_status, TaskUpdateInput, get_planner_summary

async def run_workspace_to_planner_integration_tests():
    print("\n=======================================================")
    print("  WORKSPACE -> PLANNER INTEGRATION END-TO-END SUITE   ")
    print("=======================================================\n")

    db = SessionLocal()

    email = "integration_user@studyos.edu"
    teacher_email = "prof_integration@studyos.edu"
    for e in [email, teacher_email]:
        existing = db.query(User).filter(User.email == e).first()
        if existing:
            db.delete(existing)
            db.commit()

    teacher = User(name="Prof Integration", email=teacher_email, role="teacher")
    student = register(UserCreate(name="Integration Student", email=email, password="Password123", role="student"), db=db)
    db.add(teacher)
    db.commit()

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    uploads_dir = os.path.join(backend_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    # 1. Create Enrolled Course & Material
    course = Course(title="NLP Master Course", join_code="NLP_INT_101", teacher_id=teacher.id)
    db.add(course)
    db.commit()

    enrollment = Enrollment(student_id=student.id, course_id=course.id)
    db.add(enrollment)
    db.commit()

    nlp_pdf_path = os.path.join(uploads_dir, "nlp_integration_slides.pdf")
    nlp_text_chunks = [
        "Slide 1: Introduction to Natural Language Processing & Corpus Processing.",
        "Slide 12: Transformers and Self-Attention Architecture (QKV Matrix Projections).",
        "Slide 25: BERT Masked Language Modeling and Fine-tuning."
    ]
    nlp_pdf_content = ("%PDF-1.4 Natural Language Processing Lecture Slides:\n" + "\n".join(nlp_text_chunks)).encode("utf-8")
    with open(nlp_pdf_path, "wb") as f:
        f.write(nlp_pdf_content)

    material = Material(
        course_id=course.id,
        uploaded_by=teacher.id,
        title="nlp_integration_slides.pdf",
        file_url="/uploads/nlp_integration_slides.pdf",
        file_type="PDF",
        file_size=len(nlp_pdf_content),
        processing_status="INDEXED"
    )
    db.add(material)
    db.commit()

    # 2. Launch Workspace Mission
    print("STEP 1: Launching Workspace Mission...")
    goal = "Prepare me for NLP exam in 10 days."
    mission = Mission(user_id=student.id, goal=goal, status="pending", progress_pct=0)
    db.add(mission)
    db.commit()

    await _run_mission_background(
        mission_id=mission.id,
        goal=goal,
        priority="normal",
        course_id=str(course.id),
        user_id=student.id
    )

    db.refresh(mission)
    print(f"✓ Mission completed with status: '{mission.status}'")

    # 3. Verify PostgreSQL Task Rows
    print("\nSTEP 2: Verifying PostgreSQL DailyTask rows...")
    tasks_in_db = db.query(DailyTask).filter(DailyTask.student_id == student.id).order_by(DailyTask.deadline.asc()).all()
    print(f"✓ Total DailyTask rows in DB: {len(tasks_in_db)}")

    assert len(tasks_in_db) > 0, "TEST FAILED: No DailyTask rows found in PostgreSQL!"
    for idx, t in enumerate(tasks_in_db[:5], 1):
        print(f"  Task {idx}: ID={t.id} | Title='{t.title}' | Deadline={t.deadline} | Cat={t.category}")
        assert t.student_id == student.id, "TEST FAILED: Student ID mismatch!"
        assert t.mission_id == mission.id, "TEST FAILED: Mission ID mismatch!"
        assert t.course_id == course.id, "TEST FAILED: Course ID mismatch!"
        assert t.deadline is not None, "TEST FAILED: Deadline is None!"

    # 4. Call Planner API
    print("\nSTEP 3: Calling GET /api/v1/planner API...")
    planner_res = get_student_study_plan(db=db, current_user=student)
    api_tasks = planner_res.get("tasks", [])
    print(f"✓ API returned {len(api_tasks)} tasks")
    assert len(api_tasks) == len(tasks_in_db), "TEST FAILED: API tasks count mismatch!"

    first_task = api_tasks[0]
    first_task_id = first_task["id"]
    print(f"  First API Task: ID={first_task_id} | Title='{first_task['title']}' | Status='{first_task['status']}'")

    # 5. Mark Task Complete via API
    print("\nSTEP 4: Marking task complete via PUT /api/v1/planner/task/{id}...")
    update_res = update_task_status(
        task_id=first_task_id,
        task_in=TaskUpdateInput(status="completed"),
        db=db,
        current_user=student
    )
    print(f"✓ Updated Task Status: '{update_res['status']}'")
    assert update_res["status"] == "completed", "TEST FAILED: Task completion status update failed!"

    # 6. Verify Summary API
    print("\nSTEP 5: Verifying GET /api/v1/planner/summary metrics...")
    summary_res = get_planner_summary(db=db, current_user=student)
    print(f"✓ Summary: total_tasks={summary_res['total_tasks']}, completed_tasks={summary_res['completed_tasks']}, progress_pct={summary_res['progress_pct']}%")
    assert summary_res["completed_tasks"] == 1, "TEST FAILED: Summary completed_tasks metric mismatch!"
    assert summary_res["progress_pct"] > 0, "TEST FAILED: Progress percentage not updated!"

    # 7. Test Idempotency (Re-running Mission should not duplicate tasks)
    print("\nSTEP 6: Testing Idempotency (Re-triggering persistence for same mission & artifacts)...")
    artifacts = db.query(MissionArtifact).filter(MissionArtifact.mission_id == mission.id).all()
    count_before = db.query(DailyTask).filter(DailyTask.student_id == student.id).count()

    await _run_mission_background(
        mission_id=mission.id,
        goal=goal,
        priority="normal",
        course_id=str(course.id),
        user_id=student.id
    )

    count_after = db.query(DailyTask).filter(DailyTask.student_id == student.id).count()
    print(f"✓ Task count before re-run: {count_before} | Task count after re-run: {count_after}")
    assert count_after == count_before, "TEST FAILED: Duplicate tasks were created on re-run!"

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

    print("\n=======================================================")
    print(" ✅ ALL WORKSPACE -> PLANNER INTEGRATION TESTS PASSED 100% ")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_workspace_to_planner_integration_tests())
