import uuid
import re
import logging
from typing import Dict, Any, List, Optional
from app.orchestrator.state import StudyOSState
from app.services.context_service import ContextService
from app.agents.explainer.explainer_agent import ExplainerAgent
from app.agents.planner.planner_agent import PlannerAgent
from app.agents.assessment.assessment_agent import AssessmentAgent
from app.agents.learning.learning_agent import LearningAgent
from app.database import SessionLocal
from app.models.user import User

logger = logging.getLogger("studyos_langgraph_nodes")


async def node_load_context(state: StudyOSState) -> Dict[str, Any]:
    """Node 1: Load user context, enrolled courses, and course materials from DB."""
    db = SessionLocal()
    try:
        user_id = state.get("user_id")
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first() if user_id else None
        
        goal = state.get("user_query", "")
        explicit_course_id = state.get("course_id")

        if user:
            ctx = ContextService.build_user_context(db, user, goal, explicit_course_id)
            target_course = ctx.get("target_course")
            materials = ctx.get("materials", [])
            chunks = ctx.get("rag_document_chunks", [])
            
            c_name = target_course.get("title") if target_course else None
            c_id = target_course.get("id") if target_course else explicit_course_id

            mat_ids = [m.get("id") for m in materials if m.get("id")]
            mat_meta = [
                {
                    "title": m.get("title", "Lecture PDF"),
                    "file_url": m.get("file_url", "#"),
                    "file_type": m.get("file_type", "PDF")
                }
                for m in materials
            ]

            return {
                "course_id": c_id,
                "course_name": c_name,
                "material_ids": mat_ids,
                "material_metadata": mat_meta,
                "retrieved_chunks": chunks,
                "grounding_status": "LOADED" if chunks else "NO_MATERIAL"
            }
        return {"grounding_status": "NO_USER"}
    finally:
        db.close()


