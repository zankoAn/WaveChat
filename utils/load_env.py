import environ

env = environ.Env()

environ.Env.read_env(env_file=".env")


class CONFIG:
    SECRET_KEY = env("SECRET_KEY", default="")  # type: ignore
    DEBUG = env.bool("DEBUG", default=False)  # type: ignore
    ALLOWED_HOSTS = env("ALLOWED_HOSTS", default="").split(",")  # type: ignore
    CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS", default="").split(",")  # type: ignore
    CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS", default="").split(",")  # type: ignore
