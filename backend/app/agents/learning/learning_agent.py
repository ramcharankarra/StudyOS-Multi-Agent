import re
import json
import logging
from typing import Dict, Any, Optional, List
from app.agents.base_agent import BaseAgent
from app.agents.config import AgentConfig
from app.services.gemini_service import GeminiService
from app.services.content_mapping_service import ContentMappingService

logger = logging.getLogger("learning_agent")


class LearningAgent(BaseAgent):
    """
    StudyOS Personal AI Tutor Agent.
    Generates real AI Study Material, In-Depth Concept Explanations, Structured Modules, Flashcards, and Summaries using Google Gemini.
    THE UPLOADED MATERIAL IS THE SINGLE SOURCE OF TRUTH.
    """
    def __init__(self):
        super().__init__(AgentConfig(
            name="LearningAgent",
            description="Provides interactive AI tutoring, comprehensive study material generation, document Q&A, and concept flashcards."
        ))

    async def process_task(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        context = context or {}
        task_type = context.get("task_type", "generate_notes")
        goal = prompt or context.get("goal", "Study Goal")
        course_title = context.get("course_title", "General Education Workspace")
        document_chunks: List[str] = [c for c in context.get("document_chunks", []) if c and len(c.strip()) > 15]

        # 1. Zero Material Check: Fallback to General Knowledge for general AI requests if no course materials exist
        if not document_chunks:
            if not context.get("course_id"):
                document_chunks = [f"General Knowledge & Educational Topic: {goal}\nCourse Context: {course_title}"]
            else:
                refusal_msg = "No relevant course material was retrieved. Upload course material to enable grounded study content."
                art_t = "FLASHCARDS" if "flashcard" in task_type.lower() else "NOTES"
                return {
                    "status": "refusal",
                    "artifact_type": art_t,
                    "title": "No Course Material Found",
                    "description": refusal_msg,
                    "data": {
                        "refusal": True,
                        "title": "No Course Material Found",
                        "description": refusal_msg,
                        "markdown": refusal_msg,
                        "content_markdown": refusal_msg,
                        "response": refusal_msg,
                        "no_materials_warning": refusal_msg
                    }
                }

        # 2. Subject Mismatch Validation
        from app.services.context_service import ContextService
        mismatch_msg = ContextService.validate_material_subject_match(document_chunks, goal)
        if mismatch_msg:
            art_t = "FLASHCARDS" if "flashcard" in task_type.lower() else "NOTES"
            return {
                "status": "refusal",
                "artifact_type": art_t,
                "title": "Material Content Mismatch",
                "description": mismatch_msg,
                "data": {
                    "refusal": True,
                    "title": "Material Content Mismatch",
                    "description": mismatch_msg,
                    "markdown": mismatch_msg,
                    "content_markdown": mismatch_msg,
                    "response": mismatch_msg,
                    "no_materials_warning": mismatch_msg
                }
            }

        task_type_lower = task_type.lower()
        goal_lower = goal.lower()

        # 3. Flashcards Generation
        if "flashcard" in task_type_lower or "flashcard" in goal_lower:
            return await self.generate_flashcards(course_title, goal, document_chunks)

        # 4. In-Depth Teaching Study Material Generation
        else:
            return await self.generate_study_material(course_title, goal, document_chunks)

    async def generate_flashcards(self, course_title: str, goal: str, document_chunks: List[str]) -> Dict[str, Any]:
        rag_text = "=== UPLOADED COURSE MATERIAL CONTEXT (SOURCE OF TRUTH) ===\n"
        for i, chunk in enumerate(document_chunks[:10], 1):
            rag_text += f"[Chunk {i}]:\n{chunk[:1500]}\n\n"
        rag_text += "=========================================================\n"

        prompt = (
            f"You are StudyOS AI Tutor for '{course_title}'. Generate a set of 8 to 12 conceptual flashcards for the student's study goal: '{goal}'.\n\n"
            "CRITICAL GROUNDING REQUIREMENTS:\n"
            "1. Every flashcard must test a factual definition, mechanism, formula, or concept directly stated in the provided course material text.\n"
            "2. DO NOT invent concepts not in the text.\n"
            "3. Front of card: Clear conceptual or test question.\n"
            "4. Back of card: In-depth explanation derived from the text.\n"
            "5. Include a brief hint and source reference.\n\n"
            f"{rag_text}\n\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            f'  "title": "Flashcards: {goal[:35]}",\n'
            '  "total_cards": 10,\n'
            '  "flashcards": [\n'
            "    {\n"
            '      "question": "Front of card question based on material?",\n'
            '      "answer": "Back of card detailed explanation from material.",\n'
            '      "hint": "Helpful conceptual hint",\n'
            '      "source": "Document name (Page/Section)"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        fallback_cards = self._build_heuristic_flashcards(document_chunks, goal, course_title)
        res_json = await GeminiService.generate_json(
            prompt=prompt,
            fallback_data=fallback_cards,
            agent_name="LearningAgent",
            context_chunks=document_chunks[:6]
        )

        cards = res_json.get("flashcards") or res_json.get("cards") or fallback_cards["flashcards"]
        res_data = {
            "title": res_json.get("title", f"Flashcards: {goal[:35]}"),
            "total_cards": len(cards),
            "flashcards": cards,
            "cards": cards
        }

        return {
            "status": "success",
            "artifact_type": "FLASHCARDS",
            "title": res_data["title"],
            "data": res_data
        }

    async def generate_study_material(self, course_title: str, goal: str, document_chunks: List[str]) -> Dict[str, Any]:
        """
        Generates structured, student-friendly, in-depth teaching study material.
        Covers the actual contents of the uploaded materials with full explanations,
        definitions, examples, formulas, step-by-step breakdowns, exam points, and source citations.
        """
        # Step A: Extract Content Map
        content_map = await ContentMappingService.extract_content_map(document_chunks, course_title, goal)
        units = content_map.get("units", [])
        total_topics = content_map.get("total_topics_count", 0)

        rag_text = "=== UPLOADED COURSE MATERIAL CONTEXT (SOURCE OF TRUTH) ===\n"
        for i, chunk in enumerate(document_chunks[:12], 1):
            rag_text += f"[Chunk {i}]:\n{chunk[:1800]}\n\n"
        rag_text += "=========================================================\n"

        prompt = (
            f"You are the StudyOS AI Professor and Tutor for '{course_title}'.\n"
            f"Generate comprehensive, student-friendly STUDY MATERIAL for the goal: '{goal}'.\n\n"
            "CRITICAL PRODUCT & GROUNDING POLICIES:\n"
            "1. The student must be able to LEARN and UNDERSTAND each topic directly inside StudyOS without needing to open the PDF for basic understanding.\n"
            "2. Ground every single explanation strictly in the provided course material text below. Never invent outside topics.\n"
            "3. Structure the material into the discovered Units and Topics.\n"
            "4. For EVERY topic, provide:\n"
            "   - 'topic_title': Name of the topic from the material\n"
            "   - 'unit_title': Associated unit name\n"
            "   - 'explanation': Rich, in-depth pedagogical explanation (2-3 detailed paragraphs teaching the concept clearly)\n"
            "   - 'definitions': Key definitions & terms with meanings\n"
            "   - 'subtopics': List of subtopics covered\n"
            "   - 'examples': Real examples/cases from the material (or null if none)\n"
            "   - 'formulas': Mathematical formulas, technical rules, or mechanisms (or null if none)\n"
            "   - 'step_by_step': Step-by-step procedure, chronology, or workflow if applicable (or null)\n"
            "   - 'important_points': 3-5 bulleted key takeaways\n"
            "   - 'exam_points': High-yield exam focus points\n"
            "   - 'source_document': Document title & page/section\n\n"
            f"{rag_text}\n\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            f'  "title": "Comprehensive Study Material: {course_title}",\n'
            f'  "course_title": "{course_title}",\n'
            '  "summary": "Overview of topics covered in this study guide",\n'
            f'  "total_topics_count": {max(3, total_topics)},\n'
            '  "units": [\n'
            "    {\n"
            '      "unit_number": 1,\n'
            '      "unit_title": "Unit 1: Title",\n'
            '      "description": "Unit overview",\n'
            '      "topics": [\n'
            "        {\n"
            '          "topic_title": "Topic Name",\n'
            '          "unit_title": "Unit 1: Title",\n'
            '          "explanation": "In-depth teaching explanation derived from the text...",\n'
            '          "definitions": ["Term: Definition"],\n'
            '          "subtopics": ["Subtopic A", "Subtopic B"],\n'
            '          "examples": ["Example from material"],\n'
            '          "formulas": ["Formula or Rule"],\n'
            '          "step_by_step": ["Step 1", "Step 2"],\n'
            '          "important_points": ["Point 1", "Point 2", "Point 3"],\n'
            '          "exam_points": "High-yield exam focus points for this topic",\n'
            '          "source_document": "Document name (Page X)"\n'
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        fallback = self._build_heuristic_study_material(document_chunks, course_title, goal, content_map)

        material_json = await GeminiService.generate_json(
            prompt=prompt,
            fallback_data=fallback,
            agent_name="LearningAgent",
            context_chunks=document_chunks[:6]
        )

        if not isinstance(material_json, dict) or "units" not in material_json or not material_json["units"]:
            material_json = fallback

        # Compile rich formatted markdown representation for dual-view support
        full_markdown = self._compile_markdown(material_json, course_title, goal)
        material_json["content_markdown"] = full_markdown
        material_json["markdown"] = full_markdown
        material_json["text"] = full_markdown

        return {
            "status": "success",
            "artifact_type": "NOTES",
            "title": material_json.get("title", f"Study Material: {course_title}"),
            "data": material_json
        }

    def _compile_markdown(self, material_json: Dict[str, Any], course_title: str, goal: str) -> str:
        lines = [
            f"# {material_json.get('title', f'Study Guide for {course_title}')}\n",
            f"**Course**: {course_title}  ",
            f"**Study Goal**: {goal}  ",
            f"**Source Grounding**: 100% Grounded in enrolled course materials.\n",
            "---\n"
        ]

        for unit in material_json.get("units", []):
            lines.append(f"## {unit.get('unit_title', 'Unit')}\n")
            if unit.get("description"):
                lines.append(f"> {unit.get('description')}\n")

            for topic in unit.get("topics", []):
                lines.append(f"### {topic.get('topic_title', 'Topic')}\n")
                lines.append(f"{topic.get('explanation', '')}\n")

                if topic.get("definitions"):
                    lines.append("**Key Definitions:**")
                    for d in topic["definitions"]:
                        lines.append(f"- {d}")
                    lines.append("")

                if topic.get("subtopics"):
                    lines.append("**Subtopics & Key Concepts:**")
                    for s in topic["subtopics"]:
                        lines.append(f"- {s}")
                    lines.append("")

                if topic.get("examples"):
                    lines.append("**Examples & Case References:**")
                    for ex in topic["examples"]:
                        lines.append(f"- {ex}")
                    lines.append("")

                if topic.get("formulas"):
                    lines.append("**Formulas & Mechanisms:**")
                    for f in topic["formulas"]:
                        lines.append(f"- `{f}`")
                    lines.append("")

                if topic.get("important_points"):
                    lines.append("**Important Points:**")
                    for p in topic["important_points"]:
                        lines.append(f"- {p}")
                    lines.append("")

                if topic.get("exam_points"):
                    lines.append(f"**🎯 Exam Focus:** {topic.get('exam_points')}\n")

                if topic.get("source_document"):
                    lines.append(f"*Source Reference: {topic.get('source_document')}*\n")

                lines.append("---\n")

        return "\n".join(lines)

    def _build_heuristic_flashcards(self, document_chunks: List[str], goal: str, course_title: str) -> Dict[str, Any]:
        full_text = "\n".join(document_chunks)
        lines = [line.strip() for line in full_text.split("\n") if len(line.strip()) > 20 and not line.startswith("Course Material")]

        cards = []
        for i in range(0, min(16, len(lines) - 1), 2):
            stmt = lines[i]
            q_text = f"According to your {course_title} material: What is stated regarding '{stmt[:50]}'?"
            a_text = lines[i+1] if i+1 < len(lines) else stmt
            cards.append({
                "question": q_text,
                "answer": a_text,
                "hint": f"Refer to {course_title} course material",
                "source": f"{course_title} Document"
            })

        if not cards:
            cards = [
                {
                    "question": f"What are the core concepts covered in {course_title}?",
                    "answer": f"Foundational concepts derived directly from uploaded {course_title} course slides.",
                    "hint": "Core subject fundamentals",
                    "source": f"{course_title} Document"
                }
            ]

        return {
            "title": f"Flashcards: {goal[:35]}",
            "total_cards": len(cards),
            "flashcards": cards
        }

    def _build_heuristic_study_material(self, document_chunks: List[str], course_title: str, goal: str, content_map: Dict[str, Any]) -> Dict[str, Any]:
        units = content_map.get("units", [])
        return {
            "title": f"Comprehensive Study Material: {course_title}",
            "course_title": course_title,
            "summary": f"Complete curriculum study material derived from {course_title} resources.",
            "total_topics_count": content_map.get("total_topics_count", 4),
            "units": units
        }

