"""Shared API response helpers."""
from datetime import datetime, timezone

from flask import jsonify, request


def api_structured_error(message, status=400, path=None):
    """Consistent JSON error payload for API clients."""
    return jsonify(
        {
            "ok": False,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": status,
            "message": message,
            "error": message,
            "path": path or (request.path if request else ""),
        }
    ), status


def api_error(message, status=400):
    return api_structured_error(message, status)


def api_unauthorized(message="Authentication required."):
    return api_structured_error(message, 401)


def api_forbidden(message="Access denied."):
    return api_structured_error(message, 403)


def api_ok(**payload):
    return jsonify({"ok": True, **payload})


def paginated_api_response(items_key, rows, mapper, total, page, size):
    mapped = [mapper(r) for r in rows]
    return api_ok(
        **{
            items_key: mapped,
            "total": total,
            "page": page,
            "size": size,
            "showing": len(mapped),
        }
    )
