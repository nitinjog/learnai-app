import React, { useState, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'https://learnai-backend-p96s.onrender.com';

async function apiPost(endpoint, data) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

function saveScore(topic, score) {
  try {
    const all = JSON.parse(localStorage.getItem('lai_scores') || '{}');
    const k = topic.toLowerCase().slice(0, 40);
    all[k] = [...(all[k] || []), score];
    localStorage.setItem('lai_scores', JSON.stringify(all));
  } catch (e) {}
}

function getScores(topic) {
  try {
    const all = JSON.parse(localStorage.getItem('lai_scores') || '{}');
    return (all[topic.toLowerCase().slice(0, 40)] || []).sort((a, b) => a - b);
  } catch (e) { return []; }
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080810; color: #e2e8f0; font-family: 'Segoe UI', system-ui, sans-serif; min-height: 100vh; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
  .card { background: rgba(16,16,40,0.95); border: 1px solid rgba(99,102,241,0.35); border-radius: 20px; padding: 40px; width: 100%; max-width: 860px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); animation: fadeIn .4s ease; }
  .card-wide { max-width: 980px; }
  h1.logo { font-size: clamp(2rem,6vw,3.5rem); font-weight: 900; background: linear-gradient(135deg,#818cf8,#c084fc,#38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .subtitle { color: #94a3b8; font-size: 1.05rem; margin: 8px 0 24px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; background: rgba(99,102,241,0.12); color: #818cf8; border: 1px solid rgba(99,102,241,0.25); margin: 3px; }
  .badge-yt { background: rgba(255,0,0,0.1); color: #ff4444; border-color: rgba(255,0,0,0.25); }
  .badge-course { background: rgba(34,197,94,0.1); color: #22c55e; border-color: rgba(34,197,94,0.25); }
  .input-row { display: flex; gap: 10px; margin-top: 8px; }
  input[type=text] { flex: 1; background: rgba(99,102,241,0.08); border: 1.5px solid rgba(99,102,241,0.4); border-radius: 12px; padding: 14px 18px; color: #e2e8f0; font-size: 1rem; outline: none; font-family: inherit; }
  input[type=text]:focus { border-color: #6366f1; }
  .btn { background: linear-gradient(135deg,#6366f1,#8b5cf6); border: none; border-radius: 12px; padding: 14px 24px; color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; font-family: inherit; white-space: nowrap; transition: opacity .15s; }
  .btn:disabled { opacity: 0.45; cursor: default; }
  .btn:not(:disabled):hover { opacity: 0.9; }
  .btn-sm { background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); border-radius: 8px; padding: 8px 14px; color: #818cf8; font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit; transition: background .15s; }
  .btn-sm:hover { background: rgba(99,102,241,0.2); }
  .btn-green { background: linear-gradient(135deg,#22c55e,#16a34a); }
  .btn-ghost { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.35); border-radius: 8px; padding: 8px 14px; color: #22c55e; font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit; }
  .btn-link { background: none; border: none; cursor: pointer; color: #818cf8; font-size: 0.82rem; padding: 0; font-family: inherit; text-decoration: underline; }
  label.lbl { display: block; color: #94a3b8; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 8px; }
  .resource-card { background: rgba(10,10,28,0.8); border: 1.5px solid rgba(99,102,241,0.18); border-radius: 14px; overflow: hidden; cursor: pointer; transition: border-color .15s, background .15s; display: flex; flex-direction: column; }
  .resource-card:hover { border-color: rgba(99,102,241,0.45); background: rgba(16,16,44,0.9); }
  .resource-card.sel { border-color: #6366f1; background: rgba(99,102,241,0.1); }
  .resource-card.sel-course { border-color: #22c55e; background: rgba(34,197,94,0.06); }
  .video-thumb { width: 100%; aspect-ratio: 16/9; background: rgba(99,102,241,0.08); object-fit: cover; display: block; }
  .video-thumb-placeholder { width: 100%; aspect-ratio: 16/9; background: rgba(10,10,30,0.8); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
  .card-body { padding: 12px 14px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .card-title { font-weight: 600; font-size: 0.88rem; color: #e2e8f0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .card-desc { color: #64748b; font-size: 0.78rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .card-footer { padding: 0 14px 12px; display: flex; align-items: center; justify-content: space-between; }
  .platform-badge { font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
  .check-circle { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #4b5563; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; color: #fff; transition: all .15s; }
  .check-circle.on-blue { background: #6366f1; border-color: #6366f1; }
  .check-circle.on-green { background: #22c55e; border-color: #22c55e; }
  .grid-resources { display: grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap: 12px; }
  .stat-card { background: rgba(10,10,20,0.8); border-radius: 14px; padding: 18px; text-align: center; }
  .stat-val { font-size: 1.6rem; font-weight: 800; margin: 6px 0 4px; }
  .stat-sub { color: #64748b; font-size: 0.75rem; }
  .stat-lbl { color: #64748b; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
  .progress-bar { height: 6px; background: rgba(99,102,241,0.15); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg,#6366f1,#8b5cf6); border-radius: 3px; transition: width .5s; }
  .phase-card { background: rgba(10,10,28,0.7); border: 1px solid rgba(99,102,241,0.2); border-radius: 16px; padding: 20px 24px; margin-bottom: 20px; }
  .phase-num { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
  .resource-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: rgba(99,102,241,0.04); border: 1px solid rgba(99,102,241,0.12); border-radius: 10px; margin-bottom: 8px; }
  .resource-thumb { width: 80px; height: 52px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .resource-thumb-placeholder { width: 80px; height: 52px; border-radius: 6px; background: rgba(99,102,241,0.12); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
  .opt { border-radius: 10px; padding: 12px 14px; cursor: pointer; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; border: 1.5px solid rgba(99,102,241,0.18); background: rgba(99,102,241,0.06); transition: background .1s; }
  .opt:hover { background: rgba(99,102,241,0.14); }
  .opt.picked { background: rgba(99,102,241,0.22); border-color: #6366f1; }
  .opt.correct { background: rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.5); }
  .opt.wrong { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.5); }
  .letter { width: 28px; height: 28px; border-radius: 6px; background: rgba(99,102,241,0.18); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.82rem; flex-shrink: 0; }
  .expl { background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.25); border-radius: 10px; padding: 14px; margin-bottom: 16px; }
  .bench-bar { height: 8px; border-radius: 4px; margin-top: 4px; transition: width 1s; }
  .chart-bars { display: flex; align-items: flex-end; gap: 10px; height: 140px; padding: 0 8px; }
  .chart-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
  .chart-bar { width: 100%; border-radius: 6px 6px 0 0; transition: height 1s; }
  .chart-label { font-size: 0.7rem; color: #64748b; text-align: center; }
  .chart-value { font-size: 0.8rem; font-weight: 700; }
  .err { color: #f87171; font-size: 0.88rem; margin-top: 8px; }
  .orb { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
  .z1 { position: relative; z-index: 1; }
  .flex { display: flex; }
  .flex-center { display: flex; align-items: center; }
  .gap6 { gap: 6px; }
  .gap8 { gap: 8px; }
  .gap12 { gap: 12px; }
  .gap16 { gap: 16px; }
  .wrap { flex-wrap: wrap; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .mb6 { margin-bottom: 6px; }
  .mb8 { margin-bottom: 8px; }
  .mb12 { margin-bottom: 12px; }
  .mb16 { margin-bottom: 16px; }
  .mb20 { margin-bottom: 20px; }
  .mb24 { margin-bottom: 24px; }
  .mt12 { margin-top: 12px; }
  .mt16 { margin-top: 16px; }
  .mt24 { margin-top: 24px; }
  .mt32 { margin-top: 32px; }
  .spinner { width: 48px; height: 48px; border: 4px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
  .sticky-header { position: sticky; top: 0; z-index: 10; background: rgba(8,8,16,0.96); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(99,102,241,0.18); padding: 12px 24px; }
  .section-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
  .tab-btn { background: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.18); border-radius: 10px; padding: 10px 18px; color: #94a3b8; font-weight: 600; font-size: 0.88rem; cursor: pointer; font-family: inherit; transition: all .15s; }
  .tab-btn.active { background: rgba(99,102,241,0.2); border-color: #6366f1; color: #e2e8f0; }
  .skills-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .skill-chip { background: rgba(56,189,248,0.08); border: 1px solid rgba(56,189,248,0.2); border-radius: 20px; padding: 5px 14px; color: #38bdf8; font-size: 0.8rem; font-weight: 600; }
  .next-chip { background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2); border-radius: 20px; padding: 5px 14px; color: #a78bfa; font-size: 0.8rem; font-weight: 600; }
  .loading-steps { display: flex; flex-direction: column; gap: 10px; margin-top: 24px; max-width: 360px; }
  .loading-step { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.15); }
  .loading-step.done { border-color: rgba(34,197,94,0.3); background: rgba(34,197,94,0.05); }
  .loading-step.active { border-color: rgba(99,102,241,0.4); animation: pulse 1.5s ease-in-out infinite; }
  @media (max-width: 700px) { .card { padding: 20px; } .grid-resources { grid-template-columns: repeat(auto-fill,minmax(160px,1fr)); } .resource-thumb { width: 60px; height: 40px; } .chart-bars { height: 100px; } }
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
const PLATFORM_COLORS = {
  'YouTube': { bg: 'rgba(255,0,0,0.12)', color: '#ff4444', border: 'rgba(255,0,0,0.25)' },
  'Coursera': { bg: 'rgba(0,86,210,0.12)', color: '#4d9fff', border: 'rgba(0,86,210,0.25)' },
  'edX': { bg: 'rgba(2,89,97,0.15)', color: '#00c8d4', border: 'rgba(2,89,97,0.3)' },
  'Khan Academy': { bg: 'rgba(20,157,48,0.12)', color: '#14c44c', border: 'rgba(20,157,48,0.25)' },
  'freeCodeCamp': { bg: 'rgba(10,10,35,0.5)', color: '#adbdff', border: 'rgba(99,102,241,0.3)' },
  'Codecademy': { bg: 'rgba(31,198,120,0.1)', color: '#1fc678', border: 'rgba(31,198,120,0.25)' },
  'MDN Web Docs': { bg: 'rgba(0,123,255,0.1)', color: '#5b9fff', border: 'rgba(0,123,255,0.25)' },
  'W3Schools': { bg: 'rgba(4,150,82,0.1)', color: '#04bd65', border: 'rgba(4,150,82,0.25)' },
  'GeeksforGeeks': { bg: 'rgba(11,150,59,0.1)', color: '#0bc453', border: 'rgba(11,150,59,0.25)' },
  'Real Python': { bg: 'rgba(255,193,7,0.1)', color: '#ffc107', border: 'rgba(255,193,7,0.25)' },
  'Kaggle': { bg: 'rgba(32,121,242,0.1)', color: '#20b2ff', border: 'rgba(32,121,242,0.25)' },
  'default': { bg: 'rgba(99,102,241,0.1)', color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
};

function getPlatformStyle(platform) {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS['default'];
}

// ── Loading ────────────────────────────────────────────────────────────────────
function Loading({ msg, steps = [] }) {
  return (
    <div className="page">
      <div className="z1" style={{ textAlign: 'center', width: '100%', maxWidth: 420 }}>
        <div className="spinner" />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>{msg}</h2>
        {steps.length > 0 && (
          <div className="loading-steps" style={{ margin: '0 auto' }}>
            {steps.map((s, i) => (
              <div key={i} className={`loading-step ${s.done ? 'done' : s.active ? 'active' : ''}`}>
                <span style={{ fontSize: '1.1rem' }}>{s.done ? '✅' : s.active ? '⏳' : '⬜'}</span>
                <span style={{ fontSize: '0.85rem', color: s.done ? '#22c55e' : s.active ? '#e2e8f0' : '#64748b' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 1: Landing ────────────────────────────────────────────────────────────
function LandingStep({ onSubmit }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [err, setErr] = useState('');
  const popular = ['Python Programming', 'Machine Learning', 'JavaScript', 'Web Development', 'Data Science', 'React', 'SQL', 'Chess Strategy'];

  const go = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true); setErr(''); setLoadStep(1);
    try {
      setLoadStep(2);
      const data = await apiPost('/api/search-resources', { topic: topic.trim() });
      setLoadStep(3);
      onSubmit(data);
    } catch (e) {
      setErr('Error: ' + e.message);
      setLoading(false);
      setLoadStep(0);
    }
  };

  const steps = [
    { label: 'Searching YouTube for tutorials...', done: loadStep > 1, active: loadStep === 1 },
    { label: 'Finding free courses & resources...', done: loadStep > 2, active: loadStep === 2 },
    { label: 'Preparing your resource list...', done: loadStep > 3, active: loadStep === 3 },
  ];

  if (loading) return (
    <><style>{css}</style>
      <Loading msg={`Finding resources for "${topic}"...`} steps={steps} />
    </>
  );

  return (
    <div className="page">
      <div className="orb" style={{ width: 400, height: 400, background: 'rgba(99,102,241,0.07)', left: '5%', top: '10%' }} />
      <div className="orb" style={{ width: 350, height: 350, background: 'rgba(139,92,246,0.06)', right: '5%', bottom: '15%' }} />
      <div className="card z1">
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🧠</div>
          <h1 className="logo">LearnAI</h1>
          <p className="subtitle">Real YouTube videos & free courses, AI-curated into your personal learning path</p>
          <div className="flex justify-center wrap gap8">
            {['▶ Real YouTube Videos', '📚 Free Courses', '🤖 AI Learning Path', '📝 Skill Quiz'].map(f =>
              <span key={f} className="badge">{f}</span>
            )}
          </div>
        </div>

        <label className="lbl">What do you want to learn today?</label>
        <div className="input-row mb20">
          <input type="text" placeholder="e.g. Machine Learning, JavaScript, Photography..."
            value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
          <button className="btn" onClick={go} disabled={!topic.trim()}>🔍 Search</button>
        </div>
        {err && <div className="err mb12">{err}</div>}

        <label className="lbl">Popular topics</label>
        <div className="flex wrap gap8">
          {popular.map(t => <button key={t} className="btn-sm" onClick={() => setTopic(t)}>{t}</button>)}
        </div>

        <div style={{ marginTop: 28, padding: 14, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: 10 }}>
          <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.82rem', marginBottom: 5 }}>💡 How it works</div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.7 }}>
            1. We search the web for real YouTube videos & free courses on your topic<br />
            2. You pick which resources to include<br />
            3. Gemini AI arranges them into a smart, progressive learning path<br />
            4. Take a quiz to test your knowledge!
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Resources ──────────────────────────────────────────────────────────
function ResourcesStep({ data, onGenerate, onBack }) {
  const [selVideos, setSelVideos] = useState(() => (data.videos || []).map((_, i) => i));
  const [selCourses, setSelCourses] = useState(() => (data.courses || []).map((_, i) => i));
  const [dur, setDur] = useState(60);
  const [tab, setTab] = useState('videos');
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [err, setErr] = useState('');

  const videos = data.videos || [];
  const courses = data.courses || [];
  const selCount = selVideos.length + selCourses.length;

  const toggleVideo = i => setSelVideos(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);
  const toggleCourse = i => setSelCourses(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);

  const go = async () => {
    if (selCount === 0 || loading) return;
    const pickedVideos = selVideos.map(i => videos[i]);
    const pickedCourses = selCourses.map(i => courses[i]);
    setLoading(true); setErr(''); setLoadStep(1);
    try {
      setLoadStep(2);
      const path = await apiPost('/api/generate-path', {
        topic: data.topic,
        videos: pickedVideos,
        courses: pickedCourses,
        duration: dur,
      });
      setLoadStep(3);
      onGenerate(path, pickedVideos, pickedCourses);
    } catch (e) {
      setErr('Error: ' + e.message);
      setLoading(false);
      setLoadStep(0);
    }
  };

  const steps = [
    { label: 'Analysing selected resources...', done: loadStep > 1, active: loadStep === 1 },
    { label: 'Gemini AI creating your path...', done: loadStep > 2, active: loadStep === 2 },
    { label: 'Generating quiz questions...', done: loadStep > 3, active: loadStep === 3 },
  ];

  if (loading) return (
    <><style>{css}</style>
      <Loading msg="Building your personalised learning path..." steps={steps} />
    </>
  );

  return (
    <div className="page" style={{ justifyContent: 'flex-start', paddingTop: 32 }}>
      <div className="orb" style={{ width: 400, height: 400, background: 'rgba(99,102,241,0.05)', left: '5%', top: '5%' }} />
      <div className="card card-wide z1">
        <button className="btn-sm mb20" onClick={onBack}>← Start Over</button>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>🎯 Resources for "{data.topic}"</h2>
        <p style={{ color: '#94a3b8', marginBottom: 20 }}>
          Found <strong style={{ color: '#818cf8' }}>{videos.length} YouTube videos</strong> and{' '}
          <strong style={{ color: '#22c55e' }}>{courses.length} free courses</strong> — select which to include in your path.
        </p>

        {/* Tabs */}
        <div className="section-tabs">
          <button className={`tab-btn ${tab === 'videos' ? 'active' : ''}`} onClick={() => setTab('videos')}>
            ▶ YouTube Videos ({videos.length})
            {selVideos.length > 0 && <span style={{ marginLeft: 6, background: 'rgba(255,0,0,0.2)', color: '#ff8888', borderRadius: 6, padding: '1px 6px', fontSize: '0.75rem' }}>{selVideos.length} selected</span>}
          </button>
          <button className={`tab-btn ${tab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')}>
            📚 Free Courses ({courses.length})
            {selCourses.length > 0 && <span style={{ marginLeft: 6, background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 6, padding: '1px 6px', fontSize: '0.75rem' }}>{selCourses.length} selected</span>}
          </button>
        </div>

        {tab === 'videos' && (
          <>
            <div className="flex justify-between flex-center mb12">
              <label className="lbl" style={{ marginBottom: 0 }}>YouTube Tutorials</label>
              <div className="flex gap8">
                <button className="btn-sm" onClick={() => setSelVideos(videos.map((_, i) => i))}>All</button>
                <button className="btn-sm" onClick={() => setSelVideos([])}>None</button>
              </div>
            </div>
            {videos.length === 0 ? (
              <div style={{ color: '#64748b', padding: '24px 0', textAlign: 'center' }}>
                No YouTube videos found. Try a different topic or check your connection.
              </div>
            ) : (
              <div className="grid-resources mb16">
                {videos.map((v, i) => {
                  const sel = selVideos.includes(i);
                  return (
                    <div key={i} className={`resource-card ${sel ? 'sel' : ''}`} onClick={() => toggleVideo(i)}>
                      {v.thumbnail
                        ? <img className="video-thumb" src={v.thumbnail} alt={v.title} onError={e => { e.target.style.display='none'; }} />
                        : <div className="video-thumb-placeholder">▶</div>
                      }
                      <div className="card-body">
                        <div className="card-title">{v.title}</div>
                        {v.description && <div className="card-desc">{v.description}</div>}
                      </div>
                      <div className="card-footer">
                        <span className="platform-badge" style={{ background: 'rgba(255,0,0,0.12)', color: '#ff4444', border: '1px solid rgba(255,0,0,0.2)' }}>▶ YouTube</span>
                        <div className={`check-circle ${sel ? 'on-blue' : ''}`}>{sel ? '✓' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'courses' && (
          <>
            <div className="flex justify-between flex-center mb12">
              <label className="lbl" style={{ marginBottom: 0 }}>Free Courses & Tutorials</label>
              <div className="flex gap8">
                <button className="btn-sm" onClick={() => setSelCourses(courses.map((_, i) => i))}>All</button>
                <button className="btn-sm" onClick={() => setSelCourses([])}>None</button>
              </div>
            </div>
            {courses.length === 0 ? (
              <div style={{ color: '#64748b', padding: '24px 0', textAlign: 'center' }}>
                No free courses found. Try a different topic or check your connection.
              </div>
            ) : (
              <div className="grid-resources mb16">
                {courses.map((c, i) => {
                  const sel = selCourses.includes(i);
                  const ps = getPlatformStyle(c.platform);
                  return (
                    <div key={i} className={`resource-card ${sel ? 'sel-course' : ''}`} onClick={() => toggleCourse(i)}>
                      <div style={{ padding: '16px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 64, background: ps.bg }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: ps.color }}>{c.platform}</span>
                      </div>
                      <div className="card-body">
                        <div className="card-title">{c.title}</div>
                        {c.description && <div className="card-desc">{c.description}</div>}
                      </div>
                      <div className="card-footer">
                        <span className="platform-badge" style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>{c.platform}</span>
                        <div className={`check-circle ${sel ? 'on-green' : ''}`}>{sel ? '✓' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Duration + Generate */}
        <div style={{ padding: 20, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, marginTop: 8 }}>
          <label className="lbl">Session Duration: {dur} minutes</label>
          <input type="range" min={15} max={180} step={15} value={dur} onChange={e => setDur(+e.target.value)}
            style={{ width: '100%', accentColor: '#6366f1', marginBottom: 4 }} />
          <div className="flex justify-between mb16" style={{ color: '#64748b', fontSize: '0.72rem' }}>
            <span>15 min</span><span>3 hours</span>
          </div>

          {err && <div className="err mb12">{err}</div>}

          <button className="btn" style={{ width: '100%', fontSize: '1rem', padding: '15px' }}
            disabled={selCount === 0} onClick={go}>
            🤖 Generate AI Learning Path ({selCount} resource{selCount !== 1 ? 's' : ''} · {dur} min)
          </button>
          {selCount === 0 && <p style={{ color: '#64748b', textAlign: 'center', marginTop: 8, fontSize: '0.82rem' }}>Select at least one resource above</p>}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Learning Path ──────────────────────────────────────────────────────
function LearningPathStep({ pathData, topic, onQuiz, onBack }) {
  const phases = pathData.phases || [];
  const quiz = pathData.quiz || [];

  function ResourceCard({ res }) {
    const isVideo = res.type === 'video' || res.platform === 'YouTube';
    const ps = getPlatformStyle(res.platform);
    const vidId = isVideo ? (() => {
      const m = (res.url || '').match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : null;
    })() : null;
    const thumb = vidId ? `https://img.youtube.com/vi/${vidId}/mqdefault.jpg` : null;

    return (
      <div className="resource-row">
        {isVideo && thumb
          ? <img className="resource-thumb" src={thumb} alt="" onError={e => { e.target.style.display='none'; }} />
          : <div className="resource-thumb-placeholder" style={{ background: ps.bg }}>
              {isVideo ? '▶' : '📖'}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#e2e8f0', marginBottom: 3, lineHeight: 1.4 }}>{res.title}</div>
          {res.why && <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: 5, fontStyle: 'italic' }}>{res.why}</div>}
          <div className="flex gap8 flex-center">
            <span className="platform-badge" style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, fontSize: '0.7rem', padding: '2px 7px', borderRadius: 5 }}>{res.platform}</span>
            {res.estimated_minutes && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>⏱ ~{res.estimated_minutes} min</span>}
            <a href={res.url} target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 'auto', color: '#818cf8', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(99,102,241,0.1)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)', whiteSpace: 'nowrap' }}
              onClick={e => e.stopPropagation()}>
              {isVideo ? '▶ Watch' : '→ Open'} ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080810' }}>
      <div className="sticky-header">
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button className="btn-sm" onClick={onBack}>← Home</button>
          <div style={{ flex: 1, minWidth: 100 }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pathData.title || `Learning Path: ${topic}`}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{phases.length} phases · {quiz.length} quiz questions</div>
          </div>
          {quiz.length > 0 && (
            <button className="btn" style={{ padding: '10px 18px', fontSize: '0.9rem' }} onClick={onQuiz}>Take Quiz 📝</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Overview */}
        {pathData.overview && (
          <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '18px 22px', marginBottom: 28 }}>
            <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: 8 }}>📋 Overview</div>
            <p style={{ color: '#cbd5e1', lineHeight: 1.75, fontSize: '0.95rem' }}>{pathData.overview}</p>
          </div>
        )}

        {/* Phases */}
        {phases.map((phase, pi) => (
          <div key={phase.id || pi} className="phase-card">
            <div className="flex gap12 flex-center mb12">
              <div className="phase-num">{pi + 1}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#e2e8f0' }}>{phase.name}</div>
                {phase.description && <div style={{ color: '#94a3b8', fontSize: '0.83rem', marginTop: 2 }}>{phase.description}</div>}
              </div>
            </div>
            {(phase.resources || []).map((res, ri) => (
              <ResourceCard key={ri} res={res} />
            ))}
          </div>
        ))}

        {/* Key Skills */}
        {(pathData.key_skills || []).length > 0 && (
          <div style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 14, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: 10, fontSize: '0.88rem' }}>🎯 Skills You'll Gain</div>
            <div className="skills-row">
              {pathData.key_skills.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {(pathData.next_steps || []).length > 0 && (
          <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: '16px 20px', marginBottom: 28 }}>
            <div style={{ color: '#a78bfa', fontWeight: 700, marginBottom: 10, fontSize: '0.88rem' }}>🚀 What to Learn Next</div>
            <div className="skills-row">
              {pathData.next_steps.map((s, i) => <span key={i} className="next-chip">{s}</span>)}
            </div>
          </div>
        )}

        {quiz.length > 0 && (
          <button className="btn" style={{ width: '100%', fontSize: '1.05rem', padding: '16px' }} onClick={onQuiz}>
            🎯 Take the Knowledge Quiz ({quiz.length} questions)
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Quiz ───────────────────────────────────────────────────────────────
function QuizStep({ quiz, topic, onResult }) {
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const letters = ['A', 'B', 'C', 'D'];
  const q = quiz[cur];
  const pct = Math.round(cur / quiz.length * 100);

  const confirm = () => {
    if (sel === null) return;
    setConfirmed(true);
    setAnswers(prev => [...prev, { is_correct: sel === q.correct }]);
  };

  const next = () => {
    if (cur < quiz.length - 1) { setConfirmed(false); setSel(null); setCur(i => i + 1); return; }
    const all = [...answers];
    const correct = all.filter(a => a.is_correct).length;
    const total = all.length;
    const score = Math.round(correct / total * 100);
    saveScore(topic, score);
    const scores = getScores(topic);
    const n = scores.length;
    const median = n > 0 ? scores[Math.floor(n / 2)] : score;
    const q1val = n > 0 ? scores[Math.floor(n / 4)] : Math.max(0, score - 15);
    const q3val = n > 0 ? scores[Math.floor(3 * n / 4)] : Math.min(100, score + 10);
    const percentile = n > 1 ? Math.round(scores.filter(s => s < score).length / n * 100) : 50;
    const proficiency = score >= 90 ? 'Expert' : score >= 75 ? 'Advanced' : score >= 60 ? 'Intermediate' : score >= 40 ? 'Developing' : 'Beginner';
    onResult({ score, correct, total, proficiency, percentile, stats: { median, q1: q1val, q3: q3val, n } });
  };

  return (
    <div className="page">
      <div className="card z1">
        <div className="mb24">
          <div className="flex justify-between mb8" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: '#94a3b8' }}>Question {cur + 1} of {quiz.length}</span>
            <span style={{ color: '#6366f1', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
        </div>

        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 22, lineHeight: 1.55 }}>
          {cur + 1}. {q.question}
        </h2>

        {(q.options || []).map((opt, i) => {
          let cls = 'opt';
          if (confirmed) {
            if (i === q.correct) cls += ' correct';
            else if (i === sel) cls += ' wrong';
          } else if (sel === i) cls += ' picked';
          return (
            <div key={i} className={cls} onClick={() => !confirmed && setSel(i)}
              style={{ cursor: confirmed ? 'default' : 'pointer', color: confirmed && i === q.correct ? '#22c55e' : confirmed && i === sel ? '#ef4444' : '#cbd5e1' }}>
              <span className="letter">{letters[i]}</span>
              <span style={{ fontSize: '0.92rem' }}>{opt}</span>
            </div>
          );
        })}

        {confirmed && q.explanation && (
          <div className="expl">
            <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: 5, fontSize: '0.85rem' }}>💡 Explanation</div>
            <div style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.6 }}>{q.explanation}</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!confirmed
            ? <button className="btn" disabled={sel === null} onClick={confirm}>Confirm Answer</button>
            : <button className="btn" onClick={next}>{cur < quiz.length - 1 ? 'Next Question →' : 'See Results 🏆'}</button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="chart-bars">
      {data.map((d, i) => (
        <div key={i} className="chart-bar-wrap">
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
            <div className="chart-bar" style={{ background: d.color, height: Math.round((d.value / max) * 100) + '%', minHeight: 4 }} />
          </div>
          <div className="chart-value" style={{ color: d.color }}>{d.value}%</div>
          <div className="chart-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Step 5: Results ────────────────────────────────────────────────────────────
function ResultStep({ result, topic, onRestart }) {
  const { score, correct, total, proficiency, percentile, stats } = result;
  const pColors = { Expert: '#f59e0b', Advanced: '#22c55e', Intermediate: '#6366f1', Developing: '#38bdf8', Beginner: '#94a3b8' };
  const pEmoji = { Expert: '🏆', Advanced: '⭐', Intermediate: '📈', Developing: '🌱', Beginner: '🎯' };
  const color = pColors[proficiency] || '#6366f1';
  const pDesc = {
    Expert: "Outstanding! You've demonstrated mastery-level understanding.",
    Advanced: "Excellent work! You have a strong grasp of this topic.",
    Intermediate: "Good progress! Keep practising to advance further.",
    Developing: "You're building a foundation! Review the resources and retake the quiz.",
    Beginner: "Everyone starts somewhere! Work through the learning path before retaking.",
  };

  const barData = [
    { label: 'Q1 (25th)', value: Math.round(stats.q1), color: '#38bdf8' },
    { label: 'Median', value: Math.round(stats.median), color: '#818cf8' },
    { label: 'Q3 (75th)', value: Math.round(stats.q3), color: '#c084fc' },
    { label: 'You', value: Math.round(score), color },
  ];

  return (
    <div className="page" style={{ justifyContent: 'flex-start', paddingTop: 36 }}>
      <div className="orb" style={{ width: 400, height: 400, background: 'rgba(99,102,241,0.06)', left: '10%', top: '5%' }} />
      <div className="card card-wide z1">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '4rem', marginBottom: 10 }}>{pEmoji[proficiency] || '🎯'}</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>Quiz Complete!</h1>
          <p style={{ color: '#94a3b8' }}>Performance for <strong style={{ color: '#818cf8' }}>{topic}</strong></p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Your Score', value: score + '%', sub: correct + ' / ' + total + ' correct', c: '#e2e8f0' },
            { label: 'Proficiency', value: pEmoji[proficiency] + ' ' + proficiency, sub: 'Based on your performance', c: color },
            { label: 'Percentile', value: 'Top ' + Math.round(100 - percentile) + '%', sub: 'Better than ' + Math.round(percentile) + '% of learners', c: '#22c55e' },
            { label: 'Participants', value: stats.n, sub: 'Took similar quiz', c: '#38bdf8' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ border: '1px solid ' + s.c + '30' }}>
              <div className="stat-lbl">{s.label}</div>
              <div className="stat-val" style={{ color: s.c }}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(10,10,20,0.7)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>📊 Score vs. Peers</div>
          <BarChart data={barData} />
        </div>

        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <div style={{ color: '#818cf8', fontWeight: 700, marginBottom: 14, fontSize: '0.9rem' }}>📈 Benchmark</div>
          {[
            { label: '25th Percentile (Q1)', val: stats.q1, c: '#38bdf8' },
            { label: 'Median (50th)', val: stats.median, c: '#818cf8' },
            { label: '75th Percentile (Q3)', val: stats.q3, c: '#c084fc' },
            { label: 'Your Score', val: score, c: color },
          ].map(row => (
            <div key={row.label} style={{ marginBottom: 10 }}>
              <div className="flex justify-between mb8" style={{ fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>{row.label}</span>
                <span style={{ color: row.c, fontWeight: 700 }}>{Math.round(row.val)}%</span>
              </div>
              <div className="progress-bar"><div className="bench-bar" style={{ background: row.c, width: row.val + '%' }} /></div>
            </div>
          ))}
        </div>

        <div style={{ background: color + '14', border: '1px solid ' + color + '30', borderRadius: 12, padding: 16, marginBottom: 22 }}>
          <div style={{ fontWeight: 700, color, marginBottom: 6 }}>{pEmoji[proficiency]} {proficiency} Level</div>
          <div style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.7 }}>{pDesc[proficiency]}</div>
        </div>

        <div className="flex justify-center gap12 wrap">
          <button className="btn btn-green" onClick={onRestart}>🆕 Learn Another Topic</button>
          <button className="btn-sm" onClick={() => window.print()}>🖨 Save Report</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState('landing');
  const [resources, setResources] = useState(null);   // { topic, videos, courses }
  const [pathData, setPathData] = useState(null);     // Gemini learning path
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState(null);

  const reset = () => { setStep('landing'); setResources(null); setPathData(null); setTopic(''); setResult(null); };

  const handleSearchDone = useCallback((data) => {
    setResources(data);
    setTopic(data.topic);
    setStep('resources');
  }, []);

  const handlePathGenerated = useCallback((path, _videos, _courses) => {
    setPathData(path);
    setStep('path');
  }, []);

  return (
    <>
      <style>{css}</style>
      {step === 'landing' && <LandingStep onSubmit={handleSearchDone} />}
      {step === 'resources' && resources && (
        <ResourcesStep data={resources} onGenerate={handlePathGenerated} onBack={reset} />
      )}
      {step === 'path' && pathData && (
        <LearningPathStep pathData={pathData} topic={topic} onQuiz={() => setStep('quiz')} onBack={reset} />
      )}
      {step === 'quiz' && pathData && pathData.quiz && (
        <QuizStep quiz={pathData.quiz} topic={topic} onResult={r => { setResult(r); setStep('result'); }} />
      )}
      {step === 'result' && result && (
        <ResultStep result={result} topic={topic} onRestart={reset} />
      )}
    </>
  );
}
