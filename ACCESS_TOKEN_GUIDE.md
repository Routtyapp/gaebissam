# Access Token Authentication with Liveblocks

This guide explains how to use access tokens with proper room naming patterns and wildcard permissions for your collaborative spreadsheet application.

## Room Naming Pattern

This application uses a hierarchical naming pattern for rooms:

```
workbook:{workbookId}:worksheet:{worksheetId}
```

### Examples:
- `workbook:1` - Workbook #1 (all worksheets)
- `workbook:1:worksheet:5` - Worksheet #5 in Workbook #1
- `workbook:123:worksheet:456` - Worksheet #456 in Workbook #123

## Why Use a Naming Pattern?

A naming pattern allows you to use **wildcard permissions**, which means:

1. **Scalability** - Grant access to multiple rooms with one rule
2. **Maintainability** - No need to manually track every room
3. **Flexibility** - Easy to add new worksheets without updating permissions
4. **Organization** - Clear hierarchy: Organization → Workbook → Worksheet

## Wildcard Permissions

### Server-Side Examples

```javascript
// ✅ Give access to ALL worksheets in workbook 123
session.allow('workbook:123:*', session.FULL_ACCESS);

// ✅ Give read-only access to ALL workbooks
session.allow('workbook:*', session.READ_ACCESS);

// ✅ Give access to specific workbook
session.allow('workbook:5', session.FULL_ACCESS);

// ❌ INVALID - Wildcard must be at the end
session.allow('workbook:*:worksheet:1', session.FULL_ACCESS);
```

## Current Implementation

### 1. Room ID Generation (`src/utils/roomUtils.js`)

```javascript
import { getWorkbookRoomId, getWorksheetRoomId } from './utils/roomUtils';

// Generate room ID for workbook
const roomId = getWorkbookRoomId(123); // "workbook:123"

// Generate room ID for specific worksheet
const worksheetRoom = getWorksheetRoomId(123, 456); // "workbook:123:worksheet:456"
```

### 2. Server Authentication (`server/index.js`)

The server authenticates users and grants permissions based on:
- User ID (from localStorage or your auth system)
- Workbook access rights (from database)
- Access level (full or read-only)

```javascript
// In development: All users can access all workbooks
session.allow('workbook:*', session.FULL_ACCESS);

// In production: Grant specific permissions
const permissions = await getUserWorkbookPermissions(userId);
permissions.forEach(({ workbookId, access }) => {
  if (access === 'full') {
    session.allow(`workbook:${workbookId}:*`, session.FULL_ACCESS);
  } else if (access === 'read') {
    session.allow(`workbook:${workbookId}:*`, session.READ_ACCESS);
  }
});
```

### 3. Client Configuration (`src/App.js`)

```javascript
// Current workbook ID (can be from URL params, state, etc.)
const currentWorkbookId = 1;
const roomId = getWorkbookRoomId(currentWorkbookId);

// Connect to workbook room
<RoomProvider id={roomId} initialPresence={{ cursor: null }}>
  {/* Your app */}
</RoomProvider>
```

## Permission Levels

### FULL_ACCESS
- Read all data in the room
- Write/modify data in the room
- See other users' presence
- Broadcast events

### READ_ACCESS
- Read all data in the room
- See other users' presence
- Cannot modify data
- Cannot broadcast events

## Database Schema

### Workbook Permissions Table

Run the migration to create the permissions table:

```bash
node server/migrations/add-workbook-permissions.js
```

This creates:
- `workbook_permissions` - User permissions per workbook
- `workbook_owners` - Workbook owners
- `users` - User information

### Adding Permissions

```javascript
// Grant user full access to workbook
POST /api/workbooks/123/permissions
{
  "userId": "user-abc123",
  "access": "full"
}

// Grant read-only access
POST /api/workbooks/123/permissions
{
  "userId": "user-xyz789",
  "access": "read"
}
```

## Use Cases

### 1. Personal Workbooks
Each user has their own workbooks with full access:

```javascript
// User "alice" owns workbook 1, 2, 3
session.allow('workbook:1:*', session.FULL_ACCESS);
session.allow('workbook:2:*', session.FULL_ACCESS);
session.allow('workbook:3:*', session.FULL_ACCESS);
```

### 2. Shared Workbooks (View-Only)
Users can view shared workbooks but not edit:

```javascript
// Alice shares workbook 5 with Bob (read-only)
session.allow('workbook:5:*', session.READ_ACCESS);
```

### 3. Collaborative Editing
Multiple users can edit the same workbook:

```javascript
// Team members can all edit workbook 10
session.allow('workbook:10:*', session.FULL_ACCESS);
```

### 4. Organization-Level Access
Using tenants for multi-organization apps:

```javascript
const session = liveblocks.prepareSession(userId, {
  userInfo: user.info,
  tenantId: 'acme-corp' // Organization ID
});

// All workbooks in this organization
session.allow('workbook:*', session.FULL_ACCESS);
```

## Tenants (Multi-Tenancy)

For SaaS applications with multiple organizations:

```javascript
// Server-side
const session = liveblocks.prepareSession(userId, {
  userInfo: user.info,
  tenantId: organizationId
});

// This user can only access rooms in their organization
// Even if they have a token for workbook:123 in another tenant,
// they won't be able to access it
```

## Migration from Simple Room IDs

If you're currently using simple room IDs like `my-spreadsheet-room`:

1. The current implementation maintains backward compatibility
2. You can gradually migrate workbooks to the new pattern
3. Old rooms will continue to work alongside new ones

## Best Practices

### ✅ DO:
- Use the naming pattern: `workbook:{id}:worksheet:{id}`
- Use wildcards for scalable permissions
- Store permissions in the database
- Validate user authentication before granting access
- Use tenants for multi-organization apps

### ❌ DON'T:
- Don't use wildcards in the middle: `workbook:*:worksheet:1`
- Don't hardcode room IDs in the client
- Don't grant access without checking the database
- Don't use public API key in production

## Testing

1. Open the app with workbook ID 1: Shows `workbook:1` room
2. Open in another tab with the same workbook: Both see each other
3. Change to workbook ID 2: Connected to different room `workbook:2`
4. Users in workbook 1 don't see users in workbook 2

## API Endpoints

### GET `/api/workbooks/:workbookId/permissions`
Get all users who have access to a workbook

### POST `/api/workbooks/:workbookId/permissions`
Grant a user access to a workbook

**Request:**
```json
{
  "userId": "user-123",
  "access": "full" // or "read"
}
```

## Next Steps

1. **Run the migration**: Create the permissions tables
   ```bash
   node server/migrations/add-workbook-permissions.js
   ```

2. **Implement real authentication**: Replace localStorage with proper auth
   - JWT tokens
   - OAuth (Google, GitHub, etc.)
   - Session-based auth

3. **Add UI for permissions**:
   - Share dialog
   - User management
   - Access control settings

4. **Implement room-level features**:
   - Real-time cell syncing
   - Cursor tracking per worksheet
   - Collaborative undo/redo

## Learn More

- [Liveblocks Access Tokens](https://liveblocks.io/docs/authentication/access-token)
- [Room ID Migration Guide](https://liveblocks.io/docs/guides/how-to-migrate-room-ids)
- [Tenants Documentation](https://liveblocks.io/docs/platform/tenants)
