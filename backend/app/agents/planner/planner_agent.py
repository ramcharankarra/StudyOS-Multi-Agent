import re
import logging
from typing import Dict, Any, Optional, List
from app.agents.base_agent import BaseAgent
from app.agents.config import AgentConfig
from app.services.gemini_service import GeminiService

logger = logging.getLogger("planner_agent")

def build_grounded_fallback_from_chunks(document_chunks: List[str], goal: str, course_title: str, target_days: int = 10) -> Dict[str, Any]:
    cleaned_chunks = []
    for chunk in document_chunks:
        cleaned = re.sub(r'^Course Material [^\n]+\n?', '', chunk, flags=re.MULTILINE)
        cleaned_chunks.append(cleaned)

    full_text = "\n".join(cleaned_chunks)
    lines = [line.strip() for line in full_text.split("\n") if len(line.strip()) > 12 and not line.startswith("Course Material")]

    if not lines:
        lines = [
            f"Course Material for {course_title}: Key concepts, definitions, formulas, and slide explanations.",
            "Detailed lecture notes covering theoretical foundations and worked examples."
        ]

    days_count = max(1, min(target_days, 30))
    chunk_size = max(1, len(lines) // days_count)
    topics = []
    for idx in range(days_count):
        start_i = (idx * chunk_size) % len(lines)
        section_lines = lines[start_i:start_i + chunk_size] if chunk_size > 0 else lines
        if not section_lines:
            section_lines = lines[:3]

        raw_title = section_lines[0].lstrip("#*- ").strip()
        main_topic = re.sub(r'^(Slide \d+:|Module \d+:|Section \d+:|Chapter \d+:)\s*', '', raw_title, flags=re.IGNORECASE)[:60]
        if not main_topic:
            main_topic = raw_title[:60] or f"Day {idx+1} Key Module"

        explanation_body = "\n\n".join(section_lines[1:6]) if len(section_lines) > 1 else section_lines[0]

        key_terms = [l[:120] for l in section_lines if ":" in l or "=" in l or "is " in l or "are " in l][:4]
        if not key_terms:
            key_terms = [f"Key Concept {i+1}: {l[:100]}" for i, l in enumerate(section_lines[:3])]

        topics.append({
            "day_number": idx + 1,
            "topic": f"Day {idx+1}: {main_topic}",
            "source_material_name": f"{course_title} Material.pdf",
            "source_page_range": f"Section {idx+1} (Slides {idx*10+1}–{(idx+1)*10})",
            "estimated_time_minutes": 45,
            "status": "pending",
            "what_to_learn": [f"Understand concept: {l[:60]}" for l in section_lines[:3]],
            "explanation": f"### According to your course material:\n{explanation_body}",
            "key_concepts": key_terms,
            "examples": [f"Material Example: {l[:120]}" for l in section_lines if "example" in l.lower() or "case" in l.lower()][:2] or [f"Example from course text: {section_lines[-1][:120]}"],
            "exam_focus": f"Exam Focus (From Material): Pay close attention to definitions and formulas in '{main_topic}'.",
            "quick_revision": f"Revision Summary: {section_lines[0][:150]}",
            "practice_questions": [f"Based on your material, explain '{main_topic}'?", f"What are the key components of {main_topic}?"],
            "quiz": [
                {
                    "question": f"According to your course material, what is the core feature of '{main_topic}'?",
                    "options": [section_lines[0][:60], "Generic AI Concept", "Unrelated General Topic", "None of the above"],
                    "correct": section_lines[0][:60],
                    "explanation": f"Derived directly from your uploaded material: '{section_lines[0][:120]}'"
                }
            ]
        })

    return {
        "title": f"100% Material-Grounded Study Plan: {goal[:35]}",
        "description": f"Extracted directly from enrolled course material for {course_title}",
        "total_days": len(topics),
        "days": topics
    }


class PlannerAgent(BaseAgent):
    """
    Planner Agent Engine for StudyOS.
    Generates course-grounded, day-by-day AI study plans using Google Gemini.
    THE UPLOADED MATERIAL IS THE SINGLE SOURCE OF TRUTH.
    """
    def __init__(self):
        super().__init__(AgentConfig(
            name="PlannerAgent",
            description="Generates personalized study schedules, course-grounded day-by-day topic breakdowns, explanations, concept teaching, exam focus, and quizzes."
        ))

    async def process_task(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        context = context or {}
        goal = prompt or context.get("goal", "Study Strategy Goal")
        student_name = context.get("student_name", "Student")
        course_title = context.get("course_title", "General Education Workspace")
        document_chunks: List[str] = context.get("document_chunks", [])
        available_hours = context.get("available_hours", 3)

        return await self.generate_plan(student_name, goal, course_title, document_chunks, available_hours)

    async def generate_plan(
        self,
        student_name: str,
        goal: str,
        course_title: str = "General Education Workspace",
        document_chunks: Optional[List[str]] = None,
        available_hours: int = 3
    ) -> Dict[str, Any]:
        document_chunks = [c for c in (document_chunks or []) if c and len(c.strip()) > 15]

        # 1. Zero Material Check
        if not document_chunks:
            refusal_msg = "No relevant course material was retrieved. StudyOS cannot generate material-grounded explanations until course material is available."
            return {
                "status": "refusal",
                "artifact_type": "STUDY_PLAN",
                "title": "No Course Material Found",
                "description": refusal_msg,
                "plan": {
                    "refusal": True,
                    "title": "No Course Material Found",
                    "description": refusal_msg,
                    "markdown": refusal_msg,
                    "response": refusal_msg,
                    "no_materials_warning": refusal_msg,
                    "days": []
                },
                "data": {
                    "refusal": True,
                    "title": "No Course Material Found",
                    "description": refusal_msg,
                    "markdown": refusal_msg,
                    "response": refusal_msg,
                    "no_materials_warning": refusal_msg,
                    "days": []
                }
            }

        # 2. Subject Mismatch Validation
        from app.services.context_service import ContextService
        mismatch_msg = ContextService.validate_material_subject_match(document_chunks, goal)
        if mismatch_msg:
            return {
                "status": "refusal",
                "artifact_type": "STUDY_PLAN",
                "title": "Material Content Mismatch",
                "description": mismatch_msg,
                "plan": {
                    "refusal": True,
                    "title": "Material Content Mismatch",
                    "description": mismatch_msg,
                    "markdown": mismatch_msg,
                    "response": mismatch_msg,
                    "no_materials_warning": mismatch_msg,
                    "days": []
                },
                "data": {
                    "refusal": True,
                    "title": "Material Content Mismatch",
                    "description": mismatch_msg,
                    "markdown": mismatch_msg,
                    "response": mismatch_msg,
                    "no_materials_warning": mismatch_msg,
                    "days": []
                }
            }

        # Parse requested days from goal (e.g. "Prepare me for my exam in 10 days" -> 10)
        day_match = re.search(r'(\d+)\s*days?', goal, re.IGNORECASE)
        num_days = int(day_match.group(1)) if day_match else 10
        num_days = max(1, min(num_days, 30))

        rag_context = "=== ENROLLED COURSE LECTURE MATERIAL & SLIDES CONTEXT ===\n"
        for i, chunk in enumerate(document_chunks[:15], 1):
            rag_context += f"[Section/Slide Chunk {i}]:\n{chunk[:1500]}\n\n"
        rag_context += "=========================================================\n"

        prompt = (
            f"You are the StudyOS Lead Academic Planner & AI Tutor for course '{course_title}'.\n"
            f"Student Name: '{student_name}'\n"
            f"User Goal / Request: '{goal}'\n"
            f"Target Timeline: Exactly {num_days} Days\n"
            f"{rag_context}\n"
            "CRITICAL MATERIAL GROUNDING & TEACHING POLICY:\n"
            "1. THE UPLOADED COURSE MATERIAL IS YOUR SINGLE SOURCE OF TRUTH.\n"
            "2. Inspect the actual course material and identify the actual topics, chapters, and sections.\n"
            f"3. Divide the material realistically across {num_days} days.\n"
            "4. The plan MUST contain actual learning/teaching content for each day, NOT only topic titles.\n"
            "5. For each day, provide:\n"
            "   - 'topic': Actual topic/section from the material.\n"
            "   - 'source_material_name': Name of the PDF/document.\n"
            "   - 'source_page_range': Specific slides/pages/sections (e.g. 'Slides 1–25', 'Chapter 2, pp. 45–60').\n"
            "   - 'what_to_learn': List of 2–4 specific learning outcomes derived from the material.\n"
            "   - 'explanation': Concise, readable teaching explanation derived from the material so the student can learn directly inside StudyOS without opening the PDF.\n"
            "   - 'key_concepts': List of material-derived definitions, key points, and formulas.\n"
            "   - 'examples': Relevant worked example or illustration from the material.\n"
            "   - 'exam_focus': Critical exam tips and points highlighted in the material.\n"
            "   - 'quick_revision': Concise summary for quick review.\n"
            "   - 'practice_questions': 2–3 questions based strictly on the material.\n"
            "   - 'quiz': 1–2 interactive quiz questions with options, correct answer, and explanation from the material.\n"
            "6. If the PDF contains incorrect or questionable information, do not silently replace it; clearly distinguish what the material says from any correction.\n"
            "7. Do NOT invent topics that are not present in the retrieved material.\n\n"
            "Required JSON Schema:\n"
            "{\n"
            f'  "title": "{num_days}-Day Material-Grounded Exam Preparation Plan: {goal[:30]}",\n'
            '  "description": "Comprehensive course-grounded study roadmap and daily learning content",\n'
            f'  "total_days": {num_days},\n'
            '  "days": [\n'
            '    {\n'
            '      "day_number": 1,\n'
            '      "topic": "Topic Title from Material",\n'
            '      "source_material_name": "Course Material Name",\n'
            '      "source_page_range": "Slides 1–25",\n'
            '      "estimated_time_minutes": 45,\n'
            '      "status": "pending",\n'
            '      "what_to_learn": ["Target learning outcome 1", "Target learning outcome 2"],\n'
            '      "explanation": "According to your course material: Detailed student-friendly explanation of the concepts from the slides so the student understands it completely...",\n'
            '      "key_concepts": [\n'
            '        "Concept 1: Definition and importance from material",\n'
            '        "Concept 2: Formula or key process steps"\n'
            '      ],\n'
            '      "examples": ["Material-derived example or worked problem"],\n'
            '      "exam_focus": "Critical exam points and memory tips from material",\n'
            '      "quick_revision": "Short concise summary of the topic",\n'
            '      "practice_questions": ["Practice question 1?", "Practice question 2?"],\n'
            '      "quiz": [\n'
            '        {\n'
            '          "question": "Quiz question 1?",\n'
            '          "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            '          "correct": "Option A",\n'
            '          "explanation": "Detailed explanation derived from the lecture material"\n'
            '        }\n'
            '      ]\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        fallback = build_grounded_fallback_from_chunks(document_chunks, goal, course_title, target_days=num_days)

        plan_data = await GeminiService.generate_json(prompt, fallback_data=fallback)
        return {
            "status": "success",
            "artifact_type": "STUDY_PLAN",
            "plan": plan_data,
            "title": plan_data.get("title", f"{num_days}-Day Study Plan: {goal[:30]}"),
            "data": plan_data
        }
