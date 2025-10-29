# Liveblocks Usage Examples

This document provides practical examples of using Liveblocks features in your collaborative spreadsheet application.

## Accessing User Information

### Using `useSelf()` Hook (React)

```javascript
import { useSelf } from "./liveblocks.config";

function MyComponent() {
  const self = useSelf();

  // Access user ID
  console.log(self?.id); // "user-123"

  // Access user metadata
  console.log(self?.info); // { name: "John Doe", avatar: "...", color: "..." }
  console.log(self?.info?.name); // "John Doe"
  console.log(self?.info?.avatar); // "https://..."

  return (
    <div>
      {self?.info?.avatar && (
        <img src={self.info.avatar} alt={self.info.name} />
      )}
      <span>Logged in as: {self?.info?.name}</span>
    </div>
  );
}
```

### Using `getSelf()` Method (Vanilla JS)

```javascript
import { createClient } from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth"
});

const room = client.enter("workbook:1", {
  initialPresence: { cursor: null }
});

// Get current user
const self = room.getSelf();
console.log(self.id); // User ID
console.log(self.info); // User metadata
```

## Accessing Other Users

### Using `useOthers()` Hook (React)

```javascript
import { useOthers } from "./liveblocks.config";

function UsersList() {
  const others = useOthers();

  return (
    <div>
      <h3>Online Users ({others.length})</h3>
      <ul>
        {others.map(({ connectionId, id, info, presence }) => (
          <li key={connectionId}>
            <img src={info.avatar} alt={info.name} />
            <span>{info.name}</span>
            {presence.cursor && <span> (Active)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Filtering and Mapping Users

```javascript
import { useOthers } from "./liveblocks.config";

function ActiveUsers() {
  const others = useOthers();

  // Filter users with active cursors
  const activeUsers = others.filter(user => user.presence.cursor !== null);

  // Map to get just names
  const userNames = others.map(user => user.info.name);

  return (
    <div>
      <p>Total: {others.length}</p>
      <p>Active: {activeUsers.length}</p>
      <p>Names: {userNames.join(', ')}</p>
    </div>
  );
}
```

## Using Presence

### Tracking Cursor Position

```javascript
import { useUpdateMyPresence, useOthers } from "./liveblocks.config";

function CollaborativeCursor() {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();

  return (
    <div
      onPointerMove={(e) => {
        updateMyPresence({
          cursor: { x: e.clientX, y: e.clientY }
        });
      }}
      onPointerLeave={() => {
        updateMyPresence({ cursor: null });
      }}
    >
      {/* Render other users' cursors */}
      {others.map(({ connectionId, info, presence }) => (
        presence.cursor && (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              left: presence.cursor.x,
              top: presence.cursor.y,
            }}
          >
            <img src={info.avatar} alt={info.name} />
            <span>{info.name}</span>
          </div>
        )
      ))}
    </div>
  );
}
```

### Tracking Cell Selection

```javascript
import { useUpdateMyPresence, useOthers } from "./liveblocks.config";

function SpreadsheetWithPresence() {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();

  const handleCellSelect = (row, col) => {
    updateMyPresence({
      cursor: null,
      selectedCell: { row, col }
    });
  };

  return (
    <div>
      {/* Show which cells others are editing */}
      {others.map(({ connectionId, info, presence }) => (
        presence.selectedCell && (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              top: presence.selectedCell.row * 30,
              left: presence.selectedCell.col * 100,
              border: `2px solid ${info.color}`,
            }}
          >
            {info.name} is here
          </div>
        )
      ))}
    </div>
  );
}
```

## Room ID Patterns

### Switching Between Workbooks

```javascript
import { RoomProvider } from "./liveblocks.config";
import { getWorkbookRoomId } from "./utils/roomUtils";
import { useState } from "react";

function App() {
  const [currentWorkbookId, setCurrentWorkbookId] = useState(1);
  const roomId = getWorkbookRoomId(currentWorkbookId);

  return (
    <div>
      <select
        value={currentWorkbookId}
        onChange={(e) => setCurrentWorkbookId(Number(e.target.value))}
      >
        <option value={1}>Workbook 1</option>
        <option value={2}>Workbook 2</option>
        <option value={3}>Workbook 3</option>
      </select>

      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null, selectedCell: null }}
      >
        <Spreadsheet />
      </RoomProvider>
    </div>
  );
}
```

### Using Worksheet-Specific Rooms

```javascript
import { getWorksheetRoomId } from "./utils/roomUtils";

