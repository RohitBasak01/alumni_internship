# WhatsApp Parity Gap Analysis

## Scope

This document maps the current mentorship chat implementation to a WhatsApp-like messaging experience and identifies the shortest safe path to parity.

Parity does **not** mean cloning every WhatsApp business, telephony, or multi-device feature on day one. It means delivering the core user expectations of a modern chat product:

- fast and reliable realtime messaging
- correct message lifecycle states
- rich composer and attachment flows
- solid group chat controls
- strong search, presence, and notification behavior
- secure and understandable encryption behavior

## Current Surface Area

The current chat implementation lives mainly in these files:

- `frontend/src/pages/MentorshipPage.jsx`
- `frontend/src/components/mentorship/MentorshipSidebar.jsx`
- `frontend/src/components/mentorship/MentorshipChat.jsx`
- `frontend/src/components/mentorship/MentorshipComposer.jsx`
- `frontend/src/components/mentorship/MessageBubble.jsx`
- `frontend/src/hooks/useMentorship.js`
- `frontend/src/hooks/useMentorshipSocket.js`
- `frontend/src/hooks/useMentorshipE2EE.js`
- `frontend/src/lib/api.js`
- `backend/src/routes/mentorship.routes.js`
- `backend/src/controllers/mentorship.controller.js`
- `backend/src/models/message.model.js`
- `backend/src/models/MentorshipRequest.js`
- `backend/src/server.js`

## Feature Matrix

### 1. Core Messaging

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Direct chat threads | Partial | Existing mentorship conversations are rendered and selectable | Model is still shaped around mentorship requests rather than a dedicated conversation domain |
| Group chats | Partial | UI has create-group modal and group thread rendering | Production routes for group create/leave/member management are missing from `backend/src/routes/mentorship.routes.js` |
| Realtime updates | Partial | Socket.IO exists in `backend/src/server.js` and `frontend/src/hooks/useMentorshipSocket.js` | Server emits only `mentorship:update`, while client listens for both `mentorship:update` and `mentorship:message`; event contract is inconsistent |
| Infinite scroll history | Present | `useInfiniteQuery` + `GET /:id/messages` | Needs stronger scroll restoration and unread anchor behavior |
| Optimistic sending | Partial | Pending message flow exists in `MentorshipPage.jsx` and `MentorshipChat.jsx` | Pending messages are never inserted before transmit, so optimistic UX is incomplete |
| Retry failed messages | Missing | Failure state can be set on pending message | No retry UI or resend mutation path |
| Offline queue | Missing | No persistence layer or reconnect replay | Messages can fail silently across connectivity changes |

### 2. Message Lifecycle

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Sent state | Partial | UI derives `sent` for own messages | No guaranteed server acknowledgement path tied to `clientId` replacement |
| Delivered state | Partial | `deliveredTo` exists in message schema | Controller does not update `deliveredTo` anywhere |
| Read receipts | Partial | `readBy` exists and `POST /:id/read` marks reads | Conversation-level unread counts are basic; no per-message double-check style UX |
| Failed state | Partial | Pending message can be marked failed | No visible resend action, no offline persistence |
| Message ordering | Partial | Messages sorted chronologically in UI | Needs stronger dedupe and ordering guarantees under reconnect/realtime overlap |
| Duplicate prevention | Partial | Socket hook checks duplicate `_id` when appending | Sender ack path and optimistic replacement are still brittle |

### 3. Composer and Attachments

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Text composer | Present | `MentorshipComposer.jsx` | Auto-grow, drafts, and keyboard polish are still light |
| Emoji insert | Partial | Emoji picker exists | Current emoji list is tiny and encoding is broken in `MentorshipPage.jsx` |
| File attachments | Partial | Upload API and UI exist | Attachment handling in `MentorshipChat.jsx` is marked "Mock upload for now or call real api" and lacks progress/errors per file |
| Image preview | Partial | Bubble renders images | Composer preview is minimal, no full-screen lightbox/gallery behavior |
| Video/audio/doc support | Partial | Generic file attachment model supports mime types | No tailored preview/players, no capture flows |
| Voice notes | Missing | No recorder or waveform flow | Major WhatsApp parity gap |
| Drag/drop and paste upload | Missing | No handlers present | Expected chat behavior missing |
| Reply composer preview | Partial | Reply UI exists | Backend response does not appear to consistently hydrate `replyTo` objects for fetched messages |

