import logging
from typing import Optional, Any, List
from app.services.ai_service import AIService

logger = logging.getLogger("gemini_service")

class GeminiService:
    """
    Wrapper / Alias for Centralized AIService.
    Guarantees every AI call in StudyOS routes through AIService using Google Gemini with Grounding Policy.
    """

    @staticmethod
    def is_configured() -> bool:
        return AIService.is_configured()

    @staticmethod
    def get_api_key() -> str:
        return AIService.get_api_key()

    @staticmethod
    async def generate_response(
        prompt: str,
        system_instruction: Optional[str] = None,
        agent_name: str = "GeminiService",
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        context_chunks: Optional[List[str]] = None
    ) -> str:
        return await AIService.generate_response(
            prompt=prompt,
            system_instruction=system_instruction,
            agent_name=agent_name,
            mission_id=mission_id,
            task_id=task_id,
            context_chunks=context_chunks
        )

    @staticmethod
    async def generate_json(
        prompt: str,
        system_instruction: Optional[str] = None,
        fallback_data: Optional[Any] = None,
        agent_name: str = "GeminiService",
        mission_id: Optional[str] = None,
        task_id: Optional[str] = None,
        context_chunks: Optional[List[str]] = None
    ) -> Any:
        return await AIService.generate_json(
            prompt=prompt,
            system_instruction=system_instruction,
            fallback_data=fallback_data,
            agent_name=agent_name,
            mission_id=mission_id,
            task_id=task_id,
            context_chunks=context_chunks
        )
