from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from lib.db import get_conn
from lib.auth import get_current_user
from psycopg2.extras import Json as psycopg2_Json

router = APIRouter(prefix="/applications", tags=["applications"])


class ApplicationCreate(BaseModel):
    selection_id: str
    content: dict


@router.get("/")
async def list_applications(authorization: str = Header(...)):
    user = await get_current_user(authorization)
    user_id = user["id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            # TODO: 역할 확인은 auth stub이 개선되면 수정 필요
            cur.execute("SELECT role FROM profiles WHERE id = %s", (user_id,))
            profile = cur.fetchone()

            if profile and profile["role"] == "admin":
                cur.execute("SELECT * FROM applications")
            else:
                cur.execute("SELECT * FROM applications WHERE user_id = %s", (user_id,))

            return cur.fetchall()


@router.post("/")
async def create_application(body: ApplicationCreate, authorization: str = Header(...)):
    user = await get_current_user(authorization)
    user_id = user["id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO applications (user_id, selection_id, content, status)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (user_id, body.selection_id, psycopg2_Json(body.content), "submitted"),
            )
            conn.commit()
            return cur.fetchone()


@router.get("/{application_id}")
async def get_application(application_id: str, authorization: str = Header(...)):
    user = await get_current_user(authorization)
    user_id = user["id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT role FROM profiles WHERE id = %s", (user_id,))
            profile = cur.fetchone()

            cur.execute("SELECT * FROM applications WHERE id = %s", (application_id,))
            row = cur.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="지원서 없음")

            is_admin = profile and profile["role"] == "admin"
            is_owner = row["user_id"] == user_id
            if not is_admin and not is_owner:
                raise HTTPException(status_code=403, detail="접근 권한 없음")

            return row
