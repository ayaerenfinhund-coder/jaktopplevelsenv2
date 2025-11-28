from fastapi import APIRouter, Depends
from api.deps import get_current_user

router = APIRouter()

@router.get("/")
async def export_data(format: str = "json", current_user: dict = Depends(get_current_user)):
    return {"status": "not implemented"}
