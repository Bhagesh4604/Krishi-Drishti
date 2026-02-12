import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .database import engine, Base
from .routers import auth, users, market, ai, finance, weather, news, schemes, community, plots, carbon, contracts, insurance

load_dotenv()

# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Krishi-Drishti API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(market.router)
app.include_router(ai.router)
app.include_router(finance.router)
app.include_router(weather.router)
app.include_router(news.router)
app.include_router(schemes.router)
app.include_router(community.router)
app.include_router(plots.router)
app.include_router(carbon.router)
app.include_router(contracts.router)
app.include_router(insurance.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Krishi-Drishti Backend API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
