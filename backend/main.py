import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("[STARTUP DEBUG] Backend is starting up with timestamp 2025-09-28T16:29:56 - DEBUGGING AUTH")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from app.database import engine
from app.models import Base
from app.routers import registrations, admin, ingest, meta, indicators, activities, catalog, data_quality, files, database, name_review, chat_analysis, auth

print("DEBUG: All routers imported successfully")
print(f"DEBUG: Auth router: {auth.router}")
print(f"DEBUG: Auth routes: {[route.path for route in auth.router.routes]}")

app = FastAPI(
    title="Event Registration Management Platform",
    description="Platform for managing registrations and participation in in-person events",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5176", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router, prefix="/api", tags=["authentication"])
print("DEBUG: Auth router included successfully")
app.include_router(registrations.router, prefix="/api/registrations", tags=["registrations"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(meta.router, prefix="/api/meta", tags=["metadata"])
app.include_router(indicators.router, prefix="/api", tags=["indicators"])
app.include_router(activities.router, prefix="/api", tags=["activities"])
app.include_router(catalog.router, prefix="/api", tags=["catalog"])
app.include_router(data_quality.router, prefix="/api", tags=["data-quality"])
app.include_router(files.router, prefix="/api", tags=["files"])
app.include_router(database.router, prefix="/api", tags=["database"])
app.include_router(name_review.router, prefix="/api", tags=["name-review"])
app.include_router(chat_analysis.router, prefix="/api", tags=["chat-analysis"])

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"message": "Event Registration Management Platform API"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint with basic system information.
    """
    import time
    from datetime import datetime

    return {
        "status": "healthy",
        "message": "Event Registration Management Platform API is running",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "uptime": f"{time.time():.2f} seconds"
    }

# Simple authentication endpoints
from fastapi import HTTPException
from pydantic import BaseModel
import jwt
from datetime import timedelta
import hashlib
import os

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

# Simple user store
USERS = {
    "admin": {
        "id": "1",
        "username": "admin",
        "password_hash": hashlib.sha256("pastoral2024".encode()).hexdigest(),
        "role": "admin"
    }
}

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Authenticate user and return JWT token."""
    user = USERS.get(login_data.username)

    if not user or hashlib.sha256(login_data.password.encode()).hexdigest() != user["password_hash"]:
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    # Create access token
    from datetime import datetime
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": user["username"], "exp": expire}
    access_token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    user_data = {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"]
    }

    return LoginResponse(token=access_token, user=user_data)

# User Management Models
class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "user"

class UpdateUserRequest(BaseModel):
    username: str
    role: str
    password: str = None

class UserResponse(BaseModel):
    id: str
    username: str
    role: str

# Helper function to verify admin token
from fastapi import Header
def verify_admin_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = USERS.get(username)
        if not user or user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# User Management Endpoints
@app.get("/api/auth/users")
async def get_users(authorization: str = Header(None)):
    """Get all users (admin only)."""
    verify_admin_token(authorization)
    return [{"id": u["id"], "username": u["username"], "role": u["role"]} for u in USERS.values()]

@app.post("/api/auth/users", response_model=UserResponse)
async def create_user(user_data: CreateUserRequest, authorization: str = Header(None)):
    """Create a new user (admin only)."""
    verify_admin_token(authorization)

    if user_data.username in USERS:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Generate new user ID
    new_id = str(len(USERS) + 1)

    # Hash password
    password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()

    # Create user
    new_user = {
        "id": new_id,
        "username": user_data.username,
        "password_hash": password_hash,
        "role": user_data.role
    }

    USERS[user_data.username] = new_user

    return UserResponse(id=new_id, username=user_data.username, role=user_data.role)

@app.put("/api/auth/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UpdateUserRequest, authorization: str = Header(None)):
    """Update a user (admin only)."""
    verify_admin_token(authorization)

    # Find user by ID
    user_to_update = None
    old_username = None
    for username, user in USERS.items():
        if user["id"] == user_id:
            user_to_update = user
            old_username = username
            break

    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if new username already exists (if different)
    if user_data.username != old_username and user_data.username in USERS:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Update user data
    updated_user = user_to_update.copy()
    updated_user["username"] = user_data.username
    updated_user["role"] = user_data.role

    if user_data.password:
        updated_user["password_hash"] = hashlib.sha256(user_data.password.encode()).hexdigest()

    # Remove old username key and add new one
    if old_username != user_data.username:
        del USERS[old_username]
    USERS[user_data.username] = updated_user

    return UserResponse(id=user_id, username=user_data.username, role=user_data.role)

@app.delete("/api/auth/users/{user_id}")
async def delete_user(user_id: str, authorization: str = Header(None)):
    """Delete a user (admin only)."""
    verify_admin_token(authorization)

    # Find and remove user by ID
    username_to_delete = None
    for username, user in USERS.items():
        if user["id"] == user_id:
            username_to_delete = username
            break

    if not username_to_delete:
        raise HTTPException(status_code=404, detail="User not found")

    if username_to_delete == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")

    del USERS[username_to_delete]
    return {"message": "User deleted successfully"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)