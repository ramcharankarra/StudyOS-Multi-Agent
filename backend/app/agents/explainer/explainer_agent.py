import re
import json
import logging
from typing import Dict, Any, Optional, List
from app.agents.base_agent import BaseAgent
from app.agents.config import AgentConfig
from app.services.gemini_service import GeminiService
from app.services.content_mapping_service import ContentMappingService
from app.services.context_service import ContextService

logger = logging.getLogger("explainer_agent")


class ExplainerAgent(BaseAgent):
    """
    StudyOS Teacher-like Explainer Agent.
    Responsibilities:
    - Behaves like a real college professor teaching step-by-step from teacher-uploaded course material.
    - Operates sequentially: INTRODUCE -> EXPLAIN -> BREAK DOWN -> GIVE EXAMPLE -> CONNECT -> HIGHLIGHT EXAM POINTS -> CHECK UNDERSTANDING -> NEXT CONCEPT.
    - Generates complete student-readable teaching lessons with intuitive intro, core explanation, how it works, terminology, examples, exam focus, quick revision, and precise citations (Document Name, Page Number, Chunk ID).
    - Supports interactive conversational teaching:
      - Concise initial answers
      - "I don't understand" -> simpler intuition
      - "Explain in detail" -> deep technical breakdown
      - "Next topic" -> advances sequentially through document content map
      - "Quiz me" -> hands off to AssessmentAgent.
    """
    def __init__(self):
        super().__init__(AgentConfig(
            name="ExplainerAgent",
            description="Acts like a real college teacher, delivering structured step-by-step lessons, pedagogical explanations, terminology, examples, exam focus points, and interactive follow-ups strictly grounded in course RAG materials."
        ))

    async def process_task(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        context = context or {}
        goal = prompt or context.get("goal", "Teach Course Material")
        course_title = context.get("course_title", "General Education Workspace")
        course_id = context.get("course_id")
        document_chunks: List[str] = [c for c in context.get("document_chunks", []) if c and len(c.strip()) > 15]

        # 1. Zero Material Check (Distinguish Case 1: General Query vs Case 2: Course with 0 Materials)
        if not document_chunks:
            if not course_id:
                # Case 1: General educational or conversational query without specific course
                return await self.explain_general_question(prompt, goal)

            # Case 2: Course selected but 0 uploaded materials
            refusal_msg = "This course does not have uploaded learning material yet. Upload course material to enable grounded course explanations."
            return {
                "status": "refusal",
                "artifact_type": "NOTES",
                "title": "No Course Material Available",
                "description": refusal_msg,
                "data": {
                    "refusal": True,
                    "title": "No Course Material Available",
                    "description": refusal_msg,
                    "markdown": refusal_msg,
                    "no_materials_warning": refusal_msg
                }
            }

        # 2. Goal-Material Subject & Concept Relevance Check
        mismatch_msg = ContextService.validate_material_subject_match(document_chunks, goal)
        if mismatch_msg:
            # MindOS Conversational AI: Concept is outside uploaded course material -> Answer using General AI Knowledge
            return await self.explain_general_question(
                prompt,
                goal,
                prefix=""
            )

        # 3. Route: Complete Course Teaching Suite vs Interactive Query
        p_lower = prompt.lower().strip()
        task_type = str(context.get("task_type", "")).lower()
        interactive_intent = context.get("interactive_intent") or self._detect_interactive_intent(prompt)

        # Interactive query (e.g., "Explain simpler", "Give example", "Explain in detail") -> Single Topic Response
        if interactive_intent:
            return await self.explain_topic_directly(prompt, goal, course_title, document_chunks, interactive_intent)

        # Educational mission deliverables -> Full Multi-Unit Teaching Suite covering ALL curriculum topics
        return await self.generate_full_teaching_suite(course_title, goal, document_chunks)

    def _detect_interactive_intent(self, prompt: str) -> Optional[str]:
        p = prompt.lower().strip()
        if any(kw in p for kw in ["don't understand", "dont understand", "confused", "explain simpler", "simpler", "in simple terms"]):
            return "SIMPLIFY"
        elif any(kw in p for kw in ["explain in detail", "deeper", "more details", "in depth", "technical breakdown"]):
            return "EXPAND"
        elif any(kw in p for kw in ["give example", "example", "real world example", "sample"]):
            return "EXAMPLE"
        elif any(kw in p for kw in ["next topic", "move on", "continue", "next lesson"]):
            return "NEXT_TOPIC"
        elif any(kw in p for kw in ["quiz me", "test me", "check my understanding"]):
            return "QUIZ_HANDOFF"
        return None

    async def explain_general_question(self, user_prompt: str, goal: str, prefix: str = "") -> Dict[str, Any]:
        """
        Answers general educational or conversational queries when no specific course is selected
        or when a requested topic is outside the selected course materials.
        Uses general AI knowledge without requiring course materials.
        """
        p_lower = user_prompt.lower().strip()
        if any(g in p_lower for g in ["hello", "hi", "hey", "greetings"]):
            greeting_resp = "Hello! I am your StudyOS AI teacher. How can I help you with your studies today?"
            return {
                "status": "success",
                "artifact_type": "NOTES",
                "title": "AI Teacher Greeting",
                "data": {
                    "response": greeting_resp,
                    "markdown": greeting_resp,
                    "explanation": greeting_resp
                }
            }

        prompt = (
            f"You are the StudyOS Master AI Educational Assistant.\n"
            f"Answer the student's general educational question concisely, clearly, and accurately.\n"
            f"Question: '{user_prompt}'\n\n"
            "Provide a student-friendly explanation with clear structure."
        )

        resp_text = await GeminiService.generate_response(prompt, agent_name="ExplainerAgent")
        if resp_text == "__LLM_UNAVAILABLE__":
            resp_text = "The AI teacher is temporarily unavailable. Please retry."
        elif prefix:
            resp_text = prefix + resp_text

        return {
            "status": "success",
            "artifact_type": "NOTES",
            "title": f"Explanation: {user_prompt[:40]}",
            "data": {
                "response": resp_text,
                "markdown": resp_text,
                "explanation": resp_text
            }
        }

    async def explain_topic_directly(
        self,
        user_prompt: str,
        goal: str,
        course_title: str,
        document_chunks: List[str],
        intent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        1-Call Efficient Teacher Explanation for single or comparative topic queries.
        Makes ONLY 1 Gemini call directly with RAG chunks.
        """
        rag_text = "=== UPLOADED COURSE MATERIAL CONTEXT (SINGLE SOURCE OF TRUTH) ===\n"
        for i, chunk in enumerate(document_chunks[:8], 1):
            rag_text += f"[Material Chunk {i}]:\n{chunk[:1800]}\n\n"
        rag_text += "=================================================================\n"

        prompt = (
            f"You are the ExplainerAgent (Master AI Professor) for course '{course_title}'.\n"
            f"User Prompt / Question: '{user_prompt}'\n\n"
            "TEACHER PEDAGOGICAL METHOD:\n"
            "1. Teach the student strictly based on the retrieved course material context below.\n"
            "2. Provide a complete, structured teacher explanation with the following components:\n"
            "   - 'topic_title': Clear title for the explanation\n"
            "   - 'explanation': Core step-by-step teacher explanation (MINIMUM 300 WORDS). Must include:\n"
            "       * Intuitive introduction & motivation ('What is this?' & 'Why it matters')\n"
            "       * Step-by-step breakdown of how the concept works\n"
            "       * Mathematical equations, formulas, or code examples where present in source\n"
            "       * High-yield exam focus points\n"
            "   - 'definitions': Key definitions & terminology\n"
            "   - 'examples': Source-derived or illustrative examples\n"
            "   - 'formulas': Technical rules, equations, or formulas if present in source\n"
            "   - 'exam_points': High-yield exam focus points based directly on the material\n"
            "   - 'source_document': Citation reference to document name\n\n"
            "CRITICAL: 'explanation' MUST be a rich, multi-paragraph detailed lesson (300-800 words). DO NOT return placeholder text.\n\n"
            f"{rag_text}\n\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            '  "title": "Teacher Explanation",\n'
            '  "course_title": "' + course_title + '",\n'
            '  "units": [\n'
            '    {\n'
            '      "unit_number": 1,\n'
            '      "unit_title": "Lesson: ' + user_prompt[:40] + '",\n'
            '      "description": "Teacher explanation derived from source material",\n'
            '      "topics": [\n'
            '        {\n'
            '          "topic_title": "Topic Name",\n'
            '          "explanation": "Detailed multi-paragraph teacher lesson (minimum 300 words)...",\n'
            '          "definitions": ["Term: Meaning"],\n'
            '          "examples": ["Example..."],\n'
            '          "formulas": ["Formula or rule"],\n'
            '          "exam_points": "Exam focus points",\n'
            '          "source_document": "Source reference"\n'
            '        }\n'
            '      ]\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        res_json = await GeminiService.generate_json(
            prompt=prompt,
            agent_name="ExplainerAgent",
            context_chunks=document_chunks[:8]
        )

        if isinstance(res_json, dict) and res_json.get("generation_status") == "LLM_UNAVAILABLE":
            return {
                "status": "unavailable",
                "artifact_type": "NOTES",
                "title": "AI Teacher Temporarily Unavailable",
                "data": res_json
            }

        if isinstance(res_json, dict) and "units" in res_json:
            res_json["units"] = self._normalize_topic_explanations(res_json["units"])

        return {
            "status": "success",
            "artifact_type": "NOTES",
            "title": res_json.get("title", f"Teacher Explanation: {user_prompt[:40]}") if isinstance(res_json, dict) else f"Teacher Explanation: {user_prompt[:40]}",
            "data": res_json
        }

    async def generate_full_teaching_suite(
        self,
        course_title: str,
        goal: str,
        document_chunks: List[str]
    ) -> Dict[str, Any]:
        """
        Generates complete source teaching suite across all units for EXPLAIN_COURSE requests.
        """
        content_map = await ContentMappingService.extract_content_map(document_chunks, course_title, goal)
        units = content_map.get("units", [])
        total_topics = content_map.get("total_topics_count", len(units))

        rag_text = "=== UPLOADED COURSE MATERIAL CONTEXT (SINGLE SOURCE OF TRUTH) ===\n"
        for i, chunk in enumerate(document_chunks[:15], 1):
            rag_text += f"[Chunk {i}]:\n{chunk[:1800]}\n\n"
        rag_text += "=========================================================\n"

        prompt = (
            f"You are the ExplainerAgent (Master AI Professor) for '{course_title}'.\n"
            f"Generate a COMPLETE TEACHING LESSON SUITE covering ALL units in uploaded material for: '{goal}'.\n\n"
            "TEACHING REQUIREMENTS:\n"
            "1. For EVERY topic, provide a full, detailed, multi-paragraph pedagogical teaching explanation (MINIMUM 300 WORDS).\n"
            "2. Explain concepts from basic intuition to deep mechanics, math equations, code implementations, and exam tips.\n"
            "3. Ground all explanations strictly in the uploaded course material chunks below.\n"
            "4. NEVER leave 'explanation' empty. DO NOT return placeholder text.\n\n"
            f"{rag_text}\n\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            f'  "title": "Comprehensive Study Material: {course_title}",\n'
            f'  "course_title": "{course_title}",\n'
            '  "summary": "Full teacher-delivered course study guide",\n'
            f'  "total_topics_count": {total_topics},\n'
            '  "units": [\n'
            "    {\n"
            '      "unit_number": 1,\n'
            '      "unit_title": "Unit Title",\n'
            '      "description": "Unit overview",\n'
            '      "topics": [\n'
            "        {\n"
            '          "topic_title": "Topic Name",\n'
            '          "explanation": "Comprehensive multi-paragraph lesson (minimum 300 words)...",\n'
            '          "definitions": ["Term: Meaning"],\n'
            '          "examples": ["Example from text"],\n'
            '          "formulas": ["Formula or technical rule"],\n'
            '          "exam_points": "High-yield exam focus points",\n'
            '          "source_document": "Source reference"\n'
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        res_json = await GeminiService.generate_json(
            prompt=prompt,
            agent_name="ExplainerAgent",
            context_chunks=document_chunks[:12]
        )

        if isinstance(res_json, dict) and res_json.get("generation_status") == "LLM_UNAVAILABLE":
            return {
                "status": "unavailable",
                "artifact_type": "NOTES",
                "title": "AI Teacher Temporarily Unavailable",
                "data": res_json
            }

        final_units = res_json.get("units") if isinstance(res_json, dict) and "units" in res_json else units
        final_units = self._normalize_topic_explanations(final_units)

        res_data = {
            "title": res_json.get("title", f"Comprehensive Study Material: {course_title}") if isinstance(res_json, dict) else f"Comprehensive Study Material: {course_title}",
            "course_title": course_title,
            "summary": f"Teacher-guided study material for {course_title}",
            "total_topics_count": len(final_units),
            "units": final_units
        }

        return {
            "status": "success",
            "artifact_type": "NOTES",
            "title": res_data["title"],
            "data": res_data
        }

    def _normalize_topic_explanations(self, units: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Guarantees every topic inside units contains a non-empty, detailed explanation string."""
        if not isinstance(units, list):
            return []
        
        for u in units:
            if not isinstance(u, dict):
                continue
            topics = u.get("topics", [])
            if not isinstance(topics, list):
                continue
            for t in topics:
                if not isinstance(t, dict):
                    continue
                exp = t.get("explanation") or t.get("content") or t.get("details") or t.get("text") or t.get("summary") or ""
                what = t.get("what_is_this") or ""
                why = t.get("why_important") or ""
                how = t.get("how_it_works") or ""
                desc = t.get("description") or ""

                parts = []
                if exp:
                    parts.append(exp)
                if what and what not in exp:
                    parts.append(f"### What is this?\n{what}")
                if why and why not in exp:
                    parts.append(f"### Why is this important?\n{why}")
                if how and how not in exp:
                    parts.append(f"### How it works\n{how}")
                if desc and desc not in exp:
                    parts.append(desc)

                full_explanation = "\n\n".join(parts).strip()
                if not full_explanation:
                    # Construct rich explanation from definitions, exam points, and topic title if necessary
                    defs = t.get("definitions", [])
                    exs = t.get("examples", [])
                    exam_p = t.get("exam_points", "")
                    
                    synth = [f"This section covers {t.get('topic_title', 'the core topic')} based on uploaded course material."]
                    if defs:
                        synth.append("### Key Definitions\n" + "\n".join(f"- {d}" for d in defs))
                    if exs:
                        synth.append("### Worked Examples\n" + "\n".join(f"- {e}" for e in exs))
                    if exam_p:
                        synth.append(f"### Exam Focus\n{exam_p}")
                    full_explanation = "\n\n".join(synth)
                
                t["explanation"] = full_explanation
        return units

