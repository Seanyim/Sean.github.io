import json
import os
from jinja2 import Environment, FileSystemLoader

# Configuration
DATA_DIR = '../data'
TEMPLATE_DIR = 'templates'
OUTPUT_DIR = '..'

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return [] # Return empty list/dict as appropriate in context, but mainly schemas dictate
    with open(filepath, 'r') as f:
        return json.load(f)

def build():
    print("🚀 Starting Build Agent...")
    
    # 1. Load Data Schema
    profile = load_json('profile.json')
    nav = load_json('navigation.json')
    projects = load_json('projects.json')
    blogs = load_json('blogs.json')
    tweets = load_json('tweets.json')
    
    # 2. Setup Template Engine
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    
    # 3. Instruction: Render Pages
    pages = [
        {'template': 'home.html', 'output': 'index.html', 'data': {'active_page': 'index'}},
        {'template': 'work.html', 'output': 'work.html', 'data': {'active_page': 'work', 'projects': projects}},
        {'template': 'blogs.html', 'output': 'blogs.html', 'data': {'active_page': 'blogs', 'blogs': blogs}},
        {'template': 'tweets.html', 'output': 'tweets.html', 'data': {'active_page': 'tweets', 'tweets': tweets}},
    ]
    
    for page in pages:
        template = env.get_template(page['template'])
        
        # Merge global data (profile, nav) with page-specific data
        context = {
            'profile': profile,
            'navigation': nav,
            **page['data']
        }
        
        output_content = template.render(**context)
        
        output_path = os.path.join(OUTPUT_DIR, page['output'])
        with open(output_path, 'w') as f:
            f.write(output_content)
            
        print(f"✅ Generated {page['output']}")

    print("✨ Build Complete.")

if __name__ == "__main__":
    # Ensure we are in the builder directory or adjusting paths correctly
    # Strategy: Script assumes it's run from 'builder/' directory based on relative paths
    # We will enforce CWD in the execution command.
    build()
