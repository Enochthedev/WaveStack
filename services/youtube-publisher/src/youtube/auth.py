"""
YouTube OAuth Authentication
"""
import json
from pathlib import Path
import logging
from typing import Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from ..config import settings

logger = logging.getLogger(__name__)


class YouTubeAuth:
    """Handle YouTube OAuth authentication"""

    def __init__(self, org_id: str):
        self.org_id = org_id
        self.credentials_path = Path(settings.CREDENTIALS_DIR) / f"{org_id}_youtube.json"
        self.credentials: Optional[Credentials] = None

    def get_credentials(self) -> Optional[Credentials]:
        """Get stored credentials if they exist and are valid"""
        if self.credentials and self.credentials.valid:
            return self.credentials

        # Load from file
        if self.credentials_path.exists():
            with open(self.credentials_path, 'r') as f:
                cred_data = json.load(f)

            self.credentials = Credentials(
                token=cred_data.get('token'),
                refresh_token=cred_data.get('refresh_token'),
                token_uri=cred_data.get('token_uri'),
                client_id=cred_data.get('client_id'),
                client_secret=cred_data.get('client_secret'),
                scopes=cred_data.get('scopes'),
            )

            # Refresh if expired
            if self.credentials.expired and self.credentials.refresh_token:
                from google.auth.transport.requests import Request
                self.credentials.refresh(Request())
                self._save_credentials()

            return self.credentials

        return None

    def get_authorization_url(self) -> str:
        """
        Get OAuth authorization URL

        User must visit this URL to authorize the app
        """
        if not settings.YOUTUBE_CLIENT_ID or not settings.YOUTUBE_CLIENT_SECRET:
            raise ValueError("YouTube OAuth credentials not configured")

        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.YOUTUBE_CLIENT_ID,
                    "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.YOUTUBE_REDIRECT_URI],
                }
            },
            scopes=settings.YOUTUBE_SCOPES,
        )

        flow.redirect_uri = settings.YOUTUBE_REDIRECT_URI

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'  # Force consent to get refresh token
        )

        # Store state for verification
        state_path = Path(settings.CREDENTIALS_DIR) / f"{self.org_id}_state.txt"
        state_path.parent.mkdir(parents=True, exist_ok=True)
        with open(state_path, 'w') as f:
            f.write(state)

        logger.info(f"Authorization URL generated for org {self.org_id}")
        return authorization_url

    def exchange_code(self, code: str, state: str) -> bool:
        """
        Exchange authorization code for credentials

        Args:
            code: Authorization code from OAuth callback
            state: State parameter for verification

        Returns:
            True if successful
        """
        # Verify state
        state_path = Path(settings.CREDENTIALS_DIR) / f"{self.org_id}_state.txt"
        if state_path.exists():
            with open(state_path, 'r') as f:
                stored_state = f.read()

            if stored_state != state:
                logger.error(f"State mismatch for org {self.org_id}")
                return False

        # Create flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.YOUTUBE_CLIENT_ID,
                    "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.YOUTUBE_REDIRECT_URI],
                }
            },
            scopes=settings.YOUTUBE_SCOPES,
        )

        flow.redirect_uri = settings.YOUTUBE_REDIRECT_URI

        # Exchange code for credentials
        try:
            flow.fetch_token(code=code)
            self.credentials = flow.credentials
            self._save_credentials()

            logger.info(f"✅ YouTube credentials obtained for org {self.org_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to exchange code: {e}")
            return False

    def _save_credentials(self):
        """Save credentials to file"""
        self.credentials_path.parent.mkdir(parents=True, exist_ok=True)

        cred_data = {
            'token': self.credentials.token,
            'refresh_token': self.credentials.refresh_token,
            'token_uri': self.credentials.token_uri,
            'client_id': self.credentials.client_id,
            'client_secret': self.credentials.client_secret,
            'scopes': self.credentials.scopes,
        }

        with open(self.credentials_path, 'w') as f:
            json.dump(cred_data, f)

        logger.info(f"Credentials saved for org {self.org_id}")

    def revoke_credentials(self):
        """Revoke and delete stored credentials"""
        if self.credentials_path.exists():
            self.credentials_path.unlink()
            logger.info(f"Credentials revoked for org {self.org_id}")

    def get_youtube_service(self):
        """
        Get authenticated YouTube API service

        Returns:
            YouTube API service instance
        """
        credentials = self.get_credentials()

        if not credentials:
            raise ValueError(f"No credentials found for org {self.org_id}")

        service = build('youtube', 'v3', credentials=credentials)

        return service

    def is_authenticated(self) -> bool:
        """Check if user has valid credentials"""
        credentials = self.get_credentials()
        return credentials is not None and credentials.valid
