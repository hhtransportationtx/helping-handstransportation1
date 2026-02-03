# App Store Submission Guide for Helping Hands NEMT

This guide will help you submit your Helping Hands NEMT app to the Apple App Store.

## Prerequisites

- Apple Developer Account (Already have this)
- Mac with Xcode installed
- Valid Apple Developer Program membership ($99/year)

## Step 1: Build Your App

Run these commands in your project directory:

```bash
npm run ios:build
```

This will:
1. Build your web app
2. Sync the built files to the iOS project

## Step 2: Open in Xcode

```bash
npm run ios:open
```

This opens your iOS project in Xcode.

## Step 3: Configure Your App in Xcode

### A. Update Bundle Identifier
1. In Xcode, select the **App** project in the left sidebar
2. Select the **App** target
3. Go to the **Signing & Capabilities** tab
4. The Bundle Identifier is already set to: `com.helpinghands.nemt`
5. You can change this if needed (must be unique)

### B. Set Your Team
1. Under **Signing & Capabilities** > **Team**
2. Select your Apple Developer account
3. Xcode will automatically manage signing

### C. Update Version Numbers
1. Go to the **General** tab
2. Set **Version** (e.g., 1.0.0)
3. Set **Build** number (e.g., 1)

### D. Configure App Icon
1. In the left sidebar, navigate to: **App > App > Assets.xcassets > AppIcon**
2. Drag and drop your app icon images:
   - 1024x1024px for App Store
   - Other sizes as indicated in the asset catalog
3. Icon requirements:
   - No transparency
   - No rounded corners (iOS adds them automatically)
   - PNG format

### E. Configure Launch Screen
1. Navigate to: **App > App > Assets.xcassets > Splash**
2. Add your splash screen images
3. Image should be 2732x2732px

## Step 4: Test Your App

### On Simulator
1. In Xcode, select a simulator (e.g., iPhone 15 Pro)
2. Click the Play button or press Cmd+R
3. Test all features

### On Physical Device
1. Connect your iPhone via USB
2. Trust your Mac if prompted
3. Select your device from the device menu in Xcode
4. Click Run (Cmd+R)
5. On your iPhone, go to Settings > General > VPN & Device Management
6. Trust your developer certificate

## Step 5: Create App Store Connect Record

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** > **+** (plus icon) > **New App**
3. Fill in the form:
   - **Platform**: iOS
   - **Name**: Helping Hands NEMT
   - **Primary Language**: English
   - **Bundle ID**: Select `com.helpinghands.nemt`
   - **SKU**: Any unique identifier (e.g., helpinghands-nemt-001)
   - **User Access**: Full Access

## Step 6: Prepare App Metadata

In App Store Connect, you'll need to provide:

### App Information
- **App Name**: Helping Hands NEMT
- **Subtitle**: Professional NEMT Transportation Management
- **Category**: Business or Medical
- **Age Rating**: Complete the questionnaire

### Pricing and Availability
- **Price**: Free (or set your price)
- **Availability**: All countries or select specific ones

### Privacy Policy
- **Privacy Policy URL**: You'll need to host a privacy policy
- Required for App Store submission

### App Screenshots (Required)
You need screenshots for different device sizes:
- 6.7" Display (iPhone 15 Pro Max): 1290 x 2796 pixels
- 6.5" Display (iPhone 14 Plus): 1284 x 2778 pixels
- 5.5" Display (iPhone 8 Plus): 1242 x 2208 pixels

Take 3-5 screenshots showing key features:
1. Dashboard with driver map
2. Trip management screen
3. Driver tracking
4. Dispatch interface
5. Mobile driver app

### App Description
```
Helping Hands NEMT is a comprehensive Non-Emergency Medical Transportation management system designed for transportation providers, dispatchers, and drivers.

FEATURES:
• Real-time driver tracking with map visualization
• Intelligent trip scheduling and assignment
• Automated dispatch system
• Driver and dispatcher communication
• Trip confirmations and notifications
• Fleet management and maintenance tracking
• Billing and invoicing
• Client portal access
• Comprehensive reporting

FOR DISPATCHERS:
• Live map with driver locations
• Drag-and-drop trip assignment
• Automated closest driver selection
• Real-time status updates
• Walkie-talkie communication

FOR DRIVERS:
• Turn-by-turn navigation
• Trip details and patient information
• Digital signature capture
• Photo upload for documentation
• Earnings tracking
• Trip history

Helping Hands NEMT streamlines your entire NEMT operation from booking to billing.
```