### 4. Message Actions

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Reactions | Present | Reaction endpoint and UI exist | Needs better popover dismissal and richer emoji set |
| Reply | Partial | UI sends `replyToMessageId` | Read path appears not to populate reply metadata reliably |
| Edit own message | Present | Patch route and UI exist | Should add edit time window and edited history policy if desired |
| Delete own message | Present | Delete route and tombstone UI exist | No "delete for everyone" policy distinction |
| Copy message | Present | Bubble menu supports copy | No fallback on clipboard failure |
| Forward message | Missing | No route or UI | Key WhatsApp feature absent |
| Star/bookmark | Missing | No model or UI | Useful parity feature absent |
| Pin message | Missing | No conversation-level pinned message support | Useful for groups |
| Select multiple messages | Missing | No multi-select action mode | Needed for forward/delete/share workflows |

### 5. Thread List and Conversation Management

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Conversation search | Present | Sidebar search filters local list | No server-side search, no search-inside-chat |
| Unread indicator | Partial | Sidebar shows "New" pill | No unread counts, no unread divider in thread |
| Thread preview | Partial | Latest message preview shown | No attachment/type-aware previews, no mention badges |
| Archive chats | Missing | No model, route, or UI | Common messaging expectation absent |
| Mute chats | Missing | Group member mute exists in model, but not conversation notifications mute | User-level mute behavior is absent |
| Pin chats | Missing | No UI or persistence | Common messaging expectation absent |
| Delete/clear chat | Missing | No conversation cleanup controls | Useful but risky feature absent |
| Block/report user | Missing | No safety tooling in chat surface | Important trust and safety gap |

### 6. Presence and Realtime UX

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Typing indicators | Present | API + UI exist | Needs throttling cleanup and maybe socket-native transport instead of HTTP mutation spam |
| Online indicator | Partial | Direct threads expose `online` from request status | This is not true presence; it is business status, not live connectivity |
| Last seen | Missing | No schema or API | Major parity gap |
| Connection state | Partial | `isRealtimeConnected` exists | Not surfaced meaningfully in UI |
| Presence privacy controls | Missing | No settings layer | Needed if last seen/online is added |

### 7. Group Chat

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Create group | Partial | UI and frontend API call exist | Production route/controller missing |
| Leave group | Partial | Frontend API exists | Production route/controller missing |
| Member roles | Partial | Schema and frontend API exist | Production routes/controllers missing |
| Remove member | Partial | Frontend API exists | Production route/controller missing |
| Mute member | Partial | Schema and frontend API exist | Production route/controller missing |
| Group info drawer | Partial | Header info toggle exists | Detailed group management UI is not implemented |
| Add members after creation | Missing | No active UI flow | Important group lifecycle feature |
| Mentions | Missing | No parsing or notification behavior | Important for group usability |
| Invite links | Missing | No route or model | Nice-to-have after core group controls |

### 8. Search and Discovery

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Search chats by participant/content preview | Present | Sidebar local filtering | Limited to already-loaded conversation list |
| Search within conversation | Missing | No route or UI | Major parity gap |
| Shared media/docs/links view | Missing | No conversation asset index | Important once attachments grow |
| Jump to search result context | Missing | No result navigation state | Needed for in-chat search |

### 9. Notifications

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| App notification system exists | Partial | Global notifications exist elsewhere in app | Chat-specific notification preferences are not integrated |
| Unread summary | Partial | Dashboard notification summary exists | Chat unread counts are not first-class |
| Push notifications | Missing | No service worker or push flow in chat | Major parity gap for mobile-like behavior |
| Mention/reply notifications | Missing | No specialized notification events | Needed for groups and replies |

### 10. Security and Encryption

| Feature | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Device key generation | Present | `useMentorshipE2EE.js` | Needs production routes to persist/fetch public keys and envelopes |
| Conversation secret storage | Partial | Secret is stored locally and fingerprinted | UX is device-local, manual, and fragile for true multi-device parity |
| Message encryption | Partial | `encryptMessageContent`/`decryptMessageContent` are wired | Needs full backend support and attachment encryption completion |
| Attachment encryption | Partial | Attachment schema includes encryption fields | Upload flow does not fully wire encrypted file processing in current chat component |
| Key verification | Partial | Fingerprint UI exists | No participant verification workflow beyond local toggle |
| Multi-device key sync | Missing | Local storage based secret handling only | Far from WhatsApp-level multi-device E2EE behavior |

## High-Risk Integration Mismatches

These should be fixed before adding more features.

### A. Frontend API calls do not match production backend routes

`frontend/src/lib/api.js` exposes these mentorship endpoints that are not present in `backend/src/routes/mentorship.routes.js`:

- `POST /mentorship/groups`
- `POST /mentorship/:id/leave`
- `PUT /mentorship/e2ee/public-key`
- `PATCH /mentorship/:id/e2ee/envelopes`
- member role/mute/remove routes
- upload route for `/mentorship/uploads`

