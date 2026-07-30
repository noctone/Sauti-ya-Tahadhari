import { useEffect, useState } from 'react';

const API_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export default function Home() {
  const [samples, setSamples] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/samples`)
      .then((r) => r.json())
      .then((data) => {
        setSamples(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch(() => setError('Could not reach the backend. Is uvicorn running on ' + API_URL + '?'));
  }, []);

  async function handleGenerate() {
    const trigger = samples.find((s) => s.id === selectedId);
    if (!trigger) return;
    setLoading(true);
    setError(null);
    setResult(null);
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
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedTrigger = samples.find((s) => s.id === selectedId);

  return (
    <div style={{ minHeight: '100vh', padding: '2.5rem 1.5rem', maxWidth: 980, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <PulseDot />
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          Trigger &rarr; Understand &rarr; Act
        </h1>
      </header>
      <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '2.5rem', fontSize: '0.95rem' }}>
        Turns a technical hazard trigger into a plain-language public warning and an officer
        action checklist &mdash; with the safety-critical facts locked to source, never paraphrased.
      </p>

      <section
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--panel-border)',
          borderRadius: 10,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
          SELECT A HAZARD TRIGGER
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              flex: '1 1 320px',
              background: '#0B1120',
              color: 'var(--text)',
              border: '1px solid var(--panel-border)',
              borderRadius: 6,
              padding: '0.6rem 0.75rem',
              fontSize: '0.95rem',
            }}
          >
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.hazard_type.toUpperCase()} &middot; {s.severity} &middot; {s.location}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedId}
            style={{
              background: loading ? '#5a4322' : 'var(--accent-amber)',
              color: '#0B1120',
              border: 'none',
              borderRadius: 6,
              padding: '0.6rem 1.4rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Generating…' : 'Generate warning'}
          </button>
        </div>
        {selectedTrigger && (
          <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
            threshold: {selectedTrigger.threshold_crossed} &middot; timeframe: {selectedTrigger.timeframe}
          </p>
        )}
      </section>

      {error && (
        <div
          style={{
            background: 'rgba(232,84,61,0.1)',
            border: '1px solid var(--danger)',
            borderRadius: 8,
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            color: '#ffb4a8',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: '1.5rem',
              padding: '0.9rem 1.25rem',
              borderRadius: 8,
              background: result.validation.passed ? 'rgba(45,212,191,0.1)' : 'rgba(232,84,61,0.1)',
              border: `1px solid ${result.validation.passed ? 'var(--accent-teal)' : 'var(--danger)'}`,
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{result.validation.passed ? '✓' : '✕'}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              {result.validation.passed
                ? 'Validation passed — every safety-critical fact matches the source trigger exactly.'
                : `Validation failed — ${result.validation.mismatches.length} field(s) did not match source.`}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
              gap: '1.25rem',
            }}
          >
            <Panel title="SOURCE — LOCKED" badgeColor="var(--accent-teal)" mono>
              {Object.entries(result.locked_facts).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</div>
                  <div>{v}</div>
                </div>
              ))}
            </Panel>

            <Panel title="GENERATED — AI LANGUAGE" badgeColor="var(--accent-amber)">
              <div style={{ marginBottom: 18 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>
                  Public message
                </div>
                <div style={{ lineHeight: 1.5 }}>{result.public_message}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>
                  Officer checklist
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

function Panel({ title, badgeColor, mono, children }) {
  return (
    <div
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--panel-border)',
        borderRadius: 10,
        padding: '1.25rem 1.5rem',
      }}
      className={mono ? 'mono' : ''}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: badgeColor, display: 'inline-block' }} />
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function PulseDot() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 12, height: 12 }}>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'var(--accent-amber)',
          opacity: 0.5,
          animation: 'pulse-ring 2s ease-out infinite',
        }}
      />
      <span
        style={{
          position: 'relative',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--accent-amber)',
        }}
      />
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}
