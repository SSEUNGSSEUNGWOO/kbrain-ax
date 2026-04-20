from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from lib.supabase import get_supabase

router = APIRouter(prefix="/applications", tags=["applications"])


class ApplicationCreate(BaseModel):
    selection_id: str
    content: dict


@router.get("/")
async def list_applications(authorization: str = Header(...)):
    sb = get_supabase()
    user = sb.auth.get_user(authorization.removeprefix("Bearer "))
    profile = sb.table("profiles").select("role").eq("id", user.user.id).single().execute()

    if profile.data.get("role") == "admin":
        result = sb.table("applications").select("*").execute()
    else:
        result = sb.table("applications").select("*").eq("user_id", user.user.id).execute()

    return result.data


@router.post("/")
async def create_application(body: ApplicationCreate, authorization: str = Header(...)):
    sb = get_supabase()
    user = sb.auth.get_user(authorization.removeprefix("Bearer "))

    result = sb.table("applications").insert({
        "user_id": user.user.id,
        "selection_id": body.selection_id,
        "content": body.content,
        "status": "submitted",
    }).execute()

    return result.data[0]


@router.get("/{application_id}")
async def get_application(application_id: str, authorization: str = Header(...)):
    sb = get_supabase()
    user = sb.auth.get_user(authorization.removeprefix("Bearer "))
    profile = sb.table("profiles").select("role").eq("id", user.user.id).single().execute()

    result = sb.table("applications").select("*").eq("id", application_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="지원서 없음")

    is_admin = profile.data.get("role") == "admin"
    is_owner = result.data.get("user_id") == user.user.id
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="접근 권한 없음")

    return result.data
