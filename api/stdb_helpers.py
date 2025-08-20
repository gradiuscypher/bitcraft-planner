import json
import logging
import os
from collections.abc import Generator
from pprint import pprint
from typing import Any

import httpx
from dotenv import load_dotenv, set_key
from websockets import Subprotocol
from websockets.exceptions import ConnectionClosedError
from websockets.sync.client import connect

logger = logging.getLogger(__name__)

load_dotenv()
BITCRAFT_EMAIL = os.getenv("BITCRAFT_EMAIL")
BITCRAFT_WSS_URL = os.getenv("BITCRAFT_WSS_URL")
BITCRAFT_TOKEN = os.getenv("BITCRAFT_TOKEN")

def save_to_env(key: str, value: str, env_file: str = ".env") -> None:
    """
    Alternative method using python-dotenv's set_key function.
    This preserves comments and formatting better.
    """
    success = set_key(env_file, key, value)
    if success:
        logger.info(f"Saved {key} to {env_file} using dotenv")
    else:
        logger.error(f"Failed to save {key} to {env_file}")


def get_bitcraft_token(save_token: bool = True) -> str | None:
    if BITCRAFT_TOKEN is not None:
        return BITCRAFT_TOKEN

    try:
        httpx.post(
            f"https://api.bitcraftonline.com/authentication/request-access-code?email={BITCRAFT_EMAIL}",
        )
        code = input("Wait for an email and enter the code:")
        r = httpx.post(
            "https://api.bitcraftonline.com/authentication/authenticate",
            params={"email": BITCRAFT_EMAIL, "accessCode": code},
        )
        token_data = r.json()

        token: str | None = None
        if isinstance(token_data, str):
            token = token_data
        elif isinstance(token_data, dict):
            # Try common keys
            for key in ("token", "accessToken", "access_token", "jwt", "id_token"):
                if key in token_data and isinstance(token_data[key], str):
                    token = token_data[key]
                    break

        if token is None:
            logger.error("BitCraft auth response didn't contain a token string")
            return None

        if save_token:
            save_to_env("BITCRAFT_TOKEN", token)

        return token

    except Exception:
        logger.exception("Failed to get BitCraft token")
        return None


def execute_query(query: str) -> dict | None:
    bc_token = get_bitcraft_token()
    if bc_token is None:
        logger.error("Failed to get BitCraft token")
        return None

    proto = Subprotocol("v1.json.spacetimedb")
    try:
        with connect(
            BITCRAFT_WSS_URL,
            additional_headers={"Authorization": "Bearer " + bc_token},
            subprotocols=[proto],
            max_size=None,
            max_queue=None,
        ) as ws:
            try:
                ws.recv()
            except ConnectionClosedError:
                logger.error("WebSocket closed while waiting for initial server frame")
                return None

            sub = json.dumps(dict(Subscribe=dict(request_id=1, query_strings=[query])))
            ws.send(sub)
            data = None
            try:
                for msg in ws:
                    data = json.loads(msg)
                    break
            except ConnectionClosedError:
                logger.error("WebSocket closed before receiving data for query: %s", query)
                return None
            finally:
                try:
                    ws.close()
                except Exception:
                    pass
        return data
    except Exception:
        logger.exception("Failed to execute BitCraft query over WebSocket")
        return None


def subscribe_to_query(query: str) -> None:
    bc_token = get_bitcraft_token()
    if bc_token is None:
        logger.error("Failed to get BitCraft token")
        return

    proto = Subprotocol("v1.json.spacetimedb")
    with connect(BITCRAFT_WSS_URL, additional_headers={"Authorization": "Bearer " + bc_token}, subprotocols=[proto], max_size=None, max_queue=None) as ws:
        ws.recv()
        sub = json.dumps(dict(Subscribe=dict(request_id=1, query_strings=[query])))
        ws.send(sub)
        try:
            for msg in ws:
                data = json.loads(msg)
                pprint(data)
        except KeyboardInterrupt:
            ws.close()
            return
        ws.close()


def subscribe_to_query_generator(query: str) -> Generator[Any, None, None]:
    """
    Generator version of subscribe_to_query that yields each websocket message.

    Usage:
        for message in subscribe_to_query_generator("SELECT * FROM player_state"):
            # Process each message
            print(message)
    """
    bc_token = get_bitcraft_token()
    if bc_token is None:
        logger.error("Failed to get BitCraft token")
        return

    proto = Subprotocol("v1.json.spacetimedb")
    with connect(BITCRAFT_WSS_URL, additional_headers={"Authorization": "Bearer " + bc_token}, subprotocols=[proto], max_size=None, max_queue=None) as ws:
        ws.recv()
        sub = json.dumps(dict(Subscribe=dict(request_id=1, query_strings=[query])))
        ws.send(sub)
        try:
            for msg in ws:
                data = json.loads(msg)
                yield data
        except KeyboardInterrupt:
            return
        finally:
            try:
                ws.close()
            except Exception:
                pass  # Connection might already be closed


def get_claims() -> dict | None:
    result_list: dict[int, dict] = {}
    result = execute_query("SELECT * FROM claim_state")
    claim_list = result["InitialSubscription"]["database_update"]["tables"][0]["updates"][0]["inserts"]
    for claim in claim_list:
        claim_obj = json.loads(claim)
        result_list[claim_obj["entity_id"]] = claim_obj
    return result_list


def get_claim_buildings() -> dict | None:
    result_list: dict[int, list[dict]] = {}
    result = execute_query("SELECT * FROM building_state")
    building_list = result["InitialSubscription"]["database_update"]["tables"][0]["updates"][0]["inserts"]
    if building_list:
        for building in building_list:
            building_obj = json.loads(building)
            claim_id = building_obj["claim_entity_id"]

            if claim_id not in result_list:
                result_list[claim_id] = []
            result_list[claim_id].append(building_obj)
    return result_list


def get_building_inventories() -> dict | None:
    building_inventories: dict[int, dict] = {}
    result = execute_query("SELECT * FROM inventory_state")
    inventory_list = result["InitialSubscription"]["database_update"]["tables"][0]["updates"][0]["inserts"]
    for inventory in inventory_list:
        inventory_obj = json.loads(inventory)
        building_id = inventory_obj["owner_entity_id"]
        building_inventories[building_id] = inventory_obj
    return building_inventories


def get_building_nicknames() -> dict | None:
    nickname_list = {}
    result = execute_query(f"SELECT * FROM building_nickname_state")
    result_list = result["InitialSubscription"]["database_update"]["tables"][0]["updates"][0]["inserts"]
    if result_list:
        for nickname in result_list:
            nickname_list[json.loads(nickname)["entity_id"]] = json.loads(nickname)["nickname"]
    return nickname_list


def get_user_id(username: str) -> dict | None:
    bc_token = get_bitcraft_token()
    if bc_token is None:
        logger.error("Failed to get BitCraft token")
        return None

    proto = Subprotocol("v1.json.spacetimedb")
    with connect(BITCRAFT_WSS_URL, additional_headers={"Authorization": "Bearer " + bc_token}, subprotocols=[proto], max_size=None, max_queue=None) as ws:
        ws.recv()
        sub = json.dumps(dict(Subscribe=dict(request_id=1, query_strings=[f"SELECT * FROM player_username_state where username='{username}'"])))
        ws.send(sub)
        for msg in ws:
            usernames = json.loads(msg)
            break
        ws.close()
    return usernames
