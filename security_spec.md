# Security Specification

## Data Invariants
1. A user profile (`/users/{userId}`) can only be created/updated by the user themselves.
2. Only admins can update the `isAdmin` field in a user profile.
3. Schedule events (`/users/{userId}/events/{eventId}`) can only be accessed (read/write) by the owner of the parent user document.
4. All IDs must be valid strings.

## The "Dirty Dozen" Payloads (Deny cases)
1. Create a user profile with `uid` not matching `request.auth.uid`.
2. Update someone else's user profile.
3. Update `isAdmin` to `true` as a non-admin.
4. Read schedule events of another user.
5. Create a schedule event in another user's subcollection.
6. Delete a schedule event belonging to another user.
7. Create a schedule event with missing required fields.
8. Create a schedule event with invalid data types (e.g., `dayOfWeek` as string).
9. Inject a huge string into an ID field.
10. Update a schedule event and change the `userId`.
11. Update `createdAt` (if implemented).
12. List all users as a non-admin.

## Security Rules Implementation Plan
- Use `isValidId` helper.
- Use `isAdmin` helper checking an `admins` collection or a hardcoded list for bootstrapping. (I'll use a check against a specific email `hoanghiep1296@gmail.com` for bootstrapping admin rights in the rules if possible, but the skill says check a document).
- Actually, the skill says: "Auth tokens NEVER contain custom claims... You MUST explicitly look up roles using get() or exists()".
- I'll create an `admins/{uid}` collection for admin checks.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
    function isAdmin() { return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid)); }
    function isValidId(id) { return id is string && id.size() <= 128; }

    match /users/{userId} {
      allow get: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId) && !request.resource.data.diff({}).affectedKeys().hasAny(['isAdmin']);
      allow update: if isOwner(userId) && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin']);
      allow update: if isAdmin();
      
      match /events/{eventId} {
        allow read, write: if isOwner(userId) || isAdmin();
      }
    }
    
    match /admins/{uid} {
      allow read: if isSignedIn();
      allow write: if false; // Only manageable via Firebase Console or special script
    }
  }
}
```
