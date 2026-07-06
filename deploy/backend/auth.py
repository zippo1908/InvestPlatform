"""认证与鉴权基石(P0 安全脊柱)。

原状:登录不校验密码、token 是硬编码字符串、身份靠客户端自报 X-User-Id header。
本模块提供:bcrypt 口令校验 + JWT 签发/校验 + FastAPI 依赖(current_user / require_roles)。
身份一律从已签名的 token 派生,不再信任任何客户端自报 header。
"""
from __future__ import annotations

import os
import time
from typing import Any

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException

JWT_ALG = "HS256"
JWT_TTL_SECONDS = int(os.getenv("JWT_TTL_SECONDS", str(8 * 3600)))  # 默认 8 小时


def _secret() -> str:
    """强制要求配置了足够强度的 JWT_SECRET —— 弱/缺失直接 500,绝不用内置默认值签发。"""
    secret = os.getenv("JWT_SECRET", "")
    if len(secret) < 16:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET is not configured (set a strong random value in .env, >=16 chars)",
        )
    return secret


# ── 口令 ────────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ── Token ───────────────────────────────────────────────────────────────
def create_token(
    *,
    user_id: int,
    org_id: int | None,
    tenant_id: int | None,
    roles: list[str],
    perms: list[str],
    display_name: str,
) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "org_id": org_id,
        "tenant_id": tenant_id,  # 根公司 org_id —— 数据隔离边界
        "roles": roles,
        "perms": perms,  # 角色授予的权限码(RBAC 授权边界)
        "name": display_name,
        "iat": now,
        "exp": now + JWT_TTL_SECONDS,
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALG)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, _secret(), algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class AuthedUser:
    """从 token 派生的可信身份上下文。tenant_id(根公司)是数据隔离边界。"""

    __slots__ = ("user_id", "org_id", "tenant_id", "roles", "perms", "display_name")

    def __init__(
        self,
        user_id: int,
        org_id: int | None,
        tenant_id: int | None,
        roles: list[str],
        perms: list[str],
        display_name: str,
    ):
        self.user_id = user_id
        self.org_id = org_id
        self.tenant_id = tenant_id
        self.roles = roles
        self.perms = perms
        self.display_name = display_name


# ── FastAPI 依赖 ─────────────────────────────────────────────────────────
def current_user(authorization: str | None = Header(default=None)) -> AuthedUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    claims = decode_token(authorization.split(" ", 1)[1].strip())
    return AuthedUser(
        user_id=int(claims.get("sub")),
        org_id=claims.get("org_id"),
        tenant_id=claims.get("tenant_id"),
        roles=list(claims.get("roles") or []),
        perms=list(claims.get("perms") or []),
        display_name=claims.get("name") or "",
    )


def require_roles(*allowed: str):
    """角色闸门依赖工厂:token 角色与 allowed 有交集才放行,否则 403。"""

    def _dep(user: AuthedUser = Depends(current_user)) -> AuthedUser:
        if allowed and not (set(user.roles) & set(allowed)):
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user

    return _dep


def require_permission(*needed: str):
    """权限闸门依赖工厂:token 权限码需覆盖任一 needed 才放行,否则 403。
    权限来自角色→cap_role_permissions 映射,登录时解析进 token。"""

    def _dep(user: AuthedUser = Depends(current_user)) -> AuthedUser:
        if needed and not (set(user.perms) & set(needed)):
            raise HTTPException(
                status_code=403,
                detail=f"Missing permission: requires one of {list(needed)}",
            )
        return user

    return _dep
