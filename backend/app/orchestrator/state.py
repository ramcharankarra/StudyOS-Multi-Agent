from typing import TypedDict, List, Dict, Any, Optional


class StudyOSState(TypedDict, total=False):
    """
    Strongly typed shared state for StudyOS LangGraph StateGraph orchestration.
    """
    user_id: str
    course_id: Optional[str]
    course_name: Optional[str]
    user_query: str
    intent: str
    intent_confidence: float

    material_ids: List[str]
    material_metadata: List[Dict[str, Any]]

    retrieved_chunks: List[str]
    retrieval_metadata: List[Dict[str, Any]]

    topic_map: Optional[Dict[str, Any]]

    selected_agent: str
    selected_agents: List[str]
    current_agent: str

    course_content_map: Optional[Dict[str, Any]]
    teacher_output: Optional[Dict[str, Any]]
    planner_output: Optional[Dict[str, Any]]
    learning_output: Optional[Dict[str, Any]]
    assessment_output: Optional[Dict[str, Any]]

    response_type: str
    response_content: Dict[str, Any]

    citations: List[Dict[str, Any]]

    grounding_status: str

    validation_errors: List[str]

    request_id: str

    execution_id: str

    error: Optional[str]
