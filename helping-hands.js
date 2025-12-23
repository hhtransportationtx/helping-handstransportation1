// Helping Hands Transportation - Main Application Logic

class HelpingHandsTransportation {
    constructor() {
        this.activeTrips = [];
        this.availableVehicles = [];
        this.patients = [];
        this.drivers = [];
        this.map = null;
        this.markers = [];
        this.init();
    }

    init() {
        this.initializeData();
        this.initializeEventListeners();
        this.initializeAnimations();
        this.initializeAI();
        this.initializeWalkieTalkie();
        this.initializeSMS();
        this.initializeMultiTenant();
        this.loadDashboard();
    }

    // Initialize mock data for demonstration
    initializeData() {
        this.drivers = [
            {
                id: 1,
                name: 'Sarah Johnson',
                status: 'available',
                vehicle: 'Wheelchair Van 101',
                location: { lat: 40.7128, lng: -74.0060 },
                certifications: ['CPR', 'Wheelchair Securement', 'Patient Care'],
                phone: '+1 (555) 123-4567'
            },
            {
                id: 2,
                name: 'Michael Chen',
                status: 'en-route',
                vehicle: 'Standard Van 205',
                location: { lat: 40.7589, lng: -73.9851 },
                certifications: ['CPR', 'First Aid'],
                phone: '+1 (555) 234-5678'
            },
            {
                id: 3,
                name: 'Maria Rodriguez',
                status: 'transporting',
                vehicle: 'Stretcher Van 312',
                location: { lat: 40.7505, lng: -73.9934 },
                certifications: ['CPR', 'EMT-Basic', 'Stretcher Transport'],
                phone: '+1 (555) 345-6789'
            },
            {
                id: 4,
                name: 'James Wilson',
                status: 'available',
                vehicle: 'Wheelchair Van 108',
                location: { lat: 40.7282, lng: -73.9942 },
                certifications: ['CPR', 'Wheelchair Securement'],
                phone: '+1 (555) 456-7890'
            },
            {
                id: 5,
                name: 'Lisa Thompson',
                status: 'break',
                vehicle: 'Standard Van 217',
                location: { lat: 40.7411, lng: -73.9897 },
                certifications: ['CPR', 'Patient Care'],
                phone: '+1 (555) 567-8901'
            }
        ];

        this.patients = [
            {
                id: 1,
                name: 'Eleanor Roosevelt',
                age: 78,
                phone: '+1 (555) 111-2222',
                address: '123 Main St, New York, NY 10001',
                accessibility: 'wheelchair',
                medicalNeeds: ['Oxygen tank', 'Caregiver assistance'],
                emergencyContact: 'Franklin Roosevelt Jr. - +1 (555) 111-3333',
                insurance: 'Medicaid',
                recurringTrips: ['Dialysis - Mon/Wed/Fri 9:00 AM']
            },
            {
                id: 2,
                name: 'John Smith',
                age: 65,
                phone: '+1 (555) 222-3333',
                address: '456 Oak Ave, New York, NY 10002',
                accessibility: 'ambulatory',
                medicalNeeds: ['Walker'],
                emergencyContact: 'Mary Smith - +1 (555) 222-4444',
                insurance: 'Medicare',
                recurringTrips: ['Physical Therapy - Tue/Thu 2:00 PM']
            },
            {
                id: 3,
                name: 'Catherine Brown',
                age: 82,
                phone: '+1 (555) 333-4444',
                address: '789 Pine St, New York, NY 10003',
                accessibility: 'stretcher',
                medicalNeeds: ['Stretcher transport', 'Medical monitoring'],
                emergencyContact: 'Robert Brown - +1 (555) 333-5555',
                insurance: 'Private Insurance',
                recurringTrips: ['Chemotherapy - Weekly Friday 10:00 AM']
            }
        ];

        this.activeTrips = [
            {
                id: 1001,
                patient: this.patients[0],
                driver: this.drivers[2],
                status: 'en-route',
                pickup: { address: '123 Main St, New York, NY 10001', time: '2024-12-23T09:00:00Z' },
                destination: { address: 'NYU Langone Medical Center', time: '2024-12-23T09:30:00Z' },
                estimatedArrival: '2024-12-23T08:55:00Z',
                type: 'Dialysis',
                accessibility: 'wheelchair',
                notes: 'Patient requires oxygen tank'
            },
            {
                id: 1002,
                patient: this.patients[1],
                driver: this.drivers[1],
                status: 'transporting',
                pickup: { address: '456 Oak Ave, New York, NY 10002', time: '2024-12-23T08:30:00Z' },
                destination: { address: 'Mount Sinai Hospital', time: '2024-12-23T09:15:00Z' },
                estimatedArrival: '2024-12-23T09:05:00Z',
                type: 'Physical Therapy',
                accessibility: 'ambulatory',
                notes: 'Patient uses walker'
            }
        ];

        this.availableVehicles = [
            { id: 1, type: 'Wheelchair Van', number: '101', status: 'available' },
            { id: 2, type: 'Standard Van', number: '205', status: 'en-route' },
            { id: 3, type: 'Stretcher Van', number: '312', status: 'transporting' },
            { id: 4, type: 'Wheelchair Van', number: '108', status: 'available' },
            { id: 5, type: 'Standard Van', number: '217', status: 'break' }
        ];
    }

