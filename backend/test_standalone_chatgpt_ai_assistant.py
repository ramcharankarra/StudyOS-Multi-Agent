import asyncio
from app.database import SessionLocal
from app.models.user import User
from app.schemas.user import UserCreate
from app.api.v1.auth import register
from app.api.v1.ai import ai_assistant_chat_interaction, AIAssistantChatRequest


def run_standalone_chatgpt_test():
    print("\n=======================================================")
    print("STUDYOS STANDALONE CHATGPT AI ASSISTANT VERIFICATION")
    print("=======================================================\n")

    db = SessionLocal()
    s_email = "chatgpt_standalone_student@studyos.edu"

    u = db.query(User).filter(User.email == s_email).first()
    if u:
        db.delete(u)
        db.commit()

    s_user = register(UserCreate(name="ChatGPT Student", email=s_email, password="StudentPassword123", role="student"), db=db)
    db.commit()
    session_id = "standalone_chatgpt_session_777"

    prompts_to_test = [
        "Explain LLM",
        "Write Python code for binary search",
        "Solve calculus integration of x^2",
        "Write a resume summary for a software engineer"
    ]

    for idx, p in enumerate(prompts_to_test, 1):
        print(f"[{idx}/4] Testing prompt: '{p}'")
        req = AIAssistantChatRequest(prompt=p, session_id=session_id, context_mode="general")
        res = asyncio.run(ai_assistant_chat_interaction(payload=req, db=db, current_user=s_user))
        response_text = res["response"]

        print(f"✓ Output Preview ({len(response_text)} chars):")
        print(f"  {response_text[:120]}...\n")

        forbidden_terms = [
            "Autonomous Response",
            "Workspace",
            "Save to Workspace",
            "Add to Planner",
            "Explain Simpler",
            "Classroom RAG Context",
            "Retrieved Chunks",
            "Course Context",
            "Planner Actions",
            "Workspace Memory",
            "Mission Actions"
        ]

        for term in forbidden_terms:
            assert term.lower() not in response_text.lower(), f"FORBIDDEN TERM DETECTED: Found '{term}' in response for prompt '{p}'!"

    print("✓ All 4 verification prompts returned clean ChatGPT responses with ZERO Workspace metadata!")

    print("\n=======================================================")
    print(" ✅ STANDALONE CHATGPT AI ASSISTANT TEST PASSED 100% ")
    print("=======================================================\n")

    u_to_delete = db.query(User).filter(User.email == s_email).first()
    if u_to_delete:
        db.delete(u_to_delete)
        db.commit()


if __name__ == "__main__":
    run_standalone_chatgpt_test()
