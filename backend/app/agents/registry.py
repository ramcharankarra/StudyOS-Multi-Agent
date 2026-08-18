import logging
from typing import Dict, Optional, List, Any

logger = logging.getLogger("agent_registry")


class AgentRegistry:
    """
    Centralized Agent Registry for StudyOS Multi-Agent Architecture.
    Responsibilities: register, discover, invoke, health check, and list agent capabilities.
    """
    _agents: Dict[str, Any] = {}

    @classmethod
    def register(cls, agent: Any) -> None:
        key = agent.name.lower()
        cls._agents[key] = agent
        logger.info(f"[AgentRegistry] Registered agent: {agent.name}")

    @classmethod
    def ensure_default_agents(cls) -> None:
        if len(cls._agents) < 5:
            from app.agents.coordinator import CoordinatorAgent
            from app.agents.learning import LearningAgent
            from app.agents.explainer import ExplainerAgent
            from app.agents.assessment import AssessmentAgent
            from app.agents.planner import PlannerAgent
            from app.agents.memory import MemoryAgent
            from app.agents.course_management import CourseManagementAgent

            cls.register(CoordinatorAgent())
            cls.register(LearningAgent())
            cls.register(ExplainerAgent())
            cls.register(AssessmentAgent())
            cls.register(PlannerAgent())
            cls.register(MemoryAgent())
            cls.register(CourseManagementAgent())

    @classmethod
    def get(cls, name: str) -> Optional[Any]:
        cls.ensure_default_agents()
        key = name.lower()
        if key not in cls._agents:
            # Fallback fuzzy matching
            for registered_key, agent_obj in cls._agents.items():
                if key in registered_key or registered_key in key:
                    return agent_obj
            # Default fallback to LearningAgent
            return cls._agents.get("learningagent")
        return cls._agents.get(key)

    @classmethod
    def list_agents(cls) -> List[Dict[str, str]]:
        cls.ensure_default_agents()
        return [
            {"name": agent.name, "description": agent.description}
            for agent in cls._agents.values()
        ]

    @classmethod
    def list_agent_names(cls) -> List[str]:
        cls.ensure_default_agents()
        return [agent.name for agent in cls._agents.values()]

    @classmethod
    def health_check(cls) -> Dict[str, Any]:
        cls.ensure_default_agents()
        results = {}
        for key, agent in cls._agents.items():
            results[agent.name] = {
                "status": "healthy",
                "description": agent.description,
                "has_tools": hasattr(agent, "tools") and len(agent.tools) > 0
            }
        return {
            "total_agents": len(cls._agents),
            "agents": results,
            "registry_status": "operational"
        }

    @classmethod
    def clear(cls) -> None:
        cls._agents.clear()
