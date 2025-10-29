import React from 'react';

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

/**
 * Live Cursor Component
 * Based on Liveblocks official example
 * Displays other users' cursors in real-time
 */
export function Cursor({ connectionId, x, y, info }) {
  const color = COLORS[connectionId % COLORS.length];

  return (
    <svg
      className="cursor"
      width="24"
      height="36"
      viewBox="0 0 24 36"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translateX(${x}px) translateY(${y}px)`,
        transition: 'transform 0.1s ease-out',
        pointerEvents: 'none',
      }}
    >
      <path
        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
        fill={color}
      />

      {/* User name label as foreignObject */}
      {info?.name && (
        <foreignObject x="12" y="20" width="200" height="30">
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: color,
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              width: 'fit-content',
            }}
          >
            {info.name}
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
