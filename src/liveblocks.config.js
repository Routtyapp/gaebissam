import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

/**
 * Liveblocks Configuration
 *
 * Presence: Real-time user state (cursor, selection, etc.)
 *   - cursor: { x: number, y: number } | null
 *   - selectedCell: { row: number, col: number } | null
 *
 * Storage: Persistent room data (spreadsheet cells)
 *   - cells: LiveMap<string, LiveCell>
 *
 * LiveCell structure:
 *   - value: any
 *   - formula: string | null
 *   - style: any | null
 *   - updatedBy: string (user ID)
 *   - updatedAt: number (timestamp)
 */

/**
 * Create Liveblocks client with authentication endpoint
 * This uses your server's secret key for secure authentication
 *
 * The authEndpoint callback receives the room being accessed
 * and should return the authentication token from your server
 */
const client = createClient({
  authEndpoint: async (room) => {
    // Get user info from localStorage or generate default
    const userId = localStorage.getItem('liveblocks-user-id') || `user-${Date.now()}`;
    const userName = localStorage.getItem('liveblocks-user-name') || 'Anonymous';

    // Save user ID for future sessions
    localStorage.setItem('liveblocks-user-id', userId);

    // In production, you can pass custom headers for authentication
    // For example: Authorization: Bearer <your-jwt-token>
    const headers = {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${getYourJWTToken()}`, // Example
    };

    // Call your authentication endpoint
    const response = await fetch('http://localhost:5000/api/liveblocks-auth', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        room,
        userId,
        userInfo: {
          name: userName,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`,
        },
        // Optional: Pass tenant ID for multi-tenancy
        // tenantId: getCurrentOrganizationId(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Authentication failed:', error);
      throw new Error('Authentication failed');
    }

    // Return the authentication response (token)
    return response.json();
  },

  // Optional: Throttle value in ms (default: 100)
  throttle: 16, // 60fps for smooth updates

  // Optional: Lost connection timeout in ms (default: 5000)
  lostConnectionTimeout: 5000,
});

// Create a Liveblocks client with presence and storage
export const {
  suspense: {
    RoomProvider,
    useRoom,
    useOthers,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useStorage,
    useMutation,
    useBatch,
  },
} = createRoomContext(client);