function WorksheetRoom({ workbookId, worksheetId }) {
  const roomId = getWorksheetRoomId(workbookId, worksheetId);

  return (
    <RoomProvider id={roomId} initialPresence={{ cursor: null }}>
      <WorksheetEditor />
    </RoomProvider>
  );
}
```

## Authentication Examples

### Adding JWT Token Authentication

**Client Side:**
```javascript
// src/liveblocks.config.js
const client = createClient({
  authEndpoint: async (room) => {
    const jwtToken = getYourJWTToken(); // Your auth system

    const response = await fetch('http://localhost:5000/api/liveblocks-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ room }),
    });

    return response.json();
  },
});
```

**Server Side:**
```javascript
// server/index.js
const jwt = require('jsonwebtoken');

function getUserFromDB(req) {
  // Verify JWT token
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database using decoded.userId
    const user = database.getUserById(decoded.userId);

    return {
      id: user.id,
      metadata: {
        name: user.name,
        avatar: user.avatar,
        email: user.email,
      },
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

### Multi-Tenancy with Organizations

**Client Side:**
```javascript
const client = createClient({
  authEndpoint: async (room) => {
    const organizationId = getCurrentOrganizationId(); // Your org context

    const response = await fetch('http://localhost:5000/api/liveblocks-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room,
        tenantId: organizationId,
        userId: getCurrentUserId(),
        userInfo: getCurrentUserInfo(),
      }),
    });

    return response.json();
  },
});
```

**Server Side:**
```javascript
app.post('/api/liveblocks-auth', async (req, res) => {
  const user = getUserFromDB(req);
  const { tenantId } = req.body;

  // Verify user belongs to this organization
  if (user.organizationId !== tenantId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const session = liveblocks.prepareSession(user.id, {
    userInfo: user.metadata,
    tenantId: tenantId,
  });

  // Grant access to all workbooks in this organization
  session.allow(`workbook:*`, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return res.status(status).end(body);
});
```

## Advanced Features

### User Avatars Stack

```javascript
import { useOthers, useSelf } from "./liveblocks.config";

function AvatarStack({ max = 3 }) {
  const others = useOthers();
  const self = useSelf();

  const allUsers = [self, ...others].filter(Boolean);
  const visibleUsers = allUsers.slice(0, max);
  const overflow = allUsers.length - max;

  return (
    <div style={{ display: 'flex' }}>
      {visibleUsers.map((user, index) => (
        <img
          key={user.connectionId || 'self'}
          src={user.info.avatar}
          alt={user.info.name}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '2px solid white',
            marginLeft: index > 0 ? '-8px' : '0',
          }}
          title={user.info.name}
        />
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '-8px',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
```

### Typing Indicator

```javascript
import { useUpdateMyPresence, useOthers } from "./liveblocks.config";
import { useState, useEffect } from "react";

function TypingIndicator() {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers();
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (isTyping) {
      updateMyPresence({ isTyping: true });

      const timer = setTimeout(() => {
        updateMyPresence({ isTyping: false });
        setIsTyping(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isTyping, updateMyPresence]);

  const typingUsers = others.filter(user => user.presence.isTyping);

  return (
    <div>
      <input
        type="text"
        onKeyPress={() => setIsTyping(true)}
        placeholder="Start typing..."
      />

      {typingUsers.length > 0 && (
        <p>
          {typingUsers.map(u => u.info.name).join(', ')}
          {typingUsers.length === 1 ? ' is' : ' are'} typing...
        </p>
      )}
    </div>
  );
}
```

## Learn More

- [Liveblocks React Hooks](https://liveblocks.io/docs/api-reference/liveblocks-react)
- [Presence Guide](https://liveblocks.io/docs/guides/how-to-use-presence-in-liveblocks)
- [Authentication](https://liveblocks.io/docs/authentication)
