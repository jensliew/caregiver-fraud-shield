import { useState } from 'react';
import { ScreenShell } from '../layout/ScreenShell';
import { ScreenHeaderTint } from '../layout/ScreenHeaderTint';
import { BackLink } from '../layout/BackLink';
import { Button } from '../Button';
import { Icon } from '../icons/Icon';
import { useT } from '../../i18n/useT';
import { checkLinkOrMessage } from '../../lib/getHelp';
import type { GetHelpResult } from '../../lib/types';

const RESULT_CLASSES: Record<GetHelpResult['verdict'], string> = {
  suspicious: 'bg-accent-soft border border-accent',
  unclear: 'bg-warn-soft border border-warn',
  empty: 'bg-warn-soft border border-warn',
};

export function GetHelpScreen() {
  const t = useT();
  const [text, setText] = useState('');
  const [result, setResult] = useState<GetHelpResult | null>(null);
  const [showSupportNote, setShowSupportNote] = useState(false);

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="home" />
        <h1 className="text-xl font-bold text-balance">{t('getHelpTitle')}</h1>
      </ScreenHeaderTint>

      <div className="flex flex-col gap-3">
        <Button variant="secondary" block onClick={() => setShowSupportNote(true)}>
          <Icon name="phone" size={20} />
          {t('callManagerButton')}
        </Button>
        <Button variant="secondary" block onClick={() => setShowSupportNote(true)}>
          <Icon name="videoCall" size={20} />
          {t('videoCallButton')}
        </Button>
      </div>
      {showSupportNote && <div className="rounded-xl p-4 text-sm bg-warn-soft border border-warn">{t('videoCallNote')}</div>}

      <label htmlFor="get-help-input">{t('getHelpInstruction')}</label>
      <textarea
        id="get-help-input"
        rows={4}
        placeholder="https://... or paste a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border focus:border-accent focus:outline-none"
      />
      <Button onClick={() => setResult(checkLinkOrMessage(text))}>{t('getHelpButton')}</Button>
      {result && <div className={`rounded-xl p-4 text-sm ${RESULT_CLASSES[result.verdict]}`}>{result.message}</div>}
    </ScreenShell>
  );
}
