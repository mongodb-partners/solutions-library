#!/usr/bin/env python3
"""
Seed script to create the initial super_admin user.

Run this script after deploying the admin-api service for the first time.

Usage:
    python scripts/seed_admin.py

Environment variables (from .env or environment):
    MONGODB_URI - MongoDB connection string
    ADMIN_DB_NAME - Database name (default: admin_dashboard)
"""

import asyncio
import os
import sys
from datetime import datetime
import uuid

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def generate_admin_id() -> str:
    """Generate a unique admin ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_part = uuid.uuid4().hex[:8]
    return f"ADM_{timestamp}_{unique_part}"


async def seed_admin():
    """Create the initial super_admin user."""

    # Configuration
    mongodb_uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("ADMIN_DB_NAME", "admin_dashboard")

    if not mongodb_uri:
        print("ERROR: MONGODB_URI environment variable is required")
        sys.exit(1)

    # Default credentials (should be changed after first login)
    default_username = os.getenv("ADMIN_DEFAULT_USERNAME", "admin")
    default_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "Admin1234")
    default_email = os.getenv("ADMIN_DEFAULT_EMAIL", "admin@example.com")

    print(f"Connecting to MongoDB...")
    print(f"Database: {db_name}")

    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_uri)
    db = client[db_name]
    collection = db["admins"]

    try:
        # Check if admin already exists
        existing = await collection.find_one({"username": default_username})

        if existing:
            print(f"\nAdmin user '{default_username}' already exists.")
            print("If you need to reset the password, delete the user from MongoDB first.")
            return

        # Create admin document
        now = datetime.utcnow()
        admin_doc = {
            "admin_id": generate_admin_id(),
            "username": default_username,
            "email": default_email,
            "password_hash": hash_password(default_password),
            "role": "super_admin",
            "status": "active",
            "created_at": now,
            "updated_at": now,
            "created_by": None,
            "last_login": None,
            "failed_login_attempts": 0,
            "locked_until": None,
            "profile": {
                "display_name": "Administrator",
                "avatar_url": None,
            },
            "permissions": {
                "can_manage_admins": True,
                "can_manage_solutions": True,
                "can_view_analytics": True,
                "can_manage_settings": True,
            },
        }

        # Insert admin
        result = await collection.insert_one(admin_doc)

        print("\n" + "=" * 50)
        print("SUCCESS: Initial admin user created!")
        print("=" * 50)
        print(f"\nAdmin ID: {admin_doc['admin_id']}")
        print(f"Username: {default_username}")
        print(f"Password: {default_password}")
        print(f"Role: super_admin")
        print(f"\n*** IMPORTANT ***")
        print("Please change the password after first login!")
        print("=" * 50)

    except Exception as e:
        print(f"\nERROR: Failed to create admin user: {e}")
        sys.exit(1)

    finally:
        client.close()


if __name__ == "__main__":
    print("=" * 50)
    print("Admin Dashboard - Seed Script")
    print("=" * 50)

    asyncio.run(seed_admin())
