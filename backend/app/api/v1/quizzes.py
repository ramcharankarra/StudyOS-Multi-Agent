import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.quiz import Quiz
from app.models.assessment import QuizQuestion, QuizAttempt, QuizAnswer

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

class QuizQuestionInput(BaseModel):
    question_text: str
    question_type: str = "MCQ"
    options: Optional[List[str]] = []
    correct_answer: str
    explanation: Optional[str] = None
    points: int = 10

class QuizCreateInput(BaseModel):
    course_id: str
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    questions: List[QuizQuestionInput]

class QuizAnswerSubmit(BaseModel):
    question_id: str
    student_answer: str

class QuizAttemptInput(BaseModel):
    answers: List[QuizAnswerSubmit]

@router.get("/course/{course_id}")
def list_course_quizzes(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        c_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role.lower() == "teacher":
        if course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized for this course")
    else:
        enr = db.query(Enrollment).filter(Enrollment.course_id == c_uuid, Enrollment.student_id == current_user.id).first()
        if not enr:
            raise HTTPException(status_code=403, detail="Not enrolled in this course")

    quizzes = db.query(Quiz).filter(Quiz.course_id == c_uuid).order_by(Quiz.created_at.desc()).all()
    
    result = []
    for q in quizzes:
        q_count = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == q.id).count()
        q_dict = {
            "id": str(q.id),
            "course_id": str(q.course_id),
            "title": q.title,
            "description": q.description,
            "deadline": q.deadline.isoformat() if q.deadline else None,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "question_count": q_count
        }

        if current_user.role.lower() == "student":
            attempt = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id, QuizAttempt.student_id == current_user.id).order_by(QuizAttempt.completed_at.desc()).first()
            if attempt:
                q_dict["completed"] = True
                q_dict["score"] = round(attempt.score, 1)
                q_dict["attempt_id"] = str(attempt.id)
                q_dict["completed_at"] = attempt.completed_at.isoformat() if attempt.completed_at else None
                q_dict["status"] = "COMPLETED"
            else:
                q_dict["completed"] = False
                now = datetime.now(timezone.utc)
                deadline_utc = q.deadline.replace(tzinfo=timezone.utc) if (q.deadline and q.deadline.tzinfo is None) else q.deadline
                if deadline_utc and now > deadline_utc:
                    q_dict["status"] = "OVERDUE"
                else:
                    q_dict["status"] = "NOT_STARTED"
        else:
            attempts_count = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id).count()
            q_dict["attempt_count"] = attempts_count

        result.append(q_dict)

    return result

