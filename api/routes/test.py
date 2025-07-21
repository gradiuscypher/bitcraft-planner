import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from models.users import User
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

# Create the router
test = APIRouter(prefix="/test", tags=["testing"])


class ProtectedResponse(BaseModel):
    """Response model for protected endpoint"""
    message: str
    user_info: dict


@test.get("/public")
async def public_endpoint():
    """Public endpoint that doesn't require authentication"""
    return {
        "message": "This is a public endpoint accessible to everyone",
        "oauth_flow": {
            "step_1": "GET /auth/login - Get Discord OAuth URL",
            "step_2": "Visit the URL to authorize with Discord",
            "step_3": "GET /auth/callback?code=... - Exchange code for token",
            "step_4": "Use Bearer token in Authorization header for protected endpoints",
        }
    }


@test.get("/protected", response_model=ProtectedResponse)
async def protected_endpoint(current_user: User = Depends(get_current_user)):
    """Protected endpoint that requires Discord OAuth authentication"""
    return ProtectedResponse(
        message=f"Hello {current_user.username}! This is a protected endpoint.",
        user_info={
            "id": current_user.id,
            "discord_id": current_user.discord_id,
            "username": current_user.username,
            "global_name": current_user.global_name,
            "avatar": current_user.avatar,
        }
    )


@test.get("/admin")
async def admin_endpoint(current_user: User = Depends(get_current_user)):
    """Another protected endpoint demonstrating the auth dependency"""
    return {
        "message": f"Welcome to the admin area, {current_user.username}!",
        "discord_info": {
            "discord_id": current_user.discord_id,
            "joined_at": current_user.created_at.isoformat(),
        },
        "note": "This endpoint could be extended with role-based permissions"
    } 