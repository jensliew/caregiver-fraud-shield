import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { checkTransactionRisk } from '../lib/fraudCheck';
import { startTransferFlow, resolveChallenge as resolveChallengeFlow, resolveReview as resolveReviewFlow } from '../lib/transferFlow';
import { buildApprovalRequest } from '../lib/caregiverNotify';
import { newDecisionToken, sendCaregiverEmailAlert } from '../lib/emailNotify';
import { buildCaregiverEmailBody, buildCaregiverEmailFields, buildCaregiverEmailSubject } from '../lib/caregiverEmail';
import { shouldLockForMalware, shouldLockForSuspiciousProfile, shouldLockPayTransfer } from '../lib/featureLock';
import { hasHighReportRate } from '../lib/bankErp';
import type { Account } from '../lib/authApi';
import { clearSession, saveSessionEmail } from '../lib/session';
import {
  FONT_SCALE_PERCENT,
  loadAccessibilityPrefs,
  saveAccessibilityPrefs,
  type AccessibilityPrefs,
} from '../lib/accessibilityPrefs';
import {
  isKnownHighRiskRecipient,
  isLargeAmount,
  isNewPayee,
  INITIAL_ACTIVITY,
  INITIAL_BALANCE,
  INITIAL_FUNDING_SOURCES,
  INITIAL_TRANSFER_LIMIT,
} from '../lib/mockAccount';
import { money } from '../lib/format';
import type {
  ActivityItem,
  CaregiverRequest,
  Category,
  CurrentTransfer,
  DemoControls,
  FundingSource,
  Incident,
  IncidentStatus,
  Lang,
  OutcomeStatus,
  SavedPayee,
  Screen,
} from '../lib/types';

const INITIAL_DEMO_CONTROLS: DemoControls = {
  remoteAccessActive: false,
  sideloadedAppDetected: false,
  securityAppUninstalled: false,
  knownHighRiskRecipient: false,
  newOverseasAccount: false,
  differentCountryIP: false,
  multipleHighAmountTransactions: false,
  highReportRate: false,
  limitIncreaseRequest: false,
};

interface AppStateValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  account: Account | null;
  signIn: (account: Account) => void;
  signOut: () => void;
  balance: number;
  transferLimit: number;
  recentActivity: ActivityItem[];
  incidents: Incident[];
  pendingReview: Incident[];
  currentTransfer: CurrentTransfer | null;
  caregiverRequest: CaregiverRequest | null;
  outcomeStatus: OutcomeStatus | null;
  recentLimitIncrease: boolean;
  payTransferLocked: boolean;
  demoControls: DemoControls;
  setDemoControl: (key: keyof DemoControls, value: boolean) => void;
  fundingSources: FundingSource[];
  addFundingSource: (source: { bank: string; accountNumber: string }) => string;
  selectedFundingSourceId: string;
  setSelectedFundingSourceId: (id: string) => void;
  payees: SavedPayee[];
  addPayee: (payee: { name: string; bank: string; accountNumber: string }) => string;
  selectedPayeeId: string;
  setSelectedPayeeId: (id: string) => void;
  logCaregiverEmail: (incidentId: number, subject: string, body: string) => void;
  logIdentityCheck: (incidentId: number, verified: boolean) => void;
  accessibilityPrefs: AccessibilityPrefs;
  setAccessibilityPref: <K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => void;
  addFunds: (amount: number) => void;
  submitTransfer: (payee: string, amount: number) => void;
  applyLimitDirectly: (newLimit: number) => void;
  logLimitIncreaseAttempt: (amount: number) => number;
  resolveLimitIncreaseAttempt: (id: number, status: 'resumed' | 'blocked') => void;
  resolveChallenge: (passed: boolean) => void;
  caregiverDecide: (approved: boolean) => void;
  unblockPayTransfer: () => void;
  reviewDecide: (id: number, approved: boolean) => void;
}

const AppStateCtx = createContext<AppStateValue | null>(null);

