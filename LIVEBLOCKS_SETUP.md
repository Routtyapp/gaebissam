# Liveblocks Authentication Setup

This application now uses secure authentication with Liveblocks instead of a public API key.

## Setup Instructions

### 1. Get Your Liveblocks Secret Key

1. Go to [Liveblocks Dashboard](https://liveblocks.io/dashboard/apikeys)
2. Sign in or create an account
3. Copy your **Secret Key** (starts with `sk_`)

### 2. Configure Environment Variables

1. Open the `.env` file in the root directory
2. Replace `sk_dev_YOUR_SECRET_KEY_HERE` with your actual secret key:

```env
LIVEBLOCKS_SECRET_KEY=sk_dev_your_actual_secret_key_here
```

### 3. Start the Application

Make sure both the server and client are running:

```bash
# Start both server and client
npm run dev

# Or start them separately:
# Terminal 1 - Server
npm run server

# Terminal 2 - Client
npm start
```

## How Authentication Works

### Access Token Authentication

This app uses **access token authentication**, which works as follows:

1. When a user connects, the client calls `/api/liveblocks-auth` on your server
2. The server validates the user (currently using localStorage for demo)
3. The server creates a session with user info and room permissions
4. The server returns a JWT token to the client
5. The client uses this token to connect to Liveblocks

### Current Implementation

**For Development:**
- User IDs are stored in localStorage
- All users can access the `my-spreadsheet-room`
- Users can set their display name via the "Change Name" button

**For Production (TODO):**
You should enhance the authentication to:
- Use proper user authentication (JWT, session, OAuth, etc.)
- Store user data in your database
- Implement room-level permissions based on your business logic
- Use room naming patterns like `workbook:{workbookId}` for better organization

### Room Permissions

In `server/index.js`, you can control which rooms users can access:

```javascript
// Allow specific room
session.allow('my-spreadsheet-room', session.FULL_ACCESS);

// Allow rooms matching a pattern
session.allow('workbook:*', session.FULL_ACCESS);

// Allow specific workbook
session.allow(`workbook:${workbookId}`, session.FULL_ACCESS);

// Read-only access
session.allow('my-room', session.READ_ACCESS);
```

## Features

### Current Features
- ✅ Secure authentication with secret key
- ✅ User identification and persistence
- ✅ Real-time cursor tracking
- ✅ User presence (online users count)
- ✅ Custom user names
- ✅ User avatars (auto-generated)

### Potential Enhancements
- [ ] Sync cell edits in real-time
- [ ] Cell selection awareness
- [ ] User permissions (read/write)
- [ ] User authentication (login system)
- [ ] Room-based workbooks
- [ ] Collaborative undo/redo
- [ ] Comments and annotations

## Security Best Practices

1. **Never commit your secret key** - It's already in `.gitignore`
2. **Use environment variables** - Always use `.env` for secrets
3. **Validate users** - Implement proper user authentication before production
4. **Set proper permissions** - Only allow access to rooms users should see
5. **Use HTTPS** - In production, always use HTTPS for API calls

## Troubleshooting

### "Authentication failed" error
- Check that your `.env` file has the correct secret key
- Ensure the server is running on port 5000
- Check browser console for detailed error messages

### Users not seeing each other
- Make sure all users are in the same room
- Check that the server authentication endpoint is working
- Verify CORS is properly configured

### Cursor not updating
- Check browser console for errors
- Ensure the Room component is properly mounted
- Verify the invisible overlay is not blocked by other elements

## API Endpoints

### POST `/api/liveblocks-auth`
Authenticates users and provides room access tokens.

**Request Body:**
```json
{
  "room": "my-spreadsheet-room",
  "userId": "user-123",
  "userInfo": {
    "name": "John Doe",
    "avatar": "https://..."
  }
}
```

**Response:**
Returns a Liveblocks JWT token for the authenticated session.

## Learn More

- [Liveblocks Documentation](https://liveblocks.io/docs)
- [Authentication Guide](https://liveblocks.io/docs/authentication)
- [Access Token vs ID Token](https://liveblocks.io/docs/authentication/access-token)
