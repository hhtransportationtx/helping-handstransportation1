import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useGoogleMaps } from './hooks/useGoogleMaps';
import { Login } from './components/Login';
import DriverLogin from './components/DriverLogin';
import { Navigation } from './components/Navigation';
import { DispatchDashboard } from './components/DispatchDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { BillingDashboard } from './components/BillingDashboard';
import { AIReceptionist } from './components/AIReceptionist';
import { PatientsManagement } from './components/PatientsManagement';
import ClientPortalManagement from './components/ClientPortalManagement';
import { SMSLogsViewer } from './components/SMSLogsViewer';
import DriverTrackingMap from './components/DriverTrackingMap';
import AutoScheduler from './components/AutoScheduler';
import MobileDriverApp from './components/MobileDriverApp';
import MobileDispatcherApp from './components/MobileDispatcherApp';
import { RatesManagement } from './components/RatesManagement';
import { Manual } from './components/Manual';
import { PayrollManagement } from './components/PayrollManagement';
import { DashCameraManagement } from './components/DashCameraManagement';
import { PaymentSettings } from './components/PaymentSettings';
import MemberPortal from './components/MemberPortal';
import ClientPortalLogin from './components/ClientPortalLogin';
import CSVImport from './components/CSVImport';
import { DispatcherVoiceMessages } from './components/DispatcherVoiceMessages';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import CompanyOnboarding from './components/CompanyOnboarding';
import CompanySettings from './components/CompanySettings';
import SMSTester from './components/SMSTester';
import { EdgeFunctionTester } from './components/EdgeFunctionTester';
import { OpenAITester } from './components/OpenAITester';
import { DirectOpenAITest } from './components/DirectOpenAITest';

function App() {
  const { user, profile, loading } = useAuth();
  useGoogleMaps();
  const [currentView, setCurrentView] = useState('');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.role === 'driver') {
        setCurrentView('driver');
      } else if (profile.is_super_admin) {
        setCurrentView('super-admin');
      } else {
        setCurrentView('dispatch');
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentPath === '/onboarding' || currentPath.startsWith('/onboarding')) {
    return <CompanyOnboarding />;
  }

  if (currentPath === '/member-portal' || currentPath.startsWith('/member-portal')) {
    return <MemberPortal />;
  }

  if (currentPath === '/client-portal' || currentPath.startsWith('/client-portal')) {
    return <ClientPortalLogin />;
  }

  if (!user || !profile) {
    if (currentPath === '/driver-login' || currentPath.startsWith('/driver-login')) {
      return <DriverLogin />;
    }
    return <Login />;
  }

  const isDispatcher = profile.role === 'dispatcher' || profile.role === 'admin' || profile.role === 'super_admin' || profile.is_super_admin === true;
  const isDriver = profile.role === 'driver';
  const isSuperAdmin = profile.is_super_admin === true;

  if (currentPath === '/driver-mobile' && isDriver) {
    return <MobileDriverApp />;
  }

  if (currentPath === '/dispatcher-mobile' && isDispatcher) {
    return <MobileDispatcherApp />;
  }

  return (
    <div className="min-h-screen bg-pink-50">
      <Navigation currentView={currentView} onNavigate={setCurrentView} />

      {isSuperAdmin && currentView === 'super-admin' && <SuperAdminDashboard />}
      {currentView === 'company-settings' && <CompanySettings />}
      {isDispatcher && currentView === 'dispatch' && <DispatchDashboard />}
      {isDispatcher && currentView === 'billing' && <BillingDashboard />}
      {isDispatcher && currentView === 'payments' && <PaymentSettings />}
      {isDispatcher && currentView === 'payroll' && <PayrollManagement />}
      {isDispatcher && currentView === 'receptionist' && <AIReceptionist />}
      {isDispatcher && currentView === 'patients' && <PatientsManagement />}
      {isDispatcher && currentView === 'portals' && <ClientPortalManagement />}
      {isDispatcher && currentView === 'tracking' && <DriverTrackingMap />}
      {isDispatcher && currentView === 'scheduler' && <AutoScheduler />}
      {isDispatcher && currentView === 'rates' && <RatesManagement />}
      {isDispatcher && currentView === 'manual' && <Manual />}
      {isDispatcher && currentView === 'raven' && <DashCameraManagement />}
      {isDispatcher && currentView === 'sms-logs' && <SMSLogsViewer />}
      {isDispatcher && currentView === 'sms-tester' && <SMSTester />}
      {isDispatcher && currentView === 'server-tester' && <EdgeFunctionTester />}
      {isDispatcher && currentView === 'openai-tester' && <OpenAITester />}
      {isDispatcher && currentView === 'direct-openai-test' && <DirectOpenAITest />}
      {isDispatcher && currentView === 'voice-messages' && <DispatcherVoiceMessages />}
      {isDispatcher && currentView === 'csv-import' && (
        <CSVImport onClose={() => setCurrentView('dispatch')} />
      )}
      {currentView === 'driver' && <DriverDashboard />}
    </div>
  );
}

export default App;
