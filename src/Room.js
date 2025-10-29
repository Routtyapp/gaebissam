import { useOthers, useUpdateMyPresence, useSelf, useMyPresence } from "./liveblocks.config";
import { useEffect } from "react";
import { Cursor } from "./components/Cursor";

export function Room({ workbookId }) {
  const others = useOthers();
  const self = useSelf();
  const updateMyPresence = useUpdateMyPresence();
  const [myPresence] = useMyPresence();
  const userCount = others.length;

  // Track cursor at document level to avoid blocking UI
  useEffect(() => {
    const handlePointerMove = (e) => {
      updateMyPresence({
        cursor: {
          x: Math.round(e.clientX),
          y: Math.round(e.clientY)
        }
      });
    };

    const handlePointerLeave = () => {
      updateMyPresence({ cursor: null });
    };

    // Add listeners to document
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [updateMyPresence]);

  return (
    <>
      {/* User count banner */}
      <div style={{
        padding: '10px',
        background: '#f0f0f0',
        borderBottom: '1px solid #ccc',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {self?.info?.avatar && (
            <img
              src={self.info.avatar}
              alt={self.info.name}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '2px solid #ccc'
              }}
            />
          )}
          <span>
            <strong>Workbook #{workbookId}</strong>
            {' • '}
            {userCount} other user(s) online
            {self?.info?.name && (
              <span style={{ color: '#666' }}> • You: {self.info.name}</span>
            )}
          </span>
        </div>
        <button
          onClick={() => {
            const name = prompt('Enter your name:', localStorage.getItem('liveblocks-user-name') || 'Anonymous');
            if (name) {
              localStorage.setItem('liveblocks-user-name', name);
              window.location.reload();
            }
          }}
          style={{
            padding: '5px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: 'white',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.target.style.background = 'white'}
        >
          Change Name
        </button>
      </div>

      {/* Live Cursors Container */}
      <div
        id="cursors-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999,
          overflow: 'hidden'
        }}
      >
        {/* Render other users' cursors */}
        {others.map(({ connectionId, presence, info }) =>
          presence?.cursor ? (
            <Cursor
              key={connectionId}
              connectionId={connectionId}
              x={presence.cursor.x}
              y={presence.cursor.y}
              info={info}
            />
          ) : null
        )}
      </div>

      {/* Display current user's cursor position (optional debug info) */}
      {myPresence?.cursor && (
        <div
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10000
          }}
        >
          {myPresence.cursor.x} × {myPresence.cursor.y}
        </div>
      )}
    </>
  );
}
