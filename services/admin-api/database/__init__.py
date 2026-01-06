"""Database module for MongoDB connection and index management."""

from database.connection import (
    MongoDB,
    Collections,
    get_database,
    get_admins_collection,
    get_sessions_collection,
    get_audit_collection,
)
from database.indexes import create_indexes

__all__ = [
    "MongoDB",
    "Collections",
    "get_database",
    "get_admins_collection",
    "get_sessions_collection",
    "get_audit_collection",
    "create_indexes",
]