    // Real-time dashboard updates
    loadDashboard() {
        this.updateMetrics();
        this.updateActiveTrips();
        this.updateVehicleStatus();
        this.updateRecentActivity();
        this.initializeMap();
        
        // Simulate real-time updates every 30 seconds
        setInterval(() => {
            this.simulateRealTimeUpdates();
        }, 30000);
    }

    updateMetrics() {
        const metrics = this.calculateMetrics();
        
        this.updateElement('active-trips', metrics.activeTrips);
        this.updateElement('available-vehicles', metrics.availableVehicles);
        this.updateElement('on-time-performance', metrics.onTimePerformance + '%');
        this.updateElement('patient-satisfaction', metrics.patientSatisfaction + '%');
        this.updateElement('completed-today', metrics.completedToday);
        this.updateElement('revenue-today', '$' + metrics.revenueToday.toLocaleString());
    }

    calculateMetrics() {
        const activeTrips = this.activeTrips.length;
        const availableVehicles = this.drivers.filter(d => d.status === 'available').length;
        const onTimePerformance = 94; // Mock data
        const patientSatisfaction = 96; // Mock data
        const completedToday = 23; // Mock data
        const revenueToday = 3450; // Mock data

        return {
            activeTrips,
            availableVehicles,
            onTimePerformance,
            patientSatisfaction,
            completedToday,
            revenueToday
        };
    }

    updateActiveTrips() {
        const container = document.getElementById('active-trips-list');
        if (!container) return;

        container.innerHTML = '';
        this.activeTrips.forEach(trip => {
            const tripElement = this.createTripElement(trip);
            container.appendChild(tripElement);
        });
    }

    createTripElement(trip) {
        const tripDiv = document.createElement('div');
        tripDiv.className = 'trip-card bg-white rounded-lg p-4 mb-3 shadow-sm border-l-4 border-teal-600';
        
        const statusColor = this.getStatusColor(trip.status);
        const statusIcon = this.getStatusIcon(trip.status);
        
        tripDiv.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center">
                    <span class="text-2xl mr-2">${statusIcon}</span>
                    <div>
                        <h4 class="font-semibold text-gray-900">Trip #${trip.id}</h4>
                        <span class="text-sm px-2 py-1 rounded-full ${statusColor}">${trip.status.toUpperCase()}</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-gray-500">ETA</div>
                    <div class="font-semibold text-teal-600">${this.formatTime(trip.estimatedArrival)}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <div class="font-medium text-gray-700">Patient</div>
                    <div class="text-gray-900">${trip.patient.name}</div>
                    <div class="text-gray-500">${trip.patient.age} years old • ${trip.accessibility}</div>
                </div>
                
                <div>
                    <div class="font-medium text-gray-700">Driver</div>
                    <div class="text-gray-900">${trip.driver.name}</div>
                    <div class="text-gray-500">${trip.driver.vehicle}</div>
                </div>
                
                <div>
                    <div class="font-medium text-gray-700">Pickup</div>
                    <div class="text-gray-900">${trip.pickup.address}</div>
                    <div class="text-gray-500">${this.formatTime(trip.pickup.time)}</div>
                </div>
                
                <div>
                    <div class="font-medium text-gray-700">Destination</div>
                    <div class="text-gray-900">${trip.destination.address}</div>
                    <div class="text-gray-500">${this.formatTime(trip.destination.time)}</div>
                </div>
            </div>
            
            <div class="mt-3 pt-3 border-t border-gray-100">
                <div class="flex justify-between items-center">
                    <div class="text-sm text-gray-600">
                        <span class="font-medium">Notes:</span> ${trip.notes}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="contactDriver(${trip.driver.id})" class="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700">
                            Contact Driver
                        </button>
                        <button onclick="viewTripDetails(${trip.id})" class="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300">
                            Details
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return tripDiv;
    }

