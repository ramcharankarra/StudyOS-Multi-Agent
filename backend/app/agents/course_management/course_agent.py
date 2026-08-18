import logging
from typing import Dict, Any, Optional
from app.agents.base_agent import BaseAgent
from app.agents.config import AgentConfig
from app.services.gemini_service import GeminiService

logger = logging.getLogger("course_management_agent")

class CourseManagementAgent(BaseAgent):
    """
    Course Management Agent for StudyOS.
    Generates real AI course structures, syllabi, modules, lessons, and learning objectives using Google Gemini.
    """
    def __init__(self):
        super().__init__(AgentConfig(
            name="CourseManagementAgent",
            description="Assists teachers and students with curriculum generation, module structuring, and syllabus drafting."
        ))

    async def process_task(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        context = context or {}
        goal = prompt or context.get("goal", "Course Curriculum Goal")

        sys_prompt = "You are StudyOS Course Architect. Generate structured course syllabi and learning modules."
        ai_prompt = (
            f"Generate a course structure for goal: '{goal}'.\n"
            "Return JSON matching:\n"
            "{\n"
            '  "course_title": "Course Title",\n'
            '  "description": "Course overview",\n'
            '  "modules": [\n'
            '    {\n'
            '      "module_name": "Module 1 Name",\n'
            '      "topics": ["Topic A", "Topic B"]\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        fallback = {
            "course_title": f"Course: {goal[:30]}",
            "description": f"Comprehensive syllabus for {goal}",
            "modules": [
                {"module_name": "Module 1: Foundations", "topics": ["Introduction & Terminology", "Core Architecture"]},
                {"module_name": "Module 2: Advanced Applications", "topics": ["Problem Solving Strategies", "Evaluation Techniques"]}
            ]
        }

        course_data = await GeminiService.generate_json(ai_prompt, sys_prompt, fallback_data=fallback)
        return {
            "status": "success",
            "artifact_type": "COURSE_STRUCTURE",
            "course": course_data,
            "title": course_data.get("course_title", f"Course: {goal[:30]}"),
            "data": course_data
        }
