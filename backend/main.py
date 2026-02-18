from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
import os
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor
import google.generativeai as genai
from datetime import datetime

app = FastAPI(title="LearnAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

DB_PATH = "learnai.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT,
        score REAL,
        total INTEGER,
        user_id TEXT,
        timestamp TEXT
    )''')
    conn.commit()
    conn.close()

init_db()

def get_model():
    for model_name in ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro']:
        try:
            return genai.GenerativeModel(model_name)
        except Exception:
            continue
    return genai.GenerativeModel('gemini-1.5-flash')

# ── Models ─────────────────────────────────────────────────────────────────────

class TopicRequest(BaseModel):
    topic: str

class PathRequest(BaseModel):
    topic: str
    videos: List[dict]
    courses: List[dict]
    duration: int

class QuizSubmission(BaseModel):
    topic: str
    answers: List[dict]
    user_id: str

# ── Free course platforms ──────────────────────────────────────────────────────

COURSE_DOMAINS = [
    ('coursera.org', 'Coursera'),
    ('edx.org', 'edX'),
    ('khanacademy.org', 'Khan Academy'),
    ('freecodecamp.org', 'freeCodeCamp'),
    ('codecademy.com', 'Codecademy'),
    ('udacity.com', 'Udacity'),
    ('ocw.mit.edu', 'MIT OpenCourseWare'),
    ('mit.edu', 'MIT OpenCourseWare'),
    ('developer.mozilla.org', 'MDN Web Docs'),
    ('w3schools.com', 'W3Schools'),
    ('tutorialspoint.com', 'Tutorialspoint'),
    ('geeksforgeeks.org', 'GeeksforGeeks'),
    ('realpython.com', 'Real Python'),
    ('kaggle.com', 'Kaggle'),
    ('fast.ai', 'Fast.ai'),
    ('theodinproject.com', 'The Odin Project'),
    ('javascript.info', 'JavaScript.info'),
    ('learnpython.org', 'LearnPython'),
    ('cs50.harvard.edu', 'Harvard CS50'),
    ('fullstackopen.com', 'Full Stack Open'),
    ('eloquentjavascript.net', 'Eloquent JavaScript'),
    ('leetcode.com', 'LeetCode'),
    ('hackerrank.com', 'HackerRank'),
    ('datacamp.com', 'DataCamp'),
    ('brilliant.org', 'Brilliant'),
]

def extract_youtube_id(url: str) -> Optional[str]:
    patterns = [
        r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
        r'youtu\.be/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None

def _search_youtube_videos(topic: str) -> List[dict]:
    """Search YouTube via DuckDuckGo text search (no API key needed)."""
    videos = []
    try:
        from duckduckgo_search import DDGS
        queries = [
            f"{topic} tutorial beginner site:youtube.com",
            f"{topic} full course youtube",
            f"learn {topic} youtube tutorial",
        ]
        seen_urls = set()
        for query in queries:
            try:
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, region="wt-wt", safesearch="moderate", max_results=8))
                for r in results:
                    url = r.get('href', '')
                    if ('youtube.com/watch' in url or 'youtu.be/' in url) and url not in seen_urls:
                        seen_urls.add(url)
                        vid_id = extract_youtube_id(url)
                        thumbnail = f"https://img.youtube.com/vi/{vid_id}/mqdefault.jpg" if vid_id else ''
                        title = r.get('title', '').replace(' - YouTube', '').strip()
                        videos.append({
                            'title': title,
                            'url': url,
                            'thumbnail': thumbnail,
                            'description': r.get('body', '')[:300],
                            'platform': 'YouTube',
                            'type': 'video',
                            'video_id': vid_id or '',
                        })
                if len(videos) >= 8:
                    break
            except Exception as e:
                print(f"DDG query error for '{query}': {e}")
                continue
    except ImportError:
        print("duckduckgo_search not installed")
    except Exception as e:
        print(f"YouTube search error: {e}")
    return videos[:8]


def _search_free_courses(topic: str) -> List[dict]:
    """Search free courses via DuckDuckGo text search."""
    courses = []
    try:
        from duckduckgo_search import DDGS
        queries = [
            f"{topic} free course tutorial online learn",
            f"{topic} coursera edx khanacademy free course",
            f"{topic} freecodecamp w3schools geeksforgeeks tutorial",
            f"learn {topic} free beginner course",
        ]
        seen_urls = set()
        for query in queries:
            try:
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, region="wt-wt", safesearch="moderate", max_results=15))
                for r in results:
                    href = r.get('href', '')
                    if href in seen_urls or 'youtube.com' in href:
                        continue
                    for domain, platform in COURSE_DOMAINS:
                        if domain in href:
                            seen_urls.add(href)
                            courses.append({
                                'title': r.get('title', ''),
                                'url': href,
                                'description': r.get('body', '')[:300],
                                'platform': platform,
                                'type': 'course',
                                'free': True,
                            })
                            break
                if len(courses) >= 10:
                    break
            except Exception as e:
                print(f"DDG course query error for '{query}': {e}")
                continue
    except ImportError:
        print("duckduckgo_search not installed")
    except Exception as e:
        print(f"Course search error: {e}")
    return courses[:10]


executor = ThreadPoolExecutor(max_workers=4)

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "LearnAI API running"}


@app.post("/api/search-resources")
async def search_resources(req: TopicRequest):
    """Search YouTube videos and free courses for a topic (no Gemini used)."""
    try:
        loop = asyncio.get_event_loop()
        videos_future = loop.run_in_executor(executor, _search_youtube_videos, req.topic)
        courses_future = loop.run_in_executor(executor, _search_free_courses, req.topic)
        videos, courses = await asyncio.gather(videos_future, courses_future)
        return {
            "topic": req.topic,
            "videos": videos,
            "courses": courses,
            "total_found": len(videos) + len(courses),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@app.post("/api/generate-path")
async def generate_path(req: PathRequest):
    """Use Gemini to create a structured learning path from found resources."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        model = get_model()

        resources_text = ""
        if req.videos:
            resources_text += "YOUTUBE VIDEOS:\n"
            for i, v in enumerate(req.videos, 1):
                resources_text += f'{i}. "{v["title"]}" — {v["url"]}\n'
                if v.get('description'):
                    resources_text += f'   {v["description"][:150]}\n'

        if req.courses:
            resources_text += "\nFREE COURSES & TUTORIALS:\n"
            for i, c in enumerate(req.courses, 1):
                resources_text += f'{i}. "{c["title"]}" ({c["platform"]}) — {c["url"]}\n'
                if c.get('description'):
                    resources_text += f'   {c["description"][:150]}\n'

        prompt = f"""You are an expert curriculum designer. A student wants to learn "{req.topic}" in sessions of {req.duration} minutes.

These real resources were found online:
{resources_text}

Create a structured learning path using ONLY resources from the list above (use their exact titles and URLs). Organise them into 2-4 progressive phases.

Return ONLY valid JSON — no markdown fences, no extra text:
{{
  "title": "Learning Path: {req.topic}",
  "overview": "2-3 sentence motivating description of this learning journey",
  "phases": [
    {{
      "id": "1",
      "name": "Phase 1: Foundations",
      "description": "What you will learn and achieve in this phase",
      "resources": [
        {{
          "title": "exact title from the list",
          "url": "exact url from the list",
          "type": "video or course",
          "platform": "YouTube or platform name",
          "estimated_minutes": 45,
          "why": "One sentence explaining why this resource belongs here"
        }}
      ]
    }}
  ],
  "key_skills": ["skill1", "skill2", "skill3", "skill4"],
  "next_steps": ["advanced topic 1", "advanced topic 2", "advanced topic 3"],
  "quiz": [
    {{
      "id": "q1",
      "question": "Conceptual question about {req.topic}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct"
    }}
  ]
}}

Generate 6-8 quiz questions testing core {req.topic} concepts. Use the EXACT URLs and titles from the resource list."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = re.sub(r'^```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
        text = text.strip()
        data = json.loads(text)
        return data
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON from AI: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@app.post("/api/submit-quiz")
async def submit_quiz(submission: QuizSubmission):
    correct = sum(1 for a in submission.answers if a.get("is_correct", False))
    total = len(submission.answers)
    score = (correct / total * 100) if total > 0 else 0

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO quiz_results (topic, score, total, user_id, timestamp) VALUES (?, ?, ?, ?, ?)",
        (submission.topic.lower(), score, total, submission.user_id, datetime.utcnow().isoformat()),
    )
    conn.commit()
    c.execute("SELECT score FROM quiz_results WHERE topic LIKE ?", (f"%{submission.topic.lower()}%",))
    all_scores = [row[0] for row in c.fetchall()]
    conn.close()

    all_scores.sort()
    n = len(all_scores)
    median = all_scores[n // 2] if n > 0 else score
    q1 = all_scores[n // 4] if n > 0 else score
    q3 = all_scores[3 * n // 4] if n > 0 else score
    percentile = sum(1 for s in all_scores if s < score) / n * 100 if n > 1 else 50

    proficiency = "Beginner"
    if score >= 90:
        proficiency = "Expert"
    elif score >= 75:
        proficiency = "Advanced"
    elif score >= 60:
        proficiency = "Intermediate"
    elif score >= 40:
        proficiency = "Developing"

    return {
        "score": score,
        "correct": correct,
        "total": total,
        "proficiency": proficiency,
        "percentile": round(percentile, 1),
        "stats": {
            "median": round(median, 1),
            "q1": round(q1, 1),
            "q3": round(q3, 1),
            "total_participants": n,
        },
    }


@app.get("/api/leaderboard/{topic}")
async def get_leaderboard(topic: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT score, timestamp FROM quiz_results WHERE topic LIKE ? ORDER BY score DESC LIMIT 20",
        (f"%{topic.lower()}%",),
    )
    rows = c.fetchall()
    conn.close()
    return {"topic": topic, "entries": [{"score": r[0], "date": r[1]} for r in rows]}
