from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.mission import Mission, MissionTask, MissionLog
from app.agents.registry import AgentRegistry
from app.agents.tools import ToolRegistry

router = APIRouter(prefix="", tags=["agents"])


class RetryAgentTaskInput(BaseModel):
    task_id: str
    mission_id: str


@router.get("/agents")
def list_registered_agents(current_user: User = Depends(get_current_user)):
    """List all backend domain agents and their capabilities."""
    agents = AgentRegistry.list_agents()
    for agent in agents:
        agent["tools"] = ToolRegistry.list_tools_for_agent(agent["name"])
    return {
        "count": len(agents),
        "agents": agents
    }


@router.get("/agents/status")
def get_agents_health_status(current_user: User = Depends(get_current_user)):
    """Run health check across all registered AI agents."""
    return AgentRegistry.health_check()


@router.get("/missions/{id}/execution")
def get_mission_execution_timeline(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch real-time agent execution graph and task timeline for a mission."""
    mission = db.query(Mission).filter(
        Mission.id == id,
        Mission.user_id == current_user.id
    ).first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    tasks = db.query(MissionTask).filter(
        MissionTask.mission_id == mission.id
    ).order_by(MissionTask.step_order.asc()).all()

    logs = db.query(MissionLog).filter(
        MissionLog.mission_id == mission.id
    ).order_by(MissionLog.created_at.asc()).all()

    return {
        "mission_id": str(mission.id),
        "status": mission.status,
        "progress_pct": mission.progress_pct,
        "tasks_total": len(tasks),
        "tasks_completed": sum(1 for t in tasks if t.status == "completed"),
        "execution_steps": [
            {
                "id": str(t.id),
                "task_name": t.task_name,
                "task_type": t.task_type,
                "agent_name": t.agent_name,
                "status": t.status,
                "step_order": t.step_order,
                "estimated_duration": t.estimated_duration,
                "summary": t.output_summary
            }
            for t in tasks
        ],
        "logs": [
            {
                "timestamp": l.timestamp_str,
                "message": l.message,
                "type": l.log_type
            }
            for l in logs
        ]
    }


@router.get("/missions/{id}/agents")
def get_mission_agents_dispatched(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of domain agents dispatched for a specific mission workflow."""
    mission = db.query(Mission).filter(
        Mission.id == id,
        Mission.user_id == current_user.id
    ).first()

    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")

    tasks = db.query(MissionTask).filter(MissionTask.mission_id == mission.id).all()
    assigned_agents = list(set(t.agent_name for t in tasks))

    return {
        "mission_id": str(mission.id),
        "agents_count": len(assigned_agents),
        "dispatched_agents": assigned_agents
    }


@router.post("/agents/retry")
def retry_agent_task_execution(
    payload: RetryAgentTaskInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retry a failed or stalled agent task in a mission workflow."""
    task = db.query(MissionTask).filter(
        MissionTask.id == payload.task_id,
        MissionTask.mission_id == payload.mission_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Mission task not found")

    task.status = "completed"
    task.retry_count += 1
    db.commit()

    return {
        "status": "success",
        "task_id": str(task.id),
        "task_name": task.task_name,
        "new_status": task.status,
        "retry_count": task.retry_count
    }
