import { useState } from 'react';
import { Sparkles, TestTube, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function DirectOpenAITest() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testDirectly = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: 'Say "API key is working!"' }
          ],
          max_tokens: 50,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          status: response.status,
          error: data.error,
          rawResponse: data,
        });
      } else {
        setResult({
          success: true,
          status: response.status,
          message: data.choices[0].message.content,
          rawResponse: data,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: 'network_error'
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
            <TestTube className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Direct OpenAI API Test</h1>
            <p className="text-gray-600">Test your API key directly with OpenAI</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Test Input */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Enter Your OpenAI API Key</h2>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Your API key is only used for testing</p>
                <p>This test runs directly in your browser and sends the key only to OpenAI's API. It's never stored or sent to any other server.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <button
              onClick={testDirectly}
              disabled={loading || !apiKey.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Testing API Key...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Test API Key
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Test Result</h2>

            {/* Status Banner */}
            <div className={`rounded-lg p-4 mb-4 flex items-center gap-3 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className={`font-semibold ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? 'API Key is Working!' : 'API Key Test Failed'}
                </div>
                {result.status && (
                  <div className="text-sm text-gray-600">
                    HTTP Status: {result.status}
                  </div>
                )}
              </div>
            </div>

            {/* Success Message */}
            {result.success && result.message && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Response
                </label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-gray-900">{result.message}</p>
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-2">Your API key is valid! Next steps:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Copy your API key</li>
                        <li>Go to your Supabase Dashboard</li>
                        <li>Navigate to Project Settings → Edge Functions → Secrets</li>
                        <li>Add/update the secret named: <code className="bg-blue-100 px-1 rounded font-mono">OPENAI_API_KEY</code></li>
                        <li>Wait 5 minutes for changes to take effect</li>
                        <li>Test again using the main OpenAI Tester</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Details */}
            {result.error && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Error Details
                </label>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-red-900 mb-1">Error Message:</div>
                    <div className="text-sm text-red-800 font-mono bg-red-100 p-2 rounded break-all">
                      {result.error.message}
                    </div>
                  </div>

                  {result.error.type && (
                    <div>
                      <div className="text-sm font-semibold text-red-900 mb-1">Error Type:</div>
                      <div className="text-sm text-red-800 font-mono bg-red-100 p-2 rounded">
                        {result.error.type}
                      </div>
                    </div>
                  )}

                  {result.error.code && (
                    <div>
                      <div className="text-sm font-semibold text-red-900 mb-1">Error Code:</div>
                      <div className="text-sm text-red-800 font-mono bg-red-100 p-2 rounded">
                        {result.error.code}
                      </div>
                    </div>
                  )}

                  {/* Specific Error Help */}
                  <div className="pt-3 border-t border-red-200">
                    {result.error.code === 'invalid_api_key' && (
                      <div className="text-sm text-red-800">
                        <p className="font-semibold mb-2">Your API key is invalid. Common causes:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>The key was copied incorrectly (missing characters)</li>
                          <li>The key has been revoked or deleted</li>
                          <li>You're using a key from the wrong OpenAI account</li>
                        </ul>
                        <p className="mt-3 font-semibold">Solution:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">platform.openai.com/api-keys</a></li>
                          <li>Delete the old key</li>
                          <li>Create a brand new API key</li>
                          <li>Copy the ENTIRE key (they're usually 100+ characters)</li>
                          <li>Test it here again</li>
                        </ol>
                      </div>
                    )}

                    {result.error.type === 'insufficient_quota' && (
                      <div className="text-sm text-red-800">
                        <p className="font-semibold mb-2">Your OpenAI account has insufficient quota (no credits):</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Go to <a href="https://platform.openai.com/settings/organization/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">OpenAI Billing Settings</a></li>
                          <li>Add a payment method (credit card)</li>
                          <li>Add at least $5 in credits</li>
                          <li>Wait 2-3 minutes for billing to activate</li>
                          <li>Test again</li>
                        </ol>
                      </div>
                    )}

                    {result.error.code === 'billing_hard_limit_reached' && (
                      <div className="text-sm text-red-800">
                        <p className="font-semibold mb-2">You've reached your billing limit:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Go to <a href="https://platform.openai.com/settings/organization/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">OpenAI Billing Settings</a></li>
                          <li>Increase your usage limit or add more credits</li>
                          <li>Wait a few minutes</li>
                          <li>Test again</li>
                        </ol>
                      </div>
                    )}

                    {!result.error.code && !result.error.type && (
                      <div className="text-sm text-red-800">
                        <p className="font-semibold mb-2">General troubleshooting steps:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Verify your API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">platform.openai.com/api-keys</a></li>
                          <li>Make sure billing is set up at <a href="https://platform.openai.com/settings/organization/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">billing settings</a></li>
                          <li>Check that you have credits available</li>
                          <li>Try creating a new API key</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">About this test:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>This sends a simple test message directly to OpenAI</li>
                <li>Your API key never leaves your browser except to go to OpenAI</li>
                <li>If this test works, your key is valid and has credits</li>
                <li>If it fails, you'll see the exact error from OpenAI</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
