import { useEffect, useRef, useState } from 'react';

const API_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

const LOADING_STAGES = [
  'Receiving trigger…',
  'Generating community alert…',
  'Validating critical facts…',
];

const FACT_ICON = {
  hazard_type: 'warning',
  severity: 'gauge',
  location: 'mapPin',
  threshold_crossed: 'gauge',
  timeframe: 'calendar',
};

/* ---------- Minimal hand-built stroke icons ---------- */
function Icon({ name, size = 18, color = 'currentColor' }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'satellite':
      return <svg {...common}><path d="M13 7l4 4-1.5 1.5-4-4z" /><path d="M9 11l4 4-3 3-4-4z" /><path d="M3 21l3-3" /><path d="M17 5l2-2 2 2-2 2z" /></svg>;
    case 'sparkles':
      return <svg {...common}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" /></svg>;
    case 'shieldCheck':
      return <svg {...common}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>;
    case 'xCircle':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>;
    case 'globe':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 4 6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-6-4-9s1.5-6.5 4-9z" /></svg>;
    case 'mapPin':
      return <svg {...common}><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>;
    case 'gauge':
      return <svg {...common}><path d="M4 15a8 8 0 0116 0" /><path d="M12 15l3.5-4.5" /><circle cx="12" cy="15" r="1.2" fill={color} stroke="none" /></svg>;
    case 'warning':
      return <svg {...common}><path d="M12 4l9 16H3z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.9" fill={color} stroke="none" /></svg>;
    case 'megaphone':
      return <svg {...common}><path d="M3 10v4h3l8 4V6l-8 4z" /><path d="M18 9a4 4 0 010 6" /></svg>;
    case 'clipboard':
      return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2.5" width="6" height="3" rx="1" /><path d="M8.5 11h7M8.5 15h7" /></svg>;
    case 'people':
      return <svg {...common}><circle cx="9" cy="8" r="2.6" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><circle cx="17" cy="9" r="2" /><path d="M15.5 19c0-2.2 1.8-4 4-4" /></svg>;
    case 'building':
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" /></svg>;
    case 'arrowDown':
      return <svg {...common}><path d="M12 4v14M6 13l6 6 6-6" /></svg>;
    default:
      return null;
  }
}

/* ---------- Subtle topographic contour background ---------- */
function BackgroundTexture() {
  const lines = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}
      viewBox="0 0 1200 900"
      preserveAspectRatio="xMidYMid slice"
    >
      {lines.map((i) => {
        const y = 60 + i * 95;
        const amp = 22 + (i % 3) * 10;
        const d = `M -50 ${y} C 150 ${y - amp}, 350 ${y + amp}, 550 ${y}, 750 ${y - amp}, 950 ${y + amp}, 1250 ${y}`;
        return <path key={i} d={d} fill="none" stroke="#1F5C3F" strokeWidth="1.4" opacity="0.06" />;
      })}
    </svg>
  );
}

