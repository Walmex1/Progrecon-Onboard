from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Progrecon Onboard"
    DATABASE_URL: str = "sqlite:///./progrecon.db"
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 175200

    class Config:
        env_file = ".env"

settings = Settings()
