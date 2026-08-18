# StudyOS — Production Agentic AI Learning Management System

> **StudyOS** is a premium, agentic AI-powered Learning Management System for Students and Teachers, engineered with React 19, FastAPI, PostgreSQL, and Google Gemini API.

---

## Key Modules & Agent Architecture

StudyOS operates on a multi-agent orchestration architecture led by the **Coordinator Agent**:

```
                              ┌────────────────────┐
                              │  Coordinator Agent │
                              │    (Orchestrator)  │
                              └─────────┬──────────┘
                                        │
        ┌───────────────────┬───────────┴───────────┬───────────────────┐
        ▼                   ▼                       ▼                   ▼
┌──────────────┐    ┌──────────────┐        ┌──────────────┐    ┌──────────────┐
│  Learning    │    │  Assessment  │        │   Planner    │    │    Memory    │
│    Agent     │    │    Agent     │        │    Agent     │    │    Agent     │
└──────────────┘    └──────────────┘        └──────────────┘    └──────────────┘
```

1. **Coordinator Agent**: Classifies user intent (`Learning`, `Assessment`, `Planning`, `Course`, `Profile`, `General`), coordinates multi-agent pipelines, and logs execution steps for transparent UI rendering.
2. **Learning Agent**: RAG-powered study assistant extracting concepts from uploaded course slides & notes.
3. **Assessment Agent**: RAG quiz generation, assignment rubric drafting, and auto-evaluation of subjective student answers with 0-100 scoring and feedback.
4. **Planner Agent**: Generates adaptive daily study schedules, study streak tracking, and smart task rescheduling.
5. **Memory Agent**: Tracks student weak topics, past quiz scores, and learning preferences across conversations.
6. **Analytics & Notifications**: Real-time progress tracking, instructor course metrics, announcement broadcasts, and achievement badge system.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide React, Radix UI.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy ORM, Alembic migrations, PostgreSQL, Pydantic v2.
- **AI Infrastructure**: Google Gemini 1.5 Pro / Flash API, Vector embeddings & Document Loader.
- **Storage**: Cloudinary API (Course materials & document uploads).
- **Authentication**: JWT access & refresh tokens, bcrypt password hashing, Google OAuth integration, Role-Based Access Control (`STUDENT` & `TEACHER`).

---

## Getting Started Locally

### Prerequisites
- Node.js >= 20
- Python >= 3.11
- PostgreSQL (or Docker)

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Configure your DATABASE_URL and GEMINI_API_KEY in .env
python3 run.py
```
Backend runs at `http://127.0.0.1:8000`. OpenAPI docs available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## Docker Deployment (Recommended)

Run the full StudyOS stack with PostgreSQL, FastAPI backend, and Nginx frontend in containerized isolation:

```bash
# 1. Clone & copy environment template
cp .env.example .env

# 2. Start container stack
docker-compose up --build -d

# 3. Access applications:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
```

---

## Production Cloud Deployment Guide

### 1. Database (Neon Cloud PostgreSQL)
1. Create a serverless PostgreSQL database on [Neon.tech](https://neon.tech).
2. Copy your connection string into `DATABASE_URL` in production environment settings.

### 2. Backend (Render / Railway)
1. Deploy `backend/` directory as a Python Web Service on Render or Railway.
2. Set Build Command: `pip install -r requirements.txt`.
3. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4. Configure environment variables (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `CLOUDINARY_CLOUD_NAME`).

### 3. Frontend (Vercel)
1. Import `frontend/` directory to Vercel.
2. Build Command: `npm run build`.
3. Output Directory: `dist`.
4. Set Environment Variable: `VITE_API_URL=https://your-backend-api-url.onrender.com`.

---

## API Endpoints Reference

| Category | Endpoint | Method | Role | Description |
|----------|----------|--------|------|-------------|
| **Auth** | `/api/v1/auth/signup` | `POST` | Public | Register new student or teacher account |
| **Auth** | `/api/v1/auth/login` | `POST` | Public | Authenticate user & get JWT tokens |
| **Courses** | `/api/v1/courses` | `GET/POST` | Both | List enrolled courses / Create course |
| **Materials** | `/api/v1/materials/upload` | `POST` | Teacher | Upload document & extract RAG chunks |
| **AI Orchestration** | `/api/v1/ai/query` | `POST` | Both | Multi-agent execution via CoordinatorAgent |
| **Quizzes** | `/api/v1/quizzes/{id}/attempt` | `POST` | Student | Attempt quiz with auto-scoring & feedback |
| **Planner** | `/api/v1/planner/generate` | `POST` | Student | Generate personalized AI study plan |
| **Analytics** | `/api/v1/analytics/student` | `GET` | Student | View real student performance metrics |
| **Notifications** | `/api/v1/notifications` | `GET` | Both | List unread alerts & announcements |

---

## License

Production Ready SaaS Platform — All Rights Reserved.
