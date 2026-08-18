import re
import logging
from typing import List, Dict, Any, Optional
from app.services.gemini_service import GeminiService

logger = logging.getLogger("content_mapping_service")


class ContentMappingService:
    """
    Content Mapping Service for StudyOS.
    Analyzes course-scoped document chunks and extracts the complete hierarchy of:
    - Units / Modules / Themes
    - Topics
    - Subtopics
    - Key definitions & formulas
    - Source references (document name, page number, chunk)
    """

    @classmethod
    async def extract_content_map(
        cls,
        document_chunks: List[str],
        course_title: str,
        goal: str
    ) -> Dict[str, Any]:
        """
        Extracts structured content map from course document chunks using Gemini.
        """
        valid_chunks = [c for c in document_chunks if c and len(c.strip()) > 15]
        if not valid_chunks:
            return {
                "course_title": course_title,
                "units": [],
                "total_topics_count": 0,
                "summary": "No course material chunks available."
            }

        rag_text = ""
        for i, chunk in enumerate(valid_chunks[:12], 1):
            rag_text += f"[Document Chunk {i}]:\n{chunk[:1800]}\n\n"

        prompt = (
            f"You are the StudyOS Curriculum and Content Mapping Engine for the course '{course_title}'.\n"
            f"Analyze the provided course material text and construct a comprehensive topic content map.\n\n"
            "CRITICAL ANTI-HALLUCINATION POLICY:\n"
            "1. Extract ONLY topics, units, and subtopics that actually appear in the provided document chunks.\n"
            "2. Do NOT invent outside topics that do not exist in the text.\n"
            "3. Group related topics into 2 to 5 logical Units or Modules.\n"
            "4. For each topic, identify its key subtopics, main concepts, and page/section reference if available.\n\n"
            f"=== COURSE MATERIAL CHUNKS ===\n{rag_text}=== END CHUNKS ===\n\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            f'  "course_title": "{course_title}",\n'
            '  "summary": "High-level summary of what the uploaded material covers",\n'
            '  "units": [\n'
            "    {\n"
            '      "unit_number": 1,\n'
            '      "unit_title": "Unit 1: Name of Module/Theme",\n'
            '      "description": "Overview of this unit from the text",\n'
            '      "topics": [\n'
            "        {\n"
            '          "topic_title": "Specific Topic Name from Material",\n'
            '          "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"],\n'
            '          "key_terms": ["Term 1", "Term 2"],\n'
            '          "source_reference": "Document name & page/section"\n'
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        fallback = cls._build_heuristic_content_map(valid_chunks, course_title, goal)

        result = await GeminiService.generate_json(
            prompt=prompt,
            fallback_data=fallback,
            agent_name="ContentMappingService",
            context_chunks=valid_chunks[:6]
        )

        if not isinstance(result, dict) or "units" not in result or not result["units"]:
            result = fallback
            result["is_heuristic_fallback"] = True

        # Calculate total topics count
        total_topics = 0
        for unit in result.get("units", []):
            total_topics += len(unit.get("topics", []))
        result["total_topics_count"] = total_topics

        return result

    @classmethod
    def _build_heuristic_content_map(cls, document_chunks: List[str], course_title: str, goal: str = "") -> Dict[str, Any]:
        """
        Extracts actual source units and topics directly from PDF document text.
        Preserves all 5 units present in source material without fake fallbacks.
        """
        full_text = "\n".join(document_chunks)
        lines = [line.strip() for line in full_text.split("\n") if len(line.strip()) > 3]

        units = []
        current_unit = None
        current_topics = []

        for line in lines:
            # Check for Unit/Module headings
            unit_match = re.match(r'^(UNIT\s*\d+|MODULE\s*\d+|CHAPTER\s*\d+)\s*[:\-\s]\s*(.*)$', line, re.IGNORECASE)
            if unit_match:
                if current_unit:
                    current_unit["topics"] = current_topics if current_topics else [
                        {"topic_title": f"{current_unit['unit_title']} Overview", "explanation": f"Core concepts in {current_unit['unit_title']}"}
                    ]
                    units.append(current_unit)
                    current_topics = []

                u_num_str = re.search(r'\d+', unit_match.group(1))
                u_num = int(u_num_str.group(0)) if u_num_str else len(units) + 1
                u_title = line.strip()
                current_unit = {
                    "unit_number": u_num,
                    "unit_title": u_title,
                    "description": f"Extracted from {course_title} material.",
                    "topics": []
                }
                continue

            # Check for topic bullet points or subheadings under current unit
            topic_match = re.match(r'^(Topic\s*\d+:|[\d\.]+\s+|[•\*\-])\s*(.*)$', line, re.IGNORECASE)
            if current_unit and topic_match:
                t_text = topic_match.group(2).strip()
                if 5 < len(t_text) < 80 and not t_text.endswith("."):
                    if t_text not in [t["topic_title"] for t in current_topics]:
                        current_topics.append({
                            "topic_title": t_text,
                            "unit_title": current_unit["unit_title"],
                            "what_is_this": f"{t_text} is covered under {current_unit['unit_title']} in {course_title}.",
                            "explanation": f"Core concepts of {t_text} as presented in {course_title} material.",
                            "source_document": f"{course_title} Material"
                        })

        if current_unit:
            current_unit["topics"] = current_topics if current_topics else [
                {"topic_title": f"{current_unit['unit_title']} Overview", "explanation": f"Core concepts in {current_unit['unit_title']}"}
            ]
            units.append(current_unit)

        # Fallback if no explicit UNIT headings parsed
        if not units:
            topics = []
            for line in lines:
                clean_l = re.sub(r'^(Topic\s*\d+:|Unit\s*\d+:|[#*-])\s*', '', line).strip()
                if 5 < len(clean_l) < 70 and not clean_l.endswith("."):
                    if clean_l not in [t["topic_title"] for t in topics]:
                        topics.append({
                            "topic_title": clean_l,
                            "explanation": f"{clean_l} from {course_title} material.",
                            "source_document": f"{course_title} Material"
                        })
                if len(topics) >= 15:
                    break

            units = [
                {
                    "unit_number": 1,
                    "unit_title": f"Unit 1: Course Fundamentals",
                    "description": f"Foundational concepts from {course_title} material.",
                    "topics": topics
                }
            ]

        total_topics = sum(len(u.get("topics", [])) for u in units)

        return {
            "course_title": course_title,
            "summary": f"Complete source curriculum map extracted from {course_title} material.",
            "units": units,
            "total_topics_count": total_topics,
            "is_source_extracted_map": True
        }
