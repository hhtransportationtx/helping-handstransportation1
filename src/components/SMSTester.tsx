import { useState } from 'react';
import { Send, Check, X, Loader2 } from 'lucide-react';

export default function SMSTester() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!phoneNumber) {
      setResult({ success: false, message: 'Please enter a phone number' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-sms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: phoneNumber,
            message: message || undefined,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: `SMS sent successfully! Message SID: ${data.messageSid}\nStatus: ${data.status}\nTo: ${data.to}\nFrom: ${data.from}`,
        });
      } else {
        const errorDetails = data.details ? `\nDetails: ${data.details}` : '';
        const errorCode = data.code ? `\nCode: ${data.code}` : '';
        const twilioError = data.twilioError ? `\nTwilio: ${JSON.stringify(data.twilioError, null, 2)}` : '';
        setResult({
          success: false,
          message: `${data.error || 'Failed to send SMS'}${errorDetails}${errorCode}${twilioError}`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Send className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">SMS Tester</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number (with country code)
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1234567890"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Example: +19152650211
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave empty for default test message"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSendTest}
          disabled={loading || !phoneNumber}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Test SMS
            </>
          )}
        </button>

        {result && (
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {result.success ? (
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`font-medium ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {result.success ? 'Success!' : 'Error'}
              </p>
              <pre
                className={`text-sm whitespace-pre-wrap ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {result.message}
              </pre>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> If you see "Twilio credentials not configured", you need to add the following secrets in your Supabase Dashboard:
          </p>
          <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
            <li>TWILIO_ACCOUNT_SID</li>
            <li>TWILIO_AUTH_TOKEN</li>
            <li>TWILIO_PHONE_NUMBER</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
