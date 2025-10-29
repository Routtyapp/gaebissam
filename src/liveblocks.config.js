import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

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
  // throttle: 100,

  // Optional: Lost connection timeout in ms (default: 5000)
  // lostConnectionTimeout: 5000,
});

// Create a Liveblocks client with presence type definition
// Presence will hold the cursor position for each user
export const {
  suspense: {
    RoomProvider,
    useOthers,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
  },
} = createRoomContext(client);

// Also export useMyPresence from the main context for non-suspense usage if needed
export const {
  RoomProvider: RoomProviderNonSuspense,
  useMyPresence: useMyPresenceNonSuspense,
} = createRoomContext(client);
