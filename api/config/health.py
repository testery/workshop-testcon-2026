from django.db import connection, DatabaseError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    try:
        connection.close()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        db_ok = True
        db_error = None
    except (DatabaseError, OSError) as exc:
        db_ok = False
        db_error = str(exc)

    status_code = 200 if db_ok else 503
    return Response(
        {
            "status": "ok" if db_ok else "degraded",
            "server": "ok",
            "database": "ok" if db_ok else "error",
            "database_error": db_error,
        },
        status=status_code,
    )
