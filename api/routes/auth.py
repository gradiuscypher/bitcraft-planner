import logging
from datetime import datetime, timedelta
from typing import Annotated, Any
from urllib.parse import urlencode

import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from itsdangerous import URLSafeTimedSerializer
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.users import UserGroupMembership, UserOrm
from settings import (
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    JWT_EXPIRATION_HOURS,
    JWT_SECRET_KEY,
)

logger = logging.getLogger(__name__)

# Discord OAuth URLs
DISCORD_OAUTH_BASE_URL = "https://discord.com/api/oauth2/authorize"
DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token"
DISCORD_USER_API_URL = "https://discord.com/api/users/@me"

# JWT serializer for token management
serializer = URLSafeTimedSerializer(JWT_SECRET_KEY)

# Create the router
auth = APIRouter(prefix="/auth", tags=["authentication"])

# Define the security scheme for Bearer token authentication
security = HTTPBearer()


class UserResponse(BaseModel):
    """Response model for user information"""

    id: int
    discord_id: str
    username: str
    global_name: str | None
    avatar: str | None
    email: str | None
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class LoginResponse(BaseModel):
    """Response model for login redirect"""

    login_url: str


class CallbackResponse(BaseModel):
    """Response model for OAuth callback"""

    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse

    class Config:
        from_attributes = True


async def create_or_update_user(user_data: dict[str, Any], db: AsyncSession) -> UserOrm:
    """Create or update user from Discord data"""
    # Check if user already exists
    stmt = select(UserOrm).where(UserOrm.discord_id == str(user_data["id"]))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        # Update existing user
        user.username = user_data["username"]
        user.global_name = user_data.get("global_name")
        user.avatar = user_data.get("avatar")
        user.email = user_data.get("email")
        user.updated_at = datetime.utcnow()
    else:
        # Create new user
        user = UserOrm(
            discord_id=str(user_data["id"]),
            username=user_data["username"],
            discriminator=user_data.get("discriminator"),
            global_name=user_data.get("global_name"),
            avatar=user_data.get("avatar"),
            email=user_data.get("email"),
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)
    return user


def create_jwt_token(user_id: int) -> str:
    """Create a JWT token for the user"""
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "exp": expiration.timestamp(),  # Convert datetime to Unix timestamp
    }
    return serializer.dumps(payload)


def verify_jwt_token(token: str) -> dict[str, Any] | None:
    """Verify and decode JWT token"""
    try:
        # Verify token (checks signature and expiration)
        payload = serializer.loads(
            token,
            max_age=JWT_EXPIRATION_HOURS * 3600,  # Convert hours to seconds
        )

        # Check if token has expired manually since we're using timestamp
        if "exp" in payload:
            exp_timestamp = payload["exp"]
            if datetime.utcnow().timestamp() > exp_timestamp:
                logger.warning("Token has expired")
                return None

        return payload
    except Exception as e:
        logger.warning(f"Invalid token: {e}")
        return None


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserOrm:
    """FastAPI dependency to get current authenticated user"""
    # Get token from the credentials
    token = credentials.credentials
    payload = verify_jwt_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database with eagerly loaded group relationships
    stmt = (
        select(UserOrm)
        .where(UserOrm.id == payload["user_id"])
        .options(
            selectinload(UserOrm.group_memberships).selectinload(
                UserGroupMembership.user_group,
            ),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@auth.get("/login", response_model=LoginResponse)
async def login():
    """Initiate Discord OAuth login"""
    if not DISCORD_CLIENT_ID or not DISCORD_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Discord OAuth not configured",
        )

    params = {
        "client_id": DISCORD_CLIENT_ID,
        "redirect_uri": DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify email",
    }

    login_url = f"{DISCORD_OAUTH_BASE_URL}?{urlencode(params)}"
    return LoginResponse(login_url=login_url)


@auth.get("/callback", response_model=CallbackResponse)
async def callback(code: str, db: Annotated[AsyncSession, Depends(get_db)]):
    """Handle Discord OAuth callback"""
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code not provided",
        )

    # Exchange code for access token
    async with AsyncOAuth2Client(
        client_id=DISCORD_CLIENT_ID,
        client_secret=DISCORD_CLIENT_SECRET,
    ) as client:
        try:
            # Get access token
            token_response = await client.fetch_token(
                DISCORD_TOKEN_URL,
                code=code,
                redirect_uri=DISCORD_REDIRECT_URI,
            )

            access_token = token_response["access_token"]

            # Get user information from Discord
            headers = {"Authorization": f"Bearer {access_token}"}
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(DISCORD_USER_API_URL, headers=headers)
                response.raise_for_status()
                user_data = response.json()

            # Create or update user in database
            user = await create_or_update_user(user_data, db)

            # Create JWT token
            jwt_token = create_jwt_token(user.id)

            # Create user response
            user_response = UserResponse(
                id=user.id,
                discord_id=user.discord_id,
                username=user.username,
                global_name=user.global_name,
                avatar=user.avatar,
                email=user.email,
                created_at=user.created_at,
            )

            return CallbackResponse(
                access_token=jwt_token,
                token_type="bearer",
                expires_in=JWT_EXPIRATION_HOURS * 3600,
                user=user_response,
            )

        except Exception as e:
            logger.error(f"OAuth callback error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to authenticate with Discord",
            ) from e


@auth.get("/me")
async def get_me(
    current_user: Annotated[UserOrm, Depends(get_current_user)],
) -> UserResponse:
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        discord_id=current_user.discord_id,
        username=current_user.username,
        global_name=current_user.global_name,
        avatar=current_user.avatar,
        email=current_user.email,
        created_at=current_user.created_at,
    )


@auth.post("/logout")
async def logout():
    """Logout user (client should delete the token)"""
    return {"message": "Logout successful. Please delete your access token."}


# Export the dependency for use in other routes
__all__ = ["auth", "get_current_user"]
