export function Manual() {
  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">User Manual</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Getting Started</h2>
            <div className="prose text-gray-600">
              <p className="mb-4">
                Welcome to Helping Hands Transport Management System. This comprehensive platform helps you manage all aspects of your transportation business including drivers, staff, patients, trips, and billing.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Profiling Section</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Drivers</h3>
                <p className="text-gray-600">
                  Manage your driver roster, including contact information, employment details, and status tracking.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Staff</h3>
                <p className="text-gray-600">
                  Manage administrative staff, dispatchers, and managers with role-based access control.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Members</h3>
                <p className="text-gray-600">
                  Track patient and member information, including contact details, addresses, and service preferences.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Funding Sources</h3>
                <p className="text-gray-600">
                  Manage insurance companies, brokers, and other funding sources for billing purposes.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Rates Management</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rates</h3>
                <p className="text-gray-600">
                  Configure pricing rates based on funding sources, level of service, space types, and time of day.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Addons</h3>
                <p className="text-gray-600">
                  Manage additional services and their pricing that can be added to trips.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Appointment Types</h3>
                <p className="text-gray-600">
                  Define different types of appointments with custom durations and visual indicators.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dashboard</h2>
            <p className="text-gray-600 mb-4">
              The dispatch dashboard provides a real-time overview of your operations including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Active trips and driver locations on an interactive map</li>
              <li>Recent activity feed showing trip assignments and updates</li>
              <li>Quick access to add new trips, drivers, and vehicles</li>
              <li>Operations management for trip planning and coordination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Fleet Management</h2>
            <p className="text-gray-600 mb-4">
              Manage your vehicle fleet including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Vehicle information and specifications</li>
              <li>Maintenance schedules and history</li>
              <li>Fuel tracking and expenses</li>
              <li>Vehicle assignment to drivers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Trip Management</h2>
            <p className="text-gray-600 mb-4">
              Efficiently manage patient transportation:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Create and schedule trips</li>
              <li>Assign drivers and vehicles</li>
              <li>Track trip status in real-time</li>
              <li>Manage trip confirmations and signatures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Support</h2>
            <p className="text-gray-600 mb-4">
              For additional help or support, please contact:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>Email:</strong> support@helpinghandstransport.com<br />
                <strong>Phone:</strong> (555) 123-4567<br />
                <strong>Hours:</strong> Monday - Friday, 8:00 AM - 6:00 PM
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
