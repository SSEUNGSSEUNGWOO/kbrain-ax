import os
import httpx
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from lib.db import get_conn
from lib.auth import get_current_user
from psycopg2.extras import Json as psycopg2_Json

router = APIRouter(prefix="/evaluations", tags=["evaluations"])

AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8001")


class EvaluateRequest(BaseModel):
    application_id: str
    rubric: str = "ax_training.yaml"


@router.post("/")
async def evaluate_application(body: EvaluateRequest, authorization: str = Header(...)):
    user = await get_current_user(authorization)
    user_id = user["id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT role FROM profiles WHERE id = %s", (user_id,))
            profile = cur.fetchone()

            if not profile or profile["role"] != "admin":
                raise HTTPException(status_code=403, detail="관리자 권한 필요")

            cur.execute("SELECT * FROM applications WHERE id = %s", (body.application_id,))
            app_data = cur.fetchone()

            if not app_data:
                raise HTTPException(status_code=404, detail="지원서 없음")

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

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO evaluations
                    (application_id, evaluator_id, rubric_name, total_score,
                     max_total, item_scores, feedback, ai_generated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    body.application_id,
                    user_id,
                    eval_result["rubric_name"],
                    eval_result["total_score"],
                    eval_result["max_total"],
                    psycopg2_Json(eval_result["item_scores"]),
                    eval_result["feedback"],
                    True,
                ),
            )
            conn.commit()
            return cur.fetchone()


@router.get("/{application_id}")
async def get_evaluation(application_id: str, authorization: str = Header(...)):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM evaluations WHERE application_id = %s",
                (application_id,),
            )
            return cur.fetchall()
