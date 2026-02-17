from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import json
import os
import google.generativeai as genai
from datetime import datetime
import hashlib

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
    c.execute('''CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        topic TEXT,
        subtopics TEXT,
        duration INTEGER,
        created_at TEXT
    )''')
    conn.commit()
    conn.close()

init_db()

def get_model():
    return genai.GenerativeModel('gemini-1.5-flash')

class TopicRequest(BaseModel):
    topic: str

class TutorialRequest(BaseModel):
    topic: str
    subtopics: List[str]
    duration: int  # in minutes

class QuizSubmission(BaseModel):
    topic: str
    answers: List[dict]
    user_id: str

class QuizResult(BaseModel):
    topic: str
    score: float
    total: int
    user_id: str

@app.get("/")
def root():
    return {"status": "LearnAI API running"}

@app.post("/api/suggest-topics")
async def suggest_topics(req: TopicRequest):
    try:
        model = get_model()
        prompt = f"""You are a curriculum expert. The user wants to learn about: "{req.topic}"

Search your knowledge and suggest 8-10 specific subtopics they should learn, ordered from beginner to advanced.
Also suggest 3 related topics they might be interested in after mastering this topic.

Return ONLY valid JSON in this exact format:
{{
  "main_topic": "cleaned up topic name",
  "description": "2-3 sentence overview of what this topic is about",
  "subtopics": [
    {{"id": "1", "name": "subtopic name", "difficulty": "beginner|intermediate|advanced", "estimated_minutes": 15}},
    ...
  ],
  "related_topics": ["topic1", "topic2", "topic3"],
  "total_estimated_hours": 5
}}"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        data = json.loads(text)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

@app.post("/api/generate-tutorial")
async def generate_tutorial(req: TutorialRequest):
    try:
        model = get_model()
        subtopics_str = ", ".join(req.subtopics)
        prompt = f"""You are an expert educator. Create a comprehensive tutorial on "{req.topic}" covering these subtopics: {subtopics_str}.
The user has {req.duration} minutes available.

Create an engaging, well-structured tutorial with:
- Clear explanations with real-world examples
- Code examples where relevant (use markdown code blocks)
- Key concepts highlighted
- Practical exercises

Return ONLY valid JSON:
{{
  "title": "tutorial title",
  "overview": "brief overview",
  "sections": [
    {{
      "id": "1",
      "title": "section title",
      "content": "detailed markdown content with examples",
      "key_points": ["point1", "point2"],
      "has_code": true,
      "estimated_minutes": 10
    }}
  ],
  "quiz": [
    {{
      "id": "q1",
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "why this is correct"
    }}
  ],
  "summary": "what you learned"
}}

Generate 8-10 quiz questions covering all major concepts."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        data = json.loads(text)
        return data
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
        (submission.topic.lower(), score, total, submission.user_id, datetime.utcnow().isoformat())
    )
    conn.commit()

    # Get stats for this topic
    c.execute("SELECT score FROM quiz_results WHERE topic LIKE ?", (f"%{submission.topic.lower()}%",))
    all_scores = [row[0] for row in c.fetchall()]
    conn.close()

    all_scores.sort()
    n = len(all_scores)
    median = all_scores[n//2] if n > 0 else score
    q1 = all_scores[n//4] if n > 0 else score
    q3 = all_scores[3*n//4] if n > 0 else score

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
            "total_participants": n
        }
    }

@app.get("/api/leaderboard/{topic}")
async def get_leaderboard(topic: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT score, timestamp FROM quiz_results WHERE topic LIKE ? ORDER BY score DESC LIMIT 20",
        (f"%{topic.lower()}%",)
    )
    rows = c.fetchall()
    conn.close()
    return {"topic": topic, "entries": [{"score": r[0], "date": r[1]} for r in rows]}
