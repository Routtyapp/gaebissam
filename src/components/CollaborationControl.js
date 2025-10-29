import React, { useState } from 'react';

/**
 * 협업 모드 제어 컴포넌트
 * 사용자가 협업 모드를 켜고 끌 수 있으며, 방 번호를 입력할 수 있습니다.
 */
export function CollaborationControl({
  isCollaborative,
  currentRoomId,
  onToggleCollaboration,
  onJoinRoom,
  onLeaveRoom,
}) {
  const [roomInput, setRoomInput] = useState('');

  const handleJoinRoom = () => {
    if (!roomInput.trim()) {
      alert('방 이름을 입력해주세요!');
      return;
    }

    // 방 이름을 안전한 형식으로 변환
    const sanitizedRoomId = roomInput.trim().toLowerCase().replace(/\s+/g, '-');
    onJoinRoom(sanitizedRoomId);
    setRoomInput('');
  };

  return (
    <div
      style={{
        padding: '12px',
        background: isCollaborative ? '#e8f5e9' : '#f5f5f5',
        borderBottom: '2px solid ' + (isCollaborative ? '#4caf50' : '#ccc'),
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      {/* 현재 모드 표시 */}
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

      {/* 협업 모드일 때 */}
      {isCollaborative && currentRoomId && (
        <>
          <div
            style={{
              padding: '4px 12px',
              background: 'white',
              borderRadius: '4px',
              border: '1px solid #4caf50',
              fontSize: '13px',
            }}
          >
            방: <strong>{currentRoomId}</strong>
          </div>
          <button
            onClick={onLeaveRoom}
            style={{
              padding: '6px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            협업 종료
          </button>
        </>
      )}

      {/* 독립 모드일 때 */}
      {!isCollaborative && (
        <>
          <input
            type="text"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            placeholder="방 이름 입력 (예: project-alpha)"
            style={{
              padding: '6px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '13px',
              minWidth: '200px',
            }}
          />
          <button
            onClick={handleJoinRoom}
            style={{
              padding: '6px 16px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            협업 시작
          </button>
          <span style={{ fontSize: '12px', color: '#666' }}>
            같은 방 이름을 입력한 사용자들과 실시간 협업할 수 있습니다
          </span>
        </>
      )}
    </div>
  );
}