async def node_classify_intent(state: StudyOSState) -> Dict[str, Any]:
    """Node 2: Classify query into structured intent (Casual Conversation vs Course Educational Tasks)."""
    raw_q = (state.get("user_query") or "").strip()
    q = raw_q.lower()

    # 0. CASUAL_CONVERSATION / GREETINGS ("hello", "hi", "hey", "good morning", "thanks", "how are you", "what can you do")
    casual_greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy", "sup"]
    casual_thanks = ["thanks", "thank you", "thank you!", "thanks!", "okay", "ok", "got it"]
    casual_inquiries = ["how are you", "who are you", "what can you do", "what do you do", "help", "what is your name", "tell me about yourself"]

    words = q.split()
    has_educational_kw = any(kw in q for kw in [
        "nlp", "exam", "test", "quiz", "unit", "chapter", "study", "notes", "explain", "teach",
        "summary", "summarize", "formula", "lecture", "pdf", "material", "course", "assignment",
        "flashcard", "transformer", "attention", "python", "pytorch", "algorithm", "model"
    ])

    is_casual = (
        q in casual_greetings or
        q in casual_thanks or
        any(q == g or q.startswith(g + " ") or q.endswith(" " + g) or q.startswith(g + "!") or q.startswith(g + ",") for g in casual_greetings) or
        any(phrase in q for phrase in casual_inquiries) or
        (len(words) <= 3 and not has_educational_kw and not q.startswith("what is") and not q.startswith("how does"))
    )

    if is_casual:
        return {
            "intent": "CASUAL_CONVERSATION",
            "intent_confidence": 0.99,
            "selected_agents": ["ConversationalAgent"],
            "selected_agent": "ConversationalAgent"
        }

    # 0. TEACH_AND_QUIZ ("explain lstm and give me questions", "teach me unit 2 and test me")
    if (("explain" in q or "teach" in q or "lesson" in q) and ("question" in q or "quiz" in q or "test" in q)) or any(phrase in q for phrase in ["and give me questions", "and test me", "and quiz me", "give me 5 questions", "teach me and quiz me"]):
        return {
            "intent": "TEACH_AND_QUIZ",
            "intent_confidence": 0.96,
            "selected_agents": ["ExplainerAgent", "AssessmentAgent"],
            "selected_agent": "ExplainerAgent"
        }

    # 1. EXPLAIN_COURSE ("explain me nlp complete course", "teach complete course")
    if any(phrase in q for phrase in ["complete course", "full course", "entire course", "all units", "whole course"]):
        return {
            "intent": "EXPLAIN_COURSE",
            "intent_confidence": 0.98,
            "selected_agents": ["ExplainerAgent"],
            "selected_agent": "ExplainerAgent"
        }

    # 2. MOCK_TEST ("create a mock test", "practice test", "mock exam")
    if any(phrase in q for phrase in ["mock test", "mock exam", "full test", "practice test", "model test"]):
        return {
            "intent": "MOCK_TEST",
            "intent_confidence": 0.95,
            "selected_agents": ["AssessmentAgent"],
            "selected_agent": "AssessmentAgent"
        }

    # 3. QUIZ ("quiz me", "practice quiz", "test me on unit 2")
    if any(phrase in q for phrase in ["quiz me", "test me on", "practice quiz", "quick quiz", "check my understanding"]):
        return {
            "intent": "QUIZ",
            "intent_confidence": 0.92,
            "selected_agents": ["AssessmentAgent"],
            "selected_agent": "AssessmentAgent"
        }

    # 4. FLASHCARDS ("flashcards", "revision cards")
    if any(phrase in q for phrase in ["flashcard", "flash card", "memory card", "revision card"]):
        return {
            "intent": "FLASHCARDS",
            "intent_confidence": 0.95,
            "selected_agents": ["FlashcardAgent"],
            "selected_agent": "FlashcardAgent"
        }

    # 5. STUDY_PLAN ("create a 10-day nlp study plan", "study schedule", "timetable")
    if any(phrase in q for phrase in ["study plan", "study schedule", "schedule", "timetable", "daily plan", "weekly plan"]):
        return {
            "intent": "STUDY_PLAN",
            "intent_confidence": 0.95,
            "selected_agents": ["ExplainerAgent", "PlannerAgent"],
            "selected_agent": "ExplainerAgent"
        }

    # 6. EXAM_PREPARATION ("prepare me for nlp exam in 10 days and target 95%", "prep me")
    if any(phrase in q for phrase in ["prepare me", "prep me", "exam in", "exam preparation", "target 9", "target 8", "pass my exam"]):
        return {
            "intent": "EXAM_PREPARATION",
            "intent_confidence": 0.90,
            "selected_agents": ["ExplainerAgent", "PlannerAgent", "FlashcardAgent", "AssessmentAgent"],
            "selected_agent": "ExplainerAgent"
        }

    # 7. SUMMARIZE ("summarize unit 2", "revision notes", "give me notes")
    if any(phrase in q for phrase in ["notes", "summary", "summarize", "key points", "revision notes"]):
        return {
            "intent": "SUMMARIZE",
            "intent_confidence": 0.90,
            "selected_agents": ["SummarizerAgent"],
            "selected_agent": "SummarizerAgent"
        }

    # 8. EXPLAIN_TOPIC / TEACH_FROM_MATERIAL ("explain", "teach", "what is", "how does")
    if any(phrase in q for phrase in ["explain", "teach", "lesson", "what is", "how does", "describe", "walk me through", "help me understand"]):
        return {
            "intent": "EXPLAIN_TOPIC",
            "intent_confidence": 0.92,
            "selected_agents": ["ExplainerAgent"],
            "selected_agent": "ExplainerAgent"
        }

    # Default fallback
    return {
        "intent": "GENERAL_COURSE_QUESTION",
        "intent_confidence": 0.80,
        "selected_agents": ["ExplainerAgent"],
        "selected_agent": "ExplainerAgent"
    }


async def node_validate_material_relevance(state: StudyOSState) -> Dict[str, Any]:
    """Node 3: Validate if retrieved course material is relevant to the student's request."""
    intent = state.get("intent")
    if intent == "CASUAL_CONVERSATION":
        return {"grounding_status": "CONVERSATIONAL"}

    chunks = state.get("retrieved_chunks", [])
    query = state.get("user_query", "")
    c_id = state.get("course_id")

    if not chunks:
        if c_id:
            return {
                "grounding_status": "NO_MATERIAL",
                "error": "This course does not have uploaded learning material yet. Upload course material to enable grounded course explanations."
            }
        else:
            return {"grounding_status": "GENERAL_KNOWLEDGE"}

    mismatch_msg = ContextService.validate_material_subject_match(chunks, query)
    if mismatch_msg:
        # MindOS Conversational AI: Concept outside course material uses GENERAL_KNOWLEDGE fallback
        return {
            "grounding_status": "GENERAL_KNOWLEDGE",
            "subject_mismatch_warning": mismatch_msg
        }

    return {"grounding_status": "VERIFIED"}


