from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
import os
import re
import asyncio
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
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
TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")

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

def gemini_generate(prompt: str) -> str:
    """Call Gemini REST API directly — no SDK, no compilation required."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not configured")
    models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
    last_error = None
    for model in models:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={GEMINI_API_KEY}"
        )
        payload = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 8192},
        }).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except urllib.error.HTTPError as e:
            last_error = e
            if e.code in (400, 404, 429, 503):
                continue  # try next model
            raise
    raise RuntimeError(f"All Gemini models failed: {last_error}")

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

def _tavily_search(query: str, include_domains: List[str], max_results: int) -> List[dict]:
    """Call Tavily Search REST API directly (no SDK dependency)."""
    if not TAVILY_API_KEY:
        print("TAVILY_API_KEY not set")
        return []
    payload = json.dumps({
        "api_key": TAVILY_API_KEY,
        "query": query,
        "search_depth": "basic",
        "include_domains": include_domains,
        "max_results": max_results,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.tavily.com/search",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8")).get("results", [])


def _search_youtube_videos(topic: str) -> List[dict]:
    """Search YouTube via Tavily REST API."""
    videos = []
    try:
        results = _tavily_search(
            query=f"{topic} tutorial youtube",
            include_domains=["youtube.com"],
            max_results=8,
        )
        seen_urls = set()
        for r in results:
            url = r.get("url", "")
            if ("youtube.com/watch" in url or "youtu.be/" in url) and url not in seen_urls:
                seen_urls.add(url)
                vid_id = extract_youtube_id(url)
                thumbnail = f"https://img.youtube.com/vi/{vid_id}/mqdefault.jpg" if vid_id else ""
                videos.append({
                    "title": r.get("title", "").replace(" - YouTube", "").strip(),
                    "url": url,
                    "thumbnail": thumbnail,
                    "description": r.get("content", "")[:300],
                    "platform": "YouTube",
                    "type": "video",
                    "video_id": vid_id or "",
                })
    except Exception as e:
        print(f"Tavily YouTube search error: {e}")
    return videos[:8]


def _search_free_courses(topic: str) -> List[dict]:
    """Search free courses via Tavily REST API."""
    courses = []
    try:
        results = _tavily_search(
            query=f"{topic} free course tutorial learn online",
            include_domains=[
                "coursera.org", "edx.org", "khanacademy.org",
                "freecodecamp.org", "codecademy.com", "w3schools.com",
                "developer.mozilla.org", "geeksforgeeks.org", "realpython.com",
                "kaggle.com", "theodinproject.com", "javascript.info",
                "cs50.harvard.edu", "fast.ai", "tutorialspoint.com",
                "fullstackopen.com", "learnpython.org", "ocw.mit.edu",
            ],
            max_results=10,
        )
        seen_urls = set()
        for r in results:
            url = r.get("url", "")
            if url in seen_urls:
                continue
            seen_urls.add(url)
            platform = next(
                (name for domain, name in COURSE_DOMAINS if domain in url),
                "Free Course"
            )
            courses.append({
                "title": r.get("title", ""),
                "url": url,
                "description": r.get("content", "")[:300],
                "platform": platform,
                "type": "course",
                "free": True,
            })
    except Exception as e:
        print(f"Tavily course search error: {e}")
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

        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(executor, gemini_generate, prompt)
        text = text.strip()
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
