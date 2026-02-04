# Phone Invite System - Complete Implementation Guide

## 🎉 Feature Overview

Users can now add friends via phone number! When you enter a phone number and click "Send Invite", an SMS is sent with a unique link. When the recipient clicks the link, they're directed to signup/login, and after authentication, they're automatically added to your friend list.

## 📱 Complete Flow

### 1. **Sender Flow**
   - User opens Friends page → Clicks "Add Friend" button
   - Switches to "Phone Invite" tab in the dialog
   - Enters friend's phone number (with or without country code)
   - Clicks "Send Invite"
   - SMS is sent via Twilio with invite link

### 2. **Recipient Flow**
   - Receives SMS: "{sender} invited you to join Cooper! Click here to accept: {link}"
   - Clicks link → Redirected to `/invite/{token}` page
   - Sees "You're Invited!" splash screen
   - Automatically redirected to signup page after 2 seconds
   - Signup page shows green banner: "🎉 You've been invited!"
   - Completes signup/login with their phone number
   - **Automatically added as friend** upon successful authentication
   - Invite token cleared from localStorage

### 3. **Smart Handling**
   - If user with that phone already exists → Creates friend request instead
   - If already friends → Shows appropriate error message
   - If phone number matches existing user → Direct friend request
   - Invite expires after 7 days
   - Can't send duplicate invites to same number

## 🔧 Backend Implementation

### Models

#### **PhoneInvite Model** (`server/src/models/phoneInvite.models.js`)
```javascript
{
  sender: ObjectId (ref: User),
  phoneNumber: String (formatted with country code),
  token: String (unique 32-byte hex),
  status: "pending" | "accepted" | "expired",
  expiresAt: Date (default: 7 days from creation),
  createdAt: Date,
  updatedAt: Date
}
```

**Features:**
- Auto-expires using MongoDB TTL index
- Static method `generateInviteToken()` - generates secure random token
- Static method `findValidInvite(token)` - finds non-expired pending invite

### Controllers

#### **sendPhoneInvite** (`friend.controllers.js`)
**Endpoint:** `POST /api/v1/friends/invite/phone`

**Request Body:**
```json
{
  "phoneNumber": "+911234567890" // or "1234567890"
}
```

**Process:**
1. Formats phone number (adds +91 if no country code)
2. Checks if user trying to invite themselves
3. If user exists with that phone:
   - Check if already friends → Error
   - Check if request pending → Error
   - Otherwise create friend request
4. If user doesn't exist:
   - Check for existing pending invite → Error
   - Generate unique token
   - Create PhoneInvite record
   - Create invite link: `{FRONTEND_URL}/invite/{token}`
   - Send SMS via Twilio
   - If SMS fails → Delete invite record

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "inviteLink": "http://localhost:5173/invite/abc123...",
    "phoneNumber": "+911234567890"
  },
  "message": "Invite sent successfully"
}
```

#### **acceptPhoneInvite** (`friend.controllers.js`)
**Endpoint:** `POST /api/v1/friends/invite/accept/:token`

**Process:**
1. Find valid invite by token
2. Verify user's phone matches invite phone
3. Check if already friends
4. Create or update Friend record with status "accepted"
5. Mark invite as accepted

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "requester": { username, email, avatar },
    "recipient": { username, email, avatar },
    "status": "accepted"
  },
  "message": "Friend added successfully"
}
```

### Auth Integration

#### **Updated registerUser** (`auth.controllers.js`)
- Accepts optional `inviteToken` parameter
- After user creation and OTP sending:
  - If inviteToken provided → Find valid invite
  - If invite valid and phone matches → Create friendship (status: "accepted")
  - Mark invite as accepted
  - Does NOT fail registration if invite processing fails

#### **Updated loginUser** (`auth.controllers.js`)
- Accepts optional `inviteToken` parameter
- After authentication:
  - If inviteToken provided → Find valid invite
  - If invite valid and phone matches → Create friendship (status: "accepted")
  - Mark invite as accepted
  - Does NOT fail login if invite processing fails

### Twilio Integration

#### **sendSMS Function** (`utils/twilio.js`)
```javascript
export const sendSMS = async (to, message) => {
  return await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to,
  });
};
```