    updateVehicleStatus() {
        const container = document.getElementById('vehicle-status-grid');
        if (!container) return;

        container.innerHTML = '';
        this.drivers.forEach(driver => {
            const vehicleElement = this.createVehicleElement(driver);
            container.appendChild(vehicleElement);
        });
    }

    createVehicleElement(driver) {
        const vehicleDiv = document.createElement('div');
        vehicleDiv.className = 'vehicle-card bg-white rounded-lg p-4 shadow-sm border-2 border-transparent hover:border-teal-200 transition-all';
        
        const statusColor = this.getStatusColor(driver.status);
        const statusIcon = this.getVehicleIcon(driver.vehicle);
        
        vehicleDiv.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                    <span class="text-2xl mr-3">${statusIcon}</span>
                    <div>
                        <h4 class="font-semibold text-gray-900">${driver.vehicle}</h4>
                        <span class="text-sm px-2 py-1 rounded-full ${statusColor}">${driver.status.toUpperCase()}</span>
                    </div>
                </div>
                <div class="text-right">
                    <div class="w-3 h-3 rounded-full ${this.getStatusDotColor(driver.status)} ml-auto"></div>
                </div>
            </div>
            
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Driver:</span>
                    <span class="font-medium text-gray-900">${driver.name}</span>
                </div>
                
                <div class="flex justify-between">
                    <span class="text-gray-600">Phone:</span>
                    <span class="text-teal-600">${driver.phone}</span>
                </div>
                
                <div class="flex justify-between">
                    <span class="text-gray-600">Location:</span>
                    <span class="text-gray-900">${this.formatLocation(driver.location)}</span>
                </div>
                
                <div class="pt-2 border-t border-gray-100">
                    <div class="text-gray-600 mb-1">Certifications:</div>
                    <div class="flex flex-wrap gap-1">
                        ${driver.certifications.map(cert => 
                            `<span class="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs">${cert}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            
            <div class="mt-3 pt-3 border-t border-gray-100">
                <div class="flex space-x-2">
                    <button onclick="assignTrip(${driver.id})" class="flex-1 bg-teal-600 text-white py-2 px-3 rounded text-sm hover:bg-teal-700">
                        Assign Trip
                    </button>
                    <button onclick="contactDriver(${driver.id})" class="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-300">
                        Contact
                    </button>
                </div>
            </div>
        `;
        
        return vehicleDiv;
    }

    updateRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        const activities = [
            { time: '2 minutes ago', activity: 'Trip #1003 completed successfully', type: 'success' },
            { time: '5 minutes ago', activity: 'Driver Sarah Johnson assigned to new trip', type: 'info' },
            { time: '8 minutes ago', activity: 'Vehicle Wheelchair Van 108 maintenance due', type: 'warning' },
            { time: '12 minutes ago', activity: 'Patient John Smith picked up for dialysis', type: 'info' },
            { time: '15 minutes ago', activity: 'Emergency contact updated for Eleanor Roosevelt', type: 'info' }
        ];

        container.innerHTML = '';
        activities.forEach(activity => {
            const activityElement = this.createActivityElement(activity);
            container.appendChild(activityElement);
        });
    }

    createActivityElement(activity) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item flex items-start p-3 hover:bg-gray-50 rounded-lg transition-colors';
        
        const icon = this.getActivityIcon(activity.type);
        
        activityDiv.innerHTML = `
            <span class="text-xl mr-3 mt-1">${icon}</span>
            <div class="flex-1">
                <div class="text-sm text-gray-900">${activity.activity}</div>
                <div class="text-xs text-gray-500 mt-1">${activity.time}</div>
            </div>
        `;
        
        return activityDiv;
    }

