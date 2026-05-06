from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from lib.db import get_conn
from lib.auth import get_current_user
from psycopg2.extras import Json as psycopg2_Json
from datetime import datetime

router = APIRouter(prefix="/exams", tags=["exams"])


class ExamAttemptStart(BaseModel):
    exam_id: str


class ExamAttemptSubmit(BaseModel):
    attempt_id: str
    answers: dict


class ExamSubmitDirect(BaseModel):
    exam_id: str
    answers: dict
    started_at: str
    applicant_name: str


@router.get("/")
async def list_exams(authorization: str = Header(...)):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM exams WHERE is_active = true")
            return cur.fetchall()


@router.post("/attempts/start")
async def start_attempt(body: ExamAttemptStart, authorization: str = Header(...)):
    user = await get_current_user(authorization)
    user_id = user["id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM exam_attempts WHERE exam_id = %s AND user_id = %s",
                (body.exam_id, user_id),
            )
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="이미 응시 중인 시험이 있습니다")

            cur.execute(
                """
                INSERT INTO exam_attempts (exam_id, user_id, started_at, status)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (body.exam_id, user_id, datetime.utcnow().isoformat(), "in_progress"),
            )
            conn.commit()
            return cur.fetchone()


@router.post("/attempts/submit")
async def submit_attempt(body: ExamAttemptSubmit, authorization: str = Header(...)):
    user = await get_current_user(authorization)
    user_id = user["id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM exam_attempts WHERE id = %s AND user_id = %s",
                (body.attempt_id, user_id),
            )
            attempt = cur.fetchone()

            if not attempt:
                raise HTTPException(status_code=404, detail="응시 기록 없음")
            if attempt["status"] != "in_progress":
                raise HTTPException(status_code=409, detail="이미 제출된 시험입니다")

            cur.execute(
                """
                UPDATE exam_attempts
                SET answers = %s, submitted_at = %s, status = %s
                WHERE id = %s
                RETURNING *
                """,
                (
                    psycopg2_Json(body.answers),
                    datetime.utcnow().isoformat(),
                    "submitted",
                    body.attempt_id,
                ),
            )
            conn.commit()
            return cur.fetchone()


@router.post("/submit")
async def submit_exam_direct(body: ExamSubmitDirect, authorization: str = Header(...)):
    user = await get_current_user(authorization)
    user_id = user["id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM exams WHERE id = %s", (body.exam_id,))
            exam = cur.fetchone()
            if not exam:
                raise HTTPException(status_code=404, detail="시험 없음")

            # exam_questions + question_bank JOIN
            cur.execute(
                """
                SELECT eq.points, qb.*
                FROM exam_questions eq
                JOIN question_bank qb ON eq.question_id = qb.id
                WHERE eq.exam_id = %s
                """,
                (body.exam_id,),
            )
            questions = cur.fetchall()

            scored_points = 0
            total_points = 0
            for q in questions:
                total_points += q["points"]
                user_answer = body.answers.get(q["id"], "")
                correct = q.get("correct_answer") or ""
                q_type = q.get("type", "")

                if q_type in ("객관식", "OX"):
                    if user_answer == correct:
                        scored_points += q["points"]
                elif q_type == "단답형":
                    if user_answer.strip().lower() == correct.strip().lower():
                        scored_points += q["points"]

            score = round((scored_points / total_points) * 100) if total_points > 0 else 0
            is_passed = score >= exam["passing_score"]

            cur.execute(
                """
                INSERT INTO exam_attempts
                    (exam_id, user_id, applicant_name, started_at,
                     submitted_at, answers, score, is_passed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    body.exam_id,
                    user_id,
                    body.applicant_name,
                    body.started_at,
                    datetime.utcnow().isoformat(),
                    psycopg2_Json(body.answers),
                    score,
                    is_passed,
                ),
            )
            conn.commit()

            return {"score": score, "is_passed": is_passed}


@router.put("/attempts/{attempt_id}/autosave")
async def autosave_attempt(attempt_id: str, body: dict, authorization: str = Header(...)):
    user = await get_current_user(authorization)
    user_id = user["id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE exam_attempts
                SET answers = %s
                WHERE id = %s AND user_id = %s
                """,
                (psycopg2_Json(body.get("answers", {})), attempt_id, user_id),
            )
            conn.commit()

    return {"saved": True}
