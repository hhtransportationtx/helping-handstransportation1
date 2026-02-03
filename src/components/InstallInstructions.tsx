import { X, Smartphone, Share, PlusSquare, MoreVertical, Home } from 'lucide-react';

interface InstallInstructionsProps {
  onClose: () => void;
}

export default function InstallInstructions({ onClose }: InstallInstructionsProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Install Mobile Apps</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Why Install?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>Works like a native app</li>
              <li>Quick access from home screen</li>
              <li>Full screen experience</li>
              <li>Works offline for basic features</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Two Apps Available</h3>
            <ul className="text-sm text-green-700 space-y-2">
              <li><strong>Driver App:</strong> For drivers to view trips, update status, and communicate</li>
              <li><strong>Dispatcher App:</strong> For dispatchers to manage trips and assign drivers on the go</li>
            </ul>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🍎</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">iPhone / iPad (iOS)</h3>
              </div>

              <div className="space-y-4 ml-12">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Open Safari Browser</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Make sure you're using Safari (not Chrome or other browsers)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Visit the App Page</p>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div><strong>Driver App:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">[your-url]/driver-mobile</code></div>
                      <div><strong>Dispatcher App:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">[your-url]/dispatcher-mobile</code></div>
                      <p className="text-xs text-gray-500 mt-2">Login first, then click "Mobile Mode" button to access the mobile app</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Tap Share Button</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Share className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600">
                        (Located at the bottom of Safari)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Add to Home Screen</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <PlusSquare className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-600">
                        Scroll down and select "Add to Home Screen"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    5
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Confirm Installation</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Tap "Add" in the top right corner
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Done!</p>
                    <p className="text-sm text-green-700 mt-1">
                      The app icon will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🤖</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Android</h3>
              </div>

              <div className="space-y-4 ml-12">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Open Chrome Browser</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Chrome works best for Android installation
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Visit Driver Login Page</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Navigate to: <code className="bg-gray-100 px-2 py-1 rounded text-xs">[your-url]/driver-login</code>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Tap Menu Button</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <MoreVertical className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-sm text-gray-600">
                        (Three dots in top right corner)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Install App</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Select "Add to Home screen" or "Install app"
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold">
                    5
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Confirm Installation</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Tap "Install" or "Add" to confirm
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-700 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Done!</p>
                    <p className="text-sm text-green-700 mt-1">
                      The app icon will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600">
              Contact your dispatcher if you have trouble installing the app or need your login credentials.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
