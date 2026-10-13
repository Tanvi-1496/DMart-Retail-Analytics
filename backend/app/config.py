import os
from pathlib import Path
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load .env from backend root or project root
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BASE_DIR.parent

dotenv_path = BASE_DIR / ".env"
if not dotenv_path.exists():
    dotenv_path = PROJECT_DIR / ".env"

load_dotenv(dotenv_path=dotenv_path)

class Settings(BaseModel):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8443,http://127.0.0.1:8443")
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    DATA_DIR: str = os.getenv("DATA_DIR", str(PROJECT_DIR / "data"))
    SEED_ON_STARTUP: bool = os.getenv("SEED_ON_STARTUP", "true").lower() in ("true", "1", "yes")

    @property
    def resolved_data_dir(self) -> Path:
        p = Path(self.DATA_DIR)
        if not p.is_absolute():
            if (PROJECT_DIR / p).exists():
                return PROJECT_DIR / p
            if (BASE_DIR / p).exists():
                return BASE_DIR / p
            return (PROJECT_DIR / "data").resolve()
        return p.resolve()

settings = Settings()