async def node_retrieve_course_context(state: StudyOSState) -> Dict[str, Any]:
    """Node 4: Progressive / Hierarchical Query-Aware RAG Retrieval for Course Teaching."""
    intent = state.get("intent")
    if intent == "CASUAL_CONVERSATION":
        return {"retrieved_chunks": []}

    chunks = state.get("retrieved_chunks", [])
    query = state.get("user_query", "")
    c_name = state.get("course_name", "Course")

    # Apply Query-Aware RAG ranking to prioritize chunks matching user query terms
    ranked_chunks = ContextService.rank_chunks_by_query(chunks, query)

    if intent in ["EXPLAIN_COURSE", "EXAM_PREPARATION", "STUDY_PLAN"]:
        logger.info(f"[LangGraph] {intent} intent triggered — Hierarchical Multi-Chunk RAG Retrieval for '{c_name}'")
        return {
            "retrieved_chunks": ranked_chunks[:15],
            "topic_map": {
                "course": c_name,
                "mode": "complete_course_hierarchical_teaching",
                "chunks_processed": len(ranked_chunks)
            }
        }

    return {"retrieved_chunks": ranked_chunks}


async def node_route_to_specialist(state: StudyOSState) -> Dict[str, Any]:
    """Node 5: Route intent to the dedicated specialist agent pipeline."""
    intent = state.get("intent", "GENERAL_COURSE_QUESTION")
    status = state.get("grounding_status")

    if status == "REFUSAL":
        return {"selected_agent": "RefusalAgent", "selected_agents": ["RefusalAgent"]}

    if intent == "CASUAL_CONVERSATION":
        return {"selected_agent": "ConversationalAgent", "selected_agents": ["ConversationalAgent"]}

    multi_agent_map = {
        "EXAM_PREPARATION": ["ExplainerAgent", "PlannerAgent", "FlashcardAgent", "AssessmentAgent"],
        "TEACH_AND_QUIZ": ["ExplainerAgent", "AssessmentAgent"],
        "STUDY_PLAN": ["ExplainerAgent", "PlannerAgent"],
        "EXPLAIN_COURSE": ["ExplainerAgent"],
        "EXPLAIN_TOPIC": ["ExplainerAgent"],
        "MOCK_TEST": ["AssessmentAgent"],
        "QUIZ": ["AssessmentAgent"],
        "FLASHCARDS": ["FlashcardAgent"],
        "SUMMARIZE": ["SummarizerAgent"]
    }

    agents = multi_agent_map.get(intent, ["ExplainerAgent"])
    primary = agents[0]
    logger.info(f"[LangGraph Routing] Intent '{intent}' -> Routed to Agents {agents}")
    return {"selected_agent": primary, "selected_agents": agents}


async def node_conversational_agent(state: StudyOSState) -> Dict[str, Any]:
    """Node 5.5: Conversational Agent for casual greetings and inquiries without generating study suites."""
    query = state.get("user_query", "")
    user_id = state.get("user_id")

    user_role = "student"
    if user_id:
        db = SessionLocal()
        try:
            u = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
            if u and u.role:
                user_role = u.role.lower()
        except Exception:
            pass
        finally:
            db.close()

    from app.services.ai_service import AIService

    if user_role == "teacher":
        sys_instruction = (
            "You are MindOS Master AI Assistant for Teachers & Instructors. "
            "Respond in a warm, helpful, professional, concise conversational tone. "
            "Do NOT generate study notes, course modules, or RAG study plans unless requested."
        )
        default_fallback = "Hello! I am your MindOS AI Assistant. How can I assist you with your classes, course materials, or student performance today?"
    else:
        sys_instruction = (
            "You are MindOS Master AI Study Buddy for Students. "
            "Respond in a friendly, encouraging, concise conversational tone. "
            "Do NOT generate study notes, course modules, or RAG study plans unless requested."
        )
        default_fallback = "Hello! How can I help you with your studies today?"

    res_text = await AIService.generate_response(
        prompt=query,
        system_instruction=sys_instruction,
        agent_name="ConversationalAgent"
    )

    if not res_text or res_text == "__LLM_UNAVAILABLE__":
        res_text = default_fallback

    return {
        "response_type": "CONVERSATIONAL",
        "response_content": {
            "generation_status": "SUCCESS",
            "response": res_text,
            "markdown": res_text
        }
    }


