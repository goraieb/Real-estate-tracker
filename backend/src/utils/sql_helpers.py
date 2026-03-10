"""SQL utility functions for safe query construction."""


def escape_like(value: str) -> str:
    """Escape SQL LIKE wildcard characters for safe pattern matching.

    Escapes %, _, and \\ so user input cannot manipulate LIKE patterns.
    Use with ``ESCAPE '\\'`` in the SQL LIKE clause.
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
