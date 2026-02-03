import { useState } from 'react';
import { Server, Play, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

type EdgeFunction = {
  name: string;
  description: string;
  endpoint: string;
  requiresAuth: boolean;
  testPayload?: any;
  method?: string;
};

const EDGE_FUNCTIONS: EdgeFunction[] = [
  {
    name: 'AI Receptionist',
    description: 'Test the bilingual AI receptionist chatbot',
    endpoint: 'ai-receptionist',
    requiresAuth: true,
    method: 'POST',
    testPayload: {
      message: 'Hello, I need a price quote for wheelchair service',
      conversation: []
    }
  },
  {
    name: 'Send Welcome SMS',
    description: 'Test sending welcome SMS to new drivers',
    endpoint: 'send-welcome-sms',
    requiresAuth: true,
    method: 'POST',
    testPayload: {
      phone: '+15555555555',
      name: 'Test Driver'
    }
  },
  {
    name: 'Test SMS',
    description: 'Send a test SMS message',
    endpoint: 'test-sms',
    requiresAuth: false,
    method: 'POST',
    testPayload: {
      to: '+15555555555',
      message: 'Test message from Helping Hands Transportation'
    }
  },
  {
    name: 'Update Driver Location',
    description: 'Update a driver\'s GPS location',
    endpoint: 'update-driver-location',
    requiresAuth: true,
    method: 'POST',
    testPayload: {
      latitude: 40.7128,
      longitude: -74.0060
    }
  },
  {
    name: 'Broker Claims',
    description: 'Submit broker claims for processing',
    endpoint: 'broker-claims',
    requiresAuth: true,
    method: 'GET'
  }
];

type TestResult = {
  success: boolean;
  status: number;
  duration: number;
  response?: any;
  error?: string;
};

export function EdgeFunctionTester() {
  const [selectedFunction, setSelectedFunction] = useState<EdgeFunction | null>(null);
  const [customPayload, setCustomPayload] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectFunction = (func: EdgeFunction) => {
    setSelectedFunction(func);
    setCustomPayload(JSON.stringify(func.testPayload || {}, null, 2));
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!selectedFunction) return;

    setLoading(true);
    setTestResult(null);

    const startTime = performance.now();

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${selectedFunction.endpoint}`;
      const method = selectedFunction.method || 'POST';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (selectedFunction.requiresAuth) {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (method === 'POST' && customPayload.trim()) {
        options.body = customPayload;
      }

      const response = await fetch(url, options);
      const duration = performance.now() - startTime;

      let responseData;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      setTestResult({
        success: response.ok,
        status: response.status,
        duration: Math.round(duration),
        response: responseData,
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      setTestResult({
        success: false,
        status: 0,
        duration: Math.round(duration),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Server className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edge Function Tester</h1>
            <p className="text-gray-600">Test and monitor your Supabase Edge Functions</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Function List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Available Functions</h2>
            <div className="space-y-2">
              {EDGE_FUNCTIONS.map((func) => (
                <button
                  key={func.endpoint}
                  onClick={() => handleSelectFunction(func)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                    selectedFunction?.endpoint === func.endpoint
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="font-medium text-gray-900">{func.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{func.description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      func.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {func.method || 'POST'}
                    </span>
                    {func.requiresAuth && (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                        Auth Required
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Test Panel */}
        <div className="lg:col-span-2">
          {selectedFunction ? (
            <div className="space-y-6">
              {/* Request */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Request</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${selectedFunction.endpoint}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                  </div>

                  {(selectedFunction.method || 'POST') === 'POST' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Request Body (JSON)
                      </label>
                      <textarea
                        value={customPayload}
                        onChange={(e) => setCustomPayload(e.target.value)}
                        rows={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        placeholder="Enter JSON payload..."
                      />
                    </div>
                  )}

                  <button
                    onClick={handleTest}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Test Function
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Response */}
              {testResult && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Response</h2>

                  {/* Status Banner */}
                  <div className={`rounded-lg p-4 mb-4 flex items-center gap-3 ${
                    testResult.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div className="flex-1">
                      <div className={`font-semibold ${
                        testResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {testResult.success ? 'Success' : 'Failed'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Status: {testResult.status} • Duration: {testResult.duration}ms
                      </div>
                    </div>
                  </div>

                  {/* Response Data */}
                  {testResult.response && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Response Data
                      </label>
                      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm font-mono">
                        {typeof testResult.response === 'string'
                          ? testResult.response
                          : JSON.stringify(testResult.response, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Error */}
                  {testResult.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-red-900 mb-1">Error</div>
                        <div className="text-sm text-red-800">{testResult.error}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Function</h3>
              <p className="text-gray-600">
                Choose an edge function from the list to test it
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Testing Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Functions marked "Auth Required" need a valid session to test properly</li>
              <li>Test phone numbers won't send real SMS messages in development</li>
              <li>Check the browser console for detailed error messages</li>
              <li>Some functions may require specific database records to exist</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
