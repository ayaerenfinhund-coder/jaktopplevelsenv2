from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_dogs(current_user: dict = Depends(get_current_user)):
    return []

@router.post("/", response_model=dict)
async def create_dog(dog: dict, current_user: dict = Depends(get_current_user)):
    return dog

@router.put("/{dog_id}", response_model=dict)
async def update_dog(dog_id: str, dog: dict, current_user: dict = Depends(get_current_user)):
    return dog

@router.delete("/{dog_id}")
async def delete_dog(dog_id: str, current_user: dict = Depends(get_current_user)):
    return {"status": "success"}
