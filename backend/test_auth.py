try:
    from app.routers import auth
    print('SUCCESS: Auth module imported')
    print('Router:', auth.router)
    print('Routes:', [route.path for route in auth.router.routes])
except Exception as e:
    print('ERROR importing auth:', str(e))
    import traceback
    traceback.print_exc()