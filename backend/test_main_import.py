import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("Testing main.py import...")
    # This simulates what happens when the main.py file is imported
    from app.routers import registrations, admin, ingest, meta, indicators, activities, catalog, data_quality, files, database, name_review, chat_analysis, auth
    print("SUCCESS: All routers imported successfully")
    print(f"Auth router: {auth.router}")
    print(f"Auth routes: {[route.path for route in auth.router.routes]}")

    # Test individual auth module
    print("\nTesting auth module alone...")
    from app.routers.auth import router as auth_router
    print(f"Auth router direct: {auth_router}")
    print(f"Auth routes direct: {[route.path for route in auth_router.routes]}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()