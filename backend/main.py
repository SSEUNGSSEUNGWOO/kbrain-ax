from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from routers import applications, evaluations, exams

app = FastAPI(title="KBrain-AX Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)
app.include_router(evaluations.router)
app.include_router(exams.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
