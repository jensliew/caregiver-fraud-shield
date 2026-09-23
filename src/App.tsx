import { AppStateProvider, useAppState } from './state/AppStateContext';
import { AppHeader } from './components/layout/AppHeader';
import { LoginScreen } from './components/screens/LoginScreen';
import { RegisterScreen } from './components/screens/RegisterScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { BalanceScreen } from './components/screens/BalanceScreen';
import { AddMoneyScreen } from './components/screens/AddMoneyScreen';
import { AddMoneyDoneScreen } from './components/screens/AddMoneyDoneScreen';
import { AddFavouriteScreen } from './components/screens/AddFavouriteScreen';
import { PayScreen } from './components/screens/PayScreen';
import { AddPayeeScreen } from './components/screens/AddPayeeScreen';
import { IncreaseLimitScreen } from './components/screens/IncreaseLimitScreen';
import { AlertScreen } from './components/screens/AlertScreen';
import { OutcomeScreen } from './components/screens/OutcomeScreen';
import { ReviewConsoleScreen } from './components/screens/ReviewConsoleScreen';
import { GetHelpScreen } from './components/screens/GetHelpScreen';
import { AccessibilitySettingsScreen } from './components/screens/AccessibilitySettingsScreen';
import type { Screen } from './lib/types';

const SCREENS: Record<Screen, React.ComponentType> = {
  login: LoginScreen,
  register: RegisterScreen,
  home: HomeScreen,
  balance: BalanceScreen,
  addMoney: AddMoneyScreen,
  addMoneyDone: AddMoneyDoneScreen,
  addFavourite: AddFavouriteScreen,
  pay: PayScreen,
  addPayee: AddPayeeScreen,
  increaseLimit: IncreaseLimitScreen,
  alert: AlertScreen,
  outcome: OutcomeScreen,
  review: ReviewConsoleScreen,
  getHelp: GetHelpScreen,
  accessibility: AccessibilitySettingsScreen,
};

function Screens() {
  const { screen } = useAppState();
  const ScreenComponent = SCREENS[screen] ?? LoginScreen;
  return <ScreenComponent />;
}

export default function App() {
  return (
    <AppStateProvider>
      <div className="max-w-[480px] mx-auto min-h-screen bg-surface flex flex-col">
        <AppHeader />
        <Screens />
      </div>
    </AppStateProvider>
  );
}
