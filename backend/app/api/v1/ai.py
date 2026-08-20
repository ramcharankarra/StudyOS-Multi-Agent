import uuid
import re
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.course import Course, Enrollment
from app.models.material import Material
from app.models.ai import Conversation, DocumentChunk
from app.services.gemini_service import GeminiService
from app.services.pdf_processing_service import PDFProcessingService

logger = logging.getLogger("ai_assistant")
router = APIRouter(prefix="", tags=["ai_infrastructure"])


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    task_type: Optional[str] = "custom"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024


class RAGQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    course_id: Optional[str] = None
    top_k: Optional[int] = 3


class AIAssistantChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    session_id: Optional[str] = "default_session"
    attached_file_text: Optional[str] = None
    course_id: Optional[str] = None


class AIGenerateQuizRequest(BaseModel):
    course_id: str
    difficulty: Optional[str] = "Medium"
    num_questions: Optional[int] = 5
    goal: Optional[str] = None


class AIGenerateAssignmentRequest(BaseModel):
    course_id: str
    topic: Optional[str] = None
    goal: Optional[str] = None
    difficulty: Optional[str] = "Medium"


# ---------------------------------------------------------------
# Response Sanitizer
# ---------------------------------------------------------------

def sanitize_production_response(raw_text: str) -> str:
    """Strips debug traces and system headers if accidental leakage occurs."""
    if not raw_text:
        return "Unable to generate a response. Please try again."

    cleaned = raw_text
    strip_patterns = [
        r"^Previous Conversation:[\s\S]*?User Prompt:",
        r"^Attached File Content:[\s\S]*?User Prompt:",
        r"\[AIService\].*?$",
        r"System Instruction:[\s\S]*?\n\n",
        r"User Prompt:\s*",
        r"Previous Conversation:\s*"
    ]

    for pat in strip_patterns:
        cleaned = re.sub(pat, "", cleaned, flags=re.IGNORECASE | re.MULTILINE).strip()

    lines = [l for l in cleaned.split("\n") if not l.strip().startswith(("Debug:", "RAG Status:", "System:", "Internal:", "Autonomous Response"))]
    result = "\n".join(lines).strip()
    return result if result else raw_text.strip()


# ---------------------------------------------------------------
# Simple Conversational AI Assistant Endpoints
# ---------------------------------------------------------------

@router.get("/ai/threads")
def list_chat_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user conversation threads for sidebar history."""
    threads = db.query(
        Conversation.session_id,
        func.min(Conversation.created_at).label("started_at"),
        func.max(Conversation.created_at).label("last_active"),
        func.count(Conversation.id).label("message_count")
    ).filter(
        Conversation.user_id == current_user.id
    ).group_by(
        Conversation.session_id
    ).order_by(
        func.max(Conversation.created_at).desc()
    ).all()

    result = []
    for t in threads:
        first_msg = db.query(Conversation).filter(
            Conversation.user_id == current_user.id,
            Conversation.session_id == t.session_id,
            Conversation.role == "USER"
        ).order_by(Conversation.created_at.asc()).first()

        title = first_msg.message[:35] if first_msg else "New Chat"
        title = re.sub(r"^\[Attached File:.*?\]\s*", "", title).strip()
        result.append({
            "session_id": t.session_id,
            "title": title or "New Conversation",
            "message_count": t.message_count,
            "started_at": t.started_at,
            "last_active": t.last_active
        })

    return result


@router.get("/ai/threads/{session_id}/messages")
def get_thread_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all messages for a session thread."""
    messages = db.query(Conversation).filter(
        Conversation.user_id == current_user.id,
        Conversation.session_id == session_id
    ).order_by(Conversation.created_at.asc()).all()

    return [
        {
            "id": str(m.id),
            "role": m.role.lower(),
            "message": sanitize_production_response(m.message),
            "created_at": m.created_at
        }
        for m in messages
    ]