**Required Environment Variables:**
```env
TWILIO_ACCOUNT_SID=ACa7a7381ec271d0a7328193695fbb855d
TWILIO_AUTH_TOKEN=cee78885618ec4fe717d183b13bd3e6a
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
FRONTEND_URL=http://localhost:5173  # Your frontend URL
```

**Note:** Add `TWILIO_PHONE_NUMBER` to your `.env` file with your Twilio phone number!

### Routes

**New Routes in** `friend.routes.js`:
```javascript
router.route("/invite/phone").post(sendPhoneInvite);
router.route("/invite/accept/:token").post(acceptPhoneInvite);
```

## 🎨 Frontend Implementation

### FriendsPage Updates

#### **New State Variables:**
```javascript
const [addMethod, setAddMethod] = useState("search"); // 'search' or 'phone'
const [phoneNumber, setPhoneNumber] = useState("");
const [phoneLoading, setPhoneLoading] = useState(false);
const [phoneInviteSuccess, setPhoneInviteSuccess] = useState(false);
```

#### **Add Friend Dialog - Two Tabs:**

**Tab 1: Search Users** (existing functionality)
- Search by username, email, phone
- Show results with action buttons
- Send friend request directly

**Tab 2: Phone Invite** (NEW!)
- Phone number input field
- Info message explaining the feature
- "Send Invite" button
- Success animation after sending
- Auto-closes after 3 seconds

#### **handleSendPhoneInvite Function:**
```javascript
const handleSendPhoneInvite = async () => {
  if (!phoneNumber.trim()) {
    alert("Please enter a phone number");
    return;
  }

  setPhoneLoading(true);
  try {
    await sendPhoneInvite(phoneNumber);
    setPhoneInviteSuccess(true);
    setPhoneNumber("");
    setTimeout(() => {
      setPhoneInviteSuccess(false);
      setShowAddFriendDialog(false);
    }, 3000);
  } catch (error) {
    console.error("Error sending phone invite:", error);
    alert(error.response?.data?.message || "Failed to send invite");
  } finally {
    setPhoneLoading(false);
  }
};
```

### InviteHandler Component

**New Page:** `client/src/pages/InviteHandler.jsx`

**Purpose:** Intermediate page that captures the invite token from URL

**Process:**
1. Extracts token from URL params
2. Stores token in localStorage: `localStorage.setItem("inviteToken", token)`
3. Shows beautiful "You're Invited!" splash screen
4. Redirects to `/signup?invited=true` after 2 seconds

### SignUp Updates

**New Features:**
- Detects `?invited=true` query parameter
- Shows green banner: "🎉 You've been invited! Complete signup to connect with your friend."
- Uses `useSearchParams` to check invite status

### Auth API Updates

**Updated Functions** (`client/src/api/auth.js`):

```javascript
export const registerUser = (userData) => {
  // Check for invite token in localStorage
  const inviteToken = localStorage.getItem("inviteToken");
  if (inviteToken) {
    userData.inviteToken = inviteToken;
  }
  return api.post("/api/v1/auth/register", userData);
};

export const loginUser = (credentials) => {
  // Check for invite token in localStorage
  const inviteToken = localStorage.getItem("inviteToken");
  if (inviteToken) {
    credentials.inviteToken = inviteToken;
  }
  return api.post("/api/v1/auth/login", credentials);
};
```

### App.jsx Route

**New Route:**
```javascript
<Route path="/invite/:token" element={<InviteHandler />} />
```

## 📊 Database Schema

### PhoneInvite Collection
```javascript
{
  _id: ObjectId("..."),
  sender: ObjectId("user_id_1"),
  phoneNumber: "+911234567890",
  token: "abc123def456...",  // 64 characters
  status: "pending",
  expiresAt: ISODate("2026-02-11T..."),  // 7 days from now
  createdAt: ISODate("2026-02-04T..."),
  updatedAt: ISODate("2026-02-04T...")
}
```

**Indexes:**
- `{ token: 1 }` - unique
- `{ expiresAt: 1 }` - TTL index for auto-deletion