This means some UI paths are either broken in production or only work in mock mode.

### B. Realtime event contract is inconsistent

The frontend socket hook listens for:

- `mentorship:message`
- `mentorship:update`

The backend emits:

- `mentorship:update`

There is no `mentorship:message` emission in `backend/src/server.js`. Message-specific append behavior therefore depends on an event that is never sent.

### C. Reply UX is ahead of the server response shape

Frontend components expect `message.replyTo` with:

- `messageId`
- `senderName`
- `content`

The schema stores `replyToMessageId`, but the message fetch and mutation responses do not clearly populate a `replyTo` object. Reply rendering may therefore be inconsistent after reloads or across devices.

### D. Delivery receipts are modeled but not maintained

`deliveredTo` exists in both message schemas and UI derives delivery state from it, but current controllers do not update it when recipients connect, subscribe, or receive payloads. This makes WhatsApp-style sent/delivered/read states inaccurate.

### E. Optimistic UI is incomplete

`transmitPendingMessage` removes or updates pending messages, but the current flow does not clearly add the pending message into the store before send. That weakens instant-send feel and makes retry flows harder.

## Recommended Build Order

### Phase 0: Stabilize the contract

Goal: make current chat reliable enough to extend.

1. Align frontend and backend mentorship route surface.
2. Implement missing production routes for group management, uploads, and E2EE sync.
3. Normalize socket event contract so message events, typing events, and read events are handled consistently.
4. Fix optimistic send, dedupe, retry, and `clientId` reconciliation.
5. Hydrate reply metadata in all message responses.
6. Implement actual `deliveredTo` updates.

### Phase 1: Ship a strong WhatsApp-like MVP

Goal: satisfy the majority of user expectations.

1. Improve thread list with unread counts and better previews.
2. Improve composer with auto-grow, robust attachment flow, and full emoji picker.
3. Add resend failed message and offline-safe draft persistence.
4. Add search within conversation.
5. Add archive, mute, clear chat, and block/report actions.
6. Add group member management UI.
7. Add presence model with online/last seen.

### Phase 2: Close major parity gaps

Goal: move from good messenger to near-full parity.

1. Voice notes.
2. Forwarding and multi-select.
3. Starred messages and pinned messages.
4. Shared media/docs/links panels.
5. Mention support in groups.
6. Push notifications.
7. Delete-for-everyone policy.

### Phase 3: Advanced security and multi-device behavior

Goal: approach high-trust messaging quality.

1. Proper public-key lifecycle routes and verification UX.
2. Multi-device key sync and trusted-device model.
3. Better encrypted attachment pipeline.
4. Key rotation, device revocation, and recovery flows.

## Implementation Backlog

### Priority 1: Must do first

- Add missing production mentorship routes and controllers.
- Fix socket event names and payload handling.
- Add upload route used by `uploadMentorshipAttachment`.
- Populate reply metadata from `replyToMessageId`.
- Reconcile optimistic pending messages with server acks.
- Update `deliveredTo` on recipient receipt/subscription.

### Priority 2: Must do for MVP parity

- Conversation unread counts and unread divider.
- Search inside conversation.
- Archive/mute/block/report.
- Better attachment previews and upload progress.
- Group management UI and mention support.
- Presence model for online and last seen.

### Priority 3: After MVP

- Voice notes.
- Forwarding.
- Starred messages.
- Pinned messages.
- Shared media/docs/links.
- Push notifications.

## Suggested Repo Workstreams

### Backend

- `backend/src/routes/mentorship.routes.js`
- `backend/src/controllers/mentorship.controller.js`
- `backend/src/models/message.model.js`
- `backend/src/models/MentorshipRequest.js`
- `backend/src/server.js`
- `backend/src/utils/attachments.js`

### Frontend Data and State

- `frontend/src/lib/api.js`
- `frontend/src/hooks/useMentorship.js`
- `frontend/src/hooks/useMentorshipSocket.js`
- `frontend/src/hooks/useMentorshipE2EE.js`

### Frontend UI

- `frontend/src/components/mentorship/MentorshipSidebar.jsx`
- `frontend/src/components/mentorship/MentorshipChat.jsx`
- `frontend/src/components/mentorship/MentorshipComposer.jsx`
- `frontend/src/components/mentorship/MessageBubble.jsx`
- `frontend/src/components/mentorship/MentorshipModals.jsx`
- `frontend/src/components/mentorship/Mentorship.css`

## Recommended Next Step

Start with **Phase 0** and keep the first implementation slice narrow:

1. make the production route surface match the frontend
2. fix realtime event consistency
3. make send/delivered/read/reply flows correct end-to-end

Until those are solid, every new WhatsApp-like feature will sit on shaky foundations.