@router.delete("/ai/threads/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_thread(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete thread and history."""
    db.query(Conversation).filter(
        Conversation.user_id == current_user.id,
        Conversation.session_id == session_id
    ).delete(synchronize_session=False)
    db.commit()
    return None


@router.post("/ai/chat/upload-file")
async def upload_chat_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract text from user attached file inside chat."""
    contents = await file.read()
    extracted_text = PDFProcessingService.extract_text(contents, file.filename)

    return {
        "status": "success",
        "filename": file.filename,
        "extracted_text": extracted_text[:12000],
        "character_count": len(extracted_text)
    }


@router.post("/ai/chat/assistant")
@router.post("/ai/chat/rag")  # Alias for backward compatibility
async def ai_assistant_chat_interaction(
    payload: AIAssistantChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    StudyOS MindOS Conversational AI Assistant.
    Routes queries through the compiled LangGraph StateGraph Engine with detailed trace logging.
    """
    try:
        # Step 1 Trace: HTTP Start
        logger.info(
            f"[MINDOS_HTTP_START] prompt='{payload.prompt[:80]}' | "
            f"course_id='{payload.course_id}' | session_id='{payload.session_id}' | user_id='{current_user.id}'"
        )

        # 1. Execute LangGraph Master Orchestrator Engine
        from app.orchestrator import execute_studyos_graph
        try:
            logger.info(f"[MINDOS_GRAPH_START] prompt='{payload.prompt[:50]}'")
            final_state = await execute_studyos_graph(
                user_id=str(current_user.id),
                user_query=payload.prompt,
                course_id=payload.course_id
            )
            res_content = final_state.get("response_content", {})
            logger.info(
                f"[MINDOS_GRAPH_SUCCESS] intent='{final_state.get('intent')}' | "
                f"selected_agent='{final_state.get('selected_agent')}' | "
                f"response_type='{final_state.get('response_type')}' | "
                f"generation_status='{res_content.get('generation_status') if isinstance(res_content, dict) else None}' | "
                f"response_length={len(str(res_content))}"
            )
        except Exception as graph_err:
            logger.exception(
                "[MINDOS_GRAPH_EXCEPTION] LangGraph StateGraph execution raised exception",
                extra={
                    "user_id": str(current_user.id),
                    "session_id": payload.session_id,
                    "course_id": payload.course_id,
                    "prompt": payload.prompt,
                    "error": str(graph_err)
                }
            )
            final_state = {
                "grounding_status": "GRAPH_ERROR",
                "response_type": "ERROR",
                "response_content": {
                    "generation_status": "GRAPH_ERROR",
                    "response": "StudyOS encountered a temporary processing error. Please retry."
                }
            }

        logger.info(f"[MINDOS_RESPONSE_START] session_id='{payload.session_id}'")

        g_status = final_state.get("grounding_status")
        r_type = final_state.get("response_type", "TEACHING_CONTENT")
        res_content = final_state.get("response_content", {})
        err_msg = final_state.get("error")
        direct_gemini_used = False

        # 2. Response Formatter Logic (Recognize Graph Output & Refusal States)

        # A) Refusal States / Grounding Policy Refusals (e.g. Concept Not Found, Subject Mismatch)
        if g_status in ["REFUSAL", "NOT_ENROLLED", "AMBIGUOUS_COURSE_SELECTION"] and err_msg:
            ai_response = err_msg

        # B) Case 2: Course Selected but 0 Materials Uploaded
        elif g_status == "NO_MATERIAL" and payload.course_id:
            ai_response = err_msg or "This course does not have uploaded learning material yet. Upload course material to enable grounded course explanations."

        # C) LLM Unavailable / Graph Error (Gemini 429/503/Timeout or Processing Error)
        elif isinstance(res_content, dict) and res_content.get("generation_status") in ["LLM_UNAVAILABLE", "GRAPH_ERROR"]:
            ai_response = res_content.get("response", "The AI teacher is temporarily unavailable. Please retry.")

        # D) Structured Graph Artifacts: Refusal or Markdown responses in res_content
        elif isinstance(res_content, dict) and (res_content.get("refusal") or res_content.get("no_materials_warning")):
            if payload.course_id:
                ai_response = res_content.get("description") or res_content.get("markdown") or "This course does not have uploaded learning material yet. Upload course material to enable grounded course explanations."
            else:
                ai_response = res_content.get("response") or res_content.get("markdown") or "Hello! I am your StudyOS AI teacher. How can I help you with your studies today?"

        # E) Structured Study Preparation (Multi-Agent Output)
        elif r_type == "STUDY_PREPARATION" and isinstance(res_content, dict):
            teacher_out = res_content.get("teacher_output", {})
            planner_out = res_content.get("planner_output", {})
            learning_out = res_content.get("learning_output", {})
            assessment_out = res_content.get("assessment_output", {})

            md_lines = [f"# {res_content.get('title', 'Exam Preparation Master Guide')}\n"]
            
            if teacher_out and isinstance(teacher_out, dict) and "units" in teacher_out:
                md_lines.append("## Part 1: Core Course Teaching & Topics")
                for u in teacher_out.get("units", []):
                    md_lines.append(f"### {u.get('unit_title', 'Unit')}")
                    for t in u.get("topics", []):
                        md_lines.append(f"- **{t.get('topic_title')}**: {t.get('what_is_this', '')}")
                md_lines.append("")

            if planner_out and isinstance(planner_out, dict) and "days" in planner_out:
                md_lines.append("## Part 2: 10-Day Study Schedule")
                for d in planner_out.get("days", []):
                    md_lines.append(f"#### Day {d.get('day_number', 1)}: {d.get('topic', 'Study Session')}")
                    if d.get("explanation"):
                        md_lines.append(f"{d.get('explanation')}\n")
                md_lines.append("")

            if learning_out and isinstance(learning_out, dict) and "flashcards" in learning_out:
                md_lines.append(f"## Part 3: Active-Recall Flashcards ({len(learning_out.get('flashcards', []))} Cards Created)")
                md_lines.append("")

            if assessment_out and isinstance(assessment_out, dict) and "questions" in assessment_out:
                md_lines.append(f"## Part 4: Practice Assessment ({len(assessment_out.get('questions', []))} MCQs Available)")
                md_lines.append("")

            ai_response = "\n".join(md_lines)
        elif r_type == "TEACHING_WITH_ASSESSMENT" and isinstance(res_content, dict):
            teacher_out = res_content.get("teacher_output", {})
            assessment_out = res_content.get("assessment_output", {})

            md_lines = [f"# {res_content.get('title', 'Lesson & Self-Assessment')}\n"]
            if teacher_out and isinstance(teacher_out, dict) and "units" in teacher_out:
                for u in teacher_out.get("units", []):
                    md_lines.append(f"## {u.get('unit_title', 'Unit')}")
                    for t in u.get("topics", []):
                        md_lines.append(f"### {t.get('topic_title', 'Topic')}")
                        if t.get("explanation"):
                            md_lines.append(f"{t.get('explanation')}\n")

            if assessment_out and isinstance(assessment_out, dict) and "questions" in assessment_out:
                md_lines.append("## Practice Questions")
                for q_idx, q in enumerate(assessment_out.get("questions", []), 1):
                    md_lines.append(f"**Q{q_idx}: {q.get('question_text', 'Question')}**")
                    for opt in q.get("options", []):
                        md_lines.append(f"- {opt}")
                    md_lines.append("")

            ai_response = "\n".join(md_lines)
        elif isinstance(res_content, dict) and "units" in res_content and res_content["units"]:
            # Format structured teaching content into clean Markdown for chat
            units = res_content.get("units", [])
            md_lines = [f"# {res_content.get('title', 'Study Notes')}\n"]
            for u in units:
                md_lines.append(f"## {u.get('unit_title', 'Unit')}")
                if u.get("description"):
                    md_lines.append(f"*{u.get('description')}*\n")
                for t in u.get("topics", []):
                    md_lines.append(f"### {t.get('topic_title', 'Topic')}")
                    if t.get("what_is_this"):
                        md_lines.append(f"**What is this:** {t.get('what_is_this')}\n")
                    if t.get("why_important"):
                        md_lines.append(f"**Why this matters:** {t.get('why_important')}\n")
                    if t.get("explanation"):
                        md_lines.append(f"{t.get('explanation')}\n")
                    if t.get("how_it_works"):
                        md_lines.append(f"**How it works:** {t.get('how_it_works')}\n")
                    if t.get("definitions"):
                        md_lines.append("**Key Definitions:**")
                        for d in t["definitions"]:
                            md_lines.append(f"- {d}")
                        md_lines.append("")
                    if t.get("examples"):
                        md_lines.append("**Examples:**")
                        for ex in t["examples"]:
                            md_lines.append(f"- {ex}")
                        md_lines.append("")
                    if t.get("formulas"):
                        md_lines.append("**Formulas & Rules:**")
                        for f in t["formulas"]:
                            md_lines.append(f"- `{f}`")
                        md_lines.append("")
                    if t.get("exam_points"):
                        md_lines.append(f"**Exam Focus:** {t.get('exam_points')}\n")
                    if t.get("source_document"):
                        md_lines.append(f"**Source:** `{t.get('source_document')}`\n")
            ai_response = "\n".join(md_lines)
        elif isinstance(res_content, dict) and "days" in res_content and res_content["days"]:
            days = res_content.get("days", [])
            md_lines = [f"# {res_content.get('title', 'Study Plan')}\n"]
            for d in days:
                md_lines.append(f"### Day {d.get('day_number', 1)}: {d.get('topic', 'Study Session')}")
                if d.get("explanation"):
                    md_lines.append(f"{d.get('explanation')}\n")
                if d.get("source_page_range"):
                    md_lines.append(f"**Source:** `{d.get('source_page_range')}`\n")
            ai_response = "\n".join(md_lines)
        elif isinstance(res_content, dict) and "questions" in res_content and res_content["questions"]:
            questions = res_content.get("questions", [])
            md_lines = [f"# {res_content.get('title', 'Mock Test / Assessment')}\n"]
            for q_idx, q in enumerate(questions, 1):
                q_text = q.get("question_text") or q.get("question") or "Question"
                md_lines.append(f"### Q{q_idx}: {q_text}")
                for opt in q.get("options", []):
                    md_lines.append(f"- {opt}")
                ans = q.get("answer") or q.get("correct_answer")
                if ans:
                    md_lines.append(f"\n**Correct Answer:** {ans}")
                if q.get("explanation"):
                    md_lines.append(f"**Explanation:** {q.get('explanation')}")
                src = q.get("source_document") or q.get("source")
                if src:
                    md_lines.append(f"**Source:** `{src}`")
                md_lines.append("")
            ai_response = "\n".join(md_lines)
        elif isinstance(res_content, dict) and ("flashcards" in res_content or "cards" in res_content) and (res_content.get("flashcards") or res_content.get("cards")):
            cards = res_content.get("flashcards", []) or res_content.get("cards", [])
            md_lines = [f"# {res_content.get('title', 'Flashcard Pack')}\n"]
            for c_idx, c in enumerate(cards, 1):
                md_lines.append(f"### Card {c_idx}")
                md_lines.append(f"**Front:** {c.get('front', c.get('question', ''))}")
                md_lines.append(f"**Back:** {c.get('back', c.get('answer', ''))}")
                src = c.get("source_document") or c.get("source")
                if src:
                    md_lines.append(f"**Source:** `{src}`")
                md_lines.append("")
            ai_response = "\n".join(md_lines)
        elif isinstance(res_content, str) and len(res_content.strip()) > 0:
            ai_response = res_content
        elif isinstance(res_content, dict) and "response" in res_content and isinstance(res_content["response"], str):
            ai_response = res_content["response"]
        elif isinstance(res_content, dict) and "markdown" in res_content and isinstance(res_content["markdown"], str):
            ai_response = res_content["markdown"]
        elif isinstance(res_content, dict) and "explanation" in res_content and isinstance(res_content["explanation"], str):
            ai_response = res_content["explanation"]
        elif isinstance(res_content, dict) and "concept" in res_content and isinstance(res_content.get("concept"), str):
            ai_response = f"**{res_content.get('concept')}**\n\n{res_content.get('explanation', '')}"
        else:
            logger.warning(
                f"[DIRECT_GEMINI_USED] reason='Unhandled graph output structure' | "
                f"UserID='{current_user.id}' | Prompt='{payload.prompt[:50]}'"
            )
            direct_gemini_used = True
            try:
                raw_response = await GeminiService.generate_response(
                    prompt=payload.prompt,
                    agent_name="MindOS"
                )
                if raw_response == "__LLM_UNAVAILABLE__":
                    ai_response = "The AI teacher is temporarily unavailable. Please retry."
                else:
                    ai_response = sanitize_production_response(raw_response)
                logger.info(f"[DIRECT_GEMINI_COMPLETED] ResponseLen={len(ai_response)}")
            except Exception as direct_err:
                logger.exception(
                    "[DIRECT_GEMINI_FAILED] GeminiService generation raised exception",
                    extra={
                        "user_id": str(current_user.id),
                        "session_id": payload.session_id,
                        "course_id": payload.course_id,
                        "prompt": payload.prompt,
                        "error": str(direct_err)
                    }
                )
                ai_response = "The AI teacher is temporarily unavailable. Please retry."

        # Strip internal metadata labels (e.g. General AI Knowledge, Confidence Level) from user-facing chat response
        ai_response = re.sub(r'\[General AI Knowledge[^\]]*\]\s*', '', ai_response, flags=re.IGNORECASE)
        ai_response = re.sub(r'\*\*\[?Confidence Level:[^\]\n]*\]?\*\*\s*', '', ai_response, flags=re.IGNORECASE)
        ai_response = re.sub(r'Confidence Level:[^\n]*\n?', '', ai_response, flags=re.IGNORECASE)
        ai_response = re.sub(r'^\s*---\s*\n', '', ai_response)
        ai_response = ai_response.strip()

        logger.info(
            f"[MINDOS_RESPONSE_SUCCESS] response_type='{r_type}' | "
            f"direct_gemini_used={direct_gemini_used} | response_length={len(ai_response)}"
        )

        # 3. Persist Messages in PostgreSQL
        user_m = Conversation(user_id=current_user.id, session_id=payload.session_id, message=payload.prompt, role="USER")
        ai_m = Conversation(user_id=current_user.id, session_id=payload.session_id, message=ai_response, role="ASSISTANT")
        db.add_all([user_m, ai_m])
        db.commit()

        return {
            "session_id": payload.session_id,
            "response": ai_response
        }

    except Exception as http_err:
        logger.exception(
            "[MINDOS_HTTP_EXCEPTION] HTTP Assistant endpoint raised unhandled exception",
            extra={
                "user_id": str(current_user.id),
                "session_id": payload.session_id,
                "course_id": payload.course_id,
                "prompt": payload.prompt,
                "error": str(http_err)
            }
        )
        return {
            "session_id": payload.session_id,
            "response": "StudyOS encountered a temporary processing error. Please retry."
        }


# ---------------------------------------------------------------
# Core AI Infrastructure Endpoints
# ---------------------------------------------------------------

@router.post("/ai/generate")
async def generate_ai_content(
    payload: GenerateRequest,
    current_user: User = Depends(get_current_user)
):
    res = await GeminiService.generate_response(prompt=payload.prompt)
    return {
        "status": "success",
        "task_type": payload.task_type,
        "model": "google-gemini-2.5",
        "response": sanitize_production_response(res)
    }


@router.post("/ai/generate-quiz")
async def generate_ai_quiz(
    payload: AIGenerateQuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a 100% material-grounded practice quiz using AssessmentAgent and ContextService."""
    from app.services.context_service import ContextService
    from app.agents.assessment.assessment_agent import AssessmentAgent

    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role.lower() == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to generate content for this course")

    goal_prompt = payload.goal or f"Comprehensive practice assessment for course {course.title}"
    context_data = ContextService.build_user_context(
        db=db,
        user=current_user,
        goal_prompt=goal_prompt,
        explicit_course_id=payload.course_id
    )
    document_chunks = context_data.get("rag_document_chunks", [])

    agent = AssessmentAgent()
    result = await agent.generate_quiz(
        course_title=course.title,
        goal=goal_prompt,
        document_chunks=document_chunks,
        difficulty=payload.difficulty or "Medium",
        num_questions=payload.num_questions or 5,
        course_id=str(course.id)
    )

    return result


@router.post("/ai/generate-assignment")
async def generate_ai_assignment(
    payload: AIGenerateAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate an educational assignment with rubric using AssessmentAgent and ContextService."""
    from app.services.context_service import ContextService
    from app.agents.assessment.assessment_agent import AssessmentAgent

    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role.lower() == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to generate assignments for this course")

    goal_prompt = payload.topic or payload.goal or f"Comprehensive assignment for course {course.title}"
    context_data = ContextService.build_user_context(
        db=db,
        user=current_user,
        goal_prompt=goal_prompt,
        explicit_course_id=payload.course_id
    )
    document_chunks = context_data.get("rag_document_chunks", [])

    agent = AssessmentAgent()
    result = await agent.generate_assignment(
        course_title=course.title,
        goal=goal_prompt,
        document_chunks=document_chunks,
        difficulty=payload.difficulty or "Medium"
    )

    return result


@router.post("/rag/query")
async def execute_rag_query(
    payload: RAGQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chunks_query = db.query(DocumentChunk)
    if payload.course_id:
        chunks_query = chunks_query.filter(DocumentChunk.course_id == payload.course_id)
    
    chunks = chunks_query.limit(payload.top_k or 3).all()
    context_text = "\n\n".join([c.content for c in chunks]) if chunks else "No relevant document chunks found."

    return {
        "query": payload.query,
        "context": context_text,
        "chunks_count": len(chunks),
        "chunks": [{"id": str(c.id), "content": c.content, "page": c.page_number} for c in chunks]
    }
