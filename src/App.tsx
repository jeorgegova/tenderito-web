import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import { ScrollToTop } from './components/ui/ScrollToTop';
import { AlertModal } from './components/ui/AlertModal';
import { PwaInstallPrompt } from './components/ui/PwaInstallPrompt';
import { InAppNotificationToast } from './components/ui/InAppNotificationToast';
import { useDatabase } from './hooks/useDatabase';
import { useSync } from './hooks/useSync';
import { useWebNotifications } from './hooks/useWebNotifications';

function AppContent() {
  useDatabase();
  useSync();
  useWebNotifications();

  return (
    <>
      <div className="app-container">
        <RootNavigator />
      </div>
      <AlertModal />
      <PwaInstallPrompt />
      <InAppNotificationToast />
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
