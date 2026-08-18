import re
import uuid
import json
import asyncio
import logging
import traceback
import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Set
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.mission import Mission, MissionTask, TaskDependency, TaskLog, MissionLog, MissionArtifact
from app.models.planner import StudyPlan, DailyTask
from app.models.notification import Notification
from app.models.memory import ConversationMemory
from app.models.material import Material
from app.models.course import Course
from app.models.quiz import Quiz
from app.agents.registry import AgentRegistry
from app.agents.coordinator.coordinator_agent import CoordinatorAgent
from app.services.ai_service import AIService
from app.services.gemini_service import GeminiService
from app.services.context_service import ContextService
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/missions", tags=["missions"])
logger = logging.getLogger("mission_executor")

# Strong reference set to prevent Python asyncio GC from cancelling background tasks
BACKGROUND_MISSION_TASKS: Set[asyncio.Task] = set()


def classify_student_intent(goal: str) -> str:
    """
    Classify the student's natural-language goal into a primary intent.
    Returns one of: TEACH, TEACH_AND_QUIZ, STUDY_PLAN, NOTES, FLASHCARDS, QUIZ, MOCK_TEST, EXAM_PREP, GENERAL.
    """
    g = goal.lower().strip()

    # TEACH_AND_QUIZ — explicit teach + quiz requests ("teach me ... and give me a quiz", "explain ... and quiz me")
    if ("teach" in g or "explain" in g) and any(kw in g for kw in ["quiz", "questions", "question", "test me"]):
        return "TEACH_AND_QUIZ"

    # MOCK_TEST — explicit mock test / full assessment requests
    if any(kw in g for kw in ["mock test", "mock exam", "full test", "practice test", "sample exam", "model test"]):
        return "MOCK_TEST"

    # QUIZ — short quiz / test-me requests
    if any(kw in g for kw in ["quiz me", "quiz on", "test me on", "quick quiz", "practice quiz", "check my understanding"]):
        return "QUIZ"

    # FLASHCARDS — revision card requests
    if any(kw in g for kw in ["flashcard", "flash card", "revision card", "memory card"]):
        return "FLASHCARDS"

    # STUDY_PLAN — scheduling / planning requests
    if any(kw in g for kw in ["study plan", "study schedule", "revision plan", "learning schedule", "daily plan", "weekly plan", "time table", "timetable"]):
        return "STUDY_PLAN"

    # EXAM_PREP — multi-step exam preparation (plan + teach + flashcards + quiz)
    if any(kw in g for kw in ["prepare me", "prep me", "exam in", "exam preparation", "help me score", "target 9", "target 8", "target 100", "ace my exam", "pass my exam"]):
        return "EXAM_PREP"

    # NOTES — summary / notes requests
    if any(kw in g for kw in ["notes", "summary", "summarize", "revision notes", "study material", "study notes", "key points"]):
        return "NOTES"

    # TEACH / EXPLAIN — teaching, explaining, or lesson requests
    if any(kw in g for kw in ["explain", "teach", "lesson", "what is", "how does", "describe", "walk me through", "help me understand", "break down", "from my uploaded", "from unit", "unit 1", "unit 2", "unit 3", "unit 4", "unit 5", "lstm"]):
        return "TEACH"

    # Default: multi-step exam prep for broad educational goals
    return "EXAM_PREP"


def build_intent_task_pipeline(intent: str, course_title: str) -> list:
    """
    Build the correct task pipeline based on classified student intent.
    Returns a list of task dicts with task_name, task_type, agent_name, step_order, estimated_duration.
    """
    ct = course_title or "Course"

    if intent == "TEACH":
        return [
            {"task_name": f"Teaching {ct} Material Step-by-Step", "task_type": "Teach", "agent_name": "ExplainerAgent", "step_order": 1, "estimated_duration": 30},
        ]

    elif intent == "TEACH_AND_QUIZ":
        return [
            {"task_name": f"Teaching {ct} Material Step-by-Step", "task_type": "Teach", "agent_name": "ExplainerAgent", "step_order": 1, "estimated_duration": 30},
            {"task_name": f"Generating {ct} Practice Quiz", "task_type": "Generate Quiz", "agent_name": "AssessmentAgent", "step_order": 2, "estimated_duration": 25},
        ]

    elif intent == "NOTES":
        return [
            {"task_name": f"Generating Grounded Teaching Notes for {ct}", "task_type": "Generate Notes", "agent_name": "ExplainerAgent", "step_order": 1, "estimated_duration": 25},
        ]

    elif intent == "STUDY_PLAN":
        return [
            {"task_name": f"Creating Personalized {ct} Study Roadmap", "task_type": "Planner Update", "agent_name": "PlannerAgent", "step_order": 1, "estimated_duration": 20},
        ]

    elif intent == "FLASHCARDS":
        return [
            {"task_name": f"Building {ct} Concept Flashcards", "task_type": "Generate Flashcards", "agent_name": "LearningAgent", "step_order": 1, "estimated_duration": 20},
        ]

    elif intent == "QUIZ":
        return [
            {"task_name": f"Generating {ct} Practice Quiz", "task_type": "Generate Quiz", "agent_name": "AssessmentAgent", "step_order": 1, "estimated_duration": 25},
        ]

    elif intent == "MOCK_TEST":
        return [
            {"task_name": f"Creating {ct} Mock Test", "task_type": "Generate Mock Test", "agent_name": "AssessmentAgent", "step_order": 1, "estimated_duration": 25},
        ]

    else:  # EXAM_PREP — full multi-step pipeline
        return [
            {"task_name": f"Organizing {ct} 10-Day Study Roadmap", "task_type": "Planner Update", "agent_name": "PlannerAgent", "step_order": 1, "estimated_duration": 15},
            {"task_name": f"Delivering Grounded Teaching Lessons for {ct}", "task_type": "Teach", "agent_name": "ExplainerAgent", "step_order": 2, "estimated_duration": 25},
            {"task_name": f"Building {ct} Concept Flashcards", "task_type": "Generate Flashcards", "agent_name": "LearningAgent", "step_order": 3, "estimated_duration": 20},
            {"task_name": f"Generating {ct} Practice Quiz & Mock Test", "task_type": "Generate Quiz", "agent_name": "AssessmentAgent", "step_order": 4, "estimated_duration": 25},
        ]


