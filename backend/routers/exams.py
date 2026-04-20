from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from lib.supabase import get_supabase
from datetime import datetime

router = APIRouter(prefix="/exams", tags=["exams"])


class ExamAttemptStart(BaseModel):
    exam_id: str


class ExamAttemptSubmit(BaseModel):
    attempt_id: str
    answers: dict


@router.get("/")
async def list_exams(authorization: str = Header(...)):
    sb = get_supabase()
    result = sb.table("exams").select("*").eq("is_active", True).execute()
    return result.data


@router.post("/attempts/start")
async def start_attempt(body: ExamAttemptStart, authorization: str = Header(...)):
    sb = get_supabase()
    user = sb.auth.get_user(authorization.removeprefix("Bearer "))

    existing = sb.table("exam_attempts").select("id").eq("exam_id", body.exam_id).eq("user_id", user.user.id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="이미 응시 중인 시험이 있습니다")

    result = sb.table("exam_attempts").insert({
        "exam_id": body.exam_id,
        "user_id": user.user.id,
        "started_at": datetime.utcnow().isoformat(),
        "status": "in_progress",
    }).execute()

    return result.data[0]


@router.post("/attempts/submit")
async def submit_attempt(body: ExamAttemptSubmit, authorization: str = Header(...)):
    sb = get_supabase()
    user = sb.auth.get_user(authorization.removeprefix("Bearer "))

    attempt = sb.table("exam_attempts").select("*").eq("id", body.attempt_id).eq("user_id", user.user.id).single().execute()
    if not attempt.data:
        raise HTTPException(status_code=404, detail="응시 기록 없음")
    if attempt.data["status"] != "in_progress":
        raise HTTPException(status_code=409, detail="이미 제출된 시험입니다")

    result = sb.table("exam_attempts").update({
        "answers": body.answers,
        "submitted_at": datetime.utcnow().isoformat(),
        "status": "submitted",
    }).eq("id", body.attempt_id).execute()

    return result.data[0]


@router.put("/attempts/{attempt_id}/autosave")
async def autosave_attempt(attempt_id: str, body: dict, authorization: str = Header(...)):
    sb = get_supabase()
    user = sb.auth.get_user(authorization.removeprefix("Bearer "))

    sb.table("exam_attempts").update({
        "answers": body.get("answers", {}),
    }).eq("id", attempt_id).eq("user_id", user.user.id).execute()

    return {"saved": True}