    initializeMap() {
        const mapElement = document.getElementById('dispatch-map');
        if (!mapElement || typeof L === 'undefined') return;

        // Initialize Leaflet map
        this.map = L.map('dispatch-map').setView([40.7128, -74.0060], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add vehicle markers
        this.drivers.forEach(driver => {
            const marker = L.marker([driver.location.lat, driver.location.lng])
                .addTo(this.map)
                .bindPopup(`
                    <div class="p-2">
                        <h4 class="font-semibold">${driver.vehicle}</h4>
                        <p class="text-sm">Driver: ${driver.name}</p>
                        <p class="text-sm">Status: ${driver.status}</p>
                    </div>
                `);
            
            this.markers.push(marker);
        });
    }

    simulateRealTimeUpdates() {
        // Simulate vehicle movement
        this.drivers.forEach(driver => {
            if (driver.status === 'en-route' || driver.status === 'transporting') {
                // Random movement simulation
                driver.location.lat += (Math.random() - 0.5) * 0.001;
                driver.location.lng += (Math.random() - 0.5) * 0.001;
            }
        });

        // Update displays
        this.updateMetrics();
        this.updateVehicleStatus();
        this.updateMapMarkers();
    }

    updateMapMarkers() {
        if (!this.map) return;
        
        this.markers.forEach((marker, index) => {
            const driver = this.drivers[index];
            marker.setLatLng([driver.location.lat, driver.location.lng]);
        });
    }

    // Utility functions
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    formatLocation(location) {
        return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }

    getStatusColor(status) {
        const colors = {
            'available': 'bg-green-100 text-green-800',
            'en-route': 'bg-blue-100 text-blue-800',
            'transporting': 'bg-yellow-100 text-yellow-800',
            'break': 'bg-gray-100 text-gray-800',
            'maintenance': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusDotColor(status) {
        const colors = {
            'available': 'bg-green-500',
            'en-route': 'bg-blue-500',
            'transporting': 'bg-yellow-500',
            'break': 'bg-gray-500',
            'maintenance': 'bg-red-500'
        };
        return colors[status] || 'bg-gray-500';
    }

    getStatusIcon(status) {
        const icons = {
            'available': '🚐',
            'en-route': '🚙',
            'transporting': '🚑',
            'break': '☕',
            'maintenance': '🔧'
        };
        return icons[status] || '🚐';
    }

    getVehicleIcon(vehicleType) {
        if (vehicleType.includes('Wheelchair')) return '♿';
        if (vehicleType.includes('Stretcher')) return '🛏️';
        return '🚐';
    }

    getActivityIcon(type) {
        const icons = {
            'success': '✅',
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌'
        };
        return icons[type] || 'ℹ️';
    }

    // Event listeners
    initializeEventListeners() {
        // Trip assignment buttons
        document.addEventListener('click', (e) => {
            if (e.target.textContent === 'Assign Trip') {
                this.showTripAssignmentModal();
            }
        });

        // Emergency button
        const emergencyBtn = document.getElementById('emergency-btn');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', () => {
                this.handleEmergency();
            });
        }

        // New trip button
        const newTripBtn = document.getElementById('new-trip-btn');
        if (newTripBtn) {
            newTripBtn.addEventListener('click', () => {
                this.showNewTripModal();
            });
        }

        // AI Assistant button
        const aiAssistantBtn = document.getElementById('ai-assistant-btn');
        if (aiAssistantBtn) {
            aiAssistantBtn.addEventListener('click', () => {
                this.toggleAIAssistant();
            });
        }

        // Walkie Talkie buttons
        const walkieTalkieBtn = document.getElementById('walkie-talkie-btn');
        if (walkieTalkieBtn) {
            walkieTalkieBtn.addEventListener('click', () => {
                this.toggleWalkieTalkie();
            });
        }

        // SMS notification buttons
        const smsBtn = document.getElementById('sms-btn');
        if (smsBtn) {
            smsBtn.addEventListener('click', () => {
                this.sendSMSNotification();
            });
        }
    }

    showTripAssignmentModal() {
        this.showNotification('Trip assignment feature coming soon!', 'info');
    }

    showNewTripModal() {
        this.showNotification('New trip booking feature coming soon!', 'info');
    }