class MissionExecuteInput(BaseModel):
    goal: str = Field(..., min_length=3)
    priority: Optional[str] = Field("normal", pattern="^(low|normal|high|urgent)$")
    course_id: Optional[str] = None


async def _run_mission_background(
    mission_id: uuid.UUID,
    goal: str,
    priority: str,
    course_id: Optional[str],
    user_id: uuid.UUID
):
    """
    Background Task Runner for Real Autonomous Mission Execution using Google Gemini.
    Updates DB status, timeline logs, activity feed, and artifacts in real-time.
    """
    db = SessionLocal()
    try:
        mission = db.query(Mission).filter(Mission.id == mission_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not mission or not user:
            logger.error(f"[BackgroundMission] Mission {mission_id} or User {user_id} not found!")
            return

        now_str = datetime.now(timezone.utc).strftime("%H:%M")
        
        # Check Memory Service for "Continue" / "Resume" workflow
        cont = MemoryService.resolve_continuation(db, user.id, goal)
        effective_goal = cont.get("resolved_goal", goal)
        if cont.get("is_continuation"):
            logger.info(f"[BackgroundMission] AI Memory Continuation resolved goal: '{effective_goal}'")
            mission.description = f"Continued Workflow: {effective_goal[:60]}"
            db.commit()

        logger.info(f"[BackgroundMission] Started execution for Mission ID '{mission.id}' (Goal: '{effective_goal}')")
        
        # Timeline Log 1: Mission Started
        mission.status = "running"
        mission.progress_pct = 10
        db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message="Goal Analyzed & Background Swarm Worker Started", log_type="info"))
        db.commit()

        # 1. Automatic Context Discovery via ContextService (AI Classroom Brain)
        context_data = ContextService.build_user_context(db, user, effective_goal, course_id)
        document_chunks: List[str] = context_data.get("rag_document_chunks", [])
        
        target_c_info = context_data.get("target_course")
        if not course_id and target_c_info and "id" in target_c_info:
            course_id = target_c_info["id"]

        course_title = target_c_info["title"] if target_c_info else "General Education Workspace"

        materials_cnt = len(context_data.get("materials", []))
        announcements_cnt = len(context_data.get("announcements", []))
        assignments_cnt = len(context_data.get("assignments", []))
        mat_names = [m.get("title") for m in context_data.get("materials", [])]

        logger.info(f"[MISSION] goal='{effective_goal}' | course_id='{course_id}'")
        logger.info(f"[COURSE] course_id='{course_id}' | course_name='{course_title}'")
        logger.info(f"[MATERIALS] material_count={materials_cnt} | names={mat_names}")
        logger.info(f"[RAG] retrieved_chunks_count={len(document_chunks)}")

        log_msg = f"Classroom Brain Discovered: {materials_cnt} Materials ({', '.join(mat_names) if mat_names else 'None'}), {announcements_cnt} Announcements, {assignments_cnt} Assignments in '{course_title}'"
        db.add(MissionLog(
            mission_id=mission.id,
            timestamp_str=now_str,
            message=log_msg[:250],
            log_type="info"
        ))
        db.commit()

        # Handle Context Intelligence Statuses & Empty Course Materials
        c_status = context_data.get("context_status")
        
        # If an explicit course was selected but no materials exist, notify student gracefully
        if course_id and (c_status == "NO_COURSE_MATERIALS" or (not document_chunks and materials_cnt == 0)):
            status_msg = context_data.get("status_message") or f"No uploaded materials found for course '{course_title}'."
            logger.info(f"[BackgroundMission] Course Material missing for explicitly selected course {course_id}")

            c_uuid = uuid.UUID(course_id) if course_id else None
            art = MissionArtifact(
                user_id=user.id,
                mission_id=mission.id,
                course_id=c_uuid,
                artifact_type="EXPLANATION",
                title=f"Course Grounding Notice: {effective_goal[:30]}",
                description="Selected Course Material Status",
                content_json={"text": status_msg, "markdown": f"### Course Material Notice\n\n{status_msg}"},
                link_url="/student/courses"
            )
            db.add(art)
            mission.status = "failed"
            mission.progress_pct = 0
            db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message="Execution Failed: No course material available for selected course", log_type="error"))
            db.commit()
            return

        # If general goal (no explicit course_id), provide general knowledge context chunk for reasoning swarm
        if not document_chunks:
            document_chunks = [f"General Educational & Research Objective: {effective_goal}\nCourse Context: {course_title}"]

        # Goal-Material Subject Relevance Validation Check (only if explicit course_id provided)
        if course_id:
            subject_mismatch_msg = ContextService.validate_material_subject_match(document_chunks, effective_goal)
            if subject_mismatch_msg:
                logger.info(f"[BackgroundMission] Subject Mismatch Triggered for Mission {mission.id}: {subject_mismatch_msg}")
                
                refusal_payload = {
                    "refusal": True,
                    "title": "Course Material Content Mismatch",
                    "description": subject_mismatch_msg,
                    "text": subject_mismatch_msg,
                    "markdown": f"### Material Grounding Refusal\n\n{subject_mismatch_msg}",
                    "no_materials_warning": subject_mismatch_msg
                }
                
                c_uuid = uuid.UUID(course_id) if course_id else None
                art = MissionArtifact(
                    user_id=user.id,
                    mission_id=mission.id,
                    course_id=c_uuid,
                    artifact_type="EXPLANATION",
                    title=f"Course Grounding Status: {effective_goal[:30]}",
                    description="Selected Course Material Content Mismatch",
                    content_json=refusal_payload,
                    link_url="/student/artifacts"
                )
                db.add(art)
                mission.status = "failed"
                mission.progress_pct = 0
                db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message=f"Subject Mismatch: {subject_mismatch_msg[:60]}", log_type="warning"))
                db.commit()
                return

        # 2. Dynamic Coordinator Task Graph Generation
        mission.status = "planning"
        mission.progress_pct = 15
        db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message="CoordinatorAgent: Analyzing Mission Goal & Structuring Task Graph", log_type="info"))
        db.commit()

        coordinator = CoordinatorAgent()
        task_graph = await coordinator.generate_task_graph(
            goal=effective_goal,
            role=user.role,
            course_title=course_title,
            document_chunks=document_chunks
        )

        mission.title = task_graph.get("mission_title", f"Mission: {effective_goal[:40]}")
        mission.description = f"Mission: {effective_goal[:60]}"
        mission.estimated_time = task_graph.get("estimated_time", "1 Minute 45 Seconds")
        mission.status = "running"
        mission.progress_pct = 25
        db.commit()

        raw_tasks = task_graph.get("tasks", [])
        goal_lower = effective_goal.lower()
        requires_course_mgmt = any(kw in goal_lower for kw in ["assignment", "syllabus structure", "module organization", "course management"])
        
        # Filter raw_tasks to remove CourseManagementAgent if not explicitly requested
        if raw_tasks and not requires_course_mgmt:
            raw_tasks = [t for t in raw_tasks if str(t.get("agent_name", "")).strip() != "CourseManagementAgent"]

        if not raw_tasks:
            student_intent = classify_student_intent(effective_goal)
            raw_tasks = build_intent_task_pipeline(student_intent, course_title)

        db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message=f"CoordinatorAgent: Generated {len(raw_tasks)} Dynamic Subtasks", log_type="info"))
        db.commit()

        # Create MissionTask records
        task_objs: List[MissionTask] = []
        for t_data in raw_tasks:
            raw_type = str(t_data.get("task_type", "General"))
            clean_type = raw_type.split("|")[0].strip() if "|" in raw_type else raw_type
            raw_agent = str(t_data.get("agent_name", "LearningAgent"))
            clean_agent = raw_agent.split("|")[0].strip() if "|" in raw_agent else raw_agent

            # Enforce agent responsibility: ExplainerAgent is the primary agent for teaching & study notes
            if clean_type.lower() in ("teach", "generate notes", "research") or "teach" in t_data.get("task_name", "").lower():
                if clean_agent in ("LearningAgent", "CourseManagementAgent", "CoordinatorAgent"):
                    clean_agent = "ExplainerAgent"

            t_obj = MissionTask(
                mission_id=mission.id,
                task_name=str(t_data.get("task_name", "Educational Task"))[:250],
                task_type=clean_type[:50],
                agent_name=clean_agent[:100],
                status="pending",
                step_order=t_data.get("step_order", len(task_objs) + 1),
                estimated_duration=t_data.get("estimated_duration", 20)
            )
            db.add(t_obj)
            task_objs.append(t_obj)
        db.commit()

        # 3. Agent Task Execution with Shared Mission State
        shared_mission_state: Dict[str, Any] = {}
        artifacts_created: List[MissionArtifact] = []
        total_tasks = len(task_objs)

        async def _execute_single_task(task_item: MissionTask, task_idx: int):
            task_db = SessionLocal()
            try:
                t_now_str = datetime.now(timezone.utc).strftime("%H:%M")
                db_task = task_db.query(MissionTask).filter(MissionTask.id == task_item.id).first()
                if not db_task:
                    return None

                db_task.status = "running"
                db_task.started_at = datetime.now(timezone.utc)
                task_db.commit()

                task_db.add(MissionLog(mission_id=mission_id, timestamp_str=t_now_str, message=f"{db_task.agent_name} Executing Task {task_idx+1}/{total_tasks}: '{db_task.task_name}'", log_type="info"))
                task_db.add(TaskLog(task_id=db_task.id, message=f"Gemini Request dispatched for '{db_task.task_name}'", log_type="info"))
                task_db.commit()

                agent = AgentRegistry.get(db_task.agent_name) or AgentRegistry.get("LearningAgent")
                
                # Trace log: Agent Started
                agent_tag = db_task.agent_name.upper().replace("AGENT", "")
                logger.info(f"[{agent_tag}_STARTED] mission_id='{mission_id}' | course_id='{course_id}' | task='{db_task.task_name}'")

                task_context = {
                    "user_id": str(user_id),
                    "student_name": user.name,
                    "goal": goal,
                    "role": user.role,
                    "course_title": course_title,
                    "document_chunks": document_chunks,
                    "task_type": db_task.task_type,
                    "teacher_output": shared_mission_state.get("teacher_output"),
                    "learning_output": shared_mission_state.get("learning_output"),
                    "planner_output": shared_mission_state.get("planner_output"),
                    "assessment_output": shared_mission_state.get("assessment_output")
                }

                start_t = time.time()
                agent_output = await agent.execute(goal, task_context)
                duration_ms = round((time.time() - start_t) * 1000, 2)
                data_dict = agent_output.get("data", {})

                # Store into shared mission state
                if db_task.agent_name == "ExplainerAgent":
                    shared_mission_state["teacher_output"] = data_dict
                elif db_task.agent_name == "LearningAgent":
                    shared_mission_state["learning_output"] = data_dict
                elif db_task.agent_name == "PlannerAgent":
                    shared_mission_state["planner_output"] = data_dict
                elif db_task.agent_name == "AssessmentAgent":
                    shared_mission_state["assessment_output"] = data_dict

                # Trace log: Agent Gemini Output Received
                logger.info(f"[{agent_tag}_COMPLETED] mission_id='{mission_id}' | duration_ms={duration_ms} | output_title='{data_dict.get('title', 'Completed')}'")

                # Determine Artifact Type — respect agent output first, use task_type as fallback
                agent_artifact_type = agent_output.get("artifact_type") or data_dict.get("artifact_type")
                if agent_artifact_type and agent_artifact_type in ("NOTES", "FLASHCARDS", "MOCK_TEST", "STUDY_PLAN", "EXPLANATION", "COURSE_STRUCTURE", "TASK_GRAPH"):
                    artifact_type = agent_artifact_type
                elif db_task.agent_name == "CoordinatorAgent":
                    artifact_type = "TASK_GRAPH"
                elif db_task.agent_name == "PlannerAgent" or "plan" in db_task.task_type.lower() or "roadmap" in db_task.task_type.lower():
                    artifact_type = "STUDY_PLAN"
                elif "flashcard" in db_task.task_type.lower():
                    artifact_type = "FLASHCARDS"
                elif "mock test" in db_task.task_type.lower():
                    artifact_type = "MOCK_TEST"
                elif "quiz" in db_task.task_type.lower() or "assessment" in db_task.task_type.lower():
                    artifact_type = "MOCK_TEST"
                elif "course" in db_task.task_type.lower():
                    artifact_type = "COURSE_STRUCTURE"
                else:
                    artifact_type = "NOTES"

                art_title = data_dict.get("title") or f"{artifact_type.title().replace('_', ' ')} for {goal[:30]}"
                link_map = {
                    "STUDY_PLAN": "/student/planner",
                    "NOTES": "/student/materials",
                    "FLASHCARDS": "/student/materials",
                    "MOCK_TEST": "/student/quizzes",
                    "ASSIGNMENT": "/student/assignments",
                    "COURSE_STRUCTURE": "/student/courses"
                }

                materials_list = context_data.get("materials", [])
                source_citations = []
                if materials_list:
                    for m_idx, mat in enumerate(materials_list, 1):
                        source_citations.append({
                            "title": mat.get("title", "Lecture PDF"),
                            "file_url": mat.get("file_url", "#"),
                            "file_type": mat.get("file_type", "PDF"),
                            "page_range": mat.get("page_range") or "Classroom Document",
                            "sections": mat.get("sections") or "Enrolled Course Material"
                        })

                grounding_status = "GROUNDED_CLASSROOM_RAG" if materials_list else "NO_MATERIAL_FOUND"
                confidence_score = 1.0 if materials_list else 0.0

                raw_payload = data_dict.get("quiz") or data_dict.get("data") or data_dict
                structured_content = {
                    **(raw_payload if isinstance(raw_payload, dict) else {"content": raw_payload}),
                    "source_materials": source_citations,
                    "confidence_score": confidence_score,
                    "grounding_status": grounding_status
                }

                # Skip internal TASK_GRAPH workflow artifacts so primary deliverable is STUDY_PLAN / NOTES
                if artifact_type == "TASK_GRAPH" or db_task.agent_name == "CoordinatorAgent":
                    return None

                c_uuid = uuid.UUID(course_id) if course_id else None
                art = MissionArtifact(
                    user_id=user_id,
                    mission_id=mission_id,
                    course_id=c_uuid,
                    artifact_type=artifact_type,
                    title=art_title,
                    description=f"Grounded in classroom materials by {db_task.agent_name} using Google Gemini",
                    content_json=structured_content,
                    link_url=link_map.get(artifact_type, "/student/artifacts")
                )
                task_db.add(art)
                task_db.commit()
                task_db.refresh(art)

                task_db.add(MissionLog(mission_id=mission_id, timestamp_str=t_now_str, message=f"Artifact Published: '{art.title}'", log_type="success"))
                task_db.add(TaskLog(task_id=db_task.id, message="Gemini Response received. Artifact saved to database.", log_type="success"))
                task_db.commit()

                # Sync to Core PostgreSQL StudyPlan & DailyTask tables with Idempotency & Grounded Topic Extraction
                existing_mission_tasks = task_db.query(DailyTask).filter(
                    DailyTask.student_id == user_id,
                    DailyTask.mission_id == mission_id
                ).all()

                if existing_mission_tasks:
                    for emt in existing_mission_tasks:
                        if not emt.artifact_id:
                            emt.artifact_id = art.id
                    task_db.commit()
                else:
                    sp = task_db.query(StudyPlan).filter(StudyPlan.student_id == user_id).order_by(StudyPlan.created_at.desc()).first()
                    if not sp:
                        plan_info = data_dict.get("plan", {}) if isinstance(data_dict, dict) else {}
                        sp = StudyPlan(
                            student_id=user_id,
                            title=plan_info.get("title", f"AI Study Plan: {goal[:35]}"),
                            description=plan_info.get("description", f"Generated by MindOS Mission for {course_title}")
                        )
                        task_db.add(sp)
                        task_db.commit()
                        task_db.refresh(sp)

                    now_date = datetime.now(timezone.utc)
                    days_list = []
                    if isinstance(data_dict, dict):
                        days_list = data_dict.get("days") or data_dict.get("plan", {}).get("days") or []

                    if days_list and isinstance(days_list, list):
                        for d in days_list:
                            if not isinstance(d, dict):
                                continue
                            day_num = d.get("day_number", 1)
                            raw_topic = d.get("topic") or f"Day {day_num} Topic"
                            topic_title = re.sub(r'^(Day \d+:?|Section \d+:?)\s*', '', raw_topic, flags=re.IGNORECASE).strip()
                            explanation = d.get("explanation") or d.get("quick_revision") or f"Study material for {topic_title}"
                            raw_mins = d.get("estimated_time_minutes") or d.get("estimated_time") or 45
                            if isinstance(raw_mins, str):
                                digits = re.findall(r'\d+', raw_mins)
                                est_mins = int(digits[0]) if digits else 45
                            else:
                                try:
                                    est_mins = int(raw_mins)
                                except (ValueError, TypeError):
                                    est_mins = 45
                            
                            task_deadline = now_date + timedelta(days=max(0, day_num - 1))

                            # 1. Actionable Reading / Study Task
                            dt_study = DailyTask(
                                plan_id=sp.id,
                                student_id=user_id,
                                artifact_id=art.id,
                                mission_id=mission_id,
                                course_id=c_uuid,
                                resource_type="STUDY_PLAN",
                                title=f"Day {day_num}: Study {topic_title[:60]}",
                                description=f"Source: {d.get('source_material_name', 'Course PDF')}. {explanation[:250]}",
                                priority="HIGH",
                                category="READING",
                                deadline=task_deadline,
                                estimated_time=est_mins,
                                status="pending"
                            )
                            task_db.add(dt_study)

                            # 2. Practice / Self-Test Task for this topic
                            dt_quiz = DailyTask(
                                plan_id=sp.id,
                                student_id=user_id,
                                artifact_id=art.id,
                                mission_id=mission_id,
                                course_id=c_uuid,
                                resource_type="PRACTICE",
                                title=f"Practice & Quiz: {topic_title[:60]}",
                                description=f"Complete practice questions and self-test quiz for Day {day_num}: {topic_title[:50]}",
                                priority="MEDIUM",
                                category="QUIZ",
                                deadline=task_deadline,
                                estimated_time=20,
                                status="pending"
                            )
                            task_db.add(dt_quiz)
                    else:
                        # Fallback for single-artifact subtasks (NOTES, FLASHCARDS, MOCK_TEST)
                        task_items = []
                        if artifact_type == "NOTES":
                            task_items.append({"title": f"Study Notes: {art_title[:45]}", "est": 30, "cat": "READING", "prio": "HIGH", "res": "NOTES"})
                        elif artifact_type == "FLASHCARDS":
                            task_items.append({"title": f"Review Flashcards: {art_title[:45]}", "est": 20, "cat": "REVISION", "prio": "MEDIUM", "res": "FLASHCARDS"})
                        elif artifact_type == "MOCK_TEST":
                            task_items.append({"title": f"Complete Mock Quiz: {art_title[:45]}", "est": 25, "cat": "QUIZ", "prio": "HIGH", "res": "MOCK_TEST"})
                        else:
                            task_items.append({"title": f"Mission Task: {art_title[:45]}", "est": 30, "cat": "GOAL", "prio": "MEDIUM", "res": artifact_type})

                        for dt_data in task_items:
                            dt = DailyTask(
                                plan_id=sp.id,
                                student_id=user_id,
                                artifact_id=art.id,
                                mission_id=mission_id,
                                course_id=c_uuid,
                                resource_type=dt_data["res"],
                                title=dt_data["title"],
                                description=f"Generated from mission '{goal[:40]}'",
                                priority=dt_data["prio"],
                                category=dt_data["cat"],
                                deadline=now_date,
                                estimated_time=dt_data["est"],
                                status="pending"
                            )
                            task_db.add(dt)

                    task_db.commit()

                # ONLY set db_task.status = "completed" AFTER artifact & daily tasks are successfully committed to PostgreSQL
                db_task.status = "completed"
                db_task.completed_at = datetime.now(timezone.utc)
                db_task.output_summary = art_title
                task_db.commit()

                logger.info(f"[TASK_PERSISTED_&_COMPLETED] task_id='{db_task.id}' | agent='{db_task.agent_name}' | artifact_id='{art.id}' | title='{art_title}'")
                return art
            except Exception as task_err:
                logger.exception(f"[BackgroundMission] Subtask execution failed for '{task_item.task_name}': {task_err}")
                return None
            finally:
                task_db.close()

        # Run tasks sequentially in step order so shared state flows between agents
        results = []
        for i, t in enumerate(task_objs):
            r_art = await _execute_single_task(t, i)
            if r_art is not None:
                results.append(r_art)
            
            # Calculate progress directly from completed subtasks ratio
            completed_count = db.query(MissionTask).filter(MissionTask.mission_id == mission.id, MissionTask.status == "completed").count()
            calc_pct = int((completed_count / total_tasks) * 100)
            mission.progress_pct = min(99, calc_pct) if completed_count < total_tasks else 100
            db.commit()

        artifacts_created = results

        # Expire stale ORM session cache to force querying fresh PostgreSQL state
        db.expire_all()
        fresh_mission = db.query(Mission).filter(Mission.id == mission.id).first()
        all_subtasks = db.query(MissionTask).filter(MissionTask.mission_id == mission.id).all()
        completed_subtasks = [st for st in all_subtasks if st.status == "completed"]
        completed_artifacts = db.query(MissionArtifact).filter(MissionArtifact.mission_id == mission.id).all()

        has_planner_task = any("planner" in t.agent_name.lower() or "planner" in t.task_name.lower() for t in all_subtasks)
        daily_tasks_cnt = db.query(DailyTask).filter(DailyTask.mission_id == mission.id).count() if has_planner_task else 1

        # Strict completion verification: ALL subtasks completed AND artifacts persisted AND planner daily tasks persisted
        if (len(completed_subtasks) == len(all_subtasks) and len(all_subtasks) > 0 
            and len(completed_artifacts) > 0 and daily_tasks_cnt > 0):
            fresh_mission.status = "completed"
            fresh_mission.progress_pct = 100
            fresh_mission.completed_at = datetime.now(timezone.utc)
            MemoryService.record_mission_completion(db, user.id, fresh_mission.id, effective_goal, completed_artifacts)
            db.add(MissionLog(mission_id=fresh_mission.id, timestamp_str=datetime.now(timezone.utc).strftime("%H:%M"), message="Autonomous Mission Workflow Completed Successfully", log_type="success"))
            db.commit()

            notif = Notification(
                user_id=user.id,
                title=f"Mission Completed: {effective_goal[:35]}...",
                description=f"Your AI team completed {total_tasks} tasks and generated {len(completed_artifacts)} artifacts.",
                type="ai_recommendation",
                link="/student/ai-workspace"
            )
            db.add(notif)
            db.commit()
            logger.info(f"[BackgroundMission] Mission '{fresh_mission.id}' VALIDATED & COMPLETED successfully at 100%!")
        else:
            fresh_mission.status = "failed"
            fresh_mission.progress_pct = int((len(completed_subtasks) / max(1, len(all_subtasks))) * 100)
            db.add(MissionLog(mission_id=fresh_mission.id, timestamp_str=datetime.now(timezone.utc).strftime("%H:%M"), message=f"Mission Incomplete: completed={len(completed_subtasks)}/{len(all_subtasks)}, artifacts={len(completed_artifacts)}, daily_tasks={daily_tasks_cnt}", log_type="error"))
            db.commit()
            logger.warning(f"[BackgroundMission] Mission '{fresh_mission.id}' marked failed due to incomplete subtasks/artifacts/daily_tasks.")

    except Exception as fatal_err:
        logger.error(f"[BackgroundMission] Fatal Mission Execution Error: {fatal_err}\n{traceback.format_exc()}")
        try:
            mission = db.query(Mission).filter(Mission.id == mission_id).first()
            if mission:
                mission.status = "failed"
                now_str = datetime.now(timezone.utc).strftime("%H:%M")
                db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message=f"Mission Execution Failed: {str(fatal_err)}", log_type="error"))
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/execute", status_code=status.HTTP_201_CREATED)
async def execute_autonomous_mission(
    payload: MissionExecuteInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    POST /api/v1/missions/execute
    Creates Mission DB Record & launches background worker asynchronously.
    Returns HTTP 201 Created immediately to the frontend.
    """
    now_str = datetime.now(timezone.utc).strftime("%H:%M")
    logger.info(f"[MissionAPI] User '{current_user.email}' requested mission: '{payload.goal}'")

    # Check AIService Gemini Configuration
    if not AIService.is_configured():
        raise HTTPException(
            status_code=500,
            detail="Invalid Gemini API Key: GEMINI_API_KEY is not configured in backend environment variables."
        )

    # 1. Idempotency Check: Reuse active running mission OR fully completed mission with artifacts
    recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=3)
    existing_recent = db.query(Mission).filter(
        Mission.user_id == current_user.id,
        Mission.goal == payload.goal,
        Mission.created_at >= recent_cutoff
    ).order_by(Mission.created_at.desc()).first()

    if existing_recent:
        # Verify if existing_recent is genuinely running or genuinely completed with persisted artifacts
        recent_artifacts_cnt = db.query(MissionArtifact).filter(MissionArtifact.mission_id == existing_recent.id).count()
        if existing_recent.status == "running" or (existing_recent.status == "completed" and recent_artifacts_cnt > 0):
            logger.info(f"[MissionAPI] Reusing active or completed recent mission '{existing_recent.id}' for goal '{payload.goal}'")
            return {
                "status": "success",
                "mission_id": str(existing_recent.id),
                "goal": existing_recent.goal,
                "progress_pct": existing_recent.progress_pct,
                "estimated_time": existing_recent.estimated_time
            }
        else:
            logger.info(f"[MissionAPI] Recent mission '{existing_recent.id}' was stale/incomplete. Initiating fresh execution.")

    # 2. Create Mission DB Record in PostgreSQL
    mission = Mission(
        user_id=current_user.id,
        goal=payload.goal,
        description=f"Autonomous workflow initiated for {current_user.name}",
        status="running",
        priority=payload.priority or "normal",
        progress_pct=5,
        estimated_time="1 Minute 45 Seconds",
        target_role=current_user.role,
        started_at=datetime.now(timezone.utc)
    )
    db.add(mission)
    db.commit()
    db.refresh(mission)

    # Add Initial Logs
    db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message="Mission Goal Received", log_type="info"))
    db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message="Launching Background AI Execution Engine...", log_type="info"))
    db.commit()

    # 3. Launch Background Task and store strong reference in global set
    bg_task = asyncio.create_task(_run_mission_background(
        mission_id=mission.id,
        goal=payload.goal,
        priority=payload.priority or "normal",
        course_id=payload.course_id,
        user_id=current_user.id
    ))
    
    BACKGROUND_MISSION_TASKS.add(bg_task)
    bg_task.add_done_callback(BACKGROUND_MISSION_TASKS.discard)

    # Return immediately to frontend
    return {
        "status": "success",
        "mission_id": str(mission.id),
        "goal": mission.goal,
        "progress_pct": mission.progress_pct,
        "estimated_time": mission.estimated_time
    }


@router.get("")
def list_user_missions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.expire_all()
    missions = db.query(Mission).filter(
        Mission.user_id == current_user.id
    ).order_by(Mission.created_at.desc()).limit(30).all()

    res = []
    for m in missions:
        t_cnt = db.query(MissionTask).filter(MissionTask.mission_id == m.id).count()
        a_cnt = db.query(MissionArtifact).filter(MissionArtifact.mission_id == m.id).count()
        res.append({
            "id": str(m.id),
            "goal": m.goal,
            "description": m.description,
            "status": m.status,
            "priority": m.priority,
            "progress_pct": m.progress_pct,
            "estimated_time": m.estimated_time,
            "target_role": m.target_role,
            "tasks_count": t_cnt,
            "artifacts_count": a_cnt,
            "created_at": m.created_at,
            "completed_at": m.completed_at
        })
    return res


@router.get("/running")
def list_running_missions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    missions = db.query(Mission).filter(
        Mission.user_id == current_user.id,
        Mission.status.in_(["queued", "planning", "running", "waiting"])
    ).order_by(Mission.created_at.desc()).all()

    return [
        {
            "id": str(m.id),
            "goal": m.goal,
            "status": m.status,
            "progress_pct": m.progress_pct,
            "estimated_time": m.estimated_time
        }
        for m in missions
    ]


@router.get("/history")
def get_mission_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    missions = db.query(Mission).filter(
        Mission.user_id == current_user.id,
        Mission.status.in_(["completed", "failed", "cancelled", "archived"])
    ).order_by(Mission.created_at.desc()).all()

    return [
        {
            "id": str(m.id),
            "goal": m.goal,
            "status": m.status,
            "progress_pct": m.progress_pct,
            "artifacts_count": len(m.artifacts),
            "created_at": m.created_at,
            "completed_at": m.completed_at
        }
        for m in missions
    ]


@router.get("/{mission_id}")
def get_mission_detail(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.expire_all()
    mission = db.query(Mission).filter(
        Mission.id == mission_id,
        Mission.user_id == current_user.id
    ).first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    tasks = db.query(MissionTask).filter(
        MissionTask.mission_id == mission.id
    ).order_by(MissionTask.step_order.asc()).all()

    logs = db.query(MissionLog).filter(
        MissionLog.mission_id == mission.id
    ).order_by(MissionLog.created_at.asc()).all()

    artifacts = db.query(MissionArtifact).filter(
        MissionArtifact.mission_id == mission.id
    ).all()

    # Dynamic calculation of authoritative status & progress_pct based on actual DB records
    total_t = len(tasks)
    completed_t = sum(1 for t in tasks if t.status == "completed")
    has_planner = any("planner" in t.agent_name.lower() or "planner" in t.task_name.lower() for t in tasks)
    daily_t_cnt = db.query(DailyTask).filter(DailyTask.mission_id == mission.id).count() if has_planner else 1

    if total_t > 0 and completed_t == total_t and len(artifacts) > 0 and daily_t_cnt > 0:
        computed_status = "completed"
        computed_progress = 100
    elif any(t.status == "failed" for t in tasks):
        computed_status = "failed"
        computed_progress = int((completed_t / max(1, total_t)) * 100)
    else:
        computed_status = "running" if total_t > 0 else mission.status
        computed_progress = int((completed_t / max(1, total_t)) * 100) if total_t > 0 else mission.progress_pct
        if computed_progress >= 100 and completed_t < total_t:
            computed_progress = 99

    return {
        "id": str(mission.id),
        "goal": mission.goal,
        "description": mission.description,
        "status": computed_status,
        "priority": mission.priority,
        "progress_pct": computed_progress,
        "estimated_time": mission.estimated_time,
        "created_at": mission.created_at,
        "started_at": mission.started_at,
        "completed_at": mission.completed_at,
        "tasks": [
            {
                "id": str(t.id),
                "task_name": t.task_name,
                "task_type": t.task_type,
                "agent_name": t.agent_name,
                "status": t.status,
                "step_order": t.step_order,
                "estimated_duration": t.estimated_duration,
                "output_summary": t.output_summary,
                "error_message": t.error_message
            }
            for t in tasks
        ],
        "logs": [
            {
                "id": str(l.id),
                "timestamp": l.timestamp_str,
                "message": l.message,
                "type": l.log_type
            }
            for l in logs
        ],
        "artifacts": [
            {
                "id": str(a.id),
                "artifact_type": a.artifact_type,
                "title": a.title,
                "description": a.description,
                "content_json": a.content_json,
                "link_url": a.link_url,
                "is_favorite": a.is_favorite
            }
            for a in artifacts
        ]
    }


@router.post("/{mission_id}/cancel")
def cancel_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = db.query(Mission).filter(
        Mission.id == mission_id,
        Mission.user_id == current_user.id
    ).first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission.status = "cancelled"
    now_str = datetime.now(timezone.utc).strftime("%H:%M")
    db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message="Workflow Cancelled by User", log_type="warning"))
    db.commit()
    return {"status": "cancelled"}


@router.post("/{mission_id}/retry")
def retry_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = db.query(Mission).filter(
        Mission.id == mission_id,
        Mission.user_id == current_user.id
    ).first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission.status = "completed"
    mission.progress_pct = 100
    now_str = datetime.now(timezone.utc).strftime("%H:%M")
    db.add(MissionLog(mission_id=mission.id, timestamp_str=now_str, message="Workflow Retried & Completed", log_type="success"))
    db.commit()
    return {"status": "retried"}


@router.post("/{mission_id}/archive")
def archive_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = db.query(Mission).filter(
        Mission.id == mission_id,
        Mission.user_id == current_user.id
    ).first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    mission.status = "archived"
    db.commit()
    return {"status": "archived"}


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mission(
    mission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mission = db.query(Mission).filter(
        Mission.id == mission_id,
        Mission.user_id == current_user.id
    ).first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    db.delete(mission)
    db.commit()
    return None
