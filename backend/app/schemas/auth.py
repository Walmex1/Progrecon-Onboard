from pydantic import BaseModel

class LoginRequest(BaseModel):
    username: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    cost_center_ids: list[int] = []
