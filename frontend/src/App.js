import React, { useState, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const uid = () => {
  let id = localStorage.getItem('learnai_uid');
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem('learnai_uid', id); }
  return id;
};

// ─── Animated Background ─────────────────────────────────────────────────────
const BgParticles = () => (
  <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
    {[...Array(20)].map((_, i) => (
      <div key={i} style={{
        position:'absolute',
        width: Math.random()*3+1+'px',
        height: Math.random()*3+1+'px',
        background: `hsl(${220+i*8},80%,70%)`,
        borderRadius:'50%',
        left: Math.random()*100+'%',
        top: Math.random()*100+'%',
        opacity: Math.random()*0.4+0.1,
        animation: `float ${5+Math.random()*10}s ease-in-out infinite alternate`,
        animationDelay: Math.random()*5+'s'
      }}/>
    ))}
    <style>{`
      @keyframes float { from { transform: translateY(0px) rotate(0deg); } to { transform: translateY(-30px) rotate(180deg); } }
      @keyframes pulse { 0%,100%{opacity:.3;transform:scale(1)} 50%{opacity:.6;transform:scale(1.05)} }
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    `}</style>
  </div>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative', zIndex:1 },
  card: { background:'rgba(15,15,30,0.85)', backdropFilter:'blur(20px)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'20px', padding:'40px', width:'100%', maxWidth:'860px', boxShadow:'0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1)' },
  title: { fontSize:'clamp(2rem,5vw,3.5rem)', fontWeight:800, background:'linear-gradient(135deg,#818cf8,#c084fc,#38bdf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'8px', lineHeight:1.1 },
  subtitle: { color:'#94a3b8', fontSize:'1.1rem', marginBottom:'32px' },
  input: { width:'100%', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:'12px', padding:'16px 20px', color:'#e2e8f0', fontSize:'1.1rem', outline:'none', transition:'all .3s', fontFamily:'Inter,sans-serif' },
  btn: { background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:'12px', padding:'14px 28px', color:'#fff', fontWeight:700, fontSize:'1rem', cursor:'pointer', transition:'all .3s', fontFamily:'Inter,sans-serif' },
  btnSm: { background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:'8px', padding:'8px 16px', color:'#818cf8', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', transition:'all .3s' },
  tag: { display:'inline-block', padding:'4px 12px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.05em' },
  section: { marginBottom:'24px' },
  label: { color:'#94a3b8', fontSize:'0.85rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px', display:'block' },
  progress: { height:'6px', background:'rgba(99,102,241,0.2)', borderRadius:'3px', overflow:'hidden' },
  chip: { background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'8px', padding:'10px 16px', cursor:'pointer', transition:'all .2s', display:'flex', alignItems:'center', gap:'10px' },
};

const diffColor = { beginner:'#22c55e', intermediate:'#f59e0b', advanced:'#ef4444' };

// ─── Step 1: Landing / Topic Input ───────────────────────────────────────────
function LandingStep({ onSubmit }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (!topic.trim()) return;
    setLoading(true); setErr('');
    try {
      const res = await axios.post(`${API}/api/suggest-topics`, { topic });
      onSubmit(res.data);
    } catch (e) {
      setErr('Failed to fetch topic suggestions. Please check your connection.');
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <BgParticles />
      <div style={S.card}>
        <div style={{ textAlign:'center', marginBottom:'48px' }}>
          <div style={{ fontSize:'4rem', marginBottom:'16px' }}>🧠</div>
          <h1 style={S.title}>LearnAI</h1>
          <p style={S.subtitle}>Your AI-powered personalized learning companion</p>
          <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
            {['🚀 AI-Generated Tutorials','📊 Progress Tracking','🏆 Skill Assessment','🌐 Internet-Sourced'].map(f => (
              <span key={f} style={{ ...S.tag, background:'rgba(99,102,241,0.1)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)' }}>{f}</span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:'20px' }}>
          <label style={S.label}>What do you want to learn today?</label>
          <div style={{ display:'flex', gap:'12px' }}>
            <input
              style={S.input}
              placeholder="e.g. Machine Learning, React hooks, Spanish cooking, Quantum Physics..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleSubmit()}
            />
            <button style={{ ...S.btn, whiteSpace:'nowrap', opacity: loading?0.7:1 }} onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Fetching...' : '✨ Explore'}
            </button>
          </div>
          {err && <p style={{ color:'#ef4444', marginTop:'8px', fontSize:'0.9rem' }}>{err}</p>}
        </div>

        <div>
          <label style={S.label}>Popular topics to get started</label>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {['Python Programming','Machine Learning','Web Development','Data Science','JavaScript','Blockchain','Photography','Chess Strategy'].map(t => (
              <button key={t} style={S.btnSm} onClick={() => setTopic(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Topic Suggestions ────────────────────────────────────────────────
function TopicSuggestionsStep({ data, onSelect }) {
  const [selected, setSelected] = useState([]);
  const [duration, setDuration] = useState(30);

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  const selectAll = () => setSelected(data.subtopics.map(s=>s.id));

  return (
    <div style={{ ...S.page, justifyContent:'flex-start', paddingTop:'40px' }}>
      <BgParticles />
      <div style={{ ...S.card, maxWidth:'900px' }}>
        <div style={{ marginBottom:'32px' }}>
          <button style={{ ...S.btnSm, marginBottom:'20px' }} onClick={() => window.location.reload()}>← Start Over</button>
          <h2 style={{ fontSize:'1.8rem', fontWeight:800, color:'#e2e8f0', marginBottom:'8px' }}>📚 {data.main_topic}</h2>
          <p style={{ color:'#94a3b8', lineHeight:1.7, marginBottom:'16px' }}>{data.description}</p>
          <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
            <span style={{ ...S.tag, background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)' }}>
              ⏱ ~{data.total_estimated_hours}h total
            </span>
            <span style={{ ...S.tag, background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.3)' }}>
              📖 {data.subtopics?.length} subtopics
            </span>
          </div>
        </div>

        <div style={S.section}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <label style={S.label}>Select subtopics to learn</label>
            <button style={S.btnSm} onClick={selectAll}>Select All</button>
          </div>
          <div style={{ display:'grid', gap:'10px', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))' }}>
            {data.subtopics?.map(st => {
              const isSelected = selected.includes(st.id);
              return (
                <div key={st.id}
                  style={{ ...S.chip, background: isSelected?'rgba(99,102,241,0.25)':'rgba(99,102,241,0.08)', borderColor: isSelected?'#6366f1':'rgba(99,102,241,0.2)', transform: isSelected?'scale(1.02)':'scale(1)' }}
                  onClick={() => toggle(st.id)}>
                  <div style={{ width:'20px', height:'20px', borderRadius:'5px', border:`2px solid ${isSelected?'#6366f1':'#4b5563'}`, background: isSelected?'#6366f1':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .2s' }}>
                    {isSelected && <span style={{ color:'#fff', fontSize:'12px' }}>✓</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:'#e2e8f0', fontWeight:500, fontSize:'0.9rem' }}>{st.name}</div>
                    <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                      <span style={{ color: diffColor[st.difficulty]||'#94a3b8', fontSize:'0.75rem' }}>● {st.difficulty}</span>
                      <span style={{ color:'#64748b', fontSize:'0.75rem' }}>⏱ {st.estimated_minutes}min</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...S.section, display:'flex', gap:'24px', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:'200px' }}>
            <label style={S.label}>Session Duration (minutes): {duration}</label>
            <input type="range" min={15} max={180} step={15} value={duration} onChange={e=>setDuration(+e.target.value)}
              style={{ width:'100%', accentColor:'#6366f1' }} />
            <div style={{ display:'flex', justifyContent:'space-between', color:'#64748b', fontSize:'0.75rem', marginTop:'4px' }}>
              <span>15min</span><span>3hr</span>
            </div>
          </div>
        </div>

        {data.related_topics?.length > 0 && (
          <div style={{ ...S.section, padding:'16px', background:'rgba(56,189,248,0.08)', borderRadius:'12px', border:'1px solid rgba(56,189,248,0.2)' }}>
            <label style={{ ...S.label, color:'#38bdf8' }}>🔗 Related topics you might explore next</label>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {data.related_topics.map(t => <span key={t} style={{ ...S.tag, background:'rgba(56,189,248,0.1)', color:'#38bdf8', border:'1px solid rgba(56,189,248,0.2)' }}>{t}</span>)}
            </div>
          </div>
        )}

        <button
          style={{ ...S.btn, width:'100%', fontSize:'1.1rem', padding:'18px', opacity: selected.length===0?0.5:1, marginTop:'8px' }}
          disabled={selected.length===0}
          onClick={() => onSelect({ topic: data.main_topic, subtopics: data.subtopics.filter(s=>selected.includes(s.id)).map(s=>s.name), duration })}>
          🚀 Generate My Personalized Tutorial ({selected.length} topics, {duration}min)
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Tutorial Viewer ──────────────────────────────────────────────────
function TutorialStep({ tutorial, topic, onQuiz }) {
  const [activeSection, setActiveSection] = useState(0);
  const [completed, setCompleted] = useState(new Set());
  const sections = tutorial.sections || [];

  const markDone = (i) => setCompleted(prev => new Set([...prev, i]));
  const pct = sections.length ? Math.round(completed.size / sections.length * 100) : 0;

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative' }}>
      <BgParticles />

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:10, background:'rgba(10,10,15,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(99,102,241,0.2)', padding:'12px 24px' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto', display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
          <button style={S.btnSm} onClick={() => window.location.reload()}>← Home</button>
          <div style={{ flex:1, minWidth:'200px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
              <span style={{ color:'#e2e8f0', fontWeight:600 }}>{tutorial.title}</span>
              <span style={{ color:'#6366f1', fontWeight:700 }}>{pct}%</span>
            </div>
            <div style={S.progress}><div style={{ height:'100%', width:pct+'%', background:'linear-gradient(90deg,#6366f1,#8b5cf6)', transition:'width .5s', borderRadius:'3px' }}/></div>
          </div>
          <button style={{ ...S.btn, padding:'10px 20px' }} onClick={onQuiz}>Take Quiz 📝</button>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, maxWidth:'1100px', margin:'0 auto', width:'100%', padding:'24px', gap:'24px', position:'relative', zIndex:1 }}>
        {/* Sidebar */}
        <div style={{ width:'260px', flexShrink:0, display:'flex', flexDirection:'column', gap:'6px', position:'sticky', top:'80px', alignSelf:'flex-start', maxHeight:'calc(100vh - 100px)', overflowY:'auto' }}>
          <div style={{ color:'#94a3b8', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 8px 8px' }}>Sections</div>
          {sections.map((sec, i) => (
            <button key={i} onClick={() => setActiveSection(i)} style={{
              background: activeSection===i ? 'rgba(99,102,241,0.25)' : 'transparent',
              border: activeSection===i ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
              borderRadius:'8px', padding:'10px 12px', textAlign:'left', cursor:'pointer',
              color: completed.has(i) ? '#22c55e' : activeSection===i ? '#e2e8f0' : '#94a3b8',
              fontSize:'0.85rem', fontWeight: activeSection===i ? 600 : 400, transition:'all .2s'
            }}>
              {completed.has(i) ? '✓ ' : `${i+1}. `}{sec.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          {sections[activeSection] && (
            <div style={{ ...S.card, padding:'32px' }}>
              <h2 style={{ fontSize:'1.8rem', fontWeight:800, color:'#e2e8f0', marginBottom:'8px' }}>
                {sections[activeSection].title}
              </h2>
              <div style={{ display:'flex', gap:'12px', marginBottom:'24px' }}>
                <span style={{ color:'#64748b', fontSize:'0.85rem' }}>⏱ ~{sections[activeSection].estimated_minutes} min</span>
                {sections[activeSection].has_code && <span style={{ color:'#38bdf8', fontSize:'0.85rem' }}>{'</>'} Code included</span>}
              </div>

              {sections[activeSection].key_points?.length > 0 && (
                <div style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'12px', padding:'16px', marginBottom:'24px' }}>
                  <div style={{ color:'#818cf8', fontWeight:700, marginBottom:'8px' }}>🎯 Key Points</div>
                  {sections[activeSection].key_points.map((kp, i) => (
                    <div key={i} style={{ color:'#cbd5e1', fontSize:'0.9rem', padding:'4px 0', paddingLeft:'16px', borderLeft:'2px solid #6366f1', marginBottom:'4px' }}>
                      {kp}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ color:'#cbd5e1', lineHeight:1.8 }} className="prose">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className||'');
                      return !inline && match ? (
                        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code style={{ background:'rgba(99,102,241,0.2)', padding:'2px 6px', borderRadius:'4px', fontFamily:'JetBrains Mono,monospace', fontSize:'0.9em' }} {...props}>{children}</code>
                      );
                    },
                    h1: ({children}) => <h1 style={{fontSize:'1.5rem',fontWeight:700,color:'#e2e8f0',margin:'24px 0 12px'}}>{children}</h1>,
                    h2: ({children}) => <h2 style={{fontSize:'1.3rem',fontWeight:700,color:'#e2e8f0',margin:'20px 0 10px'}}>{children}</h2>,
                    h3: ({children}) => <h3 style={{fontSize:'1.1rem',fontWeight:600,color:'#c4b5fd',margin:'16px 0 8px'}}>{children}</h3>,
                    p: ({children}) => <p style={{marginBottom:'16px',color:'#cbd5e1'}}>{children}</p>,
                    ul: ({children}) => <ul style={{paddingLeft:'24px',marginBottom:'16px',color:'#cbd5e1'}}>{children}</ul>,
                    ol: ({children}) => <ol style={{paddingLeft:'24px',marginBottom:'16px',color:'#cbd5e1'}}>{children}</ol>,
                    li: ({children}) => <li style={{marginBottom:'6px'}}>{children}</li>,
                    strong: ({children}) => <strong style={{color:'#e2e8f0',fontWeight:600}}>{children}</strong>,
                    blockquote: ({children}) => <blockquote style={{borderLeft:'4px solid #6366f1',paddingLeft:'16px',margin:'16px 0',color:'#94a3b8',fontStyle:'italic'}}>{children}</blockquote>,
                  }}
                >
                  {sections[activeSection].content}
                </ReactMarkdown>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', marginTop:'32px', gap:'12px' }}>
                <button style={{ ...S.btnSm, opacity: activeSection===0?0.4:1 }} disabled={activeSection===0} onClick={() => setActiveSection(i=>i-1)}>← Previous</button>
                <div style={{ display:'flex', gap:'12px' }}>
                  {!completed.has(activeSection) && (
                    <button style={{ ...S.btnSm, background:'rgba(34,197,94,0.15)', borderColor:'rgba(34,197,94,0.4)', color:'#22c55e' }} onClick={() => markDone(activeSection)}>
                      ✓ Mark Complete
                    </button>
                  )}
                  {activeSection < sections.length - 1 && (
                    <button style={S.btn} onClick={() => { markDone(activeSection); setActiveSection(i=>i+1); }}>
                      Next →
                    </button>
                  )}
                  {activeSection === sections.length - 1 && (
                    <button style={S.btn} onClick={onQuiz}>Take the Quiz! 🎯</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Quiz ─────────────────────────────────────────────────────────────
function QuizStep({ quiz, topic, onResult }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const q = quiz[current];
  const pct = Math.round((current / quiz.length) * 100);

  const confirm = () => {
    if (selected === null) return;
    setConfirmed(true);
    setAnswers(prev => [...prev, { question: q.question, chosen: selected, correct: q.correct, is_correct: selected === q.correct }]);
  };

  const next = async () => {
    setConfirmed(false); setSelected(null);
    if (current < quiz.length - 1) { setCurrent(i => i+1); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/submit-quiz`, { topic, answers: [...answers], user_id: uid() });
      onResult(res.data);
    } catch { onResult({ score: answers.filter(a=>a.is_correct).length/answers.length*100, correct: answers.filter(a=>a.is_correct).length, total: answers.length, proficiency:'Unknown', percentile:50, stats:{median:50,q1:25,q3:75,total_participants:1} }); }
    setLoading(false);
  };

  const letters = ['A','B','C','D'];

  return (
    <div style={S.page}>
      <BgParticles />
      <div style={S.card}>
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
            <span style={{ color:'#94a3b8' }}>Question {current+1} of {quiz.length}</span>
            <span style={{ color:'#6366f1', fontWeight:700 }}>{pct}%</span>
          </div>
          <div style={S.progress}><div style={{ height:'100%', width:pct+'%', background:'linear-gradient(90deg,#6366f1,#8b5cf6)', transition:'width .5s', borderRadius:'3px' }}/></div>
        </div>

        <h2 style={{ fontSize:'1.4rem', fontWeight:700, color:'#e2e8f0', marginBottom:'28px', lineHeight:1.5 }}>
          {current+1}. {q.question}
        </h2>

        <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'24px' }}>
          {q.options.map((opt, i) => {
            let bg='rgba(99,102,241,0.08)', border='rgba(99,102,241,0.2)', color='#cbd5e1';
            if (confirmed) {
              if (i === q.correct) { bg='rgba(34,197,94,0.15)'; border='rgba(34,197,94,0.5)'; color='#22c55e'; }
              else if (i === selected && i !== q.correct) { bg='rgba(239,68,68,0.15)'; border='rgba(239,68,68,0.5)'; color='#ef4444'; }
            } else if (selected === i) { bg='rgba(99,102,241,0.25)'; border='#6366f1'; color='#e2e8f0'; }
            return (
              <div key={i} onClick={() => !confirmed && setSelected(i)}
                style={{ ...S.chip, background:bg, borderColor:border, color, cursor:confirmed?'default':'pointer', transform:selected===i&&!confirmed?'scale(1.01)':'scale(1)' }}>
                <span style={{ width:'28px', height:'28px', borderRadius:'6px', background:'rgba(99,102,241,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.85rem', flexShrink:0 }}>{letters[i]}</span>
                <span style={{ fontSize:'0.95rem' }}>{opt}</span>
              </div>
            );
          })}
        </div>

        {confirmed && (
          <div style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'12px', padding:'16px', marginBottom:'20px' }}>
            <div style={{ color:'#818cf8', fontWeight:700, marginBottom:'4px' }}>💡 Explanation</div>
            <div style={{ color:'#cbd5e1', fontSize:'0.9rem', lineHeight:1.6 }}>{q.explanation}</div>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:'12px' }}>
          {!confirmed ? (
            <button style={{ ...S.btn, opacity:selected===null?0.4:1 }} disabled={selected===null} onClick={confirm}>Confirm Answer</button>
          ) : (
            <button style={S.btn} onClick={next} disabled={loading}>
              {loading ? 'Submitting...' : current < quiz.length - 1 ? 'Next Question →' : 'See Results 🏆'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Results ──────────────────────────────────────────────────────────
function ResultStep({ result, topic, onRestart }) {
  const { score, correct, total, proficiency, percentile, stats } = result;

  const profColors = { Expert:'#f59e0b', Advanced:'#22c55e', Intermediate:'#6366f1', Developing:'#38bdf8', Beginner:'#94a3b8' };
  const profEmoji = { Expert:'🏆', Advanced:'⭐', Intermediate:'📈', Developing:'🌱', Beginner:'🎯' };
  const color = profColors[proficiency] || '#6366f1';

  const chartData = [
    { name:'Q1 (25th)', value: stats.q1, fill:'#38bdf8' },
    { name:'Median (50th)', value: stats.median, fill:'#818cf8' },
    { name:'Q3 (75th)', value: stats.q3, fill:'#c084fc' },
    { name:'Your Score', value: score, fill: color },
  ];

  const radarData = [
    { subject:'Score', A: score },
    { subject:'vs Median', A: Math.min(100, (score / (stats.median||1)) * 60) },
    { subject:'Percentile', A: percentile },
    { subject:'Correct', A: (correct/total)*100 },
    { subject:'Completion', A: 100 },
  ];

  return (
    <div style={S.page}>
      <BgParticles />
      <div style={{ ...S.card, maxWidth:'920px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ fontSize:'5rem', marginBottom:'16px' }}>{profEmoji[proficiency]||'🎯'}</div>
          <h1 style={{ fontSize:'2.5rem', fontWeight:800, color:'#e2e8f0', marginBottom:'8px' }}>Learning Complete!</h1>
          <p style={{ color:'#94a3b8', fontSize:'1.1rem' }}>Here's your performance analysis for <strong style={{ color:'#818cf8' }}>{topic}</strong></p>
        </div>

        {/* Score + Proficiency */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', marginBottom:'32px' }}>
          {[
            { label:'Your Score', value:`${Math.round(score)}%`, sub:`${correct} / ${total} correct`, color:'#e2e8f0' },
            { label:'Proficiency Level', value: profEmoji[proficiency]+' '+proficiency, sub:'Based on your performance', color },
            { label:'Percentile Rank', value:`Top ${Math.round(100-percentile)}%`, sub:`Better than ${Math.round(percentile)}% of learners`, color:'#22c55e' },
            { label:'Participants', value: stats.total_participants, sub:'Took similar quiz', color:'#38bdf8' },
          ].map(stat => (
            <div key={stat.label} style={{ background:'rgba(15,15,30,0.6)', border:`1px solid ${stat.color}40`, borderRadius:'16px', padding:'20px', textAlign:'center' }}>
              <div style={{ color:'#64748b', fontSize:'0.8rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>{stat.label}</div>
              <div style={{ fontSize:'1.8rem', fontWeight:800, color:stat.color, marginBottom:'4px' }}>{stat.value}</div>
              <div style={{ color:'#64748b', fontSize:'0.8rem' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'32px' }}>
          <div style={{ background:'rgba(15,15,30,0.6)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'20px' }}>
            <div style={{ color:'#818cf8', fontWeight:700, marginBottom:'16px' }}>📊 Score Distribution</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={40}>
                <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:'#1a1a2e', border:'1px solid #6366f1', borderRadius:'8px', color:'#e2e8f0' }}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background:'rgba(15,15,30,0.6)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'20px' }}>
            <div style={{ color:'#818cf8', fontWeight:700, marginBottom:'8px' }}>🕸 Performance Radar</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b"/>
                <PolarAngleAxis dataKey="subject" tick={{ fill:'#64748b', fontSize:11 }}/>
                <Radar name="You" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Benchmark */}
        <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'16px', padding:'24px', marginBottom:'28px' }}>
          <div style={{ color:'#818cf8', fontWeight:700, marginBottom:'16px' }}>📈 Benchmark Comparison</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {[
              { label:'25th Percentile (Q1)', val:stats.q1, color:'#38bdf8' },
              { label:'Median (50th)', val:stats.median, color:'#818cf8' },
              { label:'75th Percentile (Q3)', val:stats.q3, color:'#c084fc' },
              { label:'Your Score', val:score, color },
            ].map(row => (
              <div key={row.label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ color:'#94a3b8', fontSize:'0.85rem' }}>{row.label}</span>
                  <span style={{ color:row.color, fontWeight:700, fontSize:'0.9rem' }}>{Math.round(row.val)}%</span>
                </div>
                <div style={S.progress}><div style={{ height:'100%', width:row.val+'%', background:row.color, borderRadius:'3px', transition:'width 1s' }}/></div>
              </div>
            ))}
          </div>
        </div>

        {/* What it means */}
        <div style={{ background:`${color}15`, border:`1px solid ${color}40`, borderRadius:'16px', padding:'20px', marginBottom:'28px' }}>
          <div style={{ fontWeight:700, color, marginBottom:'8px' }}>What does "{proficiency}" mean?</div>
          <div style={{ color:'#cbd5e1', fontSize:'0.95rem', lineHeight:1.7 }}>
            {proficiency==='Expert' && "Outstanding! You've demonstrated mastery-level understanding. You're in the top tier of all learners on this topic. Consider exploring advanced applications or teaching others."}
            {proficiency==='Advanced' && "Excellent work! You have a strong grasp of the topic with above-average performance. You're well-positioned to tackle real-world applications and more complex variations."}
            {proficiency==='Intermediate' && "Good progress! You understand the core concepts well. Focus on reinforcing the areas where you hesitated and practice with more real-world examples to advance further."}
            {proficiency==='Developing' && "You're building a foundation! Some key concepts need more practice. Review the sections where you found difficulty and retake the quiz after more study."}
            {proficiency==='Beginner' && "Everyone starts somewhere! This topic has many nuances to explore. Take your time with the tutorial sections, and don't hesitate to revisit challenging parts."}
          </div>
        </div>

        <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
          <button style={{ ...S.btn, background:'linear-gradient(135deg,#22c55e,#16a34a)' }} onClick={onRestart}>🆕 Learn Another Topic</button>
          <button style={S.btnSm} onClick={() => window.print()}>🖨 Save Report</button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen({ message }) {
  return (
    <div style={{ ...S.page, textAlign:'center' }}>
      <BgParticles />
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ fontSize:'4rem', marginBottom:'24px', animation:'spin 2s linear infinite', display:'inline-block' }}>⚡</div>
        <h2 style={{ fontSize:'1.8rem', fontWeight:700, color:'#e2e8f0', marginBottom:'12px' }}>Generating with AI...</h2>
        <p style={{ color:'#94a3b8', marginBottom:'32px' }}>{message}</p>
        <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#6366f1', animation:`pulse 1.2s ${i*0.3}s ease-in-out infinite` }}/>
          ))}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.4);opacity:1}} @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState('landing');
  const [suggestions, setSuggestions] = useState(null);
  const [tutorial, setTutorial] = useState(null);
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const handleSuggestions = (data) => { setSuggestions(data); setStep('suggestions'); };

  const handleSelect = useCallback(async ({ topic: t, subtopics, duration }) => {
    setTopic(t); setLoading(true); setLoadingMsg(`Creating your personalized ${t} tutorial with AI...`);
    try {
      const res = await axios.post(`${API}/api/generate-tutorial`, { topic: t, subtopics, duration });
      setTutorial(res.data); setStep('tutorial');
    } catch (e) {
      alert('Failed to generate tutorial. Please try again.');
    }
    setLoading(false);
  }, []);

  const handleQuiz = () => setStep('quiz');
  const handleResult = (r) => { setResult(r); setStep('result'); };
  const handleRestart = () => { setStep('landing'); setSuggestions(null); setTutorial(null); setTopic(''); setResult(null); };

  if (loading) return <LoadingScreen message={loadingMsg}/>;

  if (step==='landing') return <LandingStep onSubmit={handleSuggestions}/>;
  if (step==='suggestions') return <TopicSuggestionsStep data={suggestions} onSelect={handleSelect}/>;
  if (step==='tutorial' && tutorial) return <TutorialStep tutorial={tutorial} topic={topic} onQuiz={handleQuiz}/>;
  if (step==='quiz' && tutorial?.quiz) return <QuizStep quiz={tutorial.quiz} topic={topic} onResult={handleResult}/>;
  if (step==='result' && result) return <ResultStep result={result} topic={topic} onRestart={handleRestart}/>;

  return <LoadingScreen message="Loading..."/>;
}
