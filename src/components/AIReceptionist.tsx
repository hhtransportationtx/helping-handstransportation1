import { useState } from 'react';
import { Bot, Send, Loader2 } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function AIReceptionist() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your bilingual AI receptionist for Helping Hands Transportation. I can help you book a medical transportation trip and provide price quotes. I speak English and Spanish!\n\n¡Hola! Soy su recepcionista de IA bilingüe para Helping Hands Transportation. Puedo ayudarle a reservar un viaje de transporte médico y proporcionarle cotizaciones de precios. ¡Hablo inglés y español!\n\nHow can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

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
            message: userMessage,
            conversation: messages,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);

      if (data.tripCreated) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Trip has been successfully scheduled! A dispatcher will assign a driver shortly.',
          },
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again or contact our dispatch team directly.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Receptionist</h1>
            <p className="text-gray-600">Book trips and get instant quotes in English or Spanish</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="h-[500px] overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Booking Tips / Consejos:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Speak in English or Spanish - I understand both!</li>
            <li>• Provide patient name and phone number</li>
            <li>• Include complete pickup and dropoff addresses</li>
            <li>• Specify date and time for pickup</li>
            <li>• Ask for a price quote anytime!</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Pricing Structure:</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Base rate: $50</li>
            <li>• Per mile: $3.50</li>
            <li>• Wheelchair accessible: +$20</li>
            <li>• Stretcher service: +$35</li>
            <li>• After hours (6PM-6AM): +$30</li>
          </ul>
        </div>
      </div>
    </div>
  );
}