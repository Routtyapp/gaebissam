/**
 * SpreadJS 선택 영역 및 데이터 추출 유틸리티
 */

/**
 * 현재 선택된 영역의 데이터 추출
 * @param {Object} sheet - SpreadJS 시트 객체
 * @returns {Object} 선택된 영역의 데이터
 */
export function extractSelectionData(sheet) {
  if (!sheet) {
    throw new Error('Sheet is null or undefined');
  }

  const selections = sheet.getSelections();
  if (!selections || selections.length === 0) {
    throw new Error('No selection found');
  }

  // 첫 번째 선택 영역만 사용
  const selection = selections[0];
  const { row, col, rowCount, colCount } = selection;

  console.log(`📋 Extracting selection: (${row}, ${col}) size ${rowCount}x${colCount}`);

  const cellsData = [];

  // 선택된 영역의 모든 셀 데이터 추출
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const currentRow = row + r;
      const currentCol = col + c;

      const value = sheet.getValue(currentRow, currentCol);
      const formula = sheet.getFormula(currentRow, currentCol);
      const style = sheet.getStyle(currentRow, currentCol);

      // 빈 셀도 포함 (구조 유지)
      cellsData.push({
        relativeRow: r, // 선택 영역 내 상대 위치
        relativeCol: c,
        value: value !== undefined && value !== null ? value : '',
        formula: formula || null,
        style: style || null,
      });
    }
  }

  return {
    rowCount,
    colCount,
    cells: cellsData,
    sourceRange: { row, col, rowCount, colCount },
  };
}

/**
 * Liveblocks Storage에서 빈 공간 찾기 (자동 배치)
 * @param {LiveMap} liveCells - Liveblocks LiveMap 객체
 * @param {number} rowCount - 배치할 행 개수
 * @param {number} colCount - 배치할 열 개수
 * @returns {{row: number, col: number}} 빈 공간 위치
 */
export function findEmptySpace(liveCells, rowCount, colCount) {
  console.log(`🔍 Finding empty space for ${rowCount}x${colCount} area...`);

  // 사용 중인 셀 위치를 Set으로 관리
  const usedCells = new Set();

  if (liveCells && typeof liveCells.forEach === 'function') {
    liveCells.forEach((_, key) => {
      usedCells.add(key);
    });
  }

  console.log(`📊 Currently used cells: ${usedCells.size}`);

  // 빈 공간 찾기 (위에서 아래로, 왼쪽에서 오른쪽으로 탐색)
  const maxSearchRow = 1000;
  const maxSearchCol = 100;

  for (let startRow = 0; startRow < maxSearchRow; startRow++) {
    for (let startCol = 0; startCol < maxSearchCol; startCol++) {
      // 이 위치에 rowCount x colCount 크기가 들어갈 수 있는지 확인
      let canFit = true;

      for (let r = 0; r < rowCount && canFit; r++) {
        for (let c = 0; c < colCount && canFit; c++) {
          const checkRow = startRow + r;
          const checkCol = startCol + c;
          const key = `${checkRow},${checkCol}`;

          if (usedCells.has(key)) {
            canFit = false;
          }
        }
      }

      if (canFit) {
        console.log(`✓ Found empty space at (${startRow}, ${startCol})`);
        return { row: startRow, col: startCol };
      }
    }
  }

  // 못 찾으면 끝에 추가 (사용된 영역 다음)
  const maxRow = Math.max(...Array.from(usedCells).map(key => parseInt(key.split(',')[0])), -1);
  console.log(`⚠️ No empty space found, placing at row ${maxRow + 1}`);
  return { row: maxRow + 1, col: 0 };
}

/**
 * 데이터를 지정된 위치에 적용
 * @param {Object} extractedData - extractSelectionData()의 결과
 * @param {number} targetRow - 붙여넣을 시작 행
 * @param {number} targetCol - 붙여넣을 시작 열
 * @returns {Array} 변환된 셀 데이터 배열
 */
export function transformDataForTarget(extractedData, targetRow, targetCol) {
  const { cells } = extractedData;

  return cells.map(cell => ({
    row: targetRow + cell.relativeRow,
    col: targetCol + cell.relativeCol,
    value: cell.value,
    formula: cell.formula,
    style: cell.style,
  }));
}

/**
 * 선택 영역 요약 정보 생성
 * @param {Object} extractedData - extractSelectionData()의 결과
 * @returns {string} 요약 문자열
 */
export function getSelectionSummary(extractedData) {
  const { rowCount, colCount, cells, sourceRange } = extractedData;
  const nonEmptyCells = cells.filter(c => c.value !== '').length;

  return `${rowCount}x${colCount} 영역 (셀 ${nonEmptyCells}개, 위치: Row ${sourceRange.row + 1}, Col ${String.fromCharCode(65 + sourceRange.col)})`;
}
