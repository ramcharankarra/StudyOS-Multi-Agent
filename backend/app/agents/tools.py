import logging
from typing import Dict, Callable, Any, List, Optional

logger = logging.getLogger("tool_registry")


class ToolRegistry:
    """
    Centralized Tool Registry for StudyOS Agent Architecture.
    Each agent exposes its tools here. The Coordinator uses this registry to understand agent capabilities.
    """
    _tools: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def register_tool(cls, agent_name: str, tool_name: str, func: Optional[Callable] = None, description: str = "") -> None:
        key = f"{agent_name}::{tool_name}"
        cls._tools[key] = {
            "agent": agent_name,
            "tool": tool_name,
            "description": description,
            "func": func
        }
        logger.info(f"[ToolRegistry] Registered tool: {tool_name} for {agent_name}")

    @classmethod
    def get_tool(cls, agent_name: str, tool_name: str) -> Optional[Dict[str, Any]]:
        return cls._tools.get(f"{agent_name}::{tool_name}")

    @classmethod
    def list_tools(cls) -> List[Dict[str, str]]:
        return [
            {"agent": t["agent"], "tool": t["tool"], "description": t["description"]}
            for t in cls._tools.values()
        ]

    @classmethod
    def list_tools_for_agent(cls, agent_name: str) -> List[Dict[str, str]]:
        return [
            {"tool": t["tool"], "description": t["description"]}
            for t in cls._tools.values()
            if t["agent"] == agent_name
        ]

    @classmethod
    def clear(cls) -> None:
        cls._tools.clear()


def register_default_tools():
    """Register all default agent tools into the ToolRegistry at startup."""

    # Learning Agent Tools
    ToolRegistry.register_tool("LearningAgent", "document_search", description="Search uploaded course documents using RAG retrieval")
    ToolRegistry.register_tool("LearningAgent", "summarization", description="Summarize lecture notes, slides, and course chapters")
    ToolRegistry.register_tool("LearningAgent", "explanation", description="Explain concepts with examples and step-by-step breakdowns")

    # Assessment Agent Tools
    ToolRegistry.register_tool("AssessmentAgent", "quiz_generation", description="Generate AI quizzes from course materials")
    ToolRegistry.register_tool("AssessmentAgent", "grading", description="Auto-grade student answers with detailed feedback")
    ToolRegistry.register_tool("AssessmentAgent", "feedback", description="Provide constructive improvement suggestions")

    # Planner Agent Tools
    ToolRegistry.register_tool("PlannerAgent", "study_plan", description="Generate personalized daily study schedules")
    ToolRegistry.register_tool("PlannerAgent", "revision_plan", description="Create revision calendars for weak topics")
    ToolRegistry.register_tool("PlannerAgent", "task_scheduling", description="Schedule and prioritize study tasks")

    # Memory Agent Tools
    ToolRegistry.register_tool("MemoryAgent", "context_retrieval", description="Retrieve student learning preferences and weak topics")
    ToolRegistry.register_tool("MemoryAgent", "history_tracking", description="Track conversation history and learning sessions")

    # Course Management Agent Tools
    ToolRegistry.register_tool("CourseManagementAgent", "course_info", description="Retrieve course details, syllabus, and enrolled student data")

    logger.info(f"[ToolRegistry] Registered {len(ToolRegistry.list_tools())} default agent tools.")
