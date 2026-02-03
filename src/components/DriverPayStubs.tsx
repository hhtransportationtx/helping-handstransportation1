import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Calendar, DollarSign, Clock, FileText, Users, Mail, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface PayStub {
  id: string;
  payroll_period_id: string;
  period_start: string;
  period_end: string;
  total_trips: number;
  active_hours: number;
  total_miles: number;
  wheelchair_hours: number;
  ambulatory_hours: number;
  hourly_pay: number;
  mileage_pay: number;
  bonus_pay: number;
  total_pay: number;
  status: string;
}

interface Driver {
  id: string;
  full_name: string;
  email: string;
}

interface PayStubRequest {
  id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  request_notes: string | null;
  status: 'pending' | 'fulfilled' | 'rejected';
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export function DriverPayStubs() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [payStubs, setPayStubs] = useState<PayStub[]>([]);
  const [selectedStub, setSelectedStub] = useState<PayStub | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [requests, setRequests] = useState<PayStubRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadDrivers();
    loadRequests();
  }, []);

  useEffect(() => {
    if (selectedDriverId) {
      loadDriverInfo();
      loadPayStubs();
    }
  }, [selectedDriverId]);

  async function loadDrivers() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'driver')
      .order('full_name');

    if (data) {
      setDrivers(data);
      if (data.length > 0) {
        setSelectedDriverId(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadDriverInfo() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', selectedDriverId)
      .single();

    if (data) setDriverInfo(data);
  }

  async function loadPayStubs() {
    setLoading(true);
    const { data } = await supabase
      .from('payroll_entries')
      .select(`
        *,
        payroll_periods!payroll_entries_payroll_period_id_fkey(
          start_date,
          end_date,
          status
        )
      `)
      .eq('driver_id', selectedDriverId)
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map((entry: any) => ({
        id: entry.id,
        payroll_period_id: entry.payroll_period_id,
        period_start: entry.payroll_periods?.start_date,
        period_end: entry.payroll_periods?.end_date,
        total_trips: entry.total_trips,
        active_hours: entry.active_hours,
        total_miles: entry.total_miles,
        wheelchair_hours: entry.wheelchair_hours,
        ambulatory_hours: entry.ambulatory_hours,
        hourly_pay: entry.hourly_pay,
        mileage_pay: entry.mileage_pay,
        bonus_pay: entry.bonus_pay,
        total_pay: entry.total_pay,
        status: entry.payroll_periods?.status || 'draft',
      }));
      setPayStubs(formatted);
    }
    setLoading(false);
  }

  async function sendPayStubEmail(stub: PayStub) {
    if (!driverInfo) return;

    setSendingEmail(stub.id);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-paystub-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_id: selectedDriverId,
          pay_stub: stub,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Pay stub successfully sent to ${driverInfo.email}`);
      } else {
        alert(`Failed to send email: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending pay stub email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(null);
    }
  }

  async function loadRequests() {
    const { data } = await supabase
      .from('paystub_requests')
      .select(`
        *,
        profiles:driver_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data as any);
    }
  }

  async function handleFulfillRequest(request: PayStubRequest) {
    setProcessingRequest(request.id);
    try {
      const { data: payStubData } = await supabase
        .from('payroll_entries')
        .select(`
          *,
          payroll_periods (
            period_start,
            period_end,
            status
          )
        `)
        .eq('driver_id', request.driver_id)
        .gte('payroll_periods.period_start', request.period_start)
        .lte('payroll_periods.period_end', request.period_end)
        .maybeSingle();

      if (!payStubData) {
        alert('No pay stub found for this period. Please check the dates or create the pay period first.');
        setProcessingRequest(null);
        return;
      }

      const stub = {
        id: payStubData.id,
        period_start: payStubData.payroll_periods.period_start,
        period_end: payStubData.payroll_periods.period_end,
        total_trips: payStubData.total_trips,
        active_hours: payStubData.active_hours,
        total_miles: payStubData.total_miles,
        wheelchair_hours: payStubData.wheelchair_hours,
        ambulatory_hours: payStubData.ambulatory_hours,
        hourly_pay: payStubData.hourly_pay,
        mileage_pay: payStubData.mileage_pay,
        bonus_pay: payStubData.bonus_pay,
        total_pay: payStubData.total_pay,
        status: payStubData.payroll_periods.status,
      };

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-paystub-email`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver_id: request.driver_id,
          pay_stub: stub,
        }),
      });

      if (response.ok) {
        const { data: userData } = await supabase.auth.getUser();

        await supabase
          .from('paystub_requests')
          .update({
            status: 'fulfilled',
            fulfilled_by: userData?.user?.id,
            fulfilled_at: new Date().toISOString(),
            admin_notes: adminNotes[request.id] || 'Pay stub sent via email',
          })
          .eq('id', request.id);

        alert(`Pay stub sent to ${request.profiles.email}`);
        loadRequests();
      } else {
        const result = await response.json();
        alert(`Failed to send email: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fulfilling request:', error);
      alert('Failed to process request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  }

  async function handleRejectRequest(request: PayStubRequest) {
    const notes = adminNotes[request.id];
    if (!notes?.trim()) {
      alert('Please provide a reason for rejecting this request.');
      return;
    }

    setProcessingRequest(request.id);
    try {
      const { data: userData } = await supabase.auth.getUser();

      await supabase
        .from('paystub_requests')
        .update({
          status: 'rejected',
          fulfilled_by: userData?.user?.id,
          fulfilled_at: new Date().toISOString(),
          admin_notes: notes,
        })
        .eq('id', request.id);

      alert('Request rejected');
      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  }

  function downloadPayStub(stub: PayStub) {
    const content = `
PAY STUB
========================================

Employee: ${driverInfo?.full_name}
Employee ID: ${selectedDriverId}
Pay Period: ${new Date(stub.period_start).toLocaleDateString()} - ${new Date(stub.period_end).toLocaleDateString()}
Pay Date: ${new Date().toLocaleDateString()}

EARNINGS
----------------------------------------
Total Trips Completed: ${stub.total_trips}
Active Hours: ${stub.active_hours.toFixed(2)} hrs
Total Miles: ${stub.total_miles.toFixed(2)} mi

Hours Breakdown:
  Wheelchair (WAV): ${stub.wheelchair_hours.toFixed(2)} hrs
  Ambulatory (AMB): ${stub.ambulatory_hours.toFixed(2)} hrs

COMPENSATION
----------------------------------------
Hourly Pay: $${stub.hourly_pay.toFixed(2)}

TOTAL PAY: $${stub.total_pay.toFixed(2)}

========================================
This is an official pay stub record.
Keep for your records.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paystub_${stub.period_start}_${stub.period_end}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPayStub(stub: PayStub) {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pay Stub - ${new Date(stub.period_start).toLocaleDateString()}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .section {
            margin: 20px 0;
          }
          .section-title {
            font-weight: bold;
            font-size: 14px;
            background: #f0f0f0;
            padding: 8px;
            margin: 10px 0 5px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .total {
            font-weight: bold;
            font-size: 18px;
            text-align: right;
            margin-top: 20px;
            padding: 10px;
            background: #f0f0f0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #e0e0e0;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAY STUB</h1>
          <p><strong>Employee:</strong> ${driverInfo?.full_name}</p>
          <p><strong>Pay Period:</strong> ${new Date(stub.period_start).toLocaleDateString()} - ${new Date(stub.period_end).toLocaleDateString()}</p>
          <p><strong>Pay Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="section">
          <div class="section-title">EARNINGS SUMMARY</div>
          <table>
            <tr>
              <td>Total Trips Completed</td>
              <td style="text-align: right">${stub.total_trips}</td>
            </tr>
            <tr>
              <td>Active Hours</td>
              <td style="text-align: right">${stub.active_hours.toFixed(2)} hrs</td>
            </tr>
            <tr>
              <td>Total Miles</td>
              <td style="text-align: right">${stub.total_miles.toFixed(2)} mi</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">HOURS BREAKDOWN</div>
          <table>
            <tr>
              <td>Wheelchair (WAV)</td>
              <td style="text-align: right">${stub.wheelchair_hours.toFixed(2)} hrs</td>
            </tr>
            <tr>
              <td>Ambulatory (AMB)</td>
              <td style="text-align: right">${stub.ambulatory_hours.toFixed(2)} hrs</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">COMPENSATION</div>
          <table>
            <tr>
              <td>Hourly Pay</td>
              <td style="text-align: right">$${stub.hourly_pay.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="total">
          TOTAL PAY: $${stub.total_pay.toFixed(2)}
        </div>

        <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
          This is an official pay stub record. Keep for your records.
        </p>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pay stubs...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver Pay Stubs</h1>
          <p className="text-gray-600">View and download driver payment history</p>
        </div>
        <button
          onClick={() => setShowRequests(!showRequests)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            showRequests
              ? 'bg-gray-200 text-gray-700'
              : requests.filter((r) => r.status === 'pending').length > 0
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          <AlertCircle className="w-5 h-5" />
          Pay Stub Requests
          {requests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="bg-white text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {requests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {showRequests && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pay Stub Requests</h2>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pay stub requests</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`border rounded-lg p-4 ${
                    request.status === 'pending'
                      ? 'border-yellow-300 bg-yellow-50'
                      : request.status === 'fulfilled'
                      ? 'border-green-300 bg-green-50'
                      : 'border-red-300 bg-red-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">{request.profiles.full_name}</div>
                      <div className="text-sm text-gray-600">{request.profiles.email}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Period: {new Date(request.period_start).toLocaleDateString()} -{' '}
                        {new Date(request.period_end).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      ) : request.status === 'fulfilled' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium capitalize">{request.status}</span>
                    </div>
                  </div>

                  {request.request_notes && (
                    <div className="mb-3 p-2 bg-white rounded text-sm">
                      <div className="text-xs font-medium text-gray-600 mb-1">Driver Notes:</div>
                      <div className="text-gray-700">{request.request_notes}</div>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="space-y-2">
                      <textarea
                        value={adminNotes[request.id] || ''}
                        onChange={(e) =>
                          setAdminNotes({ ...adminNotes, [request.id]: e.target.value })
                        }
                        placeholder="Add notes (optional for fulfill, required for reject)"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFulfillRequest(request)}
                          disabled={processingRequest === request.id}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {processingRequest === request.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Fulfill & Send
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request)}
                          disabled={processingRequest === request.id}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4">
          <Users className="w-6 h-6 text-gray-600" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Driver
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name} ({driver.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedDriverId ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Driver Selected</h3>
          <p className="text-gray-600">Select a driver to view their pay stubs</p>
        </div>
      ) : payStubs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pay Stubs Yet</h3>
          <p className="text-gray-600">This driver's pay stubs will appear here after payroll is processed</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            {payStubs.map((stub) => (
              <div
                key={stub.id}
                className={`bg-white rounded-lg shadow p-4 transition-all hover:shadow-md ${
                  selectedStub?.id === stub.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div onClick={() => setSelectedStub(stub)} className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(stub.period_start).toLocaleDateString()} - {new Date(stub.period_end).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 capitalize">Status: {stub.status}</div>
                  </div>
                  <div className="text-right flex items-start gap-2">
                    <div className="text-2xl font-bold text-gray-900">${stub.total_pay.toFixed(2)}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendPayStubEmail(stub);
                      }}
                      disabled={sendingEmail === stub.id || !driverInfo?.email}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!driverInfo?.email ? "Driver has no email on file" : "Email pay stub to driver"}
                    >
                      {sendingEmail === stub.id ? (
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div onClick={() => setSelectedStub(stub)} className="grid grid-cols-3 gap-2 text-sm cursor-pointer">
                  <div>
                    <div className="text-gray-500 text-xs">Trips</div>
                    <div className="font-semibold text-gray-900">{stub.total_trips}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Hours</div>
                    <div className="font-semibold text-gray-900">{stub.active_hours.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Miles</div>
                    <div className="font-semibold text-gray-900">{stub.total_miles.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedStub && (
            <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Pay Stub Details</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => printPayStub(selectedStub)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Print"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => downloadPayStub(selectedStub)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => sendPayStubEmail(selectedStub)}
                    disabled={sendingEmail === selectedStub.id || !driverInfo?.email}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!driverInfo?.email ? "Driver has no email on file" : "Email to Driver"}
                  >
                    {sendingEmail === selectedStub.id ? (
                      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Mail className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="pb-4 border-b border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Pay Period</div>
                  <div className="font-semibold text-gray-900">
                    {new Date(selectedStub.period_start).toLocaleDateString()} - {new Date(selectedStub.period_end).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Earnings Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Trips</span>
                      <span className="font-semibold text-gray-900">{selectedStub.total_trips}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Hours</span>
                      <span className="font-semibold text-gray-900">{selectedStub.active_hours.toFixed(2)} hrs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Miles</span>
                      <span className="font-semibold text-gray-900">{selectedStub.total_miles.toFixed(2)} mi</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Hours Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Wheelchair (WAV)</span>
                      <span className="font-semibold text-gray-900">{selectedStub.wheelchair_hours.toFixed(2)} hrs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ambulatory (AMB)</span>
                      <span className="font-semibold text-gray-900">{selectedStub.ambulatory_hours.toFixed(2)} hrs</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Compensation
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hourly Pay</span>
                      <span className="font-semibold text-gray-900">${selectedStub.hourly_pay.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Pay</span>
                    <span className="text-2xl font-bold text-green-600">${selectedStub.total_pay.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={() => downloadPayStub(selectedStub)}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Pay Stub
                </button>
                <button
                  onClick={() => sendPayStubEmail(selectedStub)}
                  disabled={sendingEmail === selectedStub.id || !driverInfo?.email}
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title={!driverInfo?.email ? "Driver has no email on file" : "Email pay stub to driver"}
                >
                  {sendingEmail === selectedStub.id ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Email to Driver
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
