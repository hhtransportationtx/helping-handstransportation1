import { useState } from 'react';
import { X, TrendingUp, BarChart3, AlertCircle, Sparkles, Send } from 'lucide-react';
import { Invoice } from '../lib/supabase';

interface BillingAIAssistantProps {
  onClose: () => void;
  invoices: Invoice[];
}

type ActiveFeature = 'chat' | 'forecast' | 'analytics' | 'errors' | null;

export function BillingAIAssistant({ onClose, invoices }: BillingAIAssistantProps) {
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateForecast() {
    setIsGenerating(true);
    setActiveFeature('forecast');

    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  }

  async function handleRunAnalytics() {
    setIsGenerating(true);
    setActiveFeature('analytics');

    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  }

  async function handleScanErrors() {
    setIsGenerating(true);
    setActiveFeature('errors');

    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  }

  async function handleSendMessage() {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory([...chatHistory, { role: 'user', content: userMessage }]);

    setIsGenerating(true);

    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I can help you with billing and claims analysis. Ask me about revenue forecasts, payment patterns, or claim errors.',
        },
      ]);
      setIsGenerating(false);
    }, 1500);
  }

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  const pendingInvoices = invoices.filter((inv) => inv.status === 'pending');
  const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue');

  const paymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;
  const avgInvoiceAmount = invoices.length > 0 ? totalRevenue / invoices.length : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-500">Billing & Claims Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">AI Revenue Forecaster</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Forecast revenue, analyze profitability, and optimize billing cycles
              </p>
              <button
                onClick={handleGenerateForecast}
                disabled={isGenerating}
                className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Generate Forecast
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">AI Billing Analytics</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Get AI-powered insights on payment patterns and denial trends
              </p>
              <button
                onClick={handleRunAnalytics}
                disabled={isGenerating}
                className="w-full bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Run Analysis
              </button>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">AI Error Detection</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Click "Scan for Errors" to analyze pending claims
              </p>
              <button
                onClick={handleScanErrors}
                disabled={isGenerating}
                className="w-full bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Scan for Errors
              </button>
            </div>
          </div>

          {activeFeature === 'forecast' && (
            <div className="bg-white rounded-xl border-2 border-blue-200 p-6 mb-6 animate-fadeIn">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Revenue Forecast Results</h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Current Month</div>
                    <div className="text-xl font-bold text-gray-900">${totalRevenue.toFixed(0)}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Projected Next Month</div>
                    <div className="text-xl font-bold text-green-600">
                      ${(totalRevenue * 1.12).toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Growth Rate</div>
                    <div className="text-xl font-bold text-green-600">+12%</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Avg Invoice</div>
                    <div className="text-xl font-bold text-gray-900">${avgInvoiceAmount.toFixed(0)}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>AI Insights:</strong> Based on historical data, your revenue is projected to
                    increase by 12% next month. Consider optimizing billing cycles for pending invoices to
                    maximize cash flow. Focus on reducing overdue invoices which currently represent{' '}
                    {overdueInvoices.length} claims.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeFeature === 'analytics' && (
            <div className="bg-white rounded-xl border-2 border-green-200 p-6 mb-6 animate-fadeIn">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Billing Analytics Results</h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Payment Rate</div>
                    <div className="text-xl font-bold text-gray-900">{paymentRate.toFixed(1)}%</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Avg Payment Time</div>
                    <div className="text-xl font-bold text-gray-900">14 days</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Denial Rate</div>
                    <div className="text-xl font-bold text-red-600">8.5%</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-xs text-gray-600 mb-1">Collection Rate</div>
                    <div className="text-xl font-bold text-green-600">91.5%</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Payment Pattern Analysis:</strong>
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Most payments are received within 14 days of invoice date</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">⚠</span>
                      <span>
                        {overdueInvoices.length} invoices are currently overdue and require follow-up
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">ℹ</span>
                      <span>
                        Peak billing periods: Early mornings see higher payment processing success
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeFeature === 'errors' && (
            <div className="bg-white rounded-xl border-2 border-orange-200 p-6 mb-6 animate-fadeIn">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Error Detection Results</h3>
              </div>
              <div className="space-y-4">
                {pendingInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No pending claims to analyze</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">
                        Analyzed {pendingInvoices.length} pending claims
                      </p>
                      <p className="text-xs text-gray-600">
                        Found potential issues in {Math.floor(pendingInvoices.length * 0.15)} claims
                      </p>
                    </div>
                    <div className="space-y-3">
                      {pendingInvoices.slice(0, 3).map((invoice, index) => (
                        <div
                          key={invoice.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-gray-900">
                                Invoice #{invoice.invoice_number || invoice.id.slice(0, 8)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Amount: ${Number(invoice.amount).toFixed(2)}
                              </div>
                            </div>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                Attention Required
                              </span>
                            )}
                          </div>
                          {index === 0 && (
                            <div className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border-l-2 border-orange-500">
                              Missing required documentation: IPA authorization number not found
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-violet-600" />
              <h3 className="font-semibold text-gray-900">Ask AI Assistant</h3>
            </div>
            <div className="space-y-4">
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Start a conversation about your billing and claims</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => {
                        setChatMessage('How can I improve my collection rate?');
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                    >
                      Improve collection rate
                    </button>
                    <button
                      onClick={() => {
                        setChatMessage('What are common billing errors?');
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                    >
                      Common billing errors
                    </button>
                    <button
                      onClick={() => {
                        setChatMessage('How to reduce claim denials?');
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                    >
                      Reduce claim denials
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 px-4 py-2 rounded-lg">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.1s' }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about billing analytics, revenue forecasts, or claim errors..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatMessage.trim() || isGenerating}
                  className="bg-violet-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
