# Borrow & Lend Money Tracker

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full-stack Borrow & Lend Money Tracker web app
- Internet Identity authentication
- Contact management (add by display name/ID, optional nickname)
- Borrow/Lend request flow: create, accept, reject, track status
- Transaction records auto-created on request acceptance
- In-app notifications for all request events
- Dashboard with summary cards (total borrowed, total lent, net balance)
- Profile page with editable display name
- Mobile-first layout with fixed bottom navigation (5 tabs)
- Notification bell in header with unread badge count

### Modify
- N/A

### Remove
- N/A

## Implementation Plan

### Backend (Motoko)
- `User` entity: principal, displayName, mobileNumber, createdAt, isActive
- `Contact` entity: id, ownerPrincipal, contactPrincipal, nickName, createdAt
- `BorrowLendRequest` entity: id, fromPrincipal, toPrincipal, amount, type (Borrow|Lend), status (Pending|Accepted|Rejected), notes, createdAt, respondedAt
- `Transaction` entity: id, requestId, fromPrincipal, toPrincipal, amount, type, createdAt
- `Notification` entity: id, userPrincipal, message, isRead, createdAt
- APIs: register/login (upsert user on II login), getMyProfile, updateProfile
- Contact APIs: addContact, getMyContacts
- Request APIs: createRequest, getRequests (sent/received/all), respondRequest (accept/reject)
- Transaction APIs: getMyTransactions
- Notification APIs: getMyNotifications, markNotificationRead, markAllRead
- Dashboard API: getDashboardSummary (totals, recent transactions, pending count)
- Validation: amount > 0, no self-request, no duplicate pending requests
- No hard deletes anywhere

### Frontend (React + TypeScript + Tailwind)
- Internet Identity login page
- Bottom navigation: Dashboard, Contacts, Requests, Transactions, Profile
- Header with notification bell + unread badge
- Dashboard: summary cards (borrowed/lent/net), pending badge, quick "New Request" button, recent 5 transactions
- Contacts page: list with avatar initials, search filter, add contact modal
- Requests page: segmented tabs (Sent/Received/All), status badges (yellow/green/red), action buttons (accept/reject for received pending)
- Transactions page: chronological list, filter by type, color-coded amounts
- Notifications page (accessible from bell): list with read/unread state, mark all read
- Profile page: display name editable, principal ID shown, account info
- New Request modal/page: select contact, enter amount, type (borrow/lend), notes
- Confirmation dialogs for accept/reject actions
- Mobile-first, blue/green color scheme, card-based layouts

## UX Notes
- Fixed bottom navigation bar with 5 tabs (Dashboard, Contacts, Requests, Transactions, Profile)
- Notification bell top-right of header
- Status badges: Pending=amber, Accepted=green, Rejected=red
- Amount color coding: lent = red (money out), borrowed = green (money in) on transactions
- Compact cards, no long scrolling
- FAB button for adding contacts / new requests
- Confirmation dialogs before accept/reject
- Display name required before using the app (onboarding step after first login)
