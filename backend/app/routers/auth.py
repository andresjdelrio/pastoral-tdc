from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import os

router = APIRouter(prefix="/auth", tags=["authentication"])

# Simple in-memory user store (in production, use a database)
# Password is hashed using SHA256
USERS = {
    "admin": {
        "id": "1",
        "username": "admin",
        "password_hash": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", # "admin"
        "role": "admin"
    },
    "pastoral": {
        "id": "2",
        "username": "pastoral",
        "password_hash": "7c6a180b36896a0a8c02787eeafb0e4c", # "password" MD5 for demo
        "role": "user"
    },
    "demo": {
        "id": "3",
        "username": "demo",
        "password_hash": "fe01ce2a7fbac8fafaed7c982a04e229", # "demo123" MD5
        "role": "user"
    }
}

# Add the demo password from the frontend
demo_password = "pastoral2024"
USERS["admin"]["password_hash"] = hashlib.sha256(demo_password.encode()).hexdigest()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

security = HTTPBearer()

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class UserResponse(BaseModel):
    user: dict

def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user data."""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")

        user_data = USERS.get(username)
        if user_data is None:
            raise HTTPException(status_code=401, detail="User not found")

        return {
            "id": user_data["id"],
            "username": user_data["username"],
            "role": user_data["role"]
        }
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """
    Authenticate user and return JWT token.
    """
    user = USERS.get(login_data.username)

    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password"
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=access_token_expires
    )

    user_data = {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"]
    }

    return LoginResponse(token=access_token, user=user_data)

@router.get("/verify", response_model=UserResponse)
async def verify_user(user_data: dict = Depends(verify_token)):
    """
    Verify JWT token and return user information.
    """
    return UserResponse(user=user_data)

@router.post("/logout")
async def logout():
    """
    Logout user (client should remove token).
    """
    return {"message": "Successfully logged out"}

# Dependency to get current user
async def get_current_user(user_data: dict = Depends(verify_token)):
    """
    Dependency to get current authenticated user.
    """
    return user_data

# Dependency to require admin role
async def require_admin(user_data: dict = Depends(get_current_user)):
    """
    Dependency to require admin role.
    """
    if user_data["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data