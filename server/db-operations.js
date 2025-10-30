const supabase = require('./supabase');

/**
 * Supabase 데이터베이스 작업 추상화 레이어
 * SQLite에서 Supabase PostgreSQL로 마이그레이션
 */

// ============================================
// Workbook Operations
// ============================================

/**
 * 새로운 워크북 생성
 * room_id는 'workbook-{id}' 형식으로 자동 생성
 */
async function createWorkbook(name) {
  // 먼저 워크북 생성 (room_id 없이)
  const { data: workbook, error: insertError } = await supabase
    .from('workbooks')
    .insert({ name })
    .select()
    .single();

  if (insertError) throw insertError;

  // room_id 생성 및 업데이트
  const roomId = `workbook-${workbook.id}`;
  const { data, error } = await supabase
    .from('workbooks')
    .update({ room_id: roomId })
    .eq('id', workbook.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 모든 워크북 조회 (최근 수정순)
 */
async function getAllWorkbooks() {
  const { data, error } = await supabase
    .from('workbooks')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * 특정 워크북 조회
 */
async function getWorkbookById(id) {
  const { data, error } = await supabase
    .from('workbooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Worksheet Operations
// ============================================

/**
 * 새로운 워크시트 생성
 */
async function createWorksheet(workbookId, name, sheetIndex) {
  const { data, error } = await supabase
    .from('worksheets')
    .insert({
      workbook_id: workbookId,
      name,
      sheet_index: sheetIndex,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 워크북의 모든 워크시트 조회
 */
async function getWorksheetsByWorkbook(workbookId) {
  const { data, error } = await supabase
    .from('worksheets')
    .select('*')
    .eq('workbook_id', workbookId)
    .order('sheet_index', { ascending: true });

  if (error) throw error;
  return data;
}

// ============================================
// Cell Operations
// ============================================

/**
 * 단일 셀 저장/업데이트 (UPSERT)
 */
async function upsertCell(worksheetId, rowIndex, colIndex, value, formula = null, style = null, roomId = null) {
  const { data, error } = await supabase
    .from('cells')
    .upsert(
      {
        worksheet_id: worksheetId,
        row_index: rowIndex,
        col_index: colIndex,
        value,
        formula,
        style,
        room_id: roomId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'room_id,row_index,col_index', // room_id 기준으로!
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 여러 셀 일괄 저장/업데이트 (Batch UPSERT)
 * cells 배열의 각 항목은 room_id를 포함해야 함
 */
async function upsertCellsBatch(cells) {
  // cells 배열의 각 항목에 updated_at 추가
  const cellsWithTimestamp = cells.map(cell => ({
    ...cell,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('cells')
    .upsert(cellsWithTimestamp, {
      onConflict: 'room_id,row_index,col_index', // room_id 기준으로!
    })
    .select();

  if (error) throw error;
  return data;
}

/**
 * 워크시트의 모든 셀 조회
 */
async function getCellsByWorksheet(worksheetId, roomId = null) {
  let query = supabase
    .from('cells')
    .select('*')
    .eq('worksheet_id', worksheetId);

  // room_id가 제공되면 해당 방의 데이터만 조회
  if (roomId) {
    query = query.eq('room_id', roomId);
  }

  const { data, error } = await query
    .order('row_index', { ascending: true })
    .order('col_index', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * 특정 방(room)의 모든 셀 조회
 */
async function getCellsByRoom(roomId) {
  const { data, error } = await supabase
    .from('cells')
    .select('*')
    .eq('room_id', roomId)
    .order('row_index', { ascending: true })
    .order('col_index', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * 특정 셀 조회
 */
async function getCellByPosition(worksheetId, rowIndex, colIndex) {
  const { data, error } = await supabase
    .from('cells')
    .select('*')
    .eq('worksheet_id', worksheetId)
    .eq('row_index', rowIndex)
    .eq('col_index', colIndex)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 특정 셀 삭제
 */
async function deleteCell(worksheetId, rowIndex, colIndex) {
  const { data, error } = await supabase
    .from('cells')
    .delete()
    .eq('worksheet_id', worksheetId)
    .eq('row_index', rowIndex)
    .eq('col_index', colIndex)
    .select();

  if (error) throw error;
  return data;
}

// ============================================
// Change History Operations
// ============================================

/**
 * 변경 이력 추가
 */
async function addChangeHistory(worksheetId, rowIndex, colIndex, oldValue, newValue, userId) {
  const { data, error } = await supabase
    .from('change_history')
    .insert({
      worksheet_id: worksheetId,
      row_index: rowIndex,
      col_index: colIndex,
      old_value: oldValue,
      new_value: newValue,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 워크시트의 변경 이력 조회
 */
async function getChangeHistory(worksheetId, limit = 100) {
  const { data, error } = await supabase
    .from('change_history')
    .select('*')
    .eq('worksheet_id', worksheetId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// ============================================
// User Operations
// ============================================

/**
 * 사용자 생성 또는 업데이트
 */
async function upsertUser(userId, name, email = null, avatar = null) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        user_id: userId,
        name,
        email,
        avatar,
        last_active: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Permission Operations
// ============================================

/**
 * 사용자의 워크북 권한 조회
 */
async function getUserWorkbookPermissions(userId) {
  // 모든 워크북에 대한 전체 접근 권한 반환 (기존 로직 유지)
  const { data: workbooks, error } = await supabase
    .from('workbooks')
    .select('id');

  if (error) throw error;

  // 모든 워크북에 대한 전체 접근 권한 반환
  return workbooks.map(workbook => ({
    workbookId: workbook.id,
    access: 'full',
  }));
}

module.exports = {
  // Workbook
  createWorkbook,
  getAllWorkbooks,
  getWorkbookById,

  // Worksheet
  createWorksheet,
  getWorksheetsByWorkbook,

  // Cell
  upsertCell,
  upsertCellsBatch,
  getCellsByWorksheet,
  getCellsByRoom,
  getCellByPosition,
  deleteCell,

  // History
  addChangeHistory,
  getChangeHistory,

  // User
  upsertUser,

  // Permissions
  getUserWorkbookPermissions,
};
