import os
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from lib.supabase import get_supabase

router = APIRouter(prefix="/evaluations", tags=["evaluations"])

AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8001")


class EvaluateRequest(BaseModel):
    application_id: str
    rubric: str = "ax_training.yaml"


@router.post("/")
async def evaluate_application(body: EvaluateRequest, authorization: str = Header(...)):
    sb = get_supabase()
    user = sb.auth.get_user(authorization.removeprefix("Bearer "))
    profile = sb.table("profiles").select("role").eq("id", user.user.id).single().execute()

    if profile.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한 필요")

    application = sb.table("applications").select("*").eq("id", body.application_id).single().execute()
    if not application.data:
        raise HTTPException(status_code=404, detail="지원서 없음")

    app_data = application.data
    text = "\n\n".join(f"{k}: {v}" for k, v in app_data["content"].items())

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(f"{AI_SERVICE_URL}/evaluate", json={
            "text": text,
            "rubric": body.rubric,
            "applicant_name": app_data.get("user_id", "미상"),
            "blind_mode": True,
            "include_feedback": True,
        })

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="AI 평가 서비스 오류")

    eval_result = response.json()

    saved = sb.table("evaluations").insert({
        "application_id": body.application_id,
        "evaluator_id": user.user.id,
        "rubric_name": eval_result["rubric_name"],
        "total_score": eval_result["total_score"],
        "max_total": eval_result["max_total"],
        "item_scores": eval_result["item_scores"],
        "feedback": eval_result["feedback"],
        "ai_generated": True,
    }).execute()

    return saved.data[0]


@router.get("/{application_id}")
async def get_evaluation(application_id: str, authorization: str = Header(...)):
    sb = get_supabase()
    result = sb.table("evaluations").select("*").eq("application_id", application_id).execute()
    return result.data
