# Friend System Implementation Guide

## Overview
A comprehensive friend management system has been added to the Cooper app, allowing users to connect with each other and easily add friends to groups.

## Backend Implementation

### 1. Friend Model (`server/src/models/friend.models.js`)
- **Schema Fields:**
  - `requester`: User who sent the friend request
  - `recipient`: User who received the friend request
  - `status`: Enum - `pending`, `accepted`, `rejected`, `blocked`
  - Timestamps for tracking when requests were created/updated

- **Key Features:**
  - Compound index on `requester` and `recipient` to prevent duplicate requests
  - Static method `areFriends()` to check friendship status
  - Static method `getFriendsList()` to get all accepted friends

### 2. Friend Controllers (`server/src/controllers/friend.controllers.js`)
- **sendFriendRequest**: Send friend request to another user
- **acceptFriendRequest**: Accept pending friend request
- **rejectFriendRequest**: Reject pending friend request
- **removeFriend**: Remove existing friend connection
- **getFriends**: Get all accepted friends
- **getPendingRequests**: Get received pending requests
- **getSentRequests**: Get sent pending requests
- **searchUsers**: Search users by username, email, or phone with friendship status
- **blockUser**: Block a user

### 3. Friend Routes (`server/src/routes/friend.routes.js`)
All routes are protected with JWT authentication:
- `POST /api/v1/friends/send-request` - Send friend request
- `PATCH /api/v1/friends/accept/:requestId` - Accept friend request
- `PATCH /api/v1/friends/reject/:requestId` - Reject friend request
- `DELETE /api/v1/friends/remove/:friendId` - Remove friend
- `POST /api/v1/friends/block/:userId` - Block user
- `GET /api/v1/friends` - Get all friends
- `GET /api/v1/friends/pending` - Get pending requests
- `GET /api/v1/friends/sent` - Get sent requests
- `GET /api/v1/friends/search?query=<search>` - Search users

## Frontend Implementation

### 1. Friend API Integration (`client/src/api/friends.js`)
Axios wrapper functions for all friend-related API calls:
- `sendFriendRequest(recipientId)`
- `acceptFriendRequest(requestId)`
- `rejectFriendRequest(requestId)`
- `removeFriend(friendId)`
- `getFriends()`
- `getPendingRequests()`
- `getSentRequests()`
- `searchUsers(query)`
- `blockUser(userId)`

### 2. Friends Page (`client/src/pages/Homepage.jsx`)
Complete friend management interface with:
- **Search Bar**: Real-time user search by username, email, or phone
- **Smart Action Buttons**: 
  - "Add" for non-friends
  - "Pending" for sent requests
  - "Accept" for received requests
  - "Remove" for existing friends
- **Three Tabs**:
  - **Friends**: Display all accepted friends with remove option
  - **Requests**: Show pending friend requests with accept/reject actions
  - **Sent**: Display sent requests waiting for response
- **Live Updates**: Lists refresh after actions

### 3. Enhanced CreateGroup (`client/src/pages/CreateGroup.jsx`)
Updated "Add Members" section (Step 3) with:
- **Two Add Options**:
  1. **Add from Friends**: Opens dialog showing friend list
  2. **Add from Contacts**: Placeholder for phone contacts integration
  
- **Friend Selection Dialog**:
  - Displays all friends with avatars and usernames
  - Multi-select functionality with visual feedback
  - Shows already-added members as disabled
  - "Add Selected" button to bulk add friends
  - Selected count display

- **Enhanced Member Display**:
  - Shows username for friends (not just email)
  - Displays avatar from friend profile
  - "Friend" badge to distinguish friend members from email invites
  - Remove option for each member

## How to Use

### For Users:

1. **Add Friends**:
   - Navigate to Friends page (Homepage)
   - Search for users by username, email, or phone
   - Click "Add" button to send friend request

2. **Manage Friend Requests**:
   - Go to "Requests" tab to see incoming requests
   - Click checkmark to accept or X to reject
   - Go to "Sent" tab to see pending outgoing requests

3. **Add Friends to Groups**:
   - When creating a group, go to Step 3 (Add Members)
   - Click "Add from Friends" button
   - Select multiple friends from the dialog
   - Click "Add Selected" to add them to the group

### For Developers:

**Testing the API**:
```bash
# Send friend request
POST /api/v1/friends/send-request
Body: { "recipientId": "user_id_here" }

# Accept friend request
PATCH /api/v1/friends/accept/:requestId

# Get all friends
GET /api/v1/friends

# Search users
GET /api/v1/friends/search?query=alex
```

## Database Schema

### Friend Document Structure:
```javascript
{
  _id: ObjectId,
  requester: ObjectId (ref: User),
  recipient: ObjectId (ref: User),
  status: "pending" | "accepted" | "rejected" | "blocked",
  createdAt: Date,
  updatedAt: Date
}
```

## Features & Benefits

✅ **Complete Friend Management**: Send, accept, reject, and remove friends
✅ **Smart Search**: Find users by multiple criteria with real-time status
✅ **Duplicate Prevention**: Can't send multiple requests to same user
✅ **Easy Group Creation**: Add friends quickly without typing emails
✅ **Visual Feedback**: Clear status indicators and action buttons
✅ **Responsive Design**: Works perfectly on mobile and desktop
✅ **Real-time Updates**: Lists refresh after each action

## Future Enhancements

- Phone contacts integration for "Add from Contacts" button
- Friend suggestions based on mutual friends or interests
- Block list management
- Friend activity feed
- Notification system for friend requests
- Search filters and sorting options

## Notes

- All friend operations require authentication (JWT token)
- Friend relationships are bidirectional (no need to store twice)
- The system automatically handles mutual friendship status
- Search results include friendship status for smart UI rendering
- Member objects in CreateGroup now support both email invites and friend additions
