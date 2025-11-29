# 🔒 Firebase Security Rules Deployment

## CRITICAL: You MUST deploy these security rules to Firebase!

Your app now has **whitelist authentication** that only allows:
- sandbergsimen90@gmail.com
- w.geicke@gmail.com

## 📋 Steps to Deploy Security Rules

### 1. **Firestore Rules** (Database)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste it into the Firebase console
6. Click **Publish**

### 2. **Storage Rules** (File Uploads)
1. In Firebase Console, go to **Storage** → **Rules** tab
2. Copy the contents of `storage.rules` file
3. Paste it into the Firebase console
4. Click **Publish**

### 3. **Verify Rules Are Active**
After publishing, try logging in with a non-whitelisted email to confirm:
- ✅ You see the red "DU SKAL IKKE INN HER" alert
- ✅ User is immediately signed out
- ✅ Cannot access any data in Firestore
- ✅ Cannot upload files to Storage

## 🚨 What Happens to Unauthorized Users

### Frontend Protection:
1. **Login Page**: Checks email against whitelist after Google sign-in
2. **Dramatic Alert**: Shows full-screen flashing red warning
3. **Auto Sign-Out**: Immediately signs out unauthorized users
4. **Auth Hook**: Continuously monitors and blocks unauthorized sessions

### Backend Protection (Firebase Rules):
1. **Firestore**: All read/write operations blocked for non-whitelisted emails
2. **Storage**: All file uploads/downloads blocked for non-whitelisted emails
3. **Server-Side**: Even if someone bypasses frontend, Firebase blocks them

## 🎯 Testing

### Test with Authorized Email:
```
Email: sandbergsimen90@gmail.com or w.geicke@gmail.com
Expected: ✅ Login successful, full access
```

### Test with Unauthorized Email:
```
Email: anyone-else@gmail.com
Expected: 
- 🚨 Red flashing screen
- ⛔ "DU SKAL IKKE INN HER" message
- 🚪 Automatic sign-out
- 🔒 No database access
```

## 📝 Files Created

1. `firestore.rules` - Firestore database security rules
2. `storage.rules` - Firebase Storage security rules  
3. `firebase-database-rules.json` - Realtime Database rules (if needed)

## ⚠️ Important Notes

- **Frontend checks alone are NOT secure** - anyone can bypass JavaScript
- **Firebase Rules are MANDATORY** - they provide server-side security
- **Both layers work together** for complete protection
- Rules are enforced by Google's servers, not your code

## 🔧 Adding More Users

To add more authorized users, update the whitelist in:

1. **Frontend** (2 files):
   - `frontend/src/pages/Login.tsx` - Line 6-9
   - `frontend/src/hooks/useAuth.ts` - Line 4-7

2. **Firebase Rules** (2 files):
   - `firestore.rules` - Update `isWhitelisted()` function
   - `storage.rules` - Update `isWhitelisted()` function

Then redeploy the Firebase rules!