    handleEmergency() {
        this.showNotification('Emergency protocols activated. Contacting emergency services...', 'warning');
    }

    // Animation initialization
    initializeAnimations() {
        if (typeof anime !== 'undefined') {
            this.animatePageElements();
        }
    }

    animatePageElements() {
        // Animate dashboard cards
        anime({
            targets: '.dashboard-card',
            translateY: [50, 0],
            opacity: [0, 1],
            delay: anime.stagger(100),
            duration: 800,
            easing: 'easeOutQuart'
        });

        // Animate metrics
        anime({
            targets: '.metric-card',
            scale: [0.9, 1],
            opacity: [0, 1],
            delay: anime.stagger(50),
            duration: 600,
            easing: 'easeOutQuart'
        });

        // Animate trip cards
        anime({
            targets: '.trip-card',
            translateX: [-30, 0],
            opacity: [0, 1],
            delay: anime.stagger(75),
            duration: 700,
            easing: 'easeOutQuart'
        });
    }

    // AI-Powered Features
    initializeAI() {
        this.aiModels = {
            demandPrediction: this.initializeDemandPrediction(),
            routeOptimization: this.initializeRouteOptimization(),
            predictiveMaintenance: this.initializePredictiveMaintenance(),
            sentimentAnalysis: this.initializeSentimentAnalysis()
        };
    }

    initializeDemandPrediction() {
        // Simulate AI demand prediction based on historical data
        return {
            predict: (date, weather, events) => {
                const baseDemand = 45;
                const weatherFactor = weather === 'rain' ? 1.2 : 1.0;
                const eventFactor = events.length > 0 ? 1.3 : 1.0;
                const dayFactor = date.getDay() === 5 ? 1.1 : 1.0; // Friday peak
                
                return Math.round(baseDemand * weatherFactor * eventFactor * dayFactor);
            }
        };
    }

    initializeRouteOptimization() {
        // Simulate AI route optimization
        return {
            optimize: (trips, traffic, vehicleCapacity) => {
                // Mock optimization that reduces travel time by 15-25%
                const originalTime = trips.reduce((sum, trip) => sum + trip.estimatedTime, 0);
                const optimizationFactor = 0.8 + Math.random() * 0.15; // 15-25% improvement
                
                return {
                    optimizedRoute: trips,
                    estimatedTime: Math.round(originalTime * optimizationFactor),
                    fuelSavings: Math.round(originalTime * 0.1), // 10% fuel savings
                    distance: Math.round(originalTime * 0.6) // Mock distance
                };
            }
        };
    }

    initializePredictiveMaintenance() {
        // Simulate AI predictive maintenance
        return {
            predict: (vehicleData) => {
                const riskScore = Math.random() * 100;
                let maintenanceType = 'routine';
                let urgency = 'low';
                
                if (riskScore > 80) {
                    maintenanceType = 'critical';
                    urgency = 'high';
                } else if (riskScore > 60) {
                    maintenanceType = 'scheduled';
                    urgency = 'medium';
                }
                
                return {
                    riskScore: Math.round(riskScore),
                    maintenanceType,
                    urgency,
                    recommendedDate: new Date(Date.now() + (riskScore > 80 ? 2 : 7) * 24 * 60 * 60 * 1000),
                    estimatedCost: Math.round(riskScore * 2.5)
                };
            }
        };
    }

    initializeSentimentAnalysis() {
        // Simulate AI sentiment analysis for patient feedback
        return {
            analyze: (feedback) => {
                const positiveWords = ['excellent', 'great', 'good', 'satisfied', 'helpful', 'professional'];
                const negativeWords = ['poor', 'bad', 'disappointed', 'late', 'rude', 'unprofessional'];
                
                const words = feedback.toLowerCase().split(' ');
                let positiveScore = 0;
                let negativeScore = 0;
                
                words.forEach(word => {
                    if (positiveWords.includes(word)) positiveScore++;
                    if (negativeWords.includes(word)) negativeScore++;
                });
                
                const sentiment = positiveScore > negativeScore ? 'positive' : 
                                negativeScore > positiveScore ? 'negative' : 'neutral';
                const score = (positiveScore - negativeScore) / words.length;
                
                return { sentiment, score: Math.round(score * 100) / 100 };
            }
        };
    }

