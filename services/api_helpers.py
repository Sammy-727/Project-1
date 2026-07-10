"""Shared API response helpers."""
from flask import jsonify


def api_error(message, status=400):
    return jsonify({"ok": False, "error": message}), status


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
