import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { getActivityHeadline } from '../../lib/projectActivityHumanize';

// ── Severity badge ─────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
  critical: { bg: '#fee2e2', color: '#991b1b', label: 'Critique' },
  warning:  { bg: '#fef3c7', color: '#92400e', label: 'Attention' },
  info:     { bg: '#e0f2fe', color: '#075985', label: 'Info' },
};

function SeverityBadge({ severity = 'info' }) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

// ── Module badge ────────────────────────────────────────────────────────────────

const MODULE_COLORS = {
  task:    { bg: '#ede9fe', color: '#5b21b6' },
  project: { bg: '#ede9fe', color: '#6d28d9' },
};

function ModuleBadge({ action = '' }) {
  const mod = action.split('.')[0] ?? 'autre';
  const s = MODULE_COLORS[mod] ?? { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
    }}>
      {mod}
    </span>
  );
}

// ── Analytics summary table ────────────────────────────────────────────────────

function AnalyticsSummary({ data }) {
  if (!data) return null;
  const { kpis, by_severity, by_module, collaboration_score, generated_at } = data;

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
        Synthèse analytique
      </h2>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Activités (30j)',   value: kpis?.total_30d ?? 0 },
          { label: 'Activités (7j)',    value: kpis?.total_7d ?? 0 },
          { label: 'Critiques (7j)',    value: kpis?.critical_7d ?? 0 },
          { label: 'Utilisateurs (7j)', value: kpis?.unique_users_7d ?? 0 },
          { label: 'Score collaboration', value: `${collaboration_score ?? 0}%` },
        ].map((k) => (
          <div key={k.label} style={{
            flex: '1 1 100px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Distribution tables */}
      <div style={{ display: 'flex', gap: 24 }}>
        {/* By severity */}
        <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={thStyle}>Sévérité</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(by_severity ?? {}).map(([sev, cnt]) => (
              <tr key={sev} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}><SeverityBadge severity={sev} /></td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{cnt}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* By module */}
        <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={thStyle}>Module</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Nombre</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(by_module ?? {}).slice(0, 6).map(([mod, cnt]) => (
              <tr key={mod} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}><ModuleBadge action={`${mod}.x`} /></td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{cnt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
        Données générées le {generated_at ? new Date(generated_at).toLocaleString('fr-FR') : '—'}
      </div>
    </div>
  );
}

// ── Table styles ───────────────────────────────────────────────────────────────

const thStyle = {
  padding: '6px 10px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#475569',
  fontSize: 11,
  borderBottom: '2px solid #e2e8f0',
};

const tdStyle = {
  padding: '8px 10px',
  verticalAlign: 'middle',
  fontSize: 12,
  color: '#1e293b',
};

// ── Main report page ───────────────────────────────────────────────────────────

export default function AuditReportPage() {
  const [searchParams] = useSearchParams();
  const printedRef = useRef(false);

  const feedParams = {
    per_page:  100,
    project_id:  searchParams.get('project_id')  || undefined,
    actor_id:    searchParams.get('actor_id')    || undefined,
    module:      searchParams.get('module')      || undefined,
    severity:    searchParams.get('severity')    || undefined,
    date_from:   searchParams.get('date_from')   || undefined,
    date_to:     searchParams.get('date_to')     || undefined,
    search:      searchParams.get('search')      || undefined,
  };

  const cleanParams = Object.fromEntries(
    Object.entries(feedParams).filter(([, v]) => v !== undefined && v !== ''),
  );

  const { data: feedData, isSuccess: feedOk } = useQuery({
    queryKey: ['audit-report-feed', cleanParams],
    queryFn: () => api.get('/activity/feed', { params: cleanParams }).then((r) => r.data),
    staleTime: 0,
  });

  const { data: analyticsData, isSuccess: analyticsOk } = useQuery({
    queryKey: ['audit-report-analytics'],
    queryFn: () => api.get('/activity/analytics').then((r) => r.data),
    staleTime: 0,
  });

  // Auto-print once both queries resolve
  useEffect(() => {
    if (feedOk && analyticsOk && !printedRef.current) {
      printedRef.current = true;
      setTimeout(() => window.print(), 600);
    }
  }, [feedOk, analyticsOk]);

  const activities = feedData?.data ?? [];
  const total      = feedData?.meta?.total ?? activities.length;

  // Build active filter summary
  const filterParts = [];
  if (cleanParams.module)   filterParts.push(`Module : ${cleanParams.module}`);
  if (cleanParams.severity) filterParts.push(`Sévérité : ${cleanParams.severity}`);
  if (cleanParams.date_from) filterParts.push(`Du : ${cleanParams.date_from}`);
  if (cleanParams.date_to)   filterParts.push(`Au : ${cleanParams.date_to}`);
  if (cleanParams.search)    filterParts.push(`Recherche : "${cleanParams.search}"`);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 14mm; }
          body  { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; background: #fff; }
      `}</style>

      {/* Loading overlay (hidden on print) */}
      {(!feedOk || !analyticsOk) && (
        <div className="no-print" style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(255,255,255,0.92)', zIndex: 50,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 36, height: 36, border: '3px solid #6366f1',
              borderTopColor: 'transparent', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ color: '#64748b', fontSize: 14 }}>Chargement du rapport…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Report header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, borderBottom: '3px solid #4f46e5', paddingBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, background: '#4f46e5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Journal d'audit — Rapport
              </h1>
            </div>
            {filterParts.length > 0 && (
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                Filtres actifs : {filterParts.join(' · ')}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>TAC-TIC IntelliPM</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {total} événement{total !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* ── Analytics summary ── */}
        <AnalyticsSummary data={analyticsData} />

        {/* ── Activity table ── */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
          Événements ({activities.length}{total > activities.length ? ` sur ${total}` : ''})
        </h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ ...thStyle, width: 130 }}>Date &amp; Heure</th>
              <th style={{ ...thStyle, width: 130 }}>Utilisateur</th>
              <th style={thStyle}>Événement</th>
              <th style={{ ...thStyle, width: 70 }}>Module</th>
              <th style={{ ...thStyle, width: 80 }}>Sévérité</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((log, i) => {
              const headline = getActivityHeadline(log.action, log.meta ?? {}, log.actor?.name);
              const dt = new Date(log.created_at);
              const dateStr = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...tdStyle, color: '#64748b', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600 }}>{dateStr}</span>
                    <br />
                    <span style={{ fontSize: 11 }}>{timeStr}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.actor?.name ?? '—'}
                    {log.actor_role && (
                      <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>
                        {log.actor_role}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 320 }}>
                    <span style={{ lineHeight: 1.4 }}>{headline}</span>
                    {log.changed_fields?.length > 0 && (
                      <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                        Champs : {log.changed_fields.join(', ')}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}><ModuleBadge action={log.action} /></td>
                  <td style={tdStyle}><SeverityBadge severity={log.severity} /></td>
                </tr>
              );
            })}
            {activities.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 32 }}>
                  Aucun événement trouvé pour les filtres sélectionnés.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Footer ── */}
        <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
          <span>TAC-TIC IntelliPM — Rapport confidentiel</span>
          <span>Généré le {new Date().toLocaleString('fr-FR')}</span>
        </div>

        {/* Print button (hidden in print) */}
        <div className="no-print" style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 24px', background: '#4f46e5', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >
            Imprimer / Enregistrer en PDF
          </button>
        </div>
      </div>
    </>
  );
}
