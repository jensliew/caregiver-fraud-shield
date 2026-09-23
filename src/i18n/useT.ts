import { useAppState } from '../state/AppStateContext';
import { t, type StringKey } from './strings';

export function useT() {
  const { lang } = useAppState();
  return (key: StringKey) => t(lang, key);
}