function FlowStep({ icon, iconColor, title, subtitle, children, isLast, cardBg }) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#fff',
            border: `1.5px solid ${iconColor}`,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={19} />
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--panel-border)', minHeight: 24 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '1.75rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: iconColor, marginBottom: 2 }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>{subtitle}</div>}
        <div
          className="card"
          style={{
            background: cardBg || 'var(--panel)',
            border: '1px solid var(--panel-border)',
            borderRadius: 16,
            padding: '1.5rem 1.7rem',
            boxShadow: '0 1px 3px rgba(31,42,34,0.05)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [samples, setSamples] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/samples`)
      .then((r) => r.json())
      .then((data) => {
        setSamples(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => setError('Could not reach the backend. Is it running at ' + API_URL + '?'));
  }, []);

  async function handleGenerate() {
    const trigger = samples.find((s) => s.id === selectedId);
    if (!trigger) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setStageIndex(0);

    intervalRef.current = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, LOADING_STAGES.length - 1));
    }, 550);

    try {
      const res = await fetch(`${API_URL}/pipeline/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trigger),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      clearInterval(intervalRef.current);
      setStageIndex(LOADING_STAGES.length);
      await new Promise((r) => setTimeout(r, 350));
      setResult(data);
    } catch (e) {
      clearInterval(intervalRef.current);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedTrigger = samples.find((s) => s.id === selectedId);
  const HOW_IT_WORKS = [
    { icon: 'satellite', label: 'Receive Hazard Trigger' },
    { icon: 'sparkles', label: 'AI Generates Local Guidance' },
    { icon: 'shieldCheck', label: 'Validate Critical Facts' },
    { icon: 'megaphone', label: 'Deliver Actionable Warning' },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BackgroundTexture />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '3.5rem 1.5rem 4.5rem' }}>
        
        {/* Updated Hero Section */}
        <header
          style={{
            textAlign: "center",
            marginBottom: "3rem",
          }}
        >
          <h1
            className="serif"
            style={{
              fontSize: "3rem",
              fontWeight: 700,
              marginBottom: 8,
              color: "var(--accent-forest-dark)"
            }}
          >
            Sauti ya Tahadhari
          </h1>
          <p
            className="serif"
            style={{
              fontStyle: "italic",
              fontSize: "1.15rem",
              color: "var(--accent-clay)",
              marginBottom: "1.25rem"
            }}
          >
            Voice of Warning
          </p>
          <p
            style={{
              maxWidth: 650,
              margin: "0 auto",
              fontSize: "1.05rem",
              lineHeight: 1.7
            }}
          >
            Transforming technical early-warning intelligence into trusted,
            easy-to-understand guidance for communities and emergency responders
            across the IGAD region.
          </p>
          <div
            style={{
              marginTop: "2rem",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 15px 45px rgba(0,0,0,.18)"
            }}
          >
            <img
              src="/hero-igad.jpg"
              alt="IGAD Region"
              style={{
                width: "100%",
                height: 360,
                objectFit: "cover",
                display: "block"
              }}
            />
          </div>
        </header>

        {/* How it works */}
        <section
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '2.75rem',
            padding: '1.5rem 1rem',
            background: 'var(--panel-muted)',
            borderRadius: 14,
          }}
        >
          {HOW_IT_WORKS.map((step, i, arr) => (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 128 }}>
                <div
                  style={{
                    width: 38, height: 38, borderRadius: '50%', background: '#fff',
                    border: '1.5px solid var(--accent-forest)', color: 'var(--accent-forest)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name={step.icon} size={17} />
                </div>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, textAlign: 'center', color: 'var(--accent-forest-dark)', lineHeight: 1.3 }}>
                  {step.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <span style={{ color: 'var(--text-muted)', transform: 'rotate(-90deg)', display: 'flex' }}>
                  <Icon name="arrowDown" size={16} />
                </span>
              )}
            </div>
          ))}
        </section>

        {/* Trigger picker */}
        <section
          className="card"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--panel-border)',
            borderRadius: 14,
            padding: '1.5rem 1.7rem',
            marginBottom: '1.75rem',
            boxShadow: '0 1px 3px rgba(31,42,34,0.06)',
          }}
        >
          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 9, fontWeight: 600, letterSpacing: '0.03em' }}>
            SELECT A HAZARD TRIGGER
          </label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{
                flex: '1 1 320px',
                background: '#fff',
                color: 'var(--text)',
                border: '1px solid var(--panel-border)',
                borderRadius: 8,
                padding: '0.65rem 0.8rem',
                fontSize: '0.95rem',
              }}
            >
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.hazard_type.toUpperCase()} · {s.severity} · {s.location}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedId}
              style={{
                background: loading ? "#c9b077" : "linear-gradient(135deg,#D98E2B,#F0B84A)",
                color: "#23180B",
                border: "none",
                borderRadius: 8,
                padding: "0.7rem 1.5rem",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: loading ? "default" : "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {loading ? (stageIndex < LOADING_STAGES.length ? LOADING_STAGES[stageIndex] : 'Ready ✓') : 'Generate Community Alert →'}
            </button>
          </div>
          {selectedTrigger && (
            <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
              threshold: {selectedTrigger.threshold_crossed} · timeframe: {selectedTrigger.timeframe}
            </p>
          )}
        </section>

        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 10,
              padding: '1rem 1.25rem',
              marginBottom: '1.75rem',
              color: 'var(--danger)',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '2.75rem 1rem' }}>
            <p className="serif" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-forest-dark)', marginBottom: 6 }}>
              Welcome to Sauti ya Tahadhari
            </p>
            <p style={{ fontSize: '0.92rem', margin: 0, color: 'var(--text-muted)' }}>
              Select an early-warning trigger above to generate a validated community alert.
            </p>
          </div>
        )}

        {result && (
          <section className="fade-in" style={{ marginBottom: '3rem' }}>
            <FlowStep icon="satellite" iconColor="var(--accent-teal)" title="Official Hazard Intelligence" subtitle="Locked to source — never paraphrased">
              <div className="mono" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem' }}>
                {Object.entries(result.locked_facts).map(([k, v]) => (
                  <div key={k}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: 3 }}>
                      <Icon name={FACT_ICON[k] || 'gauge'} size={13} /> {k.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{v}</div>
                  </div>
                ))}
              </div>
            </FlowStep>

            {/* Validation Card with Updated Gradient Background */}
            <FlowStep
              icon={result.validation.passed ? 'shieldCheck' : 'xCircle'}
              iconColor={result.validation.passed ? 'var(--accent-teal)' : 'var(--danger)'}
              title={result.validation.passed ? 'Fact Validation — Verified' : 'Fact Validation — Failed'}
              cardBg={result.validation.passed ? "linear-gradient(90deg,#EDF8F7,#FFFFFF)" : "linear-gradient(90deg,#FDECEA,#FFFFFF)"}
            >
              <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                {result.validation.passed
                  ? 'Every safety-critical field in the alert below matches the original hazard trigger exactly.'
                  : `${result.validation.mismatches.length} field(s) did not match the source trigger.`}
              </div>
            </FlowStep>

            <FlowStep icon="megaphone" iconColor="var(--accent-amber)" title="Localized Community Warning" subtitle="AI-generated language, plain and actionable">
              <div style={{ lineHeight: 1.6, fontSize: '0.96rem' }}>{result.public_message}</div>
            </FlowStep>

            <FlowStep icon="clipboard" iconColor="var(--accent-clay)" title="Officer Actions" isLast>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.7, fontSize: '0.94rem' }}>
                {result.officer_checklist.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </FlowStep>
          </section>
        )}

        {/* Impact Cards */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <ImpactCard icon="people" title="Communities" body="Receive clear warnings instead of technical bulletins." />
          <ImpactCard icon="clipboard" title="Emergency Officers" body="Receive actionable response checklists." />
          <ImpactCard icon="building" title="Regional Agencies" body="Maintain consistency between official alerts and public communication." />
        </section>

        {/* Updated Footer Section */}
        <footer
          style={{
            marginTop: "3rem",
            paddingTop: "2rem",
            borderTop: "1px solid var(--panel-border)",
            textAlign: "center"
          }}
        >
          <p
            style={{
              fontWeight: 600,
              fontSize: "1rem",
              marginBottom: 10,
              color: "var(--accent-forest-dark)"
            }}
          >
            Helping bridge the gap between hazard intelligence and community action.
          </p>
          <p
            style={{
              fontSize: ".85rem",
              color: "var(--text-muted)"
            }}
          >
            Built for the IGAD Hackathon 2026
          </p>
        </footer>
      </div>

      <style jsx global>{`
        select:focus,
        button:focus-visible {
          outline: 2px solid var(--accent-amber);
          outline-offset: 2px;
        }
        .fade-in {
          animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Badge({ icon, children }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.76rem',
        fontWeight: 600,
        background: 'var(--panel)',
        border: '1px solid var(--panel-border)',
        borderRadius: 999,
        padding: '0.35rem 0.85rem 0.35rem 0.65rem',
        color: 'var(--accent-forest-dark)',
      }}
    >
      <Icon name={icon} size={14} color="var(--accent-forest)" />
      {children}
    </span>
  );
}

function ImpactCard({ icon, title, body }) {
  return (
    <div
      className="card"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--panel-border)',
        borderRadius: 12,
        padding: '1.25rem 1.4rem',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(31,42,34,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ color: 'var(--accent-forest)', marginBottom: 10 }}>
        <Icon name={icon} size={22} />
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: 6, color: 'var(--accent-forest-dark)' }}>{title}</div>
      <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}