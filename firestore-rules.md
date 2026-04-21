rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Events collection (existing for social.tsx)
    match /events/{eventId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Marketplace listings collection (new for marketplace.tsx)
    match /listings/{listingId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.sellerId || 
         request.auth.uid in resource.data.interestedUsers);
    }
  }
}

**Instructions:**
1. Copy entire rules above.
2. Go to Firebase Console > Firestore Database > Rules tab.
3. Paste & Publish.
4. Restart app (`npx expo start --clear`).

This fixes "permission-denied" error for listings/events reads/writes.
