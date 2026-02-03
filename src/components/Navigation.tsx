import { LogOut, LayoutDashboard, Car, DollarSign, Bot, Users, Building2, MapPin, Calendar, Receipt, BookOpen, Wallet, Camera, CreditCard, MessageSquare, FileSpreadsheet, Volume2, Settings, Shield, Send, Server, Sparkles, TestTube } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type NavigationProps = {
  currentView: string;
  onNavigate: (view: string) => void;
};

export function Navigation({ currentView, onNavigate }: NavigationProps) {
  const { profile, signOut } = useAuth();

  const isDispatcher = profile?.role === 'dispatcher' || profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.is_super_admin === true;
  const isDriver = profile?.role === 'driver';
  const isSuperAdmin = profile?.is_super_admin === true;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-2 md:px-4">
        <div className="flex items-center justify-between h-12 md:h-16">
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Car className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            <span className="text-base md:text-xl font-bold text-gray-900">HH Transportation</span>
          </div>

          <div className="flex-1 overflow-x-auto mx-2 md:mx-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="flex gap-0.5 md:gap-1 min-w-max pb-1">
              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => onNavigate('super-admin')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'super-admin'
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Platform Admin
                  </button>
                </>
              )}
              {isDispatcher && (
                <>
                  <button
                    onClick={() => onNavigate('company-settings')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'company-settings'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Company
                  </button>
                </>
              )}
              {isDispatcher && (
                <>
                  <button
                    onClick={() => onNavigate('dispatch')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'dispatch'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Dispatch
                  </button>
                  <button
                    onClick={() => onNavigate('billing')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'billing'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Billing
                  </button>
                  <button
                    onClick={() => onNavigate('payments')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'payments'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Payment Accounts
                  </button>
                  <button
                    onClick={() => onNavigate('payroll')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'payroll'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Payroll
                  </button>
                  <button
                    onClick={() => onNavigate('receptionist')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'receptionist'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    AI Receptionist
                  </button>
                  <button
                    onClick={() => onNavigate('patients')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'patients'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Members
                  </button>
                  <button
                    onClick={() => onNavigate('portals')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'portals'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Portals
                  </button>
                  <button
                    onClick={() => onNavigate('tracking')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'tracking'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Tracking
                  </button>
                  <button
                    onClick={() => onNavigate('scheduler')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'scheduler'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Scheduler
                  </button>
                  <button
                    onClick={() => onNavigate('rates')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'rates'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Rates
                  </button>
                  <button
                    onClick={() => onNavigate('manual')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'manual'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Manual
                  </button>
                  <button
                    onClick={() => onNavigate('raven')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'raven'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Raven
                  </button>
                  <button
                    onClick={() => onNavigate('sms-logs')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'sms-logs'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    SMS Logs
                  </button>
                  <button
                    onClick={() => onNavigate('sms-tester')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'sms-tester'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    SMS Tester
                  </button>
                  <button
                    onClick={() => onNavigate('server-tester')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'server-tester'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Server Tester
                  </button>
                  <button
                    onClick={() => onNavigate('openai-tester')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'openai-tester'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    OpenAI Test
                  </button>
                  <button
                    onClick={() => onNavigate('direct-openai-test')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'direct-openai-test'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <TestTube className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Key Tester
                  </button>
                  <button
                    onClick={() => onNavigate('voice-messages')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'voice-messages'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Voice Messages
                  </button>
                  <button
                    onClick={() => onNavigate('csv-import')}
                    className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                      currentView === 'csv-import'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Import CSV
                  </button>
                </>
              )}

              {isDriver && (
                <button
                  onClick={() => onNavigate('driver')}
                  className={`px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors flex items-center gap-1 md:gap-2 ${
                    currentView === 'driver'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Car className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  My Trips
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs md:text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}