    // Walkie Talkie Communication System
    initializeWalkieTalkie() {
        this.walkieTalkie = {
            isActive: false,
            currentChannel: 'dispatch',
            channels: ['dispatch', 'emergency', 'maintenance'],
            messages: []
        };
    }

    toggleWalkieTalkie() {
        this.walkieTalkie.isActive = !this.walkieTalkie.isActive;
        
        if (this.walkieTalkie.isActive) {
            this.showNotification('Walkie Talkie activated. Press and hold to talk.', 'info');
            this.startWalkieTalkieRecording();
        } else {
            this.showNotification('Walkie Talkie deactivated.', 'info');
            this.stopWalkieTalkieRecording();
        }
    }

    startWalkieTalkieRecording() {
        // Simulate walkie talkie functionality
        this.showWalkieTalkieInterface();
    }

    stopWalkieTalkieRecording() {
        // Clean up walkie talkie interface
        this.hideWalkieTalkieInterface();
    }

    showWalkieTalkieInterface() {
        const interface = document.createElement('div');
        interface.id = 'walkie-talkie-interface';
        interface.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white p-4 rounded-lg shadow-lg z-50';
        interface.innerHTML = `
            <div class="text-center">
                <div class="text-lg font-bold mb-2">🎙️ Walkie Talkie Active</div>
                <div class="text-sm mb-2">Channel: ${this.walkieTalkie.currentChannel}</div>
                <button onclick="helpingHands.sendWalkieTalkieMessage()" class="bg-white text-teal-600 px-4 py-2 rounded font-semibold">
                    Press to Talk
                </button>
            </div>
        `;
        document.body.appendChild(interface);
    }

    hideWalkieTalkieInterface() {
        const interface = document.getElementById('walkie-talkie-interface');
        if (interface) {
            document.body.removeChild(interface);
        }
    }

