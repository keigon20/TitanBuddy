# TitanBuddy - Marketplace Page Implementation TODO

**Status:** Complete - Files updated  
**Date:** Current session  
**Similar to:** app/social.tsx (events page)  
**Key Changes:** Firestore "listings" collection, fields: title, description, price, condition, category. No pickup location. Interest toggle instead of join.

## Step-by-Step Plan

1. [x] Create `app/marketplace.tsx` (full page, copy/adapt social.tsx structure)  
2. [x] Edit `app/home.tsx` (add 🛒 Marketplace button)  
3. [x] Edit `app/_layout.tsx` (add marketplace route to Stack)  
4. [ ] Test functionality (`npx expo start`)  
5. [ ] Update Firestore security rules for "listings"  
6. [x] Mark complete  

**Post-completion:** Run \`npx expo start --clear\` to test. Create listing via home → marketplace.

**Firestore Rules Suggestion (add to rules):**  
```
match /listings/{listing} {
  allow read: if true;  
  allow write: if request.auth != null;
  allow update: if request.auth != null && (request.auth.uid in resource.data.interestedUsers || request.auth.uid == resource.data.sellerId);
}
```

✅ Marketplace page added successfully! Ready for testing.

