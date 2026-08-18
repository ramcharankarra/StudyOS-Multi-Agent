import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_role
from app.models.user import User
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
    quizzes = db.query(Quiz).filter(Quiz.course_id == course_id).order_by(Quiz.created_at.desc()).all()
    return quizzes

@router.post("", status_code=status.HTTP_201_CREATED)
def create_quiz_with_questions(
    quiz_in: QuizCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher"]))
):
    quiz = Quiz(
        course_id=uuid.UUID(quiz_in.course_id),
        title=quiz_in.title,
        description=quiz_in.description,
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
    return {"status": "success", "quiz_id": str(quiz.id), "questions_count": len(created_questions)}

@router.get("/{quiz_id}")
async def get_quiz_detail(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()

    # If quiz has no questions, dynamically generate grounded questions from course RAG chunks and persist
    if not questions:
        try:
            from app.models.course import Course
            from app.services.context_service import ContextService
            from app.agents.assessment.assessment_agent import AssessmentAgent

            course = db.query(Course).filter(Course.id == quiz.course_id).first()
            course_title = course.title if course else "Course Workspace"
            ctx = ContextService.build_user_context(db, current_user, quiz.title, str(quiz.course_id))
            chunks = ctx.get("rag_document_chunks", [])

            if chunks:
                agent = AssessmentAgent()
                quiz_res = await agent.generate_quiz(course_title, quiz.title, chunks, num_questions=5)
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
                questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
        except Exception as e:
            print(f"[Quizzes] Failed to auto-generate questions for quiz {quiz_id}: {e}")

    return {
        "id": str(quiz.id),
        "course_id": str(quiz.course_id),
        "title": quiz.title,
        "description": quiz.description,
        "questions": [
            {
                "id": str(q.id),
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": q.options,
                "points": q.points
            }
            for q in questions
        ]
    }

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
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    q_map = {str(q.id): q for q in questions}

    total_score = 0.0
    total_possible = sum(q.points for q in questions) or 100.0

    attempt = QuizAttempt(
        quiz_id=uuid.UUID(quiz_id),
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
