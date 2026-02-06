import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .database import engine, Base
from .routers import auth, users, market, ai, finance

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

@app.get("/")
def read_root():
    return {"message": "Welcome to Krishi-Drishti Backend API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
