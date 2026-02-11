from fastapi import FastAPI, Request, Form, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, JSONResponse
import json
import os
import shutil
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
    # Trigger Static Sync
    regenerate_static_site()

def get_common_context(active_page: str):
    return {
        "request": {}, 
        "profile": load_json("profile.json"),
        "navigation": load_json("navigation.json"),
        "active_page": active_page
    }

# --- Static Site Generation ---
def regenerate_static_site():
    """Render all public pages to static HTML files in root."""
    print("🔄 Regenerating static site...")
    
    pages = [
        ("index.html", "home.html", "index"),
        ("work.html", "work.html", "work"),
        ("blogs.html", "blogs.html", "blogs"),
        ("tweets.html", "tweets.html", "tweets")
    ]
    
    # Pre-fetch data once
    context_base = get_common_context("index") # Active page overwritten in loop
    data_map = {
        "projects": load_json("projects.json"),
        "blogs": load_json("blogs.json"),
        "tweets": load_json("tweets.json")
    }

    for output_file, template_name, page_id in pages:
        # Prepare context
        ctx = context_base.copy()
        ctx["active_page"] = page_id
        # Inject data needed for specific pages
        if page_id == "work": ctx["projects"] = data_map["projects"]
        if page_id == "blogs": ctx["blogs"] = data_map["blogs"]
        if page_id == "tweets": ctx["tweets"] = data_map["tweets"]
        
        # Mock request object for url_for
        # We need a custom url_for that returns relative paths or absolute URLs for static generation
        # For simplicity, we assume Jinja templates use {{ url_for('static', path='...') }} which resolves nicely if we mock it,
        # OR we just use relative paths in templates.
        # BUT FastAPI's url_for requires a request.
        # Solution: Use a dummy request and hack/ensure templates work.
        # actually, templates.TemplateResponse does the rendering. 
        # We can explicitly render using jinja env.
        
        template = templates.get_template(template_name)
        # Mock request object for url_for
        ctx["request"] = Request(scope={"type": "http"})
        rendered_html = template.render(**ctx)
        
        with open(output_file, "w") as f:
            f.write(rendered_html)
            
    print("✅ Static site regenerated.")

# --- Public Routes ---

@app.get("/")
async def home(request: Request):
    context = get_common_context("index")
    context["request"] = request
    return templates.TemplateResponse("home.html", context)

@app.get("/index.html")
async def home_redirect(): return RedirectResponse("/")

@app.get("/work")
async def work(request: Request):
    context = get_common_context("work")
    context["request"] = request
    context["projects"] = load_json("projects.json")
    return templates.TemplateResponse("work.html", context)

@app.get("/work.html")
async def work_redirect(): return RedirectResponse("/work")

@app.get("/blogs")
async def blogs(request: Request):
    context = get_common_context("blogs")
    context["request"] = request
    context["blogs"] = load_json("blogs.json")
    return templates.TemplateResponse("blogs.html", context)

@app.get("/blogs.html")
async def blogs_redirect(): return RedirectResponse("/blogs")

@app.get("/tweets")
async def tweets(request: Request):
    context = get_common_context("tweets")
    context["request"] = request
    context["tweets"] = load_json("tweets.json")
    return templates.TemplateResponse("tweets.html", context)

@app.get("/tweets.html")
async def tweets_redirect(): return RedirectResponse("/tweets")

# --- Admin Routes ---

@app.get("/admin")
async def admin(request: Request):
    context = get_common_context("admin")
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

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save to assets/uploads
    filename = f"{int(datetime.now().timestamp())}_{file.filename}"
    filepath = os.path.join(ASSETS_DIR, "uploads", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/assets/uploads/{filename}", "filename": filename}

@app.post("/api/upload/avatar")
async def upload_avatar(file: UploadFile = File(...)):
    # Save to assets/img/avatar.jpg (overwrite)
    # Ensure assets/img exists
    os.makedirs(os.path.join(ASSETS_DIR, "img"), exist_ok=True)
    
    ext = file.filename.split('.')[-1]
    filename = f"avatar.{ext}" # Or just avatar.jpg if we force it
    filepath = os.path.join(ASSETS_DIR, "img", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update profile.json to point to new avatar
    profile = load_json("profile.json")
    profile["avatar_url"] = f"/assets/img/{filename}"
    save_json("profile.json", profile)
    
    return {"url": f"/assets/img/{filename}"}

if __name__ == "__main__":
    import uvicorn
    # Initial build on startup to ensure consistency
    regenerate_static_site()
    print("🚀 Starting Server at http://localhost:8000")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