@router.post("", status_code=status.HTTP_201_CREATED)
def create_quiz_with_questions(
    quiz_in: QuizCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    try:
        c_uuid = uuid.UUID(quiz_in.course_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid course ID format")

    course = db.query(Course).filter(Course.id == c_uuid).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the instructor for this course")

    parsed_deadline = None
    if quiz_in.deadline:
        try:
            parsed_deadline = datetime.fromisoformat(quiz_in.deadline.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid deadline ISO datetime format")

    quiz = Quiz(
        course_id=c_uuid,
        title=quiz_in.title,
        description=quiz_in.description,
        deadline=parsed_deadline,
        created_by=current_user.id
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # Store questions
    created_questions = []
    for q in quiz_in.questions:
        q_obj = QuizQuestion(
            quiz_id=quiz.id,
            question_text=q.question_text,
            question_type=q.question_type,
            options=q.options or [],
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            points=q.points
        )
        db.add(q_obj)
        created_questions.append(q_obj)

    db.commit()
    return {
        "status": "success",
        "quiz_id": str(quiz.id),
        "title": quiz.title,
        "deadline": quiz.deadline.isoformat() if quiz.deadline else None,
        "questions_count": len(created_questions)
    }

@router.get("/{quiz_id}")
async def get_quiz_detail(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        q_uuid = uuid.UUID(quiz_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid quiz ID format")

    quiz = db.query(Quiz).filter(Quiz.id == q_uuid).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    course = db.query(Course).filter(Course.id == quiz.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Associated course not found")

    is_teacher = (current_user.role.lower() == "teacher")
    if is_teacher:
        if course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this quiz")
    else:
        enr = db.query(Enrollment).filter(Enrollment.course_id == quiz.course_id, Enrollment.student_id == current_user.id).first()
        if not enr:
            raise HTTPException(status_code=403, detail="Not enrolled in the course for this quiz")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == q_uuid).all()

    # If quiz has no questions, dynamically generate grounded questions from course RAG chunks and persist
    if not questions:
        try:
            from app.services.context_service import ContextService
            from app.agents.assessment.assessment_agent import AssessmentAgent

            course_title = course.title if course else "Course Workspace"
            ctx = ContextService.build_user_context(db, current_user, quiz.title, str(quiz.course_id))
            chunks = ctx.get("rag_document_chunks", [])

            agent = AssessmentAgent()
            quiz_res = await agent.generate_quiz(course_title, quiz.title, chunks, num_questions=5, course_id=str(quiz.course_id))
            gen_questions = quiz_res.get("quiz", {}).get("questions", [])

            for gq in gen_questions:
                q_obj = QuizQuestion(
                    quiz_id=quiz.id,
                    question_text=gq.get("question") or gq.get("question_text", "Question"),
                    question_type="MCQ",
                    options=gq.get("options") or [],
                    correct_answer=gq.get("answer") or gq.get("correct_answer") or "",
                    explanation=gq.get("explanation"),
                    points=gq.get("points", 10)
                )
                db.add(q_obj)
            db.commit()
            questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == q_uuid).all()
        except Exception as e:
            print(f"[Quizzes] Failed to auto-generate questions for quiz {quiz_id}: {e}")

    attempts_count = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q_uuid).count()

    questions_data = []
    for q in questions:
        q_dict = {
            "id": str(q.id),
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": q.options,
            "points": q.points
        }
        if is_teacher:
            q_dict["correct_answer"] = q.correct_answer
            q_dict["explanation"] = q.explanation
        questions_data.append(q_dict)

    return {
        "id": str(quiz.id),
        "course_id": str(quiz.course_id),
        "course_title": course.title,
        "title": quiz.title,
        "description": quiz.description,
        "deadline": quiz.deadline.isoformat() if quiz.deadline else None,
        "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
        "attempt_count": attempts_count,
        "questions": questions_data
    }

@router.get("/{quiz_id}/attempts")
@router.get("/{quiz_id}/student-performance")
def get_quiz_student_performance(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    try:
        q_uuid = uuid.UUID(quiz_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid quiz ID format")

    quiz = db.query(Quiz).filter(Quiz.id == q_uuid).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    course = db.query(Course).filter(Course.id == quiz.course_id).first()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view student attempts for this course")

    enrollments = db.query(Enrollment).filter(Enrollment.course_id == quiz.course_id).all()
    student_ids = [e.student_id for e in enrollments]
    enrolled_students = db.query(User).filter(User.id.in_(student_ids)).all() if student_ids else []

    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q_uuid).all()
    # Map student to latest attempt
    attempts_map = {}
    for att in attempts:
        if att.student_id not in attempts_map or att.completed_at > attempts_map[att.student_id].completed_at:
            attempts_map[att.student_id] = att

    result = []
    for student in enrolled_students:
        att = attempts_map.get(student.id)
        if att:
            score_pct = round(att.score, 1) if att.score is not None else 0.0
            result.append({
                "id": str(att.id),
                "quiz_id": str(quiz.id),
                "student_id": str(student.id),
                "student_name": student.full_name or student.name or "Student",
                "student_email": student.email,
                "status": "COMPLETED",
                "attempted": True,
                "score": score_pct,
                "total_points": att.total_points or 100.0,
                "percentage": score_pct,
                "completed_at": att.completed_at.isoformat() if att.completed_at else None
            })
        else:
            result.append({
                "id": None,
                "quiz_id": str(quiz.id),
                "student_id": str(student.id),
                "student_name": student.full_name or student.name or "Student",
                "student_email": student.email,
                "status": "NOT_ATTEMPTED",
                "attempted": False,
                "score": None,
                "total_points": None,
                "percentage": None,
                "completed_at": None
            })

    return result

@router.post("/{quiz_id}/attempt", status_code=status.HTTP_201_CREATED)
def submit_quiz_attempt(
    quiz_id: str,
    attempt_in: QuizAttemptInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    """
    Student submits quiz attempt -> Auto-grades MCQs and calculates total score.
    """
    try:
        q_uuid = uuid.UUID(quiz_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid quiz ID format")

    quiz = db.query(Quiz).filter(Quiz.id == q_uuid).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Verify student enrollment
    enr = db.query(Enrollment).filter(Enrollment.course_id == quiz.course_id, Enrollment.student_id == current_user.id).first()
    if not enr:
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == q_uuid).all()
    q_map = {str(q.id): q for q in questions}

    total_score = 0.0
    total_possible = sum(q.points for q in questions) or 100.0

    attempt = QuizAttempt(
        quiz_id=q_uuid,
        student_id=current_user.id,
        score=0.0,
        total_points=total_possible
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    breakdown = []
    for ans in attempt_in.answers:
        q_obj = q_map.get(ans.question_id)
        if not q_obj:
            continue

        is_correct = (ans.student_answer.strip().lower() == q_obj.correct_answer.strip().lower())
        ans_score = float(q_obj.points) if is_correct else 0.0
        total_score += ans_score

        answer_record = QuizAnswer(
            attempt_id=attempt.id,
            question_id=q_obj.id,
            student_answer=ans.student_answer,
            is_correct=is_correct,
            score=ans_score,
            feedback=q_obj.explanation if is_correct else f"Incorrect. Correct answer: {q_obj.correct_answer}. {q_obj.explanation or ''}"
        )
        db.add(answer_record)
        breakdown.append({
            "question_id": str(q_obj.id),
            "question_text": q_obj.question_text,
            "options": q_obj.options,
            "student_answer": ans.student_answer,
            "correct_answer": q_obj.correct_answer,
            "is_correct": is_correct,
            "explanation": q_obj.explanation
        })

    attempt.score = (total_score / total_possible) * 100.0 if total_possible > 0 else 100.0
    db.add(attempt)
    db.commit()

    return {
        "status": "completed",
        "attempt_id": str(attempt.id),
        "score_percentage": round(attempt.score, 1),
        "total_score": total_score,
        "total_possible": total_possible,
        "breakdown": breakdown
    }

@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    try:
        q_uuid = uuid.UUID(quiz_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid quiz ID format")

    quiz = db.query(Quiz).filter(Quiz.id == q_uuid).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    course = db.query(Course).filter(Course.id == quiz.course_id).first()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to delete quizzes for this course")

    db.delete(quiz)
    db.commit()

    return {
        "status": "success",
        "message": "Quiz deleted successfully",
        "quiz_id": quiz_id
    }
