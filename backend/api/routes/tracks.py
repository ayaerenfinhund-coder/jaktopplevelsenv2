from fastapi import APIRouter, Depends
from api.deps import get_current_user

router = APIRouter()

@router.get("/")
async def get_tracks(current_user: dict = Depends(get_current_user)):
    return []
