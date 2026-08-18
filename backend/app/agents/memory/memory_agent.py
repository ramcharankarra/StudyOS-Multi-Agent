import logging
from typing import Dict, Any, Optional
from app.agents.base_agent import BaseAgent
from app.agents.config import AgentConfig
from app.services.ai_service import AIService

logger = logging.getLogger("memory_agent")

class MemoryAgent(BaseAgent):
    """
    Memory Agent for StudyOS.
    Manages student learning preferences, weak topics, and uses AIService when reasoning over learning history is required.
    """
    def __init__(self):
        super().__init__(AgentConfig(
            name="MemoryAgent",
            description="Manages student learning preferences, weak topics, and long-term conversation context."
        ))

    async def process_task(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        context = context or {}
        goal = prompt or context.get("goal", "Learning Memory Goal")

        # If reasoning is required over history
        ai_prompt = f"Analyze student learning trajectory for goal: '{goal}' and suggest top 3 key focus topics."
        analysis = await AIService.generate_response(ai_prompt, agent_name=self.name)

        return {
            "agent": self.name,
            "status": "success",
            "artifact_type": "MEMORY_ANALYSIS",
            "title": f"Memory Context: {goal[:30]}",
            "analysis": analysis,
            "data": {
                "summary": analysis,
                "weak_topics": [goal],
                "strong_topics": ["Core Fundamentals"]
            }
        }