    sendWalkieTalkieMessage() {
        const messages = [
            "Driver 101, please confirm your location",
            "Emergency protocol activated, all drivers report status",
            "Maintenance needed on vehicle 205, please respond",
            "Traffic update: heavy congestion on Main St, use alternate route",
            "All drivers, be advised of weather conditions"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.walkieTalkie.messages.push({
            channel: this.walkieTalkie.currentChannel,
            message: randomMessage,
            timestamp: new Date(),
            sender: 'Dispatch'
        });
        
        this.showNotification(`Walkie Talkie: ${randomMessage}`, 'info');
    }

    // SMS Notification System
    initializeSMS() {
        this.sms = {
            templates: {
                pickup: "Your Helping Hands Transportation vehicle is on its way! Driver {driverName} will arrive at {pickupTime}. Vehicle: {vehicleType}. Questions? Call (555) 123-4567",
                arrival: "Your Helping Hands Transportation vehicle has arrived! Driver {driverName} is waiting for you. Vehicle: {vehicleType}",
                delay: "Update: Your pickup time has been adjusted to {newTime} due to traffic. Driver {driverName} will keep you updated. Thank you for your patience.",
                emergency: "Helping Hands Transportation Alert: {message}. For immediate assistance, call (555) 123-4567"
            }
        };
    }

    sendSMSNotification(tripId, type, additionalData = {}) {
        const trip = this.activeTrips.find(t => t.id === tripId);
        if (!trip) return;
        
        const driver = trip.driver;
        const patient = trip.patient;
        
        let message = this.sms.templates[type] || this.sms.templates.pickup;
        
        // Replace placeholders with actual data
        message = message
            .replace('{driverName}', driver.name)
            .replace('{pickupTime}', this.formatTime(trip.pickup.time))
            .replace('{vehicleType}', driver.vehicle)
            .replace('{newTime}', additionalData.newTime || '')
            .replace('{message}', additionalData.message || '');
        
        // Simulate sending SMS
        this.showNotification(`SMS sent to ${patient.name}: ${message.substring(0, 50)}...`, 'success');
        
        // Log the SMS for compliance
        this.logSMS(tripId, patient.phone, message, type);
        
        return {
            success: true,
            message,
            recipient: patient.name,
            phone: patient.phone,
            timestamp: new Date()
        };
    }

    logSMS(tripId, phone, message, type) {
        // In a real system, this would log to a database for compliance
        const logEntry = {
            tripId,
            phone,
            message,
            type,
            timestamp: new Date(),
            status: 'sent'
        };
        
        console.log('SMS Log:', logEntry);
    }

    // AI Assistant
    toggleAIAssistant() {
        const assistant = document.getElementById('ai-assistant');
        if (assistant) {
            assistant.style.display = assistant.style.display === 'none' ? 'block' : 'none';
        } else {
            this.createAIAssistant();
        }
    }

    createAIAssistant() {
        const assistant = document.createElement('div');
        assistant.id = 'ai-assistant';
        assistant.className = 'fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50';
        assistant.innerHTML = `
            <div class="bg-teal-600 text-white p-4 rounded-t-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="text-xl mr-2">🤖</span>
                        <div>
                            <div class="font-bold">AI Assistant</div>
                            <div class="text-sm opacity-90">Ready to help</div>
                        </div>
                    </div>
                    <button onclick="helpingHands.toggleAIAssistant()" class="text-white hover:text-gray-200">
                        ✕
                    </button>
                </div>
            </div>
            <div class="p-4">
                <div class="space-y-3 mb-4">
                    <button onclick="helpingHands.askAI('demand')" class="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100">
                        📊 Predict demand for tomorrow
                    </button>
                    <button onclick="helpingHands.askAI('route')" class="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100">
                        🗺️ Optimize current routes
                    </button>
                    <button onclick="helpingHands.askAI('maintenance')" class="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100">
                        🔧 Check maintenance needs
                    </button>
                    <button onclick="helpingHands.askAI('sentiment')" class="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100">
                        💬 Analyze patient feedback
                    </button>
                </div>
                <div class="border-t pt-3">
                    <input type="text" placeholder="Ask me anything..." class="w-full p-2 border border-gray-300 rounded text-sm"
                           onkeypress="if(event.key==='Enter') helpingHands.askAI(this.value)">
                </div>
            </div>
        `;
        document.body.appendChild(assistant);
    }

    askAI(question) {
        let response = '';
        
        if (question.includes('demand') || question === 'demand') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const predictedDemand = this.aiModels.demandPrediction.predict(tomorrow, 'clear', []);
            response = `Based on historical data and patterns, I predict approximately ${predictedDemand} trips for tomorrow. I recommend scheduling ${Math.ceil(predictedDemand * 1.1)} vehicles to handle potential variations.`;
        } else if (question.includes('route') || question === 'route') {
            response = `I've analyzed your current active trips and can optimize routes to reduce total travel time by 18%. This will save approximately $45 in fuel costs and improve on-time performance by 5%.`;
        } else if (question.includes('maintenance') || question === 'maintenance') {
            const highRiskVehicles = this.vehicles.filter(v => Math.random() > 0.7);
            if (highRiskVehicles.length > 0) {
                response = `I've identified ${highRiskVehicles.length} vehicles that may need maintenance attention soon. Vehicle 217 shows signs of potential brake wear and should be scheduled for inspection within the next week.`;
            } else {
                response = `All vehicles are showing normal maintenance parameters. No immediate action required. Next scheduled maintenance is for Vehicle 101 on December 28th.`;
            }
        } else if (question.includes('sentiment') || question === 'sentiment') {
            response = `I've analyzed recent patient feedback and found a 94% satisfaction rate. Common positive themes include driver professionalism and vehicle cleanliness. One area for improvement: some patients mentioned longer than expected wait times during peak hours.`;
        } else {
            response = `I'm here to help with NEMT operations. I can assist with demand prediction, route optimization, maintenance scheduling, and analyzing patient feedback. What would you like to know?`;
        }
        
        this.showNotification(`AI: ${response}`, 'info');
    }

    // Multi-Tenant System
    initializeMultiTenant() {
        this.currentTenant = this.detectCurrentTenant();
        this.tenantConfig = this.loadTenantConfig();
        this.applyTenantBranding();
    }

    detectCurrentTenant() {
        // Detect tenant from subdomain or URL parameters
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        // Default to Helping Hands if no subdomain detected
        if (subdomain === 'localhost' || subdomain === 'helpinghands') {
            return 'helpinghands';
        }
        
        return subdomain;
    }

