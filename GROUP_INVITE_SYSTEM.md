# Group Invite System Guide

## Overview
The Cooper app has two separate invitation systems:
1. **Friend Invites** - Invite users to become your friend
2. **Group Invites** - Invite users to join a specific group

Both systems support inviting users via WhatsApp using unique token-based links.

---

## WhatsApp Invite Messages

### Friend Invite Message
When you invite someone via WhatsApp to become a friend:
```
Hi! {username} has invited you to join Cooper - the collaborative expense splitting app!
Click here to accept the invitation: {FRONTEND_URL}/invite/{token}
```

**Example:**
```
Hi! John has invited you to join Cooper - the collaborative expense splitting app!
Click here to accept the invitation: http://localhost:5173/invite/a1b2c3d4e5f6...
```

### Group Invite Message
When you invite someone via WhatsApp to join a group:
```
Hi! {username} has invited you to join the group "{groupName}" on Cooper!
Click here to accept the invitation: {FRONTEND_URL}/group-invite/{token}
```

**Example:**
```
Hi! John has invited you to join the group "Weekend Trip Crew" on Cooper!
Click here to accept the invitation: http://localhost:5173/group-invite/a1b2c3d4e5f6...
```

---

## How It Works

### Friend Invite Flow

#### 1. Sending the Invite
- **API Endpoint**: `POST /api/v1/friends/invite/phone`
- **Request Body**: 
  ```json
  {
    "phoneNumber": "+919876543210"
  }
  ```
- **Backend Process**:
  1. Generates a unique 32-byte hex token
  2. Creates a `PhoneInvite` document with:
     - Phone number
     - Token
     - Requester (sender)
     - Expiry (7 days from creation)
  3. Sends WhatsApp message via Twilio with the invite link
  4. Returns success response

#### 2. Accepting the Invite
**Scenario A: User Already Has Account**
1. User clicks WhatsApp link → Redirects to `/invite/{token}`
2. `InviteHandler` component loads
3. Checks if user is logged in
4. Calls `POST /api/v1/friends/invite-token/:token/accept`
5. Backend:
   - Validates token (not expired, status is pending)
   - Checks if recipient exists in database
   - Creates friend relationship (status: accepted)
   - Updates PhoneInvite status to "accepted"
6. User is redirected to `/friends` page

**Scenario B: User Doesn't Have Account**
1. User clicks WhatsApp link → Redirects to `/invite/{token}`
2. `InviteHandler` detects user not logged in
3. Stores token in localStorage
4. Redirects to `/signup` page
5. After signup/login:
   - Backend auto-accepts friend invite if phone matches
   - Creates User account with verified phone
   - Establishes friend relationship
6. User is redirected to dashboard

---

### Group Invite Flow

#### 1. Sending the Invite

**Option A: From Create Group Page**
- After creating a group, you can add members via:
  - Friend list (select existing friends)
  - WhatsApp invite (enter phone numbers)

**Option B: From Group Details Page** (future enhancement)
- TBD: Will have "Invite Members" button

**API Endpoint**: `POST /api/v1/groups/invite/whatsapp`
**Request Body**:
```json
{
  "groupId": "65abc123def456...",
  "phoneNumbers": ["+919876543210", "+918765432109"]
}
```

**Backend Process**:
1. Validates that user is a group member
2. For each phone number:
   - Generates unique 32-byte hex token
   - Creates `GroupInvite` document with:
     - Group reference
     - Sender (current user)
     - Phone number
     - Token
     - Status: "pending"
     - InviteType: "phone"
     - Expiry (7 days)
   - Sends WhatsApp message with group name and invite link
3. Returns success response with invite count

#### 2. Viewing Pending Invites
- **Location**: Groups page → "Invites" tab
- **API Endpoint**: `GET /api/v1/groups/invites`
- **Response**: List of pending group invites with:
  - Group details (name, member count)
  - Sender information
  - Invite type (friend/phone)
  - Creation date
- **UI Features**:
  - Cards showing group name and sender
  - Accept/Decline buttons
  - Time since invite sent
  - Badge indicating invite type

#### 3. Accepting the Invite

**Scenario A: User Already Has Account (Direct Accept)**
1. User views invite in Groups → Invites tab
2. Clicks "Accept" button
3. Calls `POST /api/v1/groups/invites/:inviteId/accept`
4. Backend:
   - Validates invite (pending status, not expired)
   - Adds user to `group.members[]` array
   - Updates invite status to "accepted"
   - Emits Socket.IO `memberJoined` event
