import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from app.agents.config import AgentConfig

logger = logging.getLogger("studyos_agents")

class BaseAgent(ABC):
    """
    Standardized BaseAgent class for all StudyOS AI Agents.
    Enforces unified logging, tool access, context management, and error handling.
    """
    def __init__(self, config: AgentConfig, tools: Optional[List[Any]] = None):
        self.config = config
        self.name = config.name
        self.description = config.description
        self.tools = tools or []
        self.logger = logger

    async def execute(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main execution wrapper with standardized error handling and logging.
        """
        self.logger.info(f"[{self.name}] Executing task with prompt length {len(prompt)}...")
        try:
            result = await self.process_task(prompt, context)
            self.logger.info(f"[{self.name}] Execution successful.")
            return {
                "status": "success",
                "agent": self.name,
                "data": result
            }
        except Exception as e:
            self.logger.error(f"[{self.name}] Error during agent execution: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "agent": self.name,
                "error": str(e)
            }

    @abstractmethod
    async def process_task(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Specific domain agent task processing logic.
        """
        pass

    def __repr__(self) -> str:
        return f"<Agent name='{self.name}' model='{self.config.model_name}'>"
