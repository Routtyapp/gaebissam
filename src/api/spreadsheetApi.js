// API 기본 URL
const API_BASE_URL = 'http://localhost:5000/api';

// ============================================
// 워크북 API
// ============================================

export const createWorkbook = async (name) => {
  const response = await fetch(`${API_BASE_URL}/workbooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  return response.json();
};

export const getWorkbooks = async () => {
  const response = await fetch(`${API_BASE_URL}/workbooks`);
  return response.json();
};

export const getWorkbook = async (id) => {
  const response = await fetch(`${API_BASE_URL}/workbooks/${id}`);
  return response.json();
};

// ============================================
// 워크시트 API
// ============================================

export const createWorksheet = async (workbook_id, name, sheet_index) => {
  const response = await fetch(`${API_BASE_URL}/worksheets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workbook_id, name, sheet_index }),
  });
  return response.json();
};

export const getWorksheets = async (workbookId) => {
  const response = await fetch(`${API_BASE_URL}/workbooks/${workbookId}/worksheets`);
  return response.json();
};

// ============================================
// 셀 데이터 API
// ============================================

export const saveCell = async (worksheet_id, row_index, col_index, value, formula = null, style = null) => {
  const response = await fetch(`${API_BASE_URL}/cells`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      worksheet_id,
      row_index,
      col_index,
      value,
      formula,
      style: style ? JSON.stringify(style) : null,
    }),
  });
  return response.json();
};

export const saveCellsBatch = async (cells) => {
  const response = await fetch(`${API_BASE_URL}/cells/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cells }),
  });
  return response.json();
};

export const getCells = async (worksheetId) => {
  const response = await fetch(`${API_BASE_URL}/worksheets/${worksheetId}/cells`);
  return response.json();
};

export const getCell = async (worksheetId, row, col) => {
  const response = await fetch(`${API_BASE_URL}/cells/${worksheetId}/${row}/${col}`);
  return response.json();
};

export const deleteCell = async (worksheetId, row, col) => {
  const response = await fetch(`${API_BASE_URL}/cells/${worksheetId}/${row}/${col}`, {
    method: 'DELETE',
  });
  return response.json();
};

// ============================================
// 변경 이력 API
// ============================================

export const getChangeHistory = async (worksheetId, limit = 100) => {
  const response = await fetch(`${API_BASE_URL}/worksheets/${worksheetId}/history?limit=${limit}`);
  return response.json();
};

// ============================================
// 유틸리티 함수
// ============================================

// 전체 워크북 데이터 저장
export const saveWorkbook = async (spread, workbookName = 'My Workbook') => {
  try {
    // 1. 워크북 생성
    const workbook = await createWorkbook(workbookName);
    const workbookId = workbook.id;

    const allCells = [];

    // 2. 각 시트별로 저장
    for (let i = 0; i < spread.getSheetCount(); i++) {
      const sheet = spread.getSheet(i);
      const sheetName = sheet.name();

      // 워크시트 생성
      const worksheet = await createWorksheet(workbookId, sheetName, i);
      const worksheetId = worksheet.id;

      // 시트의 사용된 범위 가져오기
      const usedRange = sheet.getUsedRange();
      if (!usedRange) continue;

      const { row: startRow, col: startCol, rowCount, colCount } = usedRange;

      // 셀 데이터 수집
      for (let row = startRow; row < startRow + rowCount; row++) {
        for (let col = startCol; col < startCol + colCount; col++) {
          const value = sheet.getValue(row, col);
          const formula = sheet.getFormula(row, col);

          // 값이나 수식이 있는 경우만 저장
          if (value !== null && value !== undefined && value !== '') {
            allCells.push({
              worksheet_id: worksheetId,
              row_index: row,
              col_index: col,
              value: String(value),
              formula: formula || null,
              style: null, // 스타일은 선택적으로 추가 가능
            });
          }
        }
      }
    }

    // 3. 모든 셀 데이터 일괄 저장
    if (allCells.length > 0) {
      await saveCellsBatch(allCells);
    }

    return {
      success: true,
      workbookId,
      message: `워크북이 저장되었습니다. (${allCells.length}개 셀)`,
    };
  } catch (error) {
    console.error('워크북 저장 오류:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// 워크북 데이터 로드
export const loadWorkbook = async (spread, workbookId) => {
  try {
    // 1. 워크북 정보 가져오기
    const workbook = await getWorkbook(workbookId);
    if (workbook.error) {
      throw new Error(workbook.error);
    }

    // 2. 워크시트 목록 가져오기
    const worksheets = await getWorksheets(workbookId);

    // 3. 기존 시트 모두 제거
    spread.clearSheets();

    // 4. 각 워크시트 복원
    for (const worksheet of worksheets) {
      // 시트 추가
      const sheet = new spread.sheets.Worksheet(worksheet.name);
      spread.addSheet(worksheet.sheet_index, sheet);

      // 셀 데이터 가져오기
      const cells = await getCells(worksheet.id);

      // 셀 데이터 복원
      cells.forEach(cell => {
        sheet.setValue(cell.row_index, cell.col_index, cell.value);
        if (cell.formula) {
          sheet.setFormula(cell.row_index, cell.col_index, cell.formula);
        }
      });
    }

    return {
      success: true,
      message: '워크북이 로드되었습니다.',
    };
  } catch (error) {
    console.error('워크북 로드 오류:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
