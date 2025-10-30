import React from 'react';

/**
 * 협업 모드 제어 컴포넌트
 * 워크북 기반 협업 - 현재 워크북의 room_id를 자동으로 사용
 */
export function CollaborationControl({
  isCollaborative,
  currentRoomId,
  currentWorkbookName,
  onToggleCollaboration,
}) {

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* 협업 모드 상태 표시 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: isCollaborative ? '#4caf50' : '#999',
            boxShadow: isCollaborative ? '0 0 8px rgba(76, 175, 80, 0.5)' : 'none',
          }}
        />
        <strong>{isCollaborative ? '🌐 협업 모드' : '📝 독립 모드'}</strong>
      </div>

      {/* 현재 방 정보 표시 (협업 모드일 때) */}
      {isCollaborative && currentRoomId && (
        <div
          style={{
            padding: '4px 12px',
            background: 'white',
            borderRadius: '4px',
            border: '2px solid #4caf50',
            fontSize: '13px',
          }}
        >
          방: <strong>{currentRoomId}</strong>
          {currentWorkbookName && (
            <span style={{ marginLeft: '8px', color: '#666' }}>
              ({currentWorkbookName})
            </span>
          )}
        </div>
      )}

      {/* 협업 모드 토글 버튼 */}
      <button
        onClick={onToggleCollaboration}
        style={{
          padding: '6px 16px',
          background: isCollaborative ? '#f44336' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
        }}
      >
        {isCollaborative ? '협업 종료' : '협업 시작'}
      </button>
    </div>
  );
}
