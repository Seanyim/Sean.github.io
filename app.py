from fastapi import FastAPI, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, JSONResponse
import json
import os
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

# Configuration
DATA_DIR = "data"
TEMPLATES_DIR = "templates"
ASSETS_DIR = "assets"

# Mount Static Files
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# Templates
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Helper Functions
def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    with open(filepath, "r") as f:
        return json.load(f)

def save_json(filename, data):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=4)

def get_common_context(active_page: str):
    return {
        "request": {}, # Placeholder, overridden in route
        "profile": load_json("profile.json"),
        "navigation": load_json("navigation.json"),
        "active_page": active_page
    }

# --- Public Routes ---

@app.get("/")
async def home(request: Request):
    context = get_common_context("index")
    context["request"] = request
    return templates.TemplateResponse("home.html", context)

@app.get("/index.html")
async def home_redirect():
    return RedirectResponse("/")

@app.get("/work")
async def work(request: Request):
    context = get_common_context("work")
    context["request"] = request
    context["projects"] = load_json("projects.json")
    return templates.TemplateResponse("work.html", context)

@app.get("/work.html")
async def work_redirect():
    return RedirectResponse("/work")

@app.get("/blogs")
async def blogs(request: Request):
    context = get_common_context("blogs")
    context["request"] = request
    context["blogs"] = load_json("blogs.json")
    return templates.TemplateResponse("blogs.html", context)

@app.get("/blogs.html")
async def blogs_redirect():
    return RedirectResponse("/blogs")

@app.get("/tweets")
async def tweets(request: Request):
    context = get_common_context("tweets")
    context["request"] = request
    context["tweets"] = load_json("tweets.json")
    return templates.TemplateResponse("tweets.html", context)

@app.get("/tweets.html")
async def tweets_redirect():
    return RedirectResponse("/tweets")

# --- Admin Routes ---

@app.get("/admin")
async def admin(request: Request):
    context = get_common_context("admin") # No active nav highlight for admin
    context["request"] = request
    context["projects"] = load_json("projects.json")
    context["blogs"] = load_json("blogs.json")
    context["tweets"] = load_json("tweets.json")
    return templates.TemplateResponse("admin.html", context)

# --- API Endpoints ---

class ProfileUpdate(BaseModel):
    name: str
    tagline: str
    about: str
    avatar_url: str
    github_link: str
    linkedin_link: str

@app.post("/api/save/profile")
async def save_profile(data: ProfileUpdate):
    save_json("profile.json", data.model_dump())
    return {"status": "success"}

@app.post("/api/save/blogs")
async def save_blogs(data: List[dict]):
    save_json("blogs.json", data)
    return {"status": "success"}

@app.post("/api/save/projects")
async def save_projects(data: List[dict]):
    save_json("projects.json", data)
    return {"status": "success"}

@app.post("/api/save/tweets")
async def save_tweets(data: List[dict]):
    save_json("tweets.json", data)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Server at http://localhost:8000")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
