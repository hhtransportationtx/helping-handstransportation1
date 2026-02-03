import { useState } from 'react';
import { Sparkles, Send, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type TestResult = {
  success: boolean;
  response?: string;
  duration?: number;
  error?: string;
};

export function OpenAITester() {
  const [testMessage, setTestMessage] = useState('Hello, I need a price quote for wheelchair service from 123 Main St to City Hospital on Monday.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-receptionist`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: testMessage,
            conversation: [],
          }),
        }
      );

      const duration = performance.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      if (data.error) {
        setResult({
          success: false,
          error: data.error,
          duration: Math.round(duration),
        });
      } else {
        setResult({
          success: true,
          response: data.response,
          duration: Math.round(duration),
        });
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Math.round(duration),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">OpenAI API Tester</h1>
            <p className="text-gray-600">Test your OpenAI integration for the AI Receptionist</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Test Input */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Test Message</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to send to AI Receptionist
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your test message..."
              />
            </div>

            <button
              onClick={handleTest}
              disabled={loading || !testMessage.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Testing OpenAI API...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Test OpenAI Integration
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Test Options */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Test Messages</h3>
          <div className="space-y-2">
            <button
              onClick={() => setTestMessage('Hello, I need a price quote for wheelchair service')}
              className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              Price quote request
            </button>
            <button
              onClick={() => setTestMessage('Hola, necesito transportación médica para mañana')}
              className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              Spanish greeting
            </button>
            <button
              onClick={() => setTestMessage('I need to book a trip from 123 Main St to City Hospital on Monday at 9am')}
              className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              Full booking request
            </button>
            <button
              onClick={() => setTestMessage("I'm ready to be picked up now")}
              className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              Will-call activation
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
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div className="flex-1">
                <div className={`font-semibold ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? 'OpenAI API is Working!' : 'OpenAI API Test Failed'}
                </div>
                <div className="text-sm text-gray-600">
                  Response Time: {result.duration}ms
                </div>
              </div>
            </div>

            {/* AI Response */}
            {result.response && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Receptionist Response
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">{result.response}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-900 mb-1">Error Details</div>
                  <div className="text-sm text-red-800 mb-3 font-mono bg-red-100 p-2 rounded">
                    {result.error}
                  </div>

                  {result.error.includes('Missing API key') && (
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-2">How to add your OpenAI API key:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to your Supabase Dashboard</li>
                        <li>Navigate to Project Settings → Edge Functions</li>
                        <li>Add a new secret: <code className="bg-red-100 px-1 rounded">OPENAI_API_KEY</code></li>
                        <li>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-red-600 underline hover:text-red-700">platform.openai.com</a></li>
                      </ol>
                    </div>
                  )}

                  {result.error.includes('Incorrect API key') && (
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-2">Your OpenAI API key appears to be invalid:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Check that you copied the full API key from OpenAI</li>
                        <li>Verify the key is active at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-red-600 underline hover:text-red-700">platform.openai.com</a></li>
                        <li>Make sure you have credits available in your OpenAI account</li>
                      </ul>
                    </div>
                  )}

                  {result.error.includes('insufficient_quota') && (
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-2">Your OpenAI account has insufficient quota:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Add credits to your OpenAI account</li>
                        <li>Check your usage at <a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer" className="text-red-600 underline hover:text-red-700">platform.openai.com/usage</a></li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-2">What this tests:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>OpenAI API key configuration in Supabase</li>
                <li>Connection to OpenAI's GPT-4o-mini model</li>
                <li>Bilingual conversation capabilities (English/Spanish)</li>
                <li>Price quoting functionality</li>
                <li>Trip booking and will-call activation features</li>
              </ul>
              <p className="mt-3">
                <strong>Model Used:</strong> GPT-4o-mini (optimized for speed and cost)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
