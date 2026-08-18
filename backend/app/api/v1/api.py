from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.courses import router as courses_router
from app.api.v1.materials import router as materials_router
from app.api.v1.assignments import router as assignments_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.grades import router as grades_router
from app.api.v1.ai import router as ai_router
from app.api.v1.memory import router as memory_router
from app.api.v1.planner import router as planner_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.announcements import router as announcements_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.missions import router as missions_router
from app.api.v1.search import router as search_router
from app.api.v1.agents import router as agents_router
from app.api.v1.artifacts import router as artifacts_router
from app.api.v1.goals import router as goals_router
from app.api.v1.profile import router as profile_router
from app.api.v1.collaboration import router as collaboration_router
from app.api.v1.teacher_ai import router as teacher_ai_router
from app.api.v1.context import router as context_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(courses_router)
api_v1_router.include_router(materials_router)
api_v1_router.include_router(assignments_router)
api_v1_router.include_router(quizzes_router)
api_v1_router.include_router(grades_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(memory_router)
api_v1_router.include_router(planner_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(announcements_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(missions_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(agents_router)
api_v1_router.include_router(artifacts_router)
api_v1_router.include_router(goals_router)
api_v1_router.include_router(profile_router)
api_v1_router.include_router(collaboration_router)
api_v1_router.include_router(teacher_ai_router)
api_v1_router.include_router(context_router)
