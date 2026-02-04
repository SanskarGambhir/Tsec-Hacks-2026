# Cooper - AI Agent Instructions

## Project Overview
Cooper is a collaborative expense-splitting and group management application with real-time features. It consists of three services:
- **client/** - React + Vite frontend (port 5173)
- **server/** - Express.js + MongoDB backend with Socket.IO (port 3000)
- **genai/** - FastAPI + LangGraph AI service for chat workflows

## Architecture Patterns

### Backend (Express.js)
All controllers follow this pattern using standard utilities:
```javascript
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const myController = asyncHandler(async (req, res) => {
  if (!valid) throw new ApiError(400, "Error message");
  return res.status(200).json(new ApiResponse(200, data, "Success message"));
});
```

**Key conventions:**
- Routes at `server/src/routes/` map to `/api/v1/{resource}`
- Auth middleware `verifyJWT` attaches `req.user` from JWT token
- Models use Mongoose with custom methods (see [user.models.js](server/src/models/user.models.js) for JWT generation)

### Frontend (React)
- **API calls**: Use the axios instance from `client/src/api/axios.js` with `VITE_SERVER_URL` env variable
- **UI components**: Radix UI primitives in `client/src/components/ui/` using shadcn/ui patterns with `cva` variants
- **Layout**: Pages under `MainLayout` get sidebar + topbar (see [App.jsx](client/src/App.jsx) for route structure)
- **Real-time**: Socket.IO via `client/src/lib/socket.js` - call `connectSocket()` then use emit helpers

### Real-time Communication
Server socket events (in [socket.js](server/src/socket.js)):
- `joinGroup`/`leaveGroup` - room management
- `ruleAdded`, `memberJoined`, `memberLeft`, `sendMessage` - group events
- Use `emitToGroup(groupId, event, data)` from controllers to broadcast

## Data Models
- **User** - auth with email/phone verification, PAN card validation
- **Group** - has owner, members[], rules[], pool, linked GroupWallet
- **Friend** - requester/recipient with status (pending/accepted/rejected/blocked)
- **UserWallet/GroupWallet** - balance tracking with memberBalances[]
- **PhoneInvite** - token-based SMS invites with 7-day expiry
- **Transaction** - tracks deposits/withdrawals with intentId, status (PENDING/COMPLETED), and proofHash

## Key Features & Flows

### Wallet System
Users have individual wallets (UserWallet) with balance tracking. Balance updates use MongoDB's `$inc` for atomic operations. Deposits integrate with Finternet API for payment intents and escrow delivery proofs. Balance is fetched from database via `/api/v1/wallet/balance` and displayed on Dashboard and Wallet page.

### Friend System
Search users → Send request → Accept/Reject. See [FRIEND_SYSTEM_GUIDE.md](FRIEND_SYSTEM_GUIDE.md).

### Phone Invite System
SMS invite via Twilio → User clicks link → Auto-friend on signup. See [PHONE_INVITE_SYSTEM.md](PHONE_INVITE_SYSTEM.md).

### Bill Splitting
Upload bill → OCR via Tesseract.js → AI analysis via Gemini → Split calculation using [splitEngine.js](server/src/utils/splitEngine.js).

## Development Commands

```bash
# Client (from /client)
npm run dev        # Start Vite dev server on :5173

# Server (from /server)
npm run dev        # Start with nodemon on :3000

# GenAI (from /genai)
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Environment Variables
Client needs `.env` with:
- `VITE_SERVER_URL` - Backend URL (e.g., `http://localhost:3000/api/v1/`)

Server needs `.env` with:
- `PORT`, `CORS_ORIGIN`, `MONGODB_URI`
- `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `GEMINI_API_KEY`

## Code Style
- ES Modules (`"type": "module"`)
- Tailwind CSS v4 for styling
- Use existing UI components from `components/ui/` - don't create new primitive components
- Follow existing controller/route patterns for new API endpoints
