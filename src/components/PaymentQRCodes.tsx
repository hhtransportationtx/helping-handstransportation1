import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { CreditCard, Download, Share2, Printer, X } from 'lucide-react';

type PaymentSetting = {
  id: string;
  payment_type: 'cash_app' | 'apple_pay' | 'zelle' | 'paypal';
  account_identifier: string;
  display_name: string;
  is_active: boolean;
  instructions: string | null;
  created_at: string;
  updated_at: string;
};

const PAYMENT_TYPE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  cash_app: {
    label: 'Cash App',
    icon: '💵',
    color: 'bg-green-500',
  },
  apple_pay: {
    label: 'Apple Pay',
    icon: '',
    color: 'bg-gray-900',
  },
  zelle: {
    label: 'Zelle',
    icon: '⚡',
    color: 'bg-purple-600',
  },
  paypal: {
    label: 'PayPal',
    icon: '🅿️',
    color: 'bg-blue-600',
  },
};

interface PaymentQRCodesProps {
  isAdminView?: boolean;
}

export function PaymentQRCodes({ isAdminView = false }: PaymentQRCodesProps) {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentSetting | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    loadPaymentSettings();
  }, []);

  async function loadPaymentSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('is_active', true)
        .order('payment_type');

      if (error) throw error;
      setPaymentSettings(data || []);
    } catch (error) {
      console.error('Error loading payment settings:', error);
    } finally {
      setLoading(false);
    }
  }

  function generatePaymentURL(setting: PaymentSetting): string {
    const baseUrl = window.location.origin;
    const paymentData = {
      type: setting.payment_type,
      account: setting.account_identifier,
      name: setting.display_name,
      instructions: setting.instructions,
    };
    return `${baseUrl}/payment?data=${encodeURIComponent(JSON.stringify(paymentData))}`;
  }

  function handleDownloadQR(setting: PaymentSetting) {
    const svg = document.getElementById(`qr-${setting.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `${setting.payment_type}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }

  function handlePrintQR(setting: PaymentSetting) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const paymentInfo = PAYMENT_TYPE_INFO[setting.payment_type];
    const qrUrl = generatePaymentURL(setting);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment QR Code - ${paymentInfo.label}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 500px;
            }
            h1 {
              font-size: 32px;
              margin-bottom: 10px;
              color: #333;
            }
            .payment-type {
              font-size: 24px;
              color: #666;
              margin-bottom: 20px;
            }
            .qr-container {
              margin: 30px 0;
              padding: 20px;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              background: white;
            }
            .account-info {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              margin: 20px 0;
            }
            .instructions {
              font-size: 16px;
              color: #666;
              margin-top: 20px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Scan to Pay</h1>
            <div class="payment-type">${paymentInfo.icon} ${paymentInfo.label}</div>
            <div class="qr-container">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}" alt="QR Code" />
            </div>
            <div class="account-info">${setting.account_identifier}</div>
            ${setting.instructions ? `<div class="instructions">${setting.instructions}</div>` : ''}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function handleShareQR(setting: PaymentSetting) {
    const url = generatePaymentURL(setting);
    if (navigator.share) {
      navigator.share({
        title: `Pay via ${PAYMENT_TYPE_INFO[setting.payment_type].label}`,
        text: `Scan to pay: ${setting.account_identifier}`,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Payment link copied to clipboard!');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading payment options...</div>
      </div>
    );
  }

  if (paymentSettings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Methods Available</h3>
        <p className="text-gray-500">Payment options will appear here once configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Accepted Payment Methods</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentSettings.map((setting) => {
            const paymentInfo = PAYMENT_TYPE_INFO[setting.payment_type];
            return (
              <div
                key={setting.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{paymentInfo.icon}</span>
                  <h3 className="text-lg font-semibold text-gray-900">{paymentInfo.label}</h3>
                </div>

                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4 flex items-center justify-center">
                  <QRCodeSVG
                    id={`qr-${setting.id}`}
                    value={generatePaymentURL(setting)}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-gray-900">{setting.display_name}</p>
                  <p className="text-sm text-gray-600 font-mono">{setting.account_identifier}</p>
                  {setting.instructions && (
                    <p className="text-xs text-gray-500 italic">{setting.instructions}</p>
                  )}
                </div>

                {isAdminView && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadQR(setting)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handlePrintQR(setting)}
                      className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center gap-2 text-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  </div>
                )}

                {!isAdminView && (
                  <button
                    onClick={() => {
                      setSelectedPayment(setting);
                      setShowQRModal(true);
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                  >
                    View Larger
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showQRModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {PAYMENT_TYPE_INFO[selectedPayment.payment_type].label}
              </h3>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setSelectedPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-6 flex items-center justify-center">
              <QRCodeSVG
                value={generatePaymentURL(selectedPayment)}
                size={300}
                level="H"
                includeMargin
              />
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Account</label>
                <p className="text-lg font-mono text-gray-900">{selectedPayment.account_identifier}</p>
              </div>
              {selectedPayment.instructions && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Instructions</label>
                  <p className="text-sm text-gray-600">{selectedPayment.instructions}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => handleShareQR(selectedPayment)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Share Payment Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
