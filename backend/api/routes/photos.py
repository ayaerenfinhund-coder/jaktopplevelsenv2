from fastapi import APIRouter, Depends, UploadFile, File
from api.deps import get_current_user

router = APIRouter()

@router.post("/upload")
async def upload_photo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    return {"filename": file.filename}

@router.delete("/{photo_id}")
async def delete_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    return {"status": "success"}
