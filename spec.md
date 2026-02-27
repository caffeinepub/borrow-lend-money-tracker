# Borrow & Lend Money Tracker

## Current State
- Internet Identity (ICP native) auth
- Mandatory signup: username, email, mobile (all unique)
- Email is locked after signup; username/mobile/displayName can be updated
- Contacts can be added by username, email, or mobile search
- In-app notifications for request events
- No Google login; no email notifications sent

## Requested Changes (Diff)

### Add
- Google OAuth login as the sole authentication method
- On first Google login, fetch email and name automatically from Google
- Post-signup onboarding step asking only for mobile number (email and name pre-filled from Google, locked/read-only)
- `addContactByMobileOrEmail(searchTerm)` backend function to find users by mobile or email only (no principal-based lookup in UI)
- Email notification dispatch on all user activities: added as contact, borrow/lend request created, request accepted/rejected/completed, any other relevant events
  - NOTE: Email sending is disabled on current plan -- email notifications will be queued/logged in backend but not delivered; in-app notifications remain the primary channel

### Modify
- Auth flow: replace Internet Identity with Google OAuth (via authorization component)
- Profile: name (displayName) is editable; email is pre-filled from Google and locked (not editable); mobile is mandatory
- Profile update endpoint: only allows updating name and mobile, never email
- Contact search: restrict to mobile or email lookup only (remove principal/username-based contact add in UI)
- Onboarding page: show pre-filled name and email from Google (read-only), ask only for mobile number

### Remove
- Internet Identity login button/flow
- Username field from signup (name comes from Google)
- Any UI to set/change email after signup

## Implementation Plan
1. Select `authorization` component (already selected) -- confirm Google OAuth is wired
2. Update backend:
   - Profile type: replace `username` with `googleName` (name from Google, editable); `email` from Google (immutable); `mobile` mandatory
   - `registerProfile(mobile, displayName)` -- email comes from auth context, not user input
   - `updateProfile(mobile, displayName)` -- only mobile and displayName changeable
   - `addContactBySearch(searchTerm)` -- search by email or mobile only, return matching principal + profile
   - Keep all notification logic; add notification types for contact-added events
   - Add email notification queue structure (store pending emails in stable var for future dispatch)
3. Update frontend:
   - Replace Internet Identity hooks with Google OAuth hooks from authorization component
   - LoginPage: show "Sign in with Google" button only
   - OnboardingPage: show read-only name + email from Google, single input for mobile number
   - ProfilePage: name and mobile editable, email read-only/locked
   - ContactsPage: search by mobile or email only
   - All existing request/notification flows remain intact

## UX Notes
- Mobile-first layout, bottom navigation preserved
- Onboarding is a single-step form (just mobile input) since name/email come from Google
- Profile page clearly marks email as "from Google account" and non-editable
- Contact search placeholder: "Search by mobile or email"
- In-app notification bell shows all activity notifications as before
- Email notifications note: currently stored but not delivered (plan limitation)
