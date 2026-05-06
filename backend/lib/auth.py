from fastapi import HTTPException, Header


# TODO: 인증 시스템을 재구현해야 합니다.
# Supabase Auth가 제거되었으므로, 현재는 토큰에서 user_id를 추출하는 stub입니다.
# 실제 JWT 검증 또는 별도 인증 서버 연동이 필요합니다.


async def get_current_user(authorization: str = Header(...)):
    """토큰에서 사용자 정보를 추출합니다. (stub)"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token")
    token = authorization.removeprefix("Bearer ")
    # TODO: 실제 JWT 검증으로 교체 필요
    return {"id": token, "role": "applicant"}


async def require_admin(authorization: str = Header(...)):
    """관리자 권한을 확인합니다. (stub)"""
    user = await get_current_user(authorization)
    # TODO: 실제 역할 검증으로 교체 필요
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한 필요")
    return user
