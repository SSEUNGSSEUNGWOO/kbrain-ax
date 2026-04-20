from fastapi import HTTPException, Header
from supabase import Client

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    token = authorization.removeprefix("Bearer ")
    return token


async def require_admin(authorization: str = Header(...), supabase: Client = None):
    token = await get_current_user(authorization)
    user = supabase.auth.get_user(token)
    profile = supabase.table("profiles").select("role").eq("id", user.user.id).single().execute()
    if profile.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한 필요")
    return user.user
