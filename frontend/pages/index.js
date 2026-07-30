import { useEffect, useRef, useState } from 'react';

const API_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

const LOADING_STAGES = [
  'Receiving trigger…',
  'Generating community alert…',
  'Validating critical facts…',
];

const FACT_ICONS = {
  hazard_type: '⚠️',
  severity: '🔥',
  location: '🌍',
  threshold_crossed: '📊',
  timeframe: '📅',
};

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
      setStageIndex(LOADING_STAGES.length); // "Ready" sentinel
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

  return (
    <div style={{ minHeight: '100vh', padding: '2.5rem 1.5rem 4rem', maxWidth: 1040, margin: '0 auto' }}>
      {/* Hero */}
      <header style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0 0 0.15rem', color: 'var(--accent-forest-dark)', letterSpacing: '-0.01em' }}>
          Sauti ya Tahadhari
        </h1>
        <p style={{ margin: '0 0 0.9rem', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Voice of Warning
        </p>
        <p style={{ maxWidth: 560, margin: '0 auto 1rem', fontSize: '1rem', lineHeight: 1.5, color: 'var(--text)' }}>
          Transforming technical early-warning alerts into clear, trusted guidance for communities
          and emergency responders across the IGAD region.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Badge>🛰️ ICPAC-Aligned Schema</Badge>
          <Badge>🤖 AI Assisted</Badge>
          <Badge>✅ Fact Validation</Badge>
          <Badge>🌍 IGAD Region</Badge>
        </div>
      </header>

      {/* How it works */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '2.25rem',
          padding: '1rem',
          background: 'var(--panel-muted)',
          borderRadius: 10,
        }}
      >
        {['1️⃣ Receive Hazard Trigger', '2️⃣ AI Generates Local Guidance', '3️⃣ Validate Critical Facts', '4️⃣ Deliver Actionable Warning'].map(
          (step, i, arr) => (
            <span key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--accent-forest-dark)', whiteSpace: 'nowrap' }}>{step}</span>
              {i < arr.length - 1 && <span style={{ color: 'var(--text-muted)' }}>→</span>}
            </span>
          )
        )}
      </section>

      {/* Trigger picker */}
      <section
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--panel-border)',
          borderRadius: 12,
          padding: '1.4rem 1.6rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(31,42,34,0.06)',
        }}
      >
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
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
              borderRadius: 6,
              padding: '0.6rem 0.75rem',
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
              background: loading ? '#c9b077' : 'var(--accent-amber)',
              color: '#241804',
              border: 'none',
              borderRadius: 6,
              padding: '0.6rem 1.4rem',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? (stageIndex < LOADING_STAGES.length ? LOADING_STAGES[stageIndex] : 'Ready ✓') : 'Generate Alert →'}
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
            borderRadius: 8,
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            color: 'var(--danger)',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Welcome to Sauti ya Tahadhari
          </p>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>
            Select an early-warning trigger above to generate a validated community alert.
          </p>
        </div>
      )}

      {result && (
        <>
          <ValidationCard validation={result.validation} />

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <Panel title="Verified Source Data" badgeColor="var(--accent-teal)" mono>
              {Object.entries(result.locked_facts).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {FACT_ICONS[k] || '•'} {k.replace(/_/g, ' ')}
                  </div>
                  <div>{v}</div>
                </div>
              ))}
            </Panel>

            <Panel title="Community Alert" badgeColor="var(--accent-amber)">
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>
                  📢 Public message
                </div>
                <div style={{ lineHeight: 1.5 }}>{result.public_message}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>
                  📝 Officer checklist
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', lineHeight: 1.6 }}>
                  {result.officer_checklist.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>
        </>
      )}

      {/* Impact section — always visible, reinforces value even before a click */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <ImpactCard title="Communities" body="Receive clear warnings instead of technical bulletins." />
        <ImpactCard title="Emergency Officers" body="Receive actionable response checklists." />
        <ImpactCard title="Regional Agencies" body="Maintain consistency between official alerts and public communication." />
      </section>

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2.5rem' }}>
        Helping bridge the gap between technical hazard intelligence and informed community action.
      </p>

      <style jsx>{`
        select:focus,
        button:focus-visible {
          outline: 2px solid var(--accent-amber);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        background: 'var(--panel)',
        border: '1px solid var(--panel-border)',
        borderRadius: 999,
        padding: '0.3rem 0.75rem',
        color: 'var(--accent-forest-dark)',
      }}
    >
      {children}
    </span>
  );
}

function ValidationCard({ validation }) {
  const passed = validation.passed;
  return (
    <div
      style={{
        marginBottom: '1.5rem',
        padding: '1rem 1.25rem',
        borderRadius: 10,
        background: passed ? 'var(--teal-bg)' : 'var(--danger-bg)',
        border: `1px solid ${passed ? 'var(--accent-teal)' : 'var(--danger)'}`,
      }}
    >
      <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 4, color: passed ? 'var(--accent-teal)' : 'var(--danger)' }}>
        {passed ? '✅ FACT VALIDATION' : '✕ FACT VALIDATION FAILED'}
      </div>
      <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
        {passed
          ? 'Every safety-critical field matches the original hazard trigger.'
          : `${validation.mismatches.length} field(s) did not match the source trigger.`}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
        Status: <strong style={{ color: passed ? 'var(--accent-teal)' : 'var(--danger)' }}>{passed ? 'Verified' : 'Failed'}</strong>
      </div>
    </div>
  );
}

function Panel({ title, badgeColor, mono, children }) {
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--panel-border)',
        borderRadius: 12,
        padding: '1.4rem 1.6rem',
        boxShadow: '0 1px 3px rgba(31,42,34,0.06)',
      }}
      className={mono ? 'mono' : ''}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: badgeColor, display: 'inline-block' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function ImpactCard({ title, body }) {
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--panel-border)',
        borderRadius: 10,
        padding: '1.1rem 1.25rem',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 6, color: 'var(--accent-forest-dark)' }}>{title}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}