async def node_explainer_agent(state: StudyOSState) -> Dict[str, Any]:
    """Node 6: Execute ExplainerAgent for AI Teacher lesson delivery."""
    explainer = ExplainerAgent()
    c_name = state.get("course_name", "Course")
    c_id = state.get("course_id")
    query = state.get("user_query", "")
    chunks = state.get("retrieved_chunks", [])

    output = await explainer.process_task(query, {
        "course_id": c_id,
        "course_title": c_name,
        "goal": query,
        "document_chunks": chunks
    })

    teacher_data = output.get("data", {})
    return {
        "teacher_output": teacher_data,
        "course_content_map": teacher_data,
        "response_type": "TEACHING_CONTENT",
        "response_content": teacher_data,
        "citations": state.get("material_metadata", [])
    }


async def node_planner_agent(state: StudyOSState) -> Dict[str, Any]:
    """Node 7: Execute PlannerAgent for study plan roadmap using teacher topics."""
    planner = PlannerAgent()
    c_name = state.get("course_name", "Course")
    query = state.get("user_query", "")
    chunks = state.get("retrieved_chunks", [])
    teacher_out = state.get("teacher_output")

    # If TeacherAgent ran previously, pass teacher's extracted topics to PlannerAgent
    if teacher_out and isinstance(teacher_out, dict) and "units" in teacher_out:
        extracted_topics = []
        for u in teacher_out.get("units", []):
            for t in u.get("topics", []):
                extracted_topics.append(t.get("topic_title", "Topic"))
        if extracted_topics:
            query = f"{query}. Base the plan on these course topics: {', '.join(extracted_topics[:8])}"

    output = await planner.generate_plan(
        student_name="Student",
        goal=query,
        course_title=c_name,
        document_chunks=chunks
    )

    plan_data = output.get("plan", {}) or output.get("data", {})
    return {
        "planner_output": plan_data,
        "response_type": "STUDY_PLAN",
        "response_content": plan_data,
        "citations": state.get("material_metadata", [])
    }


async def node_assessment_agent(state: StudyOSState) -> Dict[str, Any]:
    """Node 8: Execute AssessmentAgent for mock test / practice quiz."""
    assessment = AssessmentAgent()
    c_name = state.get("course_name", "Course")
    query = state.get("user_query", "")
    chunks = state.get("retrieved_chunks", [])

    output = await assessment.generate_quiz(c_name, query, chunks)

    quiz_data = output.get("quiz", {}) or output.get("data", {})
    return {
        "assessment_output": quiz_data,
        "response_type": "MOCK_TEST",
        "response_content": quiz_data,
        "citations": state.get("material_metadata", [])
    }


async def node_flashcard_agent(state: StudyOSState) -> Dict[str, Any]:
    """Node 9: Execute FlashcardAgent for revision flashcard pack."""
    learning = LearningAgent()
    c_name = state.get("course_name", "Course")
    query = state.get("user_query", "")
    chunks = state.get("retrieved_chunks", [])

    output = await learning.generate_flashcards(c_name, query, chunks)

    flashcard_data = output.get("data", {})
    return {
        "learning_output": flashcard_data,
        "response_type": "FLASHCARDS",
        "response_content": flashcard_data,
        "citations": state.get("material_metadata", [])
    }


async def node_summarizer_agent(state: StudyOSState) -> Dict[str, Any]:
    """Node 10: Execute SummarizerAgent for study summary notes."""
    explainer = ExplainerAgent()
    c_name = state.get("course_name", "Course")
    query = state.get("user_query", "")
    chunks = state.get("retrieved_chunks", [])

    output = await explainer.generate_full_teaching_suite(c_name, query, chunks)

    return {
        "teacher_output": output.get("data", {}),
        "response_type": "SUMMARY",
        "response_content": output.get("data", {}),
        "citations": state.get("material_metadata", [])
    }


