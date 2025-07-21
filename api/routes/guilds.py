from fastapi import APIRouter, Depends

from models.users import Guild, GuildOrm, User
from routes.auth import get_current_user

guilds = APIRouter(prefix="/guilds", tags=["guilds"])


@guilds.get("/{guild_id}")
async def get_guild(guild_id: int) -> Guild:
    return await GuildOrm.get_guild(guild_id)


@guilds.post("/{name}")
async def create_guild(name: str, current_user: User = Depends(get_current_user)) -> Guild:
    return await GuildOrm.create_guild(name, current_user.id)
