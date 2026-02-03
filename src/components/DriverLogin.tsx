import { useState } from 'react';
import { LogIn, Smartphone, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import InstallInstructions from './InstallInstructions';

export default function DriverLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-driver-location`;
              await fetch(apiUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  speed: position.coords.speed,
                  heading: position.coords.heading
                })
              });
            } catch (locationError) {
              console.error('Failed to update location:', locationError);
            }
          },
          (error) => {
            console.error('Location permission denied:', error);
          }
        );
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showInstructions && <InstallInstructions onClose={() => setShowInstructions(false)} />}

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 text-center">Driver Login</h1>
              <p className="text-gray-600 text-center mt-2">HealthHub NEMT</p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="driver@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              className="w-full text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Installation Instructions</span>
            </button>
          </div>

          <div className="mt-4 text-center space-y-2">
            <a
              href="/"
              className="block text-sm text-gray-600 hover:text-gray-900"
            >
              Dispatcher Login
            </a>
            <a
              href="/member-portal"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/member-portal');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="block text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Member Portal
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-white text-sm">
          <p>Need help? Contact your dispatcher</p>
        </div>
      </div>
    </div>
    </>
  );
}
