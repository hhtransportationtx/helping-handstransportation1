# 🚗 Raven Connected Integration - Complete Setup Guide

## 📋 What You Have

- **7 Raven Connected Dash Cameras** installed in:
  - BatMobile
  - Fiona
  - Luna
  - Mike
  - Scarlette
  - Smurf
  - Terminator

- **Your Credentials:**
  - Integration URL: `https://api.ravenconnected.com`
  - Integration Secret: `OBKSecret260102`
  - API Documentation: https://api.ravenconnected.com/docs

---

## 🔧 System Components

Your app has 3 integrated Raven systems:

### 1. Webhook (Real-Time Event Receiver)
**File:** `supabase/functions/raven-webhook/index.ts`

Receives instant notifications when safety events occur:
- Hard braking
- Harsh acceleration
- Harsh cornering
- Distracted driving
- Speeding violations

**What it does:**
1. Validates webhook signature for security
2. Saves event to `dash_camera_events` table
3. Creates notifications for driver, dispatchers, and admins
4. Updates driver safety scores automatically
5. Stores video URL, GPS location, speed, severity

### 2. API Sync (Historical Data Fetch)
**File:** `supabase/functions/raven-connected-sync/index.ts`

Pulls historical data from Raven's API:
- `check_api_key` - Verify API configuration
- `sync_events` - Download events for date range
- `get_video` - Download specific video footage
- `calculate_safety_score` - Recalculate driver scores

### 3. Configuration UI
**File:** `src/components/RavenConfiguration.tsx`

Admin interface for:
- Mapping vehicles to Raven device IDs
- Testing API connection
- Viewing configuration status

### 4. Webhook Testing Tool
**File:** `src/components/RavenWebhookTester.tsx`

Testing interface for:
- Verifying webhook endpoint is working
- Checking API key configuration
- Sending test events

---

## 🎯 Setup Process

### STEP 1: Add Supabase Secrets

Add these environment variables to your Supabase project:

1. Go to: Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add:
   ```
   RAVEN_API_KEY=<your_api_key_from_raven>
   RAVEN_WEBHOOK_SECRET=OBKSecret260102
   ```

**To get your API key:**
1. Log in to Raven dashboard
2. Go to: Settings → API Keys (or Developer Settings)
3. Copy the API key
4. Add it to Supabase secrets as shown above

### STEP 2: Find Device IDs

1. Log in to: https://app.ravenconnected.com (or your Raven portal)
2. Click on each vehicle
3. Find "Device ID", "Serial Number", or "IMEI"
4. Write them down:
   ```
   BatMobile: _______________
   Fiona:     _______________
   Luna:      _______________
   Mike:      _______________
   Scarlette: _______________
   Smurf:     _______________
   Terminator:_______________
   ```

### STEP 3: Map Devices in Your App

1. In your app, go to: **Fleet Management** → **Raven Configuration**
2. Enter each vehicle's Raven Device ID
3. Click **Save Configuration**
4. Click **Test Connection** to verify

### STEP 4: Configure Webhook in Raven

This enables real-time event notifications!

1. Log in to Raven dashboard
2. Navigate to: **Settings** → **Integrations** → **Webhooks**
3. Click **Add Webhook** or **New Integration**
4. Configure:
   ```
   Webhook URL: https://vnyebfjpkgqurgqxoqyv.supabase.co/functions/v1/raven-webhook

   Method: POST

   Signature Verification: ENABLED
   Secret: OBKSecret260102

   Events to Send: [Select all safety events]
   ✓ Hard Braking
   ✓ Harsh Acceleration
   ✓ Harsh Cornering
   ✓ Distracted Driving
   ✓ Speeding
   ✓ All other safety events
   ```
5. **Save** the webhook configuration

### STEP 5: Test Everything

1. Go to: **Fleet Management** → **Raven Webhook Tester**
2. Click **Test API Key** - should show "configured"
3. Click **Test Webhook** - should return success
4. Trigger a real event (have a driver brake hard safely)
5. Check notifications panel for the alert

---

## 🔍 Understanding Event Flow

