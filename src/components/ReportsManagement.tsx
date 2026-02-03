import { useState } from 'react';
import { BarChart3, Users, AlertCircle, MessageSquare, TrendingUp, FileText } from 'lucide-react';
import { DriverEarningsReport } from './DriverEarningsReport';
import { DriverScoreReport } from './DriverScoreReport';
import { GrievanceReport } from './GrievanceReport';
import { AccidentalReport } from './AccidentalReport';
import { OutboundingReport } from './OutboundingReport';

type TabType = 'driverEarnings' | 'driverScore' | 'grievance' | 'accidental' | 'outbounding' | 'business' | 'statistics' | 'vehicleInspection';

export function ReportsManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('driverEarnings');

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-1 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('business')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'business'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Business Reports
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'statistics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('vehicleInspection')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'vehicleInspection'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Vehicle Inspection
          </button>
          <button
            onClick={() => setActiveTab('outbounding')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'outbounding'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Outbounding
          </button>
          <button
            onClick={() => setActiveTab('accidental')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'accidental'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Accidental Reports
          </button>
          <button
            onClick={() => setActiveTab('grievance')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'grievance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Grievance / Item Lost
          </button>
          <button
            onClick={() => setActiveTab('driverScore')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'driverScore'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Driver Score
          </button>
          <button
            onClick={() => setActiveTab('driverEarnings')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'driverEarnings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Driver Earnings
          </button>
        </div>
      </div>

      {activeTab === 'driverEarnings' && <DriverEarningsReport />}
      {activeTab === 'driverScore' && <DriverScoreReport />}
      {activeTab === 'grievance' && <GrievanceReport />}
      {activeTab === 'accidental' && <AccidentalReport />}
      {activeTab === 'outbounding' && <OutboundingReport />}

      {(activeTab === 'business' || activeTab === 'statistics' || activeTab === 'vehicleInspection') && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg">
              {activeTab === 'business' && 'Business Reports coming soon'}
              {activeTab === 'statistics' && 'Statistics coming soon'}
              {activeTab === 'vehicleInspection' && 'Vehicle Inspection reports coming soon'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
