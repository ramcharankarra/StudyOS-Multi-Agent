import time
import asyncio
import logging
from typing import Dict, Any, Optional, List, Tuple
from app.agents.base_agent import BaseAgent
from app.agents.config import AgentConfig
from app.agents.registry import AgentRegistry
from app.services.gemini_service import GeminiService
from app.services.ai_service import AIService

logger = logging.getLogger("coordinator_agent")

class CoordinatorAgent(BaseAgent):
    """
    Coordinator Agent — The Autonomous Multi-Agent Orchestrator for StudyOS.
    Responsibilities:
    - Receive user mission goal.
    - Use Google Gemini to dynamically generate a task graph workflow.
    - Coordinate domain agents (Learning, Assessment, Planner, Course, Memory, Analytics).
    - Aggregate results and provide execution transparency.
    """

    def __init__(self):
        super().__init__(AgentConfig(
            name="CoordinatorAgent",
            description="Autonomous orchestrator: decomposes mission goals into dynamic task graphs using Google Gemini, coordinates domain agents, and aggregates results."
        ))

    async def generate_task_graph(
        self,
        goal: str,
        role: str = "student",
        course_title: Optional[str] = None,
        document_chunks: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calls Google Gemini via GeminiService to dynamically decompose a user goal into a structured Task Graph.
        """
        system_instruction = (
            "You are StudyOS Chief AI Coordinator. Your role is to analyze a user's educational goal and decompose it into a structured workflow task graph."
        )

        rag_section = ""
        if document_chunks:
            rag_section = "\n=== COURSE MATERIAL HIGHLIGHTS ===\n" + "\n".join([c[:300] for c in document_chunks[:5]]) + "\n=================================\n"
        
        prompt = (
            f"User Educational Goal: '{goal}'\n"
            f"Target User Role: {role}\n"
            f"Course Context: {course_title or 'General Education Workspace'}\n"
            f"{rag_section}\n"
            "Decompose this goal into a sequence of logical tasks based on the actual course topics. Assign each task strictly to its responsible agent:\n"
            "- 'ExplainerAgent': Primary agent for teaching, explaining, delivering grounded course lessons, concept breakdowns\n"
            "- 'PlannerAgent': Creating daily study schedule, study roadmaps, calendar time blocking\n"
            "- 'LearningAgent': Concept flashcards, active recall memory packs, revision cards\n"
            "- 'AssessmentAgent': Practice quizzes, MCQs, mock tests, evaluations\n"
            "- 'CourseManagementAgent': ONLY for explicit course assignment or syllabus structure management (do NOT include for standard study/exam prep)\n\n"
            "Routing Rules:\n"
            "1. If goal asks for teaching/explanation only -> ExplainerAgent\n"
            "2. If goal asks for flashcards only -> LearningAgent\n"
            "3. If goal asks for quiz/test only -> AssessmentAgent\n"
            "4. If goal asks for study plan only -> PlannerAgent\n"
            "5. If goal asks for teaching + quiz -> ExplainerAgent -> AssessmentAgent\n"
            "6. If goal is exam prep / multi-step study -> PlannerAgent -> ExplainerAgent -> LearningAgent -> AssessmentAgent\n\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            '  "mission_title": "Short title describing the mission",\n'
            '  "estimated_time": "e.g. 2 Minutes 15 Seconds",\n'
            '  "tasks": [\n'
            "    {\n"
            '      "task_name": "Actionable task title reflecting actual subject topics",\n'
            '      "task_type": "Planning|Teach|Generate Notes|Generate Flashcards|Generate Quiz|Generate Mock Test",\n'
            '      "agent_name": "ExplainerAgent|PlannerAgent|LearningAgent|AssessmentAgent",\n'
            '      "step_order": 1,\n'
            '      "estimated_duration": 20\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        fallback = {
            "mission_title": f"Mission: {goal[:40]}",
            "estimated_time": "1 Minute 45 Seconds",
            "tasks": [
                {"task_name": f"Organizing {course_title or 'Course'} Study Calendar & Roadmap", "task_type": "Planning", "agent_name": "PlannerAgent", "step_order": 1, "estimated_duration": 15},
                {"task_name": f"Delivering Grounded Teaching Lessons for {course_title or 'Course'}", "task_type": "Teach", "agent_name": "ExplainerAgent", "step_order": 2, "estimated_duration": 25},
                {"task_name": f"Building {course_title or 'Course'} Concept Flashcards", "task_type": "Generate Flashcards", "agent_name": "LearningAgent", "step_order": 3, "estimated_duration": 20},
                {"task_name": f"Generating {course_title or 'Course'} Practice Quiz & Mock Test", "task_type": "Generate Quiz", "agent_name": "AssessmentAgent", "step_order": 4, "estimated_duration": 25}
            ]
        }

        task_graph = await AIService.generate_json(prompt, system_instruction, fallback_data=fallback, agent_name="CoordinatorAgent")
        if not isinstance(task_graph, dict) or "tasks" not in task_graph or not task_graph["tasks"]:
            return fallback

        return task_graph

    async def process_task(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Coordinator Agent task processing.
        """
        start_time = time.time()
        context = context or {}
        goal = prompt or context.get("goal", "Learn Subject")
        role = context.get("role", "student")
        course_title = context.get("course_title")
        document_chunks = context.get("document_chunks")
        
        task_graph = await self.generate_task_graph(goal, role, course_title, document_chunks)
        
        total_time_ms = round((time.time() - start_time) * 1000, 2)
        
        return {
            "status": "success",
            "orchestrator": self.name,
            "task_graph": task_graph,
            "execution_time_ms": total_time_ms,
            "response": f"Coordinator Agent analyzed goal '{goal}' and generated a {len(task_graph.get('tasks', []))}-task execution workflow."
        }
