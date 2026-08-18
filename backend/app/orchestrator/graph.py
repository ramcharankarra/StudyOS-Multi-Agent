import logging
from typing import Dict, Any, Optional
from langgraph.graph import StateGraph, START, END

from app.orchestrator.state import StudyOSState
from app.orchestrator.nodes import (
    node_load_context,
    node_classify_intent,
    node_validate_material_relevance,
    node_retrieve_course_context,
    node_route_to_specialist,
    node_conversational_agent,
    node_explainer_agent,
    node_planner_agent,
    node_assessment_agent,
    node_flashcard_agent,
    node_summarizer_agent,
    node_grounding_validation,
    node_format_response
)

logger = logging.getLogger("studyos_langgraph_engine")


def router_specialist_condition(state: StudyOSState) -> str:
    """Conditional router function for specialist agent branching."""
    status = state.get("grounding_status")
    if status == "REFUSAL":
        return "grounding_validation"

    agent = state.get("selected_agent", "ExplainerAgent")
    agent_node_map = {
        "ConversationalAgent": "conversational_agent",
        "ExplainerAgent": "explainer_agent",
        "PlannerAgent": "planner_agent",
        "AssessmentAgent": "assessment_agent",
        "FlashcardAgent": "flashcard_agent",
        "SummarizerAgent": "summarizer_agent"
    }
    return agent_node_map.get(agent, "explainer_agent")


def build_studyos_langgraph():
    builder = StateGraph(StudyOSState)

    # 1. Add Nodes
    builder.add_node("load_context", node_load_context)
    builder.add_node("classify_intent", node_classify_intent)
    builder.add_node("validate_material_relevance", node_validate_material_relevance)
    builder.add_node("retrieve_course_context", node_retrieve_course_context)
    builder.add_node("route_to_specialist", node_route_to_specialist)

    builder.add_node("conversational_agent", node_conversational_agent)
    builder.add_node("explainer_agent", node_explainer_agent)
    builder.add_node("planner_agent", node_planner_agent)
    builder.add_node("assessment_agent", node_assessment_agent)
    builder.add_node("flashcard_agent", node_flashcard_agent)
    builder.add_node("summarizer_agent", node_summarizer_agent)

    from app.orchestrator.nodes import node_coverage_validation
    builder.add_node("coverage_validation", node_coverage_validation)
    builder.add_node("grounding_validation", node_grounding_validation)
    builder.add_node("format_response", node_format_response)

    # 2. Add Linear Edges
    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "classify_intent")
    builder.add_edge("classify_intent", "validate_material_relevance")
    builder.add_edge("validate_material_relevance", "retrieve_course_context")
    builder.add_edge("retrieve_course_context", "route_to_specialist")

    # 3. Add Conditional Edge for Specialist Routing
    builder.add_conditional_edges(
        "route_to_specialist",
        router_specialist_condition,
        {
            "conversational_agent": "conversational_agent",
            "explainer_agent": "explainer_agent",
            "planner_agent": "planner_agent",
            "assessment_agent": "assessment_agent",
            "flashcard_agent": "flashcard_agent",
            "summarizer_agent": "summarizer_agent",
            "grounding_validation": "grounding_validation"
        }
    )

    # 4. Join Specialist Nodes back to Coverage Validation / Grounding Validation
    builder.add_edge("conversational_agent", "grounding_validation")
    builder.add_edge("explainer_agent", "coverage_validation")
    builder.add_edge("coverage_validation", "grounding_validation")
    builder.add_edge("planner_agent", "grounding_validation")
    builder.add_edge("assessment_agent", "grounding_validation")
    builder.add_edge("flashcard_agent", "grounding_validation")
    builder.add_edge("summarizer_agent", "grounding_validation")

    builder.add_edge("grounding_validation", "format_response")
    builder.add_edge("format_response", END)

    compiled_graph = builder.compile()
    logger.info("[StudyOS LangGraph] Compiled Master StateGraph Engine successfully.")
    return compiled_graph


# Global Singleton Instance of Compiled StateGraph
studyos_graph = build_studyos_langgraph()


async def execute_studyos_graph(
    user_id: str,
    user_query: str,
    course_id: Optional[str] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the StudyOS LangGraph StateGraph Engine with multi-agent coordination.
    """
    initial_state: StudyOSState = {
        "user_id": user_id,
        "user_query": user_query,
        "course_id": course_id,
        "request_id": request_id,
        "grounding_status": "PENDING"
    }

    final_state = await studyos_graph.ainvoke(initial_state)

    # Multi-Agent Coordination: Execute secondary agents sequentially with shared state
    selected_agents = final_state.get("selected_agents", [])
    if len(selected_agents) > 1:
        from app.orchestrator.nodes import (
            node_planner_agent,
            node_flashcard_agent,
            node_assessment_agent,
            node_format_response
        )
        current_state = dict(final_state)
        for agent_name in selected_agents[1:]:
            logger.info(f"[Multi-Agent Coordination] Executing secondary agent '{agent_name}' with shared state")
            if agent_name == "PlannerAgent":
                p_out = await node_planner_agent(current_state)
                current_state.update(p_out)
            elif agent_name == "FlashcardAgent":
                f_out = await node_flashcard_agent(current_state)
                current_state.update(f_out)
            elif agent_name == "AssessmentAgent":
                a_out = await node_assessment_agent(current_state)
                current_state.update(a_out)

        # Re-format unified response with all specialist outputs
        fmt_out = await node_format_response(current_state)
        current_state.update(fmt_out)
        final_state = current_state

    return final_state
