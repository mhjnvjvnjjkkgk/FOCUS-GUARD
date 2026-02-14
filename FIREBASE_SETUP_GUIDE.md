# Firebase & Google Auth Setup Guide

Follow these steps to generate the keys needed for the app.

## Step 1: Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Name it `FocusGuard` (or anything you like).
4. Disable "Google Analytics" for now (simpler).
5. Click **Create project**.

## Step 2: Enable Database (Firestore)
1. In the left sidebar, click **Build** -> **Firestore Database**.
2. Click **Create database**.
3. Choose **Start in test mode** (Easier for development).
4. Select a location (e.g., `nam5 (us-central)`).
5. Click **Enable**.

## Step 3: Enable Authentication (Google)
1. In the left sidebar, click **Build** -> **Authentication**.
2. Click **Get started**.
3. Select **Google** from the providers list.
4. Click **Enable** (toggle switch).
5. Set the **Project support email** (use your email).
6. Click **Save**.

## Step 4: Get "firebaseConfig" Keys
1. Click the **Gear icon** (Settings) next to "Project Overview" in the top left.
2. Select **Project settings**.
3. Scroll down to the "Your apps" section.
4. Click the **</>** icon (Web).
5. Register app with nickname `FocusGuard-Web`.
6. **COPY** the `firebaseConfig` object (apiKey, authDomain, etc.).
7. Open `configs/firebaseConfig.ts` in your code and replace the text.

## Step 5: Get "clientId" for Google Login
1. Still in the **Authentication** -> **Sign-in method** -> **Google** section (click the Pencil icon to edit).
2. Look for **Web SDK configuration**.
3. Expand it to reveal the **Web Client ID**.
4. **COPY** this string (ends in `.apps.googleusercontent.com`).
5. Open `app/(tabs)/stats.tsx` in your code.
6. Search for `clientId:` and replace the placeholder text.

## Step 6: Restart App
1. In your terminal, verify the app is running (press `r` to reload).
2. Go to the **Stats** tab.
3. Click **SIGN IN (GOOGLE)**.
4. You should see the Google Login popup.
