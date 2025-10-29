import React, { useState } from 'react';
import { extractSelectionData, getSelectionSummary } from '../utils/selectionUtils';
import { useCrossRoomTransfer } from '../hooks/useCrossRoomTransfer';

/**
 * 다른 방으로 보내기 버튼 컴포넌트
 */
export function SendToRoomButton({ spreadInstance, currentRoomId, userId }) {
  const { transferToRoom, isTransferring } = useCrossRoomTransfer(currentRoomId);
  const [showDialog, setShowDialog] = useState(false);
  const [targetRoomInput, setTargetRoomInput] = useState('');
  const [selectionData, setSelectionData] = useState(null);

  const handleOpenDialog = () => {
    console.log('📤 Send to room button clicked');
    console.log('   spreadInstance:', !!spreadInstance);

    if (!spreadInstance) {
      alert('스프레드시트가 초기화되지 않았습니다.');
      return;
    }

    try {
      const sheet = spreadInstance.getActiveSheet();
      console.log('   sheet:', !!sheet);

      const data = extractSelectionData(sheet);
      console.log('   extracted data:', data);

      if (data.cells.length === 0) {
        alert('선택된 영역이 비어있습니다.');
        return;
      }

      setSelectionData(data);
      setShowDialog(true);
      console.log('✓ Dialog opened');
    } catch (error) {
      console.error('Error opening dialog:', error);
      alert(error.message);
    }
  };

  const handleSend = async () => {
    console.log('🚀 Send button clicked');
    console.log('   targetRoomInput:', targetRoomInput);
    console.log('   selectionData:', selectionData);

    if (!targetRoomInput.trim()) {
      alert('대상 방 이름을 입력해주세요!');
      return;
    }

    const targetRoom = targetRoomInput.trim().toLowerCase().replace(/\s+/g, '-');
    console.log('   sanitized targetRoom:', targetRoom);
    console.log('   currentRoomId:', currentRoomId);

    if (targetRoom === currentRoomId) {
      alert('현재 방과 같은 방입니다!');
      return;
    }

    console.log(`📤 Sending to room: ${targetRoom}`);

    try {
      const result = await transferToRoom(targetRoom, selectionData, userId);
      console.log('   transfer result:', result);

      if (result.success) {
        alert(
          `✅ 전송 완료!\n` +
          `방: ${result.targetRoom}\n` +
          `셀 개수: ${result.insertedCells}개\n` +
          `위치: (${result.position.row}, ${result.position.col})`
        );
        setShowDialog(false);
        setTargetRoomInput('');
      } else {
        alert(`❌ 전송 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert(`❌ 전송 중 오류: ${error.message}`);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setTargetRoomInput('');
    setSelectionData(null);
  };

  return (
    <>
      {/* 다른 방으로 보내기 버튼 */}
      <button
        onClick={handleOpenDialog}
        disabled={!spreadInstance}
        style={{
          padding: '8px 16px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: spreadInstance ? 'pointer' : 'not-allowed',
          fontSize: '13px',
          fontWeight: '500',
          opacity: spreadInstance ? 1 : 0.5,
        }}
      >
        📤 다른 방으로 보내기
      </button>

      {/* 전송 다이얼로그 */}
      {showDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              minWidth: '400px',
              maxWidth: '500px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0' }}>📤 다른 방으로 데이터 보내기</h3>

            {/* 선택 영역 정보 */}
            {selectionData && (
              <div
                style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '14px',
                }}
              >
                <strong>선택된 영역:</strong>
                <div style={{ marginTop: '8px' }}>
                  {getSelectionSummary(selectionData)}
                </div>
              </div>
            )}

            {/* 대상 방 입력 */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                대상 방 이름:
              </label>
              <input
                type="text"
                value={targetRoomInput}
                onChange={(e) => setTargetRoomInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="예: team-project-beta"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                💡 해당 방에 자동으로 빈 공간을 찾아 붙여넣습니다
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                disabled={isTransferring}
                style={{
                  padding: '8px 20px',
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={isTransferring || !targetRoomInput.trim()}
                style={{
                  padding: '8px 20px',
                  background: isTransferring ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isTransferring || !targetRoomInput.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {isTransferring ? '전송 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