### Real-Time Event (via Webhook):
```
Driver brakes hard
    ↓
Raven camera detects it
    ↓
Raven sends webhook to your URL
    ↓
Your webhook function processes it
    ↓
Event saved to database
    ↓
Notifications sent to:
  • Driver
  • All dispatchers
  • All admins
    ↓
Driver safety score updated
```

### Historical Sync (via API):
```
Admin clicks "Sync Events"
    ↓
Your app calls Raven API
    ↓
Downloads events for date range
    ↓
Saves to database
    ↓
Calculates safety scores
```

---

## 📊 Safety Score Calculation

Starting Score: **100 points**

**Penalty by Severity:**
- Low: -1 point
- Medium: -3 points
- High: -5 points
- Critical: -10 points

**Event Tracking:**
- Harsh braking count
- Harsh acceleration count
- Harsh cornering count
- Distraction count
- Speeding count

**Score Updates:**
- Calculated daily per driver
- Stored in `driver_safety_scores` table
- Shown in Driver Performance Dashboard

---

## 🗄️ Database Tables

### `dash_camera_events`
Stores all safety events:
- vehicle_id
- driver_id
- event_type
- severity
- event_timestamp
- video_url
- thumbnail_url
- location (lat/lng)
- speed_mph
- metadata

### `vehicle_camera_config`
Maps vehicles to Raven devices:
- vehicle_id
- raven_device_id
- camera_model
- status
- installation_date
- last_sync

### `driver_safety_scores`
Daily driver scores:
- driver_id
- date
- overall_score
- harsh_braking_count
- harsh_acceleration_count
- harsh_cornering_count
- distraction_count
- speeding_count

---

## 🧪 Testing Checklist

- [ ] RAVEN_API_KEY added to Supabase secrets
- [ ] RAVEN_WEBHOOK_SECRET added to Supabase secrets
- [ ] All 7 vehicles mapped to device IDs
- [ ] Configuration saved in app
- [ ] Connection test passes
- [ ] Webhook configured in Raven dashboard
- [ ] Webhook URL test passes
- [ ] API key test passes
- [ ] Test event received successfully
- [ ] Real event triggers notification
- [ ] Safety score updates correctly

---

## 🚨 Troubleshooting

### Webhook Not Receiving Events
1. Verify webhook URL in Raven dashboard is correct
2. Check RAVEN_WEBHOOK_SECRET matches in both systems
3. Ensure signature verification is enabled
4. Check Supabase Edge Function logs for errors
5. Use Webhook Tester to send test event

### API Sync Fails
1. Verify RAVEN_API_KEY is correct in Supabase secrets
2. Check device ID is correct for vehicle
3. Verify date range is valid
4. Check Raven API status
5. Review Edge Function logs

### Safety Scores Not Updating
1. Verify driver is assigned to vehicle
2. Check events are being saved to database
3. Verify event_type field format matches score logic
4. Review driver_safety_scores table

### No Notifications Appearing
1. Verify notifications table has entries
2. Check driver_id exists in profiles table
3. Verify dispatcher/admin roles are set correctly
4. Check NotificationsPanel component is showing

---

## 📞 Support Resources

- **Raven Support**: support@ravenconnected.com
- **Raven Documentation**: https://api.ravenconnected.com/docs
- **Your Integration URL**: https://api.ravenconnected.com
- **Your Webhook URL**: https://vnyebfjpkgqurgqxoqyv.supabase.co/functions/v1/raven-webhook

---

## 🎓 Understanding the Email Screenshot

From your integration email:

**Integration URL** = Where to make API calls
- Used by: `raven-connected-sync` function
- For: Pulling historical data

**Integration Secret** = Webhook signature verification
- Used by: `raven-webhook` function
- For: Validating incoming events are from Raven

**Account Rep Contact** = Josh Asbury
- Email: joshua.asbury@ravenconnected.com
- For: Questions about devices, features, billing

---

## ✅ You're Done When...

1. All 7 vehicles show "Configured" status
2. Test Connection succeeds
3. Webhook Test succeeds
4. API Key Test succeeds
5. A real safety event:
   - Appears in dash_camera_events table
   - Creates notifications
   - Updates driver safety score
   - Shows video/thumbnail URLs

---

**Need Help?** Contact your system administrator or check Supabase Edge Function logs for detailed error messages.