    loadTenantConfig() {
        const tenantConfigs = {
            'helpinghands': {
                name: 'Helping Hands Transportation',
                logo: 'HH Logo White.png',
                primaryColor: '#2C5F5D',
                secondaryColor: '#7BA05B',
                features: ['ai', 'walkie-talkie', 'sms', 'analytics', 'billing', 'compliance'],
                plan: 'enterprise',
                maxVehicles: 100,
                maxUsers: 50
            },
            'medicare': {
                name: 'MediCare Transport',
                logo: 'medicare-logo.png',
                primaryColor: '#2563EB',
                secondaryColor: '#60A5FA',
                features: ['dispatch', 'tracking', 'billing', 'basic-analytics'],
                plan: 'professional',
                maxVehicles: 25,
                maxUsers: 15
            },
            'comfortcare': {
                name: 'Comfort Care Transport',
                logo: 'comfortcare-logo.png',
                primaryColor: '#7C3AED',
                secondaryColor: '#A78BFA',
                features: ['dispatch', 'tracking', 'billing', 'analytics', 'compliance'],
                plan: 'enterprise',
                maxVehicles: 50,
                maxUsers: 25
            }
        };
        
        return tenantConfigs[this.currentTenant] || tenantConfigs['helpinghands'];
    }

    applyTenantBranding() {
        // Apply custom CSS variables for tenant branding
        document.documentElement.style.setProperty('--deep-teal', this.tenantConfig.primaryColor);
        document.documentElement.style.setProperty('--sage-green', this.tenantConfig.secondaryColor);
        
        // Update logo if different from default
        if (this.tenantConfig.logo !== 'HH Logo White.png') {
            const logos = document.querySelectorAll('.logo');
            logos.forEach(logo => {
                logo.src = this.tenantConfig.logo;
            });
        }
        
        // Update company name
        const brandNames = document.querySelectorAll('.brand-name');
        brandNames.forEach(brandName => {
            brandName.textContent = this.tenantConfig.name;
        });
        
        // Filter features based on tenant plan
        this.filterFeaturesByTenant();
    }

    filterFeaturesByTenant() {
        // Hide features not available to current tenant
        const availableFeatures = this.tenantConfig.features;
        
        // Hide AI assistant if not available
        if (!availableFeatures.includes('ai')) {
            const aiBtn = document.getElementById('ai-assistant-btn');
            if (aiBtn) aiBtn.style.display = 'none';
        }
        
        // Hide walkie-talkie if not available
        if (!availableFeatures.includes('walkie-talkie')) {
            const walkieBtn = document.getElementById('walkie-talkie-btn');
            if (walkieBtn) walkieBtn.style.display = 'none';
        }
        
        // Hide SMS if not available
        if (!availableFeatures.includes('sms')) {
            const smsBtn = document.getElementById('sms-btn');
            if (smsBtn) smsBtn.style.display = 'none';
        }
    }

    // Tenant-specific data filtering
    getTenantData() {
        // Filter data based on current tenant
        return {
            drivers: this.drivers.slice(0, this.tenantConfig.maxVehicles),
            vehicles: this.availableVehicles.slice(0, this.tenantConfig.maxVehicles),
            trips: this.activeTrips.filter(trip => trip.tenantId === this.currentTenant || this.currentTenant === 'helpinghands')
        };
    }

    // Notification system
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Global functions for button interactions
function assignTrip(driverId) {
    window.helpingHands.showNotification(`Trip assignment feature for driver ${driverId} coming soon!`, 'info');
}

function contactDriver(driverId) {
    const driver = window.helpingHands.drivers.find(d => d.id === driverId);
    if (driver) {
        window.helpingHands.showNotification(`Calling ${driver.name} at ${driver.phone}...`, 'info');
    }
}

function viewTripDetails(tripId) {
    window.helpingHands.showNotification(`Trip details for trip ${tripId} coming soon!`, 'info');
}

function navigateToPage(page) {
    window.location.href = page;
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.helpingHands = new HelpingHandsTransportation();
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 1000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-success {
        background: #7BA05B;
    }
    
    .notification-info {
        background: #2C5F5D;
    }
    
    .notification-warning {
        background: #F2CC8F;
        color: #3D3D3D;
    }
    
    .notification-error {
        background: #C85A54;
    }
`;
document.head.appendChild(style);