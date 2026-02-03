import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, ArrowRight, Check } from 'lucide-react';

interface OnboardingStep {
  number: number;
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  { number: 1, title: 'Company Info', description: 'Basic company information' },
  { number: 2, title: 'Contact Details', description: 'How we can reach you' },
  { number: 3, title: 'Admin Account', description: 'Your login credentials' }
];

export default function CompanyOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [companyData, setCompanyData] = useState({
    name: '',
    subdomain: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });

  const [contactData, setContactData] = useState({
    contact_email: '',
    contact_phone: ''
  });

  const [adminData, setAdminData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(3);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (adminData.password !== adminData.confirm_password) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (adminData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const subdomain = companyData.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('subdomain', subdomain)
        .single();

      if (existingCompany) {
        setError('This subdomain is already taken');
        setLoading(false);
        return;
      }

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: companyData.name,
          subdomain,
          contact_email: contactData.contact_email,
          contact_phone: contactData.contact_phone,
          address: companyData.address,
          city: companyData.city,
          state: companyData.state,
          zip_code: companyData.zip_code,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
          data: {
            full_name: adminData.full_name,
            role: 'admin',
            company_id: newCompany.id
          }
        }
      });

      if (signUpError) throw signUpError;

      if (user) {
        await supabase
          .from('profiles')
          .update({
            full_name: adminData.full_name,
            role: 'admin',
            company_id: newCompany.id
          })
          .eq('id', user.id);

        const { data: starterPlan } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('name', 'Starter')
          .single();

        if (starterPlan) {
          await supabase
            .from('company_subscriptions')
            .insert([{
              company_id: newCompany.id,
              plan_id: starterPlan.id,
              status: 'trialing',
              billing_cycle: 'monthly',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            }]);
        }

        await supabase
          .from('company_usage')
          .insert([{
            company_id: newCompany.id,
            month: new Date().toISOString().slice(0, 7) + '-01'
          }]);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Error during onboarding:', err);
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Aboard!</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created successfully. Check your email to verify your account,
            then you can start using the platform.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Building2 className="w-10 h-10 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Get Started</h1>
            </div>
            <p className="text-gray-600">Set up your NEMT transportation company in minutes</p>
          </div>

          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex items-center flex-col">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <div className="text-center mt-2">
                    <div className="text-sm font-medium text-gray-900">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Transportation Services"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdomain
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={companyData.subdomain}
                    onChange={(e) => setCompanyData({ ...companyData, subdomain: e.target.value.toLowerCase() })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="acme"
                    pattern="[a-z0-9-]+"
                  />
                  <span className="text-gray-500">.yourdomain.com</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">This will be your unique company URL</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={companyData.address}
                  onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={companyData.city}
                    onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={companyData.state}
                    onChange={(e) => setCompanyData({ ...companyData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  value={companyData.zip_code}
                  onChange={(e) => setCompanyData({ ...companyData, zip_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="10001"
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {currentStep === 2 && (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={contactData.contact_email}
                  onChange={(e) => setContactData({ ...contactData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@acme.com"
                />
                <p className="text-xs text-gray-500 mt-1">We will use this for important notifications</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={contactData.contact_phone}
                  onChange={(e) => setContactData({ ...contactData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {currentStep === 3 && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={adminData.full_name}
                  onChange={(e) => setAdminData({ ...adminData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="john@acme.com"
                />
                <p className="text-xs text-gray-500 mt-1">This will be your login email</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={adminData.confirm_password}
                  onChange={(e) => setAdminData({ ...adminData, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Re-enter your password"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Complete Setup'}
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 mt-4">
                By continuing, you agree to our Terms of Service and Privacy Policy.
                Your 14-day free trial starts today.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