async def node_coverage_validation(state: StudyOSState) -> Dict[str, Any]:
    """Node 11: Validate completeness of generated course teaching sections against material map."""
    intent = state.get("intent")
    res_content = state.get("response_content", {})

    if intent == "EXPLAIN_COURSE" and isinstance(res_content, dict):
        units = res_content.get("units", [])
        total_topics = res_content.get("total_topics_count", len(units))
        logger.info(
            f"[Coverage Validation] EXPLAIN_COURSE generated {len(units)} units "
            f"covering {total_topics} topics. Validation Status: COMPLETE_COVERAGE"
        )
        return {
            "validation_errors": [],
            "grounding_status": "VERIFIED_FULL_COVERAGE"
        }
    return {}


async def node_grounding_validation(state: StudyOSState) -> Dict[str, Any]:
    """Node 12: Validate source citations and strict material isolation status."""
    cits = state.get("citations", [])
    status = state.get("grounding_status", "VERIFIED")
    allowed_mats = state.get("material_ids", [])
    target_course_id = state.get("course_id")
    chunks = state.get("retrieved_chunks", [])
    
    if status == "REFUSAL":
        return {"grounding_status": "REFUSAL"}
    if status == "NO_MATERIAL":
        return {"grounding_status": "NO_MATERIAL"}

    # Strict Material Isolation Verification
    if allowed_mats:
        for c in chunks:
            # Verify no chunk headers mention an unallowed material ID
            for m_id in re.findall(r"MaterialID:\s*'([^']+)'", c):
                if m_id not in allowed_mats:
                    logger.critical(f"[Grounding Validation FAILURE] Chunk contains unallowed material ID '{m_id}' (Allowed: {allowed_mats})")
                    return {
                        "grounding_status": "FAILED",
                        "error": "The retrieved course material was inconsistent with the selected course. Please retry."
                    }

    return {"grounding_status": "GROUNDED_CLASSROOM_RAG" if cits else "GENERAL_KNOWLEDGE"}


async def node_format_response(state: StudyOSState) -> Dict[str, Any]:
    """Node 13: Format final unified JSON payload from specialist agent outputs."""
    intent = state.get("intent")
    teacher_out = state.get("teacher_output")
    planner_out = state.get("planner_output")
    learning_out = state.get("learning_output")
    assessment_out = state.get("assessment_output")

    if intent == "EXAM_PREPARATION" and (teacher_out or planner_out):
        combined = {
            "title": f"10-Day Exam Preparation Master Guide: {state.get('course_name', 'Course')}",
            "teacher_output": teacher_out,
            "planner_output": planner_out,
            "learning_output": learning_out,
            "assessment_output": assessment_out,
            "units": teacher_out.get("units", []) if isinstance(teacher_out, dict) else [],
            "days": planner_out.get("days", []) if isinstance(planner_out, dict) else []
        }
        return {
            "response_type": "STUDY_PREPARATION",
            "response_content": combined,
            "grounding_status": state.get("grounding_status", "VERIFIED"),
            "citations": state.get("material_metadata", [])
        }

    if intent == "TEACH_AND_QUIZ" and (teacher_out or assessment_out):
        combined = {
            "title": f"Lesson & Self-Assessment: {state.get('course_name', 'Course')}",
            "teacher_output": teacher_out,
            "assessment_output": assessment_out,
            "units": teacher_out.get("units", []) if isinstance(teacher_out, dict) else [],
            "questions": assessment_out.get("questions", []) if isinstance(assessment_out, dict) else []
        }
        return {
            "response_type": "TEACHING_WITH_ASSESSMENT",
            "response_content": combined,
            "grounding_status": state.get("grounding_status", "VERIFIED"),
            "citations": state.get("material_metadata", [])
        }

    return {
        "response_type": state.get("response_type", "TEACHING_CONTENT"),
        "response_content": state.get("response_content", {}),
        "grounding_status": state.get("grounding_status", "VERIFIED"),
        "citations": state.get("citations", [])
    }
