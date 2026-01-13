import os
from python.helpers.api import ApiHandler, Input, Output, Request, Response
from python.helpers import files, runtime
from typing import TypedDict


# Sensitive file patterns that should never be accessed via API
BLOCKED_PATTERNS = [
    '.env', 'secrets.env', '.git', '.ssh', 'id_rsa', 'id_ed25519',
    'credentials', 'password', '.pem', '.key', 'shadow', 'passwd'
]


def is_path_safe(path: str, base_dir: str) -> bool:
    """
    Validate that a path is safe to access.
    Returns True if path is within base_dir and not a sensitive file.
    """
    try:
        # Resolve the real path (handles symlinks and ..)
        real_path = os.path.realpath(path)
        real_base = os.path.realpath(base_dir)

        # Check if resolved path is within the base directory
        if not real_path.startswith(real_base + os.sep) and real_path != real_base:
            return False

        # Check for sensitive file patterns
        path_lower = real_path.lower()
        for pattern in BLOCKED_PATTERNS:
            if pattern in path_lower:
                return False

        return True
    except (OSError, ValueError):
        return False


class FileInfoApi(ApiHandler):
    async def process(self, input: Input, request: Request) -> Output:
        path = input.get("path", "")
        info = await runtime.call_development_function(get_file_info, path)
        return info

class FileInfo(TypedDict):
    input_path: str
    abs_path: str
    exists: bool
    is_dir: bool
    is_file: bool
    is_link: bool
    size: int
    modified: float
    created: float
    permissions: int
    dir_path: str
    file_name: str
    file_ext: str
    message: str

async def get_file_info(path: str) -> FileInfo:
    abs_path = files.get_abs_path(path)
    base_dir = files.get_base_dir()

    # Security: Validate path is within allowed directory
    if not is_path_safe(abs_path, base_dir):
        return {
            "input_path": path,
            "abs_path": "",
            "exists": False,
            "is_dir": False,
            "is_file": False,
            "is_link": False,
            "size": 0,
            "modified": 0,
            "created": 0,
            "permissions": 0,
            "dir_path": "",
            "file_name": "",
            "file_ext": "",
            "message": "Access denied - path outside allowed directory or blocked"
        }

    exists = os.path.exists(abs_path)
    message = ""

    if not exists:
        message = f"File {path} not found."

    return {
        "input_path": path,
        "abs_path": abs_path,
        "exists": exists,
        "is_dir": os.path.isdir(abs_path) if exists else False,
        "is_file": os.path.isfile(abs_path) if exists else False,
        "is_link": os.path.islink(abs_path) if exists else False,
        "size": os.path.getsize(abs_path) if exists else 0,
        "modified": os.path.getmtime(abs_path) if exists else 0,
        "created": os.path.getctime(abs_path) if exists else 0,
        "permissions": os.stat(abs_path).st_mode if exists else 0,
        "dir_path": os.path.dirname(abs_path),
        "file_name": os.path.basename(abs_path),
        "file_ext": os.path.splitext(abs_path)[1],
        "message": message
    }