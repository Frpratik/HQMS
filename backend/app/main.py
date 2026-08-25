import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("hqms")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup initialization and shutdown cleanup.
    """
    logger.info("Initializing HQMS Backend Service...")
    logger.info(f"Environment: {settings.ENVIRONMENT} | Debug: {settings.DEBUG}")
    # Startup tasks (DB connection check / redis pool init) can happen here
    yield
    # Shutdown tasks
    logger.info("Shutting down HQMS Backend Service...")


def create_application() -> FastAPI:
    """
    Factory creating configured FastAPI instance.
    """
    application = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Set all CORS enabled origins
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Include API Routers
    application.include_router(api_router, prefix=settings.API_V1_STR)

    # Include WebSocket Router
    from app.websockets.router import ws_router
    application.include_router(ws_router)

    @application.get("/", tags=["Root"])

    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": "0.1.0",
            "docs": f"{settings.API_V1_STR}/docs",
            "status": "online",
        }

    return application


app = create_application()