### Friend Collection (unchanged)
```javascript
{
  _id: ObjectId("..."),
  requester: ObjectId("user_id_1"),
  recipient: ObjectId("user_id_2"),
  status: "accepted",  // Set automatically via invite
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

## 🔒 Security Features

1. **Token Security:**
   - 32-byte random hex tokens (64 characters)
   - Cryptographically secure using `crypto.randomBytes()`
   - One-time use (marked as accepted after use)

2. **Phone Validation:**
   - Backend validates phone matches invite
   - Can't accept invite with different phone number
   - Prevents invite hijacking

3. **Expiration:**
   - Invites expire after 7 days
   - MongoDB TTL index auto-deletes expired records
   - Frontend validates token on server side

4. **Duplicate Prevention:**
   - Can't send multiple pending invites to same number
   - Checks existing friendships before creating
   - Updates existing requests if rejected

## 🧪 Testing Guide

### Manual Testing Steps:

1. **Happy Path:**
   ```
   1. Login as User A
   2. Go to Friends page
   3. Click "Add Friend"
   4. Switch to "Phone Invite" tab
   5. Enter test phone number
   6. Click "Send Invite"
   7. Check phone for SMS
   8. Click link in SMS
   9. See invite splash screen
   10. Complete signup as User B
   11. Verify friendship created
   12. Login as User A
   13. Check Friends list → User B should be there
   ```

2. **Existing User:**
   ```
   1. Login as User A
   2. Try to invite User B's phone (who already exists)
   3. Should create friend request instead of invite
   4. User B should see pending request
   ```

3. **Already Friends:**
   ```
   1. User A and User B are already friends
   2. User A tries to invite User B's phone
   3. Should show error: "This user is already your friend"
   ```

4. **Expired Invite:**
   ```
   1. Manually set invite expiry to past date in DB
   2. Try to accept invite with token
   3. Should show: "Invalid or expired invite"
   ```

### API Testing (Postman/Thunder Client):

**Send Invite:**
```bash
POST http://localhost:8000/api/v1/friends/invite/phone
Headers: Authorization: Bearer {accessToken}
Body: {
  "phoneNumber": "+911234567890"
}
```

**Accept Invite:**
```bash
POST http://localhost:8000/api/v1/friends/invite/accept/{token}
Headers: Authorization: Bearer {accessToken}
```

## 🐛 Common Issues & Solutions

### Issue 1: SMS Not Sending
**Error:** "Failed to send SMS"
**Solution:**
- Check Twilio credentials in `.env`
- Verify `TWILIO_PHONE_NUMBER` is set
- Ensure phone number is verified in Twilio (for trial accounts)
- Check Twilio dashboard for error logs

### Issue 2: Invite Link 404
**Error:** Page not found when clicking link
**Solution:**
- Verify `FRONTEND_URL` in `.env` matches your frontend URL
- Check route is added in App.jsx: `/invite/:token`
- Ensure InviteHandler component is imported

### Issue 3: Friendship Not Created
**Error:** Invite accepted but not showing in friends list
**Solution:**
- Check browser console for errors
- Verify inviteToken is in localStorage
- Check backend logs for auth controller errors
- Ensure phone number in signup matches invite phone

### Issue 4: Token Already Used
**Error:** "Invalid or expired invite"
**Solution:**
- Invite tokens are one-time use
- Clear localStorage: `localStorage.removeItem("inviteToken")`
- Send a new invite

## 🚀 Deployment Checklist

- [ ] Add `TWILIO_PHONE_NUMBER` to production `.env`
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Verify Twilio phone number is purchased (not trial)
- [ ] Test SMS delivery to different carriers
- [ ] Set up MongoDB indexes on PhoneInvite collection
- [ ] Configure CORS for production domain
- [ ] Update invite link expiry time if needed (default: 7 days)
- [ ] Add analytics tracking for invite conversions
- [ ] Set up monitoring for SMS failures

## 📈 Future Enhancements

- [ ] Add email fallback if SMS fails
- [ ] Show invite pending status in UI
- [ ] Add ability to resend invite
- [ ] Track invite analytics (sent, accepted, expired)
- [ ] Add invite rewards/gamification
- [ ] Support international phone formats better
- [ ] Add WhatsApp invite option
- [ ] Show who invited user in welcome message
- [ ] Add invite history in profile

## 🎯 Summary

The phone invite system is now fully functional end-to-end:
✅ Backend models, controllers, and routes
✅ Twilio SMS integration
✅ Frontend UI with dual-tab dialog
✅ Invite link handling and redirection
✅ Auth integration for auto-friendship
✅ Security and validation
✅ Error handling and edge cases

Your users can now seamlessly invite friends via phone number! 🎉
