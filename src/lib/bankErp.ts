/**
 * Stand-in for a lookup against the bank's own ERP/case-management system
 * — "how often has this recipient been reported by other customers" is
 * data the bank holds, not something a browser can detect on its own.
 * Demo-only static table; production would be a real backend query (see
 * requirements.md §5 Data Requirements).
 */
const RECIPIENT_REPORT_RATES: Record<string, number> = {
  'agnes kar men': 0.42,
  'quickcash transfer sdn bhd': 0.67,
};

const HIGH_REPORT_RATE_THRESHOLD = 0.3;

function normalize(name: string): string {
  return (name || '').trim().toLowerCase();
}

export function getReportRate(name: string): number {
  return RECIPIENT_REPORT_RATES[normalize(name)] ?? 0;
}

export function hasHighReportRate(name: string): boolean {
  return getReportRate(name) >= HIGH_REPORT_RATE_THRESHOLD;
}
