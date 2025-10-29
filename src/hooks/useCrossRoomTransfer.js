import { useState } from 'react';

/**
 * 크로스 룸 데이터 전송 훅 (서버 기반)
 */
export function useCrossRoomTransfer(currentRoomId) {
  const [isTransferring, setIsTransferring] = useState(false);

  /**
   * 다른 방으로 데이터 전송 (서버 API 사용)
   * @param {string} targetRoomId - 대상 방 ID
   * @param {Object} extractedData - 추출된 선택 영역 데이터
   * @param {string} userId - 현재 사용자 ID
   */
  const transferToRoom = async (targetRoomId, extractedData, userId) => {
    setIsTransferring(true);

    try {
      console.log(`🚀 Starting transfer to room: ${targetRoomId}`);
      console.log(`   Data: ${extractedData.cells.length} cells (${extractedData.rowCount}x${extractedData.colCount})`);

      // 서버 API를 통해 전송 데이터 큐에 추가
      const response = await fetch('http://localhost:5000/api/rooms/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceRoom: currentRoomId,
          targetRoom: targetRoomId,
          data: extractedData,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✓ Server response:', result);

      setIsTransferring(false);

      return {
        success: true,
        targetRoom: targetRoomId,
        insertedCells: extractedData.cells.length,
        position: { row: 0, col: 0 }, // 서버에서 처리
        message: result.message,
      };
    } catch (error) {
      console.error('Transfer failed:', error);
      setIsTransferring(false);

      return {
        success: false,
        error: error.message,
      };
    }
  };

  return {
    transferToRoom,
    isTransferring,
  };
}
