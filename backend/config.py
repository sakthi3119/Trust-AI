from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./trustai.db"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    SECRET_KEY: str = "trustai-hackathon-secret-key"

    class Config:
        env_file = ".env"

settings = Settings()
    