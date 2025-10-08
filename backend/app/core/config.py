from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Define API keys for the supported AI providers
    # These will be loaded from environment variables or a .env file
    OPENAI_API_KEY: str = "default_key_if_not_set"
    ANTHROPIC_API_KEY: str = "default_key_if_not_set"
    DEEPSEEK_API_KEY: str = "default_key_if_not_set"

    # This tells pydantic to load variables from a .env file
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8')

# Create a single, importable instance of the settings
settings = Settings()