from python.helpers import dotenv
import hashlib
import hmac
import secrets


# Use a static salt derived from credentials for session hashing
# This provides consistent hashes across server restarts while being unique per deployment
def _get_derived_salt(user: str) -> bytes:
    """
    Generate a deterministic salt based on the username.
    This ensures consistent session tokens across server restarts.
    """
    # Use PBKDF2 to derive a salt from the username
    return hashlib.pbkdf2_hmac(
        'sha256',
        user.encode('utf-8'),
        b'agent_zero_salt_derivation_v1',
        iterations=1000
    )


def get_credentials_hash():
    """
    Generate a secure hash of credentials for session validation.
    Uses PBKDF2 with a derived salt for better security than plain SHA256.
    """
    user = dotenv.get_dotenv_value("AUTH_LOGIN")
    password = dotenv.get_dotenv_value("AUTH_PASSWORD")
    if not user:
        return None

    # Use PBKDF2 for secure password-based key derivation
    salt = _get_derived_salt(user)
    credentials = f"{user}:{password}".encode('utf-8')

    # PBKDF2 with 100,000 iterations (OWASP recommendation)
    derived_key = hashlib.pbkdf2_hmac(
        'sha256',
        credentials,
        salt,
        iterations=100000
    )
    return derived_key.hex()


def verify_credentials(submitted_user: str, submitted_password: str) -> bool:
    """
    Securely verify submitted credentials against stored credentials.
    Uses constant-time comparison to prevent timing attacks.
    """
    stored_user = dotenv.get_dotenv_value("AUTH_LOGIN")
    stored_password = dotenv.get_dotenv_value("AUTH_PASSWORD")

    if not stored_user:
        return False

    # Use constant-time comparison to prevent timing attacks
    user_match = hmac.compare_digest(submitted_user, stored_user)
    password_match = hmac.compare_digest(submitted_password, stored_password or "")

    return user_match and password_match


def is_login_required():
    user = dotenv.get_dotenv_value("AUTH_LOGIN")
    return bool(user)