let nextIncidentId = 1;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const [screen, setScreen] = useState<Screen>('login');
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [transferLimit, setTransferLimit] = useState(INITIAL_TRANSFER_LIMIT);
  const [recentActivity] = useState<ActivityItem[]>(INITIAL_ACTIVITY);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [currentTransfer, setCurrentTransfer] = useState<CurrentTransfer | null>(null);
  const [caregiverRequest, setCaregiverRequest] = useState<CaregiverRequest | null>(null);
  const [outcomeStatus, setOutcomeStatus] = useState<OutcomeStatus | null>(null);
  // Set once a real >=S$10,000 limit increase completes (see
  // resolveLimitIncreaseAttempt below); combined with a later
  // suspicious-profile-flagged transfer, this is the "combination of
  // signals" tier from requirements.md FR2.3 — see lib/featureLock.ts.
  const [recentLimitIncrease, setRecentLimitIncrease] = useState(false);
  const [payTransferLocked, setPayTransferLocked] = useState(false);
  const [demoControls, setDemoControls] = useState<DemoControls>(INITIAL_DEMO_CONTROLS);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>(INITIAL_FUNDING_SOURCES);
  // Lives here, not as AddMoneyScreen's own local state, so it survives the
  // round trip to the dedicated "Add New Account" screen and back — a
  // screen navigation unmounts AddMoneyScreen, which would otherwise lose
  // track of "select the account I just added" on return.
  const [selectedFundingSourceId, setSelectedFundingSourceId] = useState<string>(INITIAL_FUNDING_SOURCES[0]?.id ?? '');
  // Saved "pay to" recipients — same lives-in-context reasoning as
  // fundingSources above: AddPayeeScreen is a separate screen, so this
  // needs to survive the round trip back to PayScreen.
  const [payees, setPayees] = useState<SavedPayee[]>([]);
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>('');
  // Device-level display preferences (lib/accessibilityPrefs.ts) — loaded
  // once from localStorage, then kept in sync with the <html> element
  // below so they apply to every screen, current and future.
  const [accessibilityPrefs, setAccessibilityPrefs] = useState<AccessibilityPrefs>(() => loadAccessibilityPrefs());

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = FONT_SCALE_PERCENT[accessibilityPrefs.fontScale];
    root.classList.toggle('a11y-bold', accessibilityPrefs.bold);
    root.classList.toggle('a11y-text-border', accessibilityPrefs.textBorder);
    root.classList.toggle('a11y-eye-protection', accessibilityPrefs.eyeProtection);
    saveAccessibilityPrefs(accessibilityPrefs);
  }, [accessibilityPrefs]);

  const setAccessibilityPref = useCallback(<K extends keyof AccessibilityPrefs>(key: K, value: AccessibilityPrefs[K]) => {
    setAccessibilityPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setDemoControl = useCallback((key: keyof DemoControls, value: boolean) => {
    setDemoControls((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Hydrate app state from the account returned by register/login, so
  // balance, limit and the caregiver email are the server's values (this
  // account), not hardcoded defaults. Then land on Home.
  const signIn = useCallback((acct: Account) => {
    setAccount(acct);
    setBalance(acct.balance);
    setTransferLimit(acct.transferLimit);
    saveSessionEmail(acct.email);
    setScreen('home');
  }, []);

  const signOut = useCallback(() => {
    setAccount(null);
    clearSession();
    setScreen('login');
  }, []);

  const addFundingSource = useCallback((source: { bank: string; accountNumber: string }) => {
    const id = `src-${Date.now()}`;
    setFundingSources((prev) => [...prev, { ...source, id }]);
    return id;
  }, []);

  const addPayee = useCallback((payee: { name: string; bank: string; accountNumber: string }) => {
    const id = `payee-${Date.now()}`;
    setPayees((prev) => [...prev, { ...payee, id }]);
    return id;
  }, []);

  // The "store a copy internally" half of the malware-lock email alert —
  // an audit trail visible on the incident in the Fraud-Ops Review Console
  // (see incidentReport.ts), not a separate store.
  const logCaregiverEmail = useCallback((incidentId: number, subject: string, body: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === incidentId ? { ...i, emailLog: { subject, body, sentAt: new Date().toISOString() } } : i))
    );
  }, []);

  // Identity-confirmation is never a gate here (see IdentityCheckStep) —
  // this just records the outcome (or the "not set up" case, verified:false)
  // onto the incident for the record. It never resumes or unlocks anything
  // on its own.
  const logIdentityCheck = useCallback((incidentId: number, verified: boolean) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === incidentId ? { ...i, identityCheck: { verified, timestamp: new Date().toISOString() } } : i))
    );
  }, []);

  const addFunds = useCallback((amount: number) => {
    setBalance((prev) => prev + amount);
  }, []);

  // Option B: every flagged transfer automatically emails the caregiver a
  // detailed fraud report — no manual button click required. Fire-and-forget
  // and fully non-blocking (see emailNotify.ts): a network failure here must
  // never stall the fraud flow. On success, records the email on the incident
  // for the Fraud-Ops audit trail. `token` is only passed for the locked
  // compound-signal tier, which the caregiver can resolve via the email's
  // Approve/Reject buttons; other flags send an informational report.
  const autoSendCaregiverEmail = useCallback(
    (args: {
      transfer: Pick<CurrentTransfer, 'subject' | 'amount' | 'decision'>;
      incidentId: number | null;
      locked: boolean;
      token?: string;
      kind?: 'malware';
    }) => {
      const { transfer, incidentId, locked, token, kind } = args;
      const timestamp = new Date().toISOString();
      // Subject by notification type:
      //   malware        → blocked-account notice (case 2)
      //   token present  → approval required (cases 3 & 4)
      //   no token       → informational notification (case 1, limit increase)
      const subjectKind = kind === 'malware' ? 'malware' : token ? 'approval' : 'notification';
      const subject = buildCaregiverEmailSubject(subjectKind);
      const body = buildCaregiverEmailBody(transfer, { locked, timestamp });
      const fields = buildCaregiverEmailFields(transfer, { timestamp, accountHolder: account?.name });
      const to = account?.caregiverEmail || undefined;

      void sendCaregiverEmailAlert({ subject, body, fields, to, token: token ?? '', kind }).then((result) => {
        if (result.ok && incidentId != null) {
          setIncidents((prev) =>
            prev.map((i) => (i.id === incidentId ? { ...i, emailLog: { subject, body, sentAt: new Date().toISOString() } } : i))
          );
        }
      });
    },
    [account]
  );

  // Runs a decision through the response flow, wiring transferFlow.ts's
  // pure hooks to React state updates. `transfer` is the object that will
  // become state.currentTransfer once we know its incidentId.
  const runFlow = useCallback((transfer: Omit<CurrentTransfer, 'incidentId'>) => {
    const { decision, subject, amount } = transfer;
    let incidentId: number | null = null;

    startTransferFlow(decision, {
      onProceed: () => {
        setOutcomeStatus('approved');
        setScreen('outcome');
      },
      onLog: () => {
        incidentId = nextIncidentId++;
        setIncidents((prev) => [
          ...prev,
          {
            id: incidentId!,
            subject,
            amount,
            reasons: decision.reasons,
            categories: decision.categories,
            status: 'pending',
            // AlertScreen has no self-serve biometric step anymore, so
            // there's no "failed verification" moment to gate this on —
            // per requirements.md's "Parallel/escalation" framing, logging
            // for the fraud team happens in parallel with notifying the
            // caregiver, both from the moment of pause.
            escalated: true,
            timestamp: new Date().toISOString(),
          },
        ]);
      },
      onCaregiverNotify: () => {
        setCaregiverRequest(
          buildApprovalRequest({
            summary: `${subject} · ${money(amount)}`,
            reasons: decision.reasons,
            strongWarning: decision.categories.some((c) => c.id === 'malware'),
          })
        );
      },
      onChallenge: () => setScreen('alert'),
    });

    setCurrentTransfer({ ...transfer, incidentId });

    // Option B: any flagged transfer notifies the caregiver by email, even
    // the softer-signal cases that only raise the in-app alert challenge
    // rather than fully locking the feature. Clean (non-flagged) transfers
    // proceed silently and send nothing.
    if (decision.flagged) {
      autoSendCaregiverEmail({ transfer, incidentId, locked: false });
    }
  }, [autoSendCaregiverEmail]);

  const submitTransfer = useCallback(
    (payee: string, amount: number) => {
      const dc = demoControls;
      const signals = {
        newPayee: isNewPayee(payee),
        largeAmount: isLargeAmount(amount),
        limitIncreaseRequest: dc.limitIncreaseRequest,
        remoteAccessActive: dc.remoteAccessActive,
        sideloadedAppDetected: dc.sideloadedAppDetected,
        securityAppUninstalled: dc.securityAppUninstalled,
        knownHighRiskRecipient: dc.knownHighRiskRecipient || isKnownHighRiskRecipient(payee),
        newOverseasAccount: dc.newOverseasAccount,
        differentCountryIP: dc.differentCountryIP,
        multipleHighAmountTransactions: dc.multipleHighAmountTransactions,
        highReportRate: dc.highReportRate || hasHighReportRate(payee),
      };
      const decision = checkTransactionRisk(signals);
      const transfer: Omit<CurrentTransfer, 'incidentId'> = { type: 'transfer', subject: payee, amount, signals, decision };

      // Most severe tier: any malware signal alone, immediately — no prior
      // limit increase or combination needed. The caregiver notice here is
      // purely informational (no approve/decline exposed in PayLockedView);
      // only a Fraud-Ops reviewDecide can unlock it. Checked ahead of the
      // compound-signal lock below since malware always wins.
      if (shouldLockForMalware(decision)) {
        const incidentId = nextIncidentId++;
        // Token ties the malware-alert email's Unblock button back to this
        // block, so the app can poll for the caregiver's unblock decision.
        const decisionToken = newDecisionToken();
        setIncidents((prev) => [
          ...prev,
          {
            id: incidentId,
            subject: payee,
            amount,
            reasons: decision.reasons,
            categories: decision.categories,
            status: 'pending',
            escalated: true,
            timestamp: new Date().toISOString(),
          },
        ]);
        setCurrentTransfer({ ...transfer, incidentId, decisionToken });
        setPayTransferLocked(true);
        setCaregiverRequest(
          buildApprovalRequest({
            summary: `${payee} · ${money(amount)}`,
            reasons: decision.reasons,
            strongWarning: true,
          })
        );
        // Malware block: the caregiver can Unblock (or Call hotline) straight
        // from the email. Send as kind:'malware' with a token the app polls.
        autoSendCaregiverEmail({ transfer, incidentId, locked: true, token: decisionToken, kind: 'malware' });
        return;
      }

      // Stronger tier: a real recent limit increase + this transfer itself
      // reads as a suspicious recipient. No self-serve biometric bypass —
      // straight to "feature locked, caregiver must authorize" (also
      // escalated:true so it's visible in the Fraud-Ops Review Console too,
      // per FR6.3's "ambiguous/severe → human eyes as well" framing).
      if (shouldLockPayTransfer(recentLimitIncrease, decision)) {
        const incidentId = nextIncidentId++;
        // Ties this paused transfer to the caregiver's email Approve/Reject
        // buttons — the click happens outside the app, so the app polls
        // this token to learn the outcome (see PayLockedView).
        const decisionToken = newDecisionToken();
        setIncidents((prev) => [
          ...prev,
          {
            id: incidentId,
            subject: payee,
            amount,
            reasons: [...decision.reasons, 'Recent transfer-limit increase followed by a payment to a flagged recipient'],
            categories: decision.categories,
            status: 'pending',
            escalated: true,
            timestamp: new Date().toISOString(),
          },
        ]);
        setCurrentTransfer({ ...transfer, incidentId, decisionToken });
        setPayTransferLocked(true);
        setCaregiverRequest(
          buildApprovalRequest({
            summary: `${payee} · ${money(amount)}`,
            reasons: decision.reasons,
            strongWarning: true,
          })
        );
        // Compound lock: the caregiver can Approve/Reject straight from the
        // email, so pass the decisionToken that ties those buttons back to
        // this paused transfer (the app polls it in PayLockedView).
        autoSendCaregiverEmail({ transfer, incidentId, locked: true, token: decisionToken });
        return;
      }

      // Suspicious recipient profile on its own — locks Pay & Transfer and
      // requires the caregiver's email Approve/Decline before the payment
      // can proceed. Same handling as the compound lock above, minus the
      // "recent limit increase" reason line. Checked after malware and the
      // compound tier since those are stronger/more specific.
      if (shouldLockForSuspiciousProfile(decision)) {
        const incidentId = nextIncidentId++;
        const decisionToken = newDecisionToken();
        setIncidents((prev) => [
          ...prev,
          {
            id: incidentId,
            subject: payee,
            amount,
            reasons: decision.reasons,
            categories: decision.categories,
            status: 'pending',
            escalated: true,
            timestamp: new Date().toISOString(),
          },
        ]);
        setCurrentTransfer({ ...transfer, incidentId, decisionToken });
        setPayTransferLocked(true);
        setCaregiverRequest(
          buildApprovalRequest({
            summary: `${payee} · ${money(amount)}`,
            reasons: decision.reasons,
            strongWarning: false,
          })
        );
        autoSendCaregiverEmail({ transfer, incidentId, locked: true, token: decisionToken });
        return;
      }

      runFlow(transfer);
    },
    [demoControls, recentLimitIncrease, runFlow, autoSendCaregiverEmail]
  );

  // The <10k path on IncreaseLimitScreen — applies immediately, no fraud
  // check at all, no incident logged. Deliberately not routed through
  // runFlow/fraudCheck: that pipeline is for the shared, blocking
  // pause/escalate flow, which this path is explicitly not.
  const applyLimitDirectly = useCallback((newLimit: number) => {
    setTransferLimit(newLimit);
  }, []);

  // The >=10k path's own small logging pair — mirrors the shape runFlow's
  // onLog uses, but resolves synchronously (resumed or blocked) and never
  // sets escalated:true, so it can never surface in the Fraud-Ops Review
  // Console — that queue is specifically for cases still awaiting a human,
  // and this flow never leaves anything awaiting.
  const logLimitIncreaseAttempt = useCallback((amount: number) => {
    const id = nextIncidentId++;
    const category: Category = {
      id: 'limit-increase',
      label: 'Unusual transfer amount or limit increase',
      reasons: ['Requested limit ≥ S$10,000'],
    };
    setIncidents((prev) => [
      ...prev,
      {
        id,
        subject: 'Transfer limit increase',
        amount,
        reasons: category.reasons,
        categories: [category],
        status: 'pending',
        escalated: false,
        timestamp: new Date().toISOString(),
      },
    ]);
    return id;
  }, []);

  const resolveLimitIncreaseAttempt = useCallback(
    (id: number, status: IncidentStatus) => {
      setIncidents((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, status, escalated: false } : i));
        // A completed (verified) >=S$10,000 limit increase is an
        // informational caregiver notice — "for their awareness, no action
        // needed" (see IncreaseLimitScreen's 'notified' step). Send the real
        // email here so the on-screen "caregiver has been notified" is true,
        // not just a claim. No token → no Approve/Decline buttons.
        if (status === 'resumed') {
          const incident = next.find((i) => i.id === id);
          if (incident) {
            autoSendCaregiverEmail({
              transfer: {
                subject: incident.subject,
                amount: incident.amount,
                decision: { flagged: true, categories: incident.categories, reasons: incident.reasons },
              },
              incidentId: id,
              locked: false,
            });
          }
        }
        return next;
      });
      if (status === 'resumed') setRecentLimitIncrease(true);
    },
    [autoSendCaregiverEmail]
  );

  const resolveChallenge = useCallback(
    (passed: boolean) => {
      const incidentId = currentTransfer?.incidentId;
      resolveChallengeFlow(passed, {
        onResume: () => {
          if (incidentId != null) {
            setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, status: 'resumed', escalated: false } : i)));
          }
          setOutcomeStatus('approved');
          setScreen('outcome');
        },
        onEscalate: () => {
          if (incidentId != null) {
            setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, escalated: true } : i)));
          }
          setOutcomeStatus('pending-review');
          setScreen('outcome');
        },
      });
    },
    [currentTransfer]
  );

  const caregiverDecide = useCallback(
    (approved: boolean) => {
      // The lock is "blocked until a decision is made," not a permanent
      // dead end — either answer resolves it, so Pay & Transfer becomes
      // usable again either way (a decline still blocks that one transfer).
      if (payTransferLocked) {
        setPayTransferLocked(false);
        setRecentLimitIncrease(false);
      }
      if (approved) {
        resolveChallenge(true);
        return;
      }
      const incidentId = currentTransfer?.incidentId;
      if (incidentId != null) {
        setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, status: 'blocked', escalated: false } : i)));
      }
      setOutcomeStatus('blocked');
      setScreen('outcome');
    },
    [currentTransfer, payTransferLocked, resolveChallenge]
  );

  const reviewDecide = useCallback(
    (id: number, approved: boolean) => {
      resolveReviewFlow(approved, {
        onResume: () => setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'resumed', escalated: false } : i))),
        onBlock: () => setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'blocked', escalated: false } : i))),
      });
      // A Fraud-Ops reviewer can resolve this incident before the caregiver
      // does — don't leave Pay & Transfer stuck locked if so.
      if (payTransferLocked && currentTransfer?.incidentId === id) {
        setPayTransferLocked(false);
        setRecentLimitIncrease(false);
      }
    },
    [payTransferLocked, currentTransfer]
  );

  // The caregiver chose "Unblock" in the malware-alert email. Clear the
  // block so Pay & Transfer is usable again and resolve the incident. This
  // is a deliberate caregiver override of the malware block (they've judged
  // the device safe / called the hotline), distinct from a Fraud-Ops review.
  const unblockPayTransfer = useCallback(() => {
    if (payTransferLocked) {
      setPayTransferLocked(false);
      setRecentLimitIncrease(false);
    }
    const incidentId = currentTransfer?.incidentId;
    if (incidentId != null) {
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? { ...i, status: 'resumed', escalated: false } : i)));
    }
  }, [payTransferLocked, currentTransfer]);

  const pendingReview = useMemo(() => incidents.filter((i) => i.status === 'pending' && i.escalated), [incidents]);

  const value: AppStateValue = {
    lang,
    setLang,
    screen,
    setScreen,
    account,
    signIn,
    signOut,
    balance,
    transferLimit,
    recentActivity,
    incidents,
    pendingReview,
    currentTransfer,
    caregiverRequest,
    outcomeStatus,
    recentLimitIncrease,
    payTransferLocked,
    demoControls,
    setDemoControl,
    fundingSources,
    addFundingSource,
    selectedFundingSourceId,
    setSelectedFundingSourceId,
    payees,
    addPayee,
    selectedPayeeId,
    setSelectedPayeeId,
    logCaregiverEmail,
    logIdentityCheck,
    accessibilityPrefs,
    setAccessibilityPref,
    addFunds,
    submitTransfer,
    applyLimitDirectly,
    logLimitIncreaseAttempt,
    resolveLimitIncreaseAttempt,
    resolveChallenge,
    caregiverDecide,
    unblockPayTransfer,
    reviewDecide,
  };

  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateCtx);
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider');
  return ctx;
}
