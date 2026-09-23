import { ScreenShell } from '../layout/ScreenShell';
import { BackLink } from '../layout/BackLink';
import { Button } from '../Button';
import { CategoryBadges } from '../CategoryBadges';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { money } from '../../lib/format';
import { buildIncidentReport } from '../../lib/incidentReport';

export function ReviewConsoleScreen() {
  const { pendingReview, reviewDecide } = useAppState();
  const t = useT();

  return (
    <ScreenShell>
      <BackLink to="home" />
      <h1 className="text-xl font-bold text-balance">{t('reviewConsoleTitle')}</h1>
      {pendingReview.length === 0 && <p>{t('reviewConsoleEmpty')}</p>}
      <ul className="flex flex-col gap-3">
        {pendingReview.map((incident) => (
          <li key={incident.id} className="border border-border rounded-xl p-4 flex justify-between items-start gap-3 flex-wrap">
            <div>
              <strong>{incident.subject}</strong> · {money(incident.amount)}
              <CategoryBadges categories={incident.categories} />
              <div className="text-xs text-ink-muted mt-1">{incident.reasons.join(' · ')}</div>
              <div className="text-xs text-ink-muted mt-1">{incident.timestamp}</div>
              {/* Ops-facing only — the malware tier is the one that requires
                  investigation + a report before it can be resolved. */}
              {incident.categories.some((c) => c.id === 'malware') && (
                <details className="mt-2">
                  <summary className="cursor-pointer list-none marker:content-none text-xs font-bold text-accent min-h-tap flex items-center [&::-webkit-details-marker]:hidden">
                    {t('generateReportButton')}
                  </summary>
                  <pre className="mt-2 text-xs bg-bg rounded-lg p-3 whitespace-pre-wrap font-sans">{buildIncidentReport(incident)}</pre>
                </details>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => reviewDecide(incident.id, true)}>{t('approveButton')}</Button>
              <Button variant="danger" onClick={() => reviewDecide(incident.id, false)}>
                {t('declineButton')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </ScreenShell>
  );
}
