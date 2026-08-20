import os
import re
import json
import time
import asyncio
import logging
import httpx
from typing import Optional, Dict, Any, List, AsyncGenerator
from fastapi import HTTPException

logger = logging.getLogger("ai_service")

GROUNDED_SYSTEM_INSTRUCTION = """You are StudyOS Master AI Educational Assistant.
Provide concise, clear, accurate, and student-friendly explanations.
Focus on providing high-quality educational answers directly without adding metadata headers, confidence level tags, or internal routing labels.
"""


class AIService:
    """
    Centralized AI Engine Service for StudyOS.
    Google Gemini is the ONLY AI provider.
    
    Responsibilities:
    - Manage Gemini client initialization safely using GEMINI_API_KEY from environment variables.
    - Grounded AI & Anti-Hallucination Enforcement.
    - Centralized prompt management, JSON structured output validation, streaming, logging, and retries.
    - Rate limit (HTTP 429) & timeout handling across fallback models.
    """

    _cached_api_key: Optional[str] = None

    @classmethod
    def get_api_key(cls) -> str:
        if cls._cached_api_key:
            return cls._cached_api_key

        from app.config import settings
        api_key = os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")

        if not api_key:
            # Check relative .env file
            possible_env_paths = [".env"]
            for env_path in possible_env_paths:
                if os.path.exists(env_path):
                    try:
                        with open(env_path, "r") as f:
                            for line in f:
                                if line.strip().startswith("GEMINI_API_KEY="):
                                    key_val = line.split("=", 1)[1].strip().strip('"').strip("'")
                                    if key_val and not key_val.startswith("your_"):
                                        api_key = key_val
                                        break
                    except Exception as e:
                        logger.warning(f"Failed to read env file {env_path}: {e}")
                if api_key:
                    break

        if api_key:
            cls._cached_api_key = api_key
            return api_key

        return ""

    @classmethod
    def is_configured(cls) -> bool:
        return bool(cls.get_api_key())

    @classmethod
    def validate_configuration(cls) -> str:
        api_key = cls.get_api_key()
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="Backend Configuration Error: GEMINI_API_KEY is missing from environment variables."
            )
        return api_key

    @classmethod
    def check_grounding_requirement(cls, prompt: str, context_chunks: List[str]) -> Dict[str, Any]:
        """
        Evaluate if prompt requires course context that is currently missing.
        Prevents AI hallucinations for specific unuploaded lectures or exams.
        """
        prompt_lower = prompt.lower()

        # Check explicit general knowledge mode
        is_general_knowledge = any(phrase in prompt_lower for phrase in [
            "using your own knowledge", "ignore my course materials", "general knowledge", "use general knowledge"
        ])
        if is_general_knowledge:
            return {
                "allow": True,
                "mode": "general_knowledge",
                "prefix": ""
            }

        # Specific queries requiring uploaded context
        specific_lecture_queries = ["today's lecture", "todays lecture", "today lecture", "summarize today", "what did my professor teach"]
        specific_exam_queries = ["important questions for tomorrow", "tomorrow's exam", "tomorrows exam", "exam scope for tomorrow"]

        has_context = len(context_chunks) > 0 and any(len(c.strip()) > 20 for c in context_chunks)

        if not has_context:
            if any(q in prompt_lower for q in specific_lecture_queries):
                return {
                    "allow": False,
                    "confidence": "Low",
                    "response": (
                        "I don't have enough classroom information to answer.\n\n"
                        "You can:\n"
                        "• Upload the lecture slides or notes.\n"
                        "• Ask your instructor to publish today's lecture.\n"
                        "• Paste the lecture text here."
                    )
                }

            if any(q in prompt_lower for q in specific_exam_queries):
                return {
                    "allow": False,
                    "confidence": "Low",
                    "response": (
                        "I don't have enough classroom information to answer.\n\n"
                        "Please upload your syllabus or course materials, and I'll generate questions based only on those resources."
                    )
                }

        return {
            "allow": True,
            "mode": "grounded" if has_context else "medium_confidence",
            "prefix": ""
        }

    @classmethod
    async def generate_response(
        cls,
        prompt: str,
        system_instruction: Optional[str] = None,
        agent_name: str = "AIService",
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        context_chunks: Optional[List[str]] = None,
        max_retries: int = 2
    ) -> str:
        """
        Centralized text generation method via Google Gemini API.
        Enforces Anti-Hallucination Grounding Policy & Latency Logging.
        """
        context_chunks = context_chunks or []
        grounding_check = cls.check_grounding_requirement(prompt, context_chunks)
        if not grounding_check["allow"]:
            logger.info(f"[AIService] Grounding Policy Triggered — Suppressed Hallucination for prompt: '{prompt}'")
            return grounding_check["response"]

        api_key = cls.get_api_key()
        if not api_key:
            logger.warning("[AIService] GEMINI_API_KEY missing. Returning fallback foundation response.")
            return f"StudyOS AI Response for: '{prompt}'."

        start_time = time.time()
        models_to_try = [
            "models/gemini-3.5-flash",
            "models/gemini-3.6-flash",
            "models/gemini-3.5-flash-lite",
            "models/gemini-flash-latest",
            "models/gemini-pro-latest"
        ]

        effective_system = system_instruction or GROUNDED_SYSTEM_INSTRUCTION

        # Build Grounded Context Prompt
        full_prompt = f"System Instruction: {effective_system}\n\n"
        if context_chunks:
            full_prompt += "=== GROUNDED RETRIEVED COURSE CONTEXT ===\n"
            for idx, chunk in enumerate(context_chunks, 1):
                full_prompt += f"[Source {idx}]: {chunk}\n\n"
            full_prompt += "=== END CONTEXT ===\n\n"
            full_prompt += "Instruction: Base your response on the context above. Cite sources where appropriate.\n\n"

        full_prompt += f"User Query / Goal:\n{prompt}"

        payload = {
            "contents": [
                {
                    "parts": [{"text": full_prompt}]
                }
            ]
        }

        prefix = grounding_check.get("prefix", "")

        async with httpx.AsyncClient(timeout=35.0) as client:
            for attempt in range(min(max_retries, 1) + 1):
                for model_name in models_to_try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={api_key}"
                    try:
                        res = await client.post(url, json=payload)
                        latency_ms = round((time.time() - start_time) * 1000, 2)

                        if res.status_code == 200:
                            data = res.json()
                            candidates = data.get("candidates", [])
                            if candidates and "content" in candidates[0]:
                                parts = candidates[0]["content"].get("parts", [])
                                if parts and "text" in parts[0]:
                                    output_text = parts[0]["text"].strip()
                                    logger.info(
                                        f"[AIService] SUCCESS | Agent='{agent_name}' | Model='{model_name}' | "
                                        f"MissionID='{mission_id}' | TaskID='{task_id}' | Latency={latency_ms}ms | Len={len(output_text)}"
                                    )
                                    return prefix + output_text
                        elif res.status_code in [429, 503]:
                            logger.warning(f"[AIService] Status {res.status_code} for {model_name}. Short backoff before retry...")
                            await asyncio.sleep(0.5)
                        else:
                            logger.warning(f"[AIService] Model {model_name} returned HTTP {res.status_code}: {res.text[:150]}")

                    except Exception as e:
                        logger.error(f"[AIService] Exception calling {model_name} (Attempt {attempt+1}): {e}")

        latency_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(f"[AIService] All Gemini models failed or timed out after {latency_ms}ms due to rate limiting or high demand.")

        p_lower = prompt.lower().strip()
        if any(g in p_lower for g in ["hello", "hi", "hey", "greetings"]):
            return "Hello! I am your StudyOS Grounded AI Educational Engine. How can I help you with your studies today?"

        # Return explicit signal marker rather than silent fake educational string
        return "__LLM_UNAVAILABLE__"

    @classmethod
    async def generate_json(
        cls,
        prompt: str,
        system_instruction: Optional[str] = None,
        fallback_data: Optional[Any] = None,
        agent_name: str = "AIService",
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        context_chunks: Optional[List[str]] = None
    ) -> Any:
        """
        Centralized JSON structured output generation method.
        Strips markdown code blocks and validates JSON structures.
        """
        json_prompt = (
            f"{prompt}\n\n"
            "CRITICAL REQUIREMENT: Respond ONLY with a raw, valid JSON object or array. "
            "Do NOT wrap in markdown fences (```), backticks, or explanatory text."
        )

        response_text = await cls.generate_response(
            prompt=json_prompt,
            system_instruction=system_instruction,
            agent_name=agent_name,
            mission_id=mission_id,
            task_id=task_id,
            context_chunks=context_chunks
        )

        if response_text == "__LLM_UNAVAILABLE__":
            logger.warning(f"[AIService] LLM unavailable for Agent '{agent_name}'. Returning fallback or LLM_UNAVAILABLE dict.")
            if fallback_data is not None:
                return fallback_data
            return {
                "generation_status": "LLM_UNAVAILABLE",
                "grounding_status": "GROUNDED_CLASSROOM_RAG",
                "is_fallback": True,
                "response": "The course material was retrieved successfully, but the AI teacher is temporarily unavailable. Please retry."
            }

        clean_text = response_text.replace("```json", "").replace("```JSON", "").replace("```", "").strip()
        clean_text = re.sub(r',\s*([\}\]])', r'\1', clean_text)

        # Try direct JSON parsing
        try:
            return json.loads(clean_text)
        except Exception:
            pass

        # Regex search for JSON object {}
        dict_match = re.search(r'\{[\s\S]*\}', clean_text)
        if dict_match:
            try:
                candidate = re.sub(r',\s*([\}\]])', r'\1', dict_match.group(0))
                return json.loads(candidate)
            except Exception:
                pass

        # Regex search for JSON array []
        array_match = re.search(r'\[[\s\S]*\]', clean_text)
        if array_match:
            try:
                candidate = re.sub(r',\s*([\}\]])', r'\1', array_match.group(0))
                return json.loads(candidate)
            except Exception:
                pass

        logger.warning(f"[AIService] Failed to parse JSON response for Agent '{agent_name}'.")
        if fallback_data is not None:
            return fallback_data
        return {
            "generation_status": "LLM_UNAVAILABLE",
            "grounding_status": "GROUNDED_CLASSROOM_RAG",
            "is_fallback": True,
            "response": "The course material was retrieved successfully, but the AI teacher is temporarily unavailable. Please retry."
        }

    @classmethod
    async def stream_response(cls, prompt: str, context_chunks: Optional[List[str]] = None) -> AsyncGenerator[str, None]:
        """
        Streaming support generator interface.
        """
        response = await cls.generate_response(prompt, context_chunks=context_chunks)
        words = response.split(" ")
        for word in words:
            yield word + " "
