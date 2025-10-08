from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Correct, absolute imports for all routers
from app.api import model_routes, audio_routes, evaluation_routes, ai_routes, export_routes

app = FastAPI(
    title="Universal ASC Model Evaluator",
    description="A comprehensive platform for evaluating audio scene classification models.",
    version="1.0.0",
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(model_routes.router, prefix="/api/model")
app.include_router(audio_routes.router, prefix="/api/audio")
app.include_router(evaluation_routes.router, prefix="/api/evaluation")
app.include_router(ai_routes.router, prefix="/api/ai")
app.include_router(export_routes.router, prefix="/api/export")

@app.get("/", tags=["General"])
def read_root():
    return {"message": "Welcome to the Universal ASC Model Evaluator API"}

@app.get("/api/health", tags=["General"])
def get_health_status():
    return {"status": "ok"}