5. User is redirected to group page
6. Invite is removed from pending list

**Scenario B: User Clicks WhatsApp Link (Not Logged In)**
1. User clicks WhatsApp link → Redirects to `/group-invite/{token}`
2. `GroupInviteHandler` component loads
3. Detects user not logged in
4. Stores `groupInviteToken` in localStorage
5. Shows message: "Please log in to accept this invitation"
6. Redirects to `/login` page
7. After login:
   - Checks localStorage for stored token
   - Calls `POST /api/v1/groups/invite-token/:token/accept`
   - Backend validates and adds user to group
   - Redirects to group page

**Scenario C: User Clicks WhatsApp Link (Already Logged In)**
1. User clicks WhatsApp link → Redirects to `/group-invite/{token}`
2. `GroupInviteHandler` component loads
3. Extracts token from URL
4. Shows group details with "Accept Invitation" button
5. User clicks button
6. Calls `POST /api/v1/groups/invite-token/:token/accept`
7. Backend validates and adds user to group
8. Success animation shown
9. Redirects to group page

---

## Database Models

### PhoneInvite Model
```javascript
{
  phoneNumber: String (required, indexed),
  requester: ObjectId (ref: User),
  recipient: ObjectId (ref: User, optional),
  token: String (unique, indexed),
  status: String (enum: pending/accepted/rejected/expired),
  expiresAt: Date (7 days from creation, TTL index)
}
```

### GroupInvite Model
```javascript
{
  group: ObjectId (ref: Group, required),
  sender: ObjectId (ref: User, required),
  recipient: ObjectId (ref: User, optional),
  phoneNumber: String (optional),
  token: String (unique, indexed),
  status: String (enum: pending/accepted/rejected/expired),
  inviteType: String (enum: friend/phone),
  expiresAt: Date (7 days from creation, TTL index)
}
```

---

## API Routes

### Friend Invites
- `POST /api/v1/friends/invite/phone` - Send WhatsApp friend invite
- `POST /api/v1/friends/invite-token/:token/accept` - Accept via token

### Group Invites
- `POST /api/v1/groups/invite/friend` - Send invite to existing friend
- `POST /api/v1/groups/invite/whatsapp` - Send WhatsApp invite(s)
- `GET /api/v1/groups/invites` - Get user's pending invites
- `POST /api/v1/groups/invites/:id/accept` - Accept invite (authenticated)
- `POST /api/v1/groups/invites/:id/reject` - Reject invite
- `POST /api/v1/groups/invite-token/:token/accept` - Accept via token (WhatsApp)

---

## Frontend Components

### InviteHandler.jsx
- Handles friend invite acceptance
- Route: `/invite/:token`
- Manages token storage for non-authenticated users

### GroupInviteHandler.jsx
- Handles group invite acceptance via WhatsApp link
- Route: `/group-invite/:token`
- Shows group details before acceptance
- Manages authentication state

### GroupInvites.jsx
- Displays pending group invites
- Used in Groups page → Invites tab
- Shows cards with Accept/Decline actions

### CreateGroup.jsx
- Has "Add Members" section with two tabs:
  - **Friends**: Select from existing friends
  - **WhatsApp**: Enter phone numbers
- Sends invites after group creation

---

## Key Differences

| Feature | Friend Invite | Group Invite |
|---------|--------------|--------------|
| **Purpose** | Establish friend connection | Join specific group |
| **Route** | `/invite/:token` | `/group-invite/:token` |
| **Model** | PhoneInvite | GroupInvite |
| **UI Location** | Friends page | Groups page → Invites tab |
| **Message** | Generic Cooper invite | Includes group name |
| **Auto-Accept** | On signup with matching phone | Manual acceptance required |
| **Requires Auth** | Optional (can signup after) | Required before acceptance |

---

## Token Security
- Tokens are 32-byte random hex strings (64 characters)
- Unique index prevents duplicates
- TTL index auto-deletes expired invites after 7 days
- Tokens are validated for:
  - Existence in database
  - Pending status
  - Not expired
  - Associated with correct group/user

---

## Future Enhancements
1. **Batch Accept**: Accept multiple group invites at once
2. **Invite Notifications**: Real-time notifications when invited
3. **Invite History**: View accepted/rejected invites
4. **Custom Messages**: Personalized invite messages
5. **Email Invites**: Support email in addition to WhatsApp
6. **Invite Reminders**: Resend invites to pending recipients
7. **Group Invite from Details**: Add "Invite" button in GroupDetails page