### Keywords
transportation, NEMT, medical transport, dispatch, fleet management, driver tracking

### Support URL
Your website or support page URL

### Marketing URL (Optional)
Your company website

## Step 7: Archive and Upload to App Store

### Create Archive
1. In Xcode, select **Any iOS Device (arm64)** as the destination
2. Go to **Product** > **Archive**
3. Wait for the archive to complete (this may take a few minutes)
4. The Organizer window will open automatically

### Upload to App Store Connect
1. In the Organizer window, select your archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Click **Upload**
5. Select **Upload** (not Export)
6. Click **Next** through the options (keep defaults)
7. Click **Upload**

The upload process may take 10-30 minutes depending on your internet speed.

## Step 8: Submit for Review

1. Go back to App Store Connect
2. Wait for the build to appear (can take 10-30 minutes after upload)
3. In your app's version page, scroll to **Build**
4. Click **+** and select the build you just uploaded
5. Complete all required fields (description, screenshots, etc.)
6. Click **Save**
7. Click **Submit for Review**

### Review Questionnaire
You'll need to answer questions about:
- Encryption (select "No" if you're not using custom encryption)
- Advertising identifier
- Content rights
- Government contract work

### Review Notes (Important)
Provide Apple with:
- Test account credentials (username and password)
- Instructions for testing key features
- Any special setup needed

Example:
```
TEST ACCOUNTS:

Dispatcher Account:
Username: demo@dispatcher.com
Password: [provide test password]

Driver Account:
Username: demo@driver.com
Password: [provide test password]

TESTING INSTRUCTIONS:
1. Login with dispatcher account
2. View the dashboard and live map
3. Create a test trip
4. Login with driver account on another device
5. Accept the trip and view navigation

Note: Location permissions are required for driver tracking features.
```

## Step 9: Wait for Review

- Initial review typically takes 24-48 hours
- You'll receive email updates about the review status
- Check App Store Connect regularly for updates

### Review Status States:
- **Waiting for Review**: In the queue
- **In Review**: Apple is actively reviewing
- **Pending Developer Release**: Approved, waiting for you to release
- **Ready for Sale**: Live on the App Store
- **Rejected**: Needs fixes (Apple will provide reasons)

## Step 10: Handle Rejection (if needed)

If rejected, Apple will tell you why. Common reasons:
- Missing test account
- Crashes during testing
- Missing features described in screenshots
- Privacy policy issues
- Incomplete metadata

Fix the issues and resubmit.

## Tips for Approval

1. **Test Thoroughly**: Test on multiple devices and iOS versions
2. **Provide Working Test Accounts**: Critical for approval
3. **Clear Screenshots**: Show actual app features
4. **Complete Metadata**: Fill out all fields
5. **Privacy Policy**: Host a clear privacy policy
6. **Responsive Support**: Respond quickly to Apple's questions

## Post-Approval Updates

To submit updates:
1. Update version number in Xcode
2. Build and archive new version
3. Upload to App Store Connect
4. Create a new version in App Store Connect
5. Add "What's New" notes
6. Submit for review

## Important Files in Your Project

- **capacitor.config.ts**: App ID and name configuration
- **ios/App/App/Info.plist**: App permissions and settings
- **ios/App/App/Assets.xcassets**: Icons and images

## Commands Reference

```bash
# Build web app and sync to iOS
npm run ios:build

# Open project in Xcode
npm run ios:open

# Just build web app
npm run build

# Sync without building
npx cap sync ios
```

## Need Help?

- [Apple Developer Forums](https://developer.apple.com/forums/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

## Current App Configuration

- **App Name**: Helping Hands NEMT
- **Bundle ID**: com.helpinghands.nemt
- **Permissions Added**:
  - Location (Always and When In Use) - For driver tracking
  - Camera - For QR code scanning and photos
  - Microphone - For walkie-talkie feature
  - Photo Library - For saving trip photos
- **Background Modes**: Location, Audio

Your app is ready for App Store submission!
