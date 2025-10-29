/**
 * Liveblocks ↔ SQLite 동기화 유틸리티
 *
 * 전략:
 * 1. 워크북 열기: SQLite → Liveblocks Storage 로드
 * 2. 실시간 편집: Liveblocks Storage 사용 (즉시 동기화)
 * 3. 주기적 백업: Liveblocks Storage → SQLite 저장
 */

import { getCells, saveCellsBatch } from '../api/spreadsheetApi';

/**
 * SQLite에서 셀 데이터를 가져와서 Liveblocks Storage에 로드
 * Note: liveCells는 useStorage로 가져온 읽기 전용 객체입니다.
 * 실제 업데이트는 useMutation을 통해 해야 하므로 이 함수는 데이터만 반환합니다.
 * @param {number} worksheetId - 워크시트 ID
 * @returns {Promise<Array>} 셀 데이터 배열
 */
export async function loadCellsFromDatabase(worksheetId) {
  try {
    console.log(`📥 Loading cells from database (worksheet ${worksheetId})...`);

    const cells = await getCells(worksheetId);

    if (!cells || cells.length === 0) {
      console.log('No cells found in database');
      return [];
    }

    console.log(`✓ Loaded ${cells.length} cells from database`);
    return cells;
  } catch (error) {
    console.error('Failed to load cells from database:', error);
    throw error;
  }
}

/**
 * Liveblocks Storage에서 SpreadJS로 셀 데이터 적용
 * @param {LiveMap} liveCells - Liveblocks LiveMap 객체
 * @param {Object} sheet - SpreadJS 시트 객체
 */
export function applyCellsToSpreadJS(liveCells, sheet) {
  try {
    console.log(`📊 Applying cells to SpreadJS...`);

    // sheet 유효성 검사
    if (!sheet) {
      console.error('Sheet is null or undefined');
      return 0;
    }

    // liveCells 유효성 검사
    if (!liveCells || typeof liveCells.forEach !== 'function') {
      console.error('liveCells is not a valid LiveMap');
      return 0;
    }

    let count = 0;

    // 이벤트 일시 중지 (성능 향상)
    const spread = sheet.getParent();
    if (spread) {
      spread.suspendPaint();
      spread.suspendEvent();
    }

    // LiveMap의 모든 셀을 순회
    liveCells.forEach((cellData, key) => {
      try {
        const [row, col] = key.split(',').map(Number);

        // 유효한 행/열 번호 확인
        if (isNaN(row) || isNaN(col) || row < 0 || col < 0) {
          console.warn(`Invalid cell key: ${key}`);
          return;
        }

        // 값 설정
        if (cellData.value !== null && cellData.value !== undefined && cellData.value !== '') {
          sheet.setValue(row, col, cellData.value);
          count++;
        }

        // 수식 설정
        if (cellData.formula) {
          sheet.setFormula(row, col, cellData.formula);
        }

        // 스타일 설정 (선택사항)
        // if (cellData.style) {
        //   sheet.setStyle(row, col, cellData.style);
        // }
      } catch (cellError) {
        console.error(`Error applying cell ${key}:`, cellError);
      }
    });

    // 이벤트 재개
    if (spread) {
      spread.resumeEvent();
      spread.resumePaint();
    }

    console.log(`✓ Applied ${count} cells to SpreadJS`);
    return count;
  } catch (error) {
    console.error('Failed to apply cells to SpreadJS:', error);
    throw error;
  }
}

/**
 * Liveblocks Storage의 셀 데이터를 SQLite에 백업
 * @param {LiveMap} liveCells - Liveblocks LiveMap 객체
 * @param {number} worksheetId - 워크시트 ID
 */
export async function backupCellsToDatabase(liveCells, worksheetId) {
  try {
    console.log(`💾 Backing up cells to database...`);

    const cells = [];

    // LiveMap에서 모든 셀 데이터 추출
    liveCells.forEach((cellData, key) => {
      const [row, col] = key.split(',').map(Number);

      cells.push({
        worksheet_id: worksheetId,
        row_index: row,
        col_index: col,
        value: String(cellData.value || ''),
        formula: cellData.formula,
        style: cellData.style ? JSON.stringify(cellData.style) : null,
      });
    });

    if (cells.length === 0) {
      console.log('No cells to backup');
      return 0;
    }

    // 일괄 저장
    await saveCellsBatch(cells);

    console.log(`✓ Backed up ${cells.length} cells to database`);
    return cells.length;
  } catch (error) {
    console.error('Failed to backup cells to database:', error);
    throw error;
  }
}

/**
 * 셀 키 생성 유틸리티
 * @param {number} row - 행 번호
 * @param {number} col - 열 번호
 * @returns {string} 셀 키 (예: "0,5")
 */
export function getCellKey(row, col) {
  return `${row},${col}`;
}

/**
 * 셀 키 파싱 유틸리티
 * @param {string} key - 셀 키 (예: "0,5")
 * @returns {{row: number, col: number}} 행, 열 번호
 */
export function parseCellKey(key) {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

/**
 * 주기적 백업 설정
 * @param {LiveMap} liveCells - Liveblocks LiveMap 객체
 * @param {number} worksheetId - 워크시트 ID
 * @param {number} intervalMs - 백업 간격 (밀리초, 기본 30초)
 * @returns {NodeJS.Timeout} 타이머 ID (clearInterval로 정지 가능)
 */
export function setupPeriodicBackup(liveCells, worksheetId, intervalMs = 30000) {
  console.log(`⏰ Setting up periodic backup every ${intervalMs / 1000} seconds`);

  const timerId = setInterval(async () => {
    try {
      await backupCellsToDatabase(liveCells, worksheetId);
    } catch (error) {
      console.error('Periodic backup failed:', error);
    }
  }, intervalMs);

  return timerId;
}
