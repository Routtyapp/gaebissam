/**
 * Liveblocks Room ID 생성 및 관리 유틸리티
 *
 * Room ID 패턴:
 * - workbook:{workbookId} - 워크북 전체
 * - workbook:{workbookId}:worksheet:{worksheetId} - 특정 워크시트
 *
 * 와일드카드 패턴 (서버 측 권한):
 * - workbook:* - 모든 워크북
 * - workbook:{workbookId}:* - 특정 워크북의 모든 워크시트
 */

/**
 * 워크북용 Room ID 생성
 * @param {number|string} workbookId - 워크북 ID
 * @returns {string} Room ID
 */
export function getWorkbookRoomId(workbookId) {
  return `workbook:${workbookId}`;
}

/**
 * 워크시트용 Room ID 생성
 * @param {number|string} workbookId - 워크북 ID
 * @param {number|string} worksheetId - 워크시트 ID
 * @returns {string} Room ID
 */
export function getWorksheetRoomId(workbookId, worksheetId) {
  return `workbook:${workbookId}:worksheet:${worksheetId}`;
}

/**
 * Room ID에서 워크북 ID 추출
 * @param {string} roomId - Room ID
 * @returns {string|null} 워크북 ID 또는 null
 */
export function extractWorkbookId(roomId) {
  const match = roomId.match(/^workbook:(\d+)/);
  return match ? match[1] : null;
}

/**
 * Room ID에서 워크시트 ID 추출
 * @param {string} roomId - Room ID
 * @returns {string|null} 워크시트 ID 또는 null
 */
export function extractWorksheetId(roomId) {
  const match = roomId.match(/worksheet:(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Room ID가 유효한지 확인
 * @param {string} roomId - Room ID
 * @returns {boolean} 유효 여부
 */
export function isValidRoomId(roomId) {
  // 워크북 또는 워크시트 패턴과 일치하는지 확인
  const workbookPattern = /^workbook:\d+$/;
  const worksheetPattern = /^workbook:\d+:worksheet:\d+$/;
  return workbookPattern.test(roomId) || worksheetPattern.test(roomId);
}

/**
 * 와일드카드 권한 패턴 생성 (서버 측 사용)
 * @param {number|string} workbookId - 워크북 ID
 * @returns {string} 와일드카드 패턴
 */
export function getWorkbookWildcard(workbookId) {
  return `workbook:${workbookId}:*`;
}

/**
 * Room ID 파싱
 * @param {string} roomId - Room ID
 * @returns {{type: string, workbookId: string|null, worksheetId: string|null}}
 */
export function parseRoomId(roomId) {
  const workbookId = extractWorkbookId(roomId);
  const worksheetId = extractWorksheetId(roomId);

  return {
    type: worksheetId ? 'worksheet' : 'workbook',
    workbookId,
    worksheetId,
  };
}

// 예시 사용법:
// const roomId = getWorkbookRoomId(123); // "workbook:123"
// const worksheetRoom = getWorksheetRoomId(123, 456); // "workbook:123:worksheet:456"
// const workbookId = extractWorkbookId("workbook:123:worksheet:456"); // "123"
