require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Liveblocks } = require('@liveblocks/node');
const dbOps = require('./db-operations');

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;

// Debug: Check if environment variables are loaded
console.log('=== Environment Variables Check ===');
console.log('LIVEBLOCKS_SECRET_KEY exists:', !!process.env.LIVEBLOCKS_SECRET_KEY);
console.log('LIVEBLOCKS_SECRET_KEY length:', process.env.LIVEBLOCKS_SECRET_KEY?.length || 0);
console.log('LIVEBLOCKS_SECRET_KEY starts with:', process.env.LIVEBLOCKS_SECRET_KEY?.substring(0, 10) || 'NOT SET');
console.log('PORT:', PORT);
console.log('===================================\n');

// Initialize Liveblocks with secret key
if (!process.env.LIVEBLOCKS_SECRET_KEY) {
  console.error('⚠️  WARNING: LIVEBLOCKS_SECRET_KEY is not set in .env file!');
}

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || '',
});

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// ============================================
// 기본 라우트
// ============================================

// 헬스체크 엔드포인트
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Spreadsheet API Server',
    version: '2.0.0',
    database: 'Supabase PostgreSQL',
    features: ['LiveBlocks', 'Collaborative Editing'],
  });
});

// API 상태 확인
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================
// Liveblocks 인증 API
// ============================================

/**
 * 사용자의 워크북 권한을 확인하는 함수
 * 실제 프로덕션에서는 데이터베이스를 조회하여 권한을 확인해야 합니다
 */
async function getUserWorkbookPermissions(userId) {
  // Supabase에서 사용자의 워크북 권한 조회
  try {
    return await dbOps.getUserWorkbookPermissions(userId);
  } catch (error) {
    console.error('워크북 권한 조회 오류:', error);
    return [];
  }
}

/**
 * Room ID 생성 패턴: workbook:{workbookId}:worksheet:{worksheetId}
 * 예시:
 * - workbook:1 - 워크북 전체
 * - workbook:1:worksheet:1 - 특정 워크시트
 * - workbook:1:* - 워크북 1의 모든 워크시트
 */

/**
 * Helper function to get user from database
 * In production, this should validate JWT tokens or sessions
 */
function getUserFromDB(req) {
  // TODO: Replace with actual user authentication
  // Examples:
  // - Verify JWT token from Authorization header
  // - Check session cookie
  // - Validate OAuth token

  const { userId, userInfo } = req.body;

  // For now, using userId from request body (development only)
  return {
    id: userId || `user-${Date.now()}`,
    metadata: {
      name: userInfo?.name || 'Anonymous',
      avatar: userInfo?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo?.name || 'Anonymous')}`,
      color: userInfo?.color || `hsl(${Math.random() * 360}, 70%, 50%)`,
    },
    // In production, you would have:
    // organization: user.organizationId,
    // group: user.groupId,
    // tenantId: user.tenantId,
  };
}

// Liveblocks 인증 엔드포인트 (Access Token 방식)
app.post('/api/liveblocks-auth', async (req, res) => {
  try {
    // Get the current user from your database
    const user = getUserFromDB(req);

    // Optional: Get tenant ID for multi-tenancy
    const tenantId = req.body.tenantId || null;

    // Start an auth session inside your endpoint
    const sessionOptions = { userInfo: user.metadata };
    if (tenantId) {
      sessionOptions.tenantId = tenantId;
    }

    const session = liveblocks.prepareSession(user.id, sessionOptions);

    // Get user's workbook permissions from database
    const permissions = await getUserWorkbookPermissions(user.id);

    // Use a naming pattern to allow access to rooms with wildcards
    permissions.forEach(({ workbookId, access }) => {
      if (access === 'full') {
        // Giving the user full access to all worksheets in their workbooks
        session.allow(`workbook:${workbookId}:*`, session.FULL_ACCESS);
      } else if (access === 'read') {
        // Giving the user read access only
        session.allow(`workbook:${workbookId}:*`, session.READ_ACCESS);
      }
    });

    // Backward compatibility: Allow access to default room
    session.allow('my-spreadsheet-room', session.FULL_ACCESS);

    // Development mode: Allow access to all rooms for testing
    if (process.env.NODE_ENV !== 'production') {
      // 모든 워크북 접근 허용
      session.allow('workbook:*', session.FULL_ACCESS);

      // 사용자가 입력한 임의의 방 이름 모두 허용
      session.allow('*', session.FULL_ACCESS);
    }

    // Production: 요청된 room에 대한 접근 허용
    // (실제 프로덕션에서는 데이터베이스에서 권한 확인 필요)
    const { room } = req.body;
    if (room) {
      session.allow(room, session.FULL_ACCESS);
    }

    // Authorize the user and return the result
    const { status, body } = await session.authorize();

    console.log(`✓ Authentication successful: ${user.metadata.name} (${user.id})`);
    return res.status(status).end(body);

  } catch (error) {
    console.error('✗ Liveblocks authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

// 워크북 권한 관리 API
app.post('/api/workbooks/:workbookId/permissions', (req, res) => {
  const { workbookId } = req.params;
  const { userId, access } = req.body;

  // TODO: 데이터베이스에 사용자 권한 저장
  // 실제 구현에서는 workbook_permissions 테이블을 생성하고 관리해야 합니다

  res.json({
    message: '권한이 설정되었습니다.',
    workbookId,
    userId,
    access
  });
});

// 워크북 권한 조회 API
app.get('/api/workbooks/:workbookId/permissions', (req, res) => {
  const { workbookId } = req.params;

  // TODO: 데이터베이스에서 워크북 권한 조회

  res.json([
    // 예시 응답
    { userId: 'user-1', access: 'full', userName: 'John Doe' },
    { userId: 'user-2', access: 'read', userName: 'Jane Smith' },
  ]);
});

// ============================================
// 크로스 룸 데이터 전송 API
// ============================================

// 대기 중인 전송 데이터 저장 (메모리)
const pendingTransfers = new Map(); // roomId -> array of transfers

/**
 * 다른 방으로 선택 영역 데이터 전송
 */
app.post('/api/rooms/transfer', async (req, res) => {
  try {
    const {
      sourceRoom,
      targetRoom,
      data, // extractSelectionData() 결과
      userId,
    } = req.body;

    console.log(`📤 Transfer request: ${sourceRoom} → ${targetRoom}`);
    console.log(`   Data: ${data.rowCount}x${data.colCount} (${data.cells.length} cells)`);
    console.log(`   User: ${userId}`);

    // 대상 방의 대기 목록에 추가
    if (!pendingTransfers.has(targetRoom)) {
      pendingTransfers.set(targetRoom, []);
    }

    const transfer = {
      id: Date.now(),
      sourceRoom,
      data,
      userId,
      timestamp: Date.now(),
    };

    pendingTransfers.get(targetRoom).push(transfer);

    console.log(`✓ Transfer queued for room ${targetRoom}`);

    res.json({
      success: true,
      message: `${targetRoom}으로 데이터가 전송되었습니다.`,
      targetRoom,
      transferredCells: data.cells.length,
      transferId: transfer.id,
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 특정 방의 대기 중인 전송 데이터 가져오기
 */
app.get('/api/rooms/:roomId/pending-transfers', (req, res) => {
  const { roomId } = req.params;

  const transfers = pendingTransfers.get(roomId) || [];

  // 전송 후 삭제
  if (transfers.length > 0) {
    console.log(`📬 Sending ${transfers.length} pending transfers to room ${roomId}`);
    pendingTransfers.delete(roomId);
  }

  res.json({ transfers });
});

// ============================================
// 워크북 API
// ============================================

// 워크북 생성
app.post('/api/workbooks', async (req, res) => {
  try {
    const { name } = req.body;
    const workbook = await dbOps.createWorkbook(name);
    res.json(workbook);
  } catch (error) {
    console.error('워크북 생성 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 모든 워크북 조회
app.get('/api/workbooks', async (req, res) => {
  try {
    const workbooks = await dbOps.getAllWorkbooks();
    res.json(workbooks);
  } catch (error) {
    console.error('워크북 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 특정 워크북 조회
app.get('/api/workbooks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const workbook = await dbOps.getWorkbookById(id);

    if (!workbook) {
      return res.status(404).json({ error: '워크북을 찾을 수 없습니다.' });
    }

    res.json(workbook);
  } catch (error) {
    console.error('워크북 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 워크시트 API
// ============================================

// 워크시트 생성
app.post('/api/worksheets', async (req, res) => {
  try {
    const { workbook_id, name, sheet_index } = req.body;
    const worksheet = await dbOps.createWorksheet(workbook_id, name, sheet_index);
    res.json(worksheet);
  } catch (error) {
    console.error('워크시트 생성 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 워크북의 모든 워크시트 조회
app.get('/api/workbooks/:workbookId/worksheets', async (req, res) => {
  try {
    const { workbookId } = req.params;
    const worksheets = await dbOps.getWorksheetsByWorkbook(workbookId);
    res.json(worksheets);
  } catch (error) {
    console.error('워크시트 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 셀 데이터 API
// ============================================

// 셀 데이터 저장/업데이트 (단일)
app.post('/api/cells', async (req, res) => {
  try {
    const { worksheet_id, row_index, col_index, value, formula, style, room_id } = req.body;

    // 셀 데이터 저장/업데이트 (room_id 포함)
    const cell = await dbOps.upsertCell(
      worksheet_id,
      row_index,
      col_index,
      value,
      formula,
      style,
      room_id
    );

    // 변경 이력 저장 (에러가 발생해도 계속 진행)
    try {
      await dbOps.addChangeHistory(
        worksheet_id,
        row_index,
        col_index,
        null, // old_value
        value,
        'system'
      );
    } catch (historyErr) {
      console.error('변경 이력 저장 오류:', historyErr);
    }

    res.json(cell);
  } catch (error) {
    console.error('셀 저장 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 셀 데이터 대량 저장/업데이트
app.post('/api/cells/batch', async (req, res) => {
  try {
    const { cells } = req.body;

    if (!Array.isArray(cells) || cells.length === 0) {
      return res.status(400).json({ error: '유효한 셀 데이터 배열이 필요합니다.' });
    }

    // Supabase는 upsert가 트랜잭션 방식으로 처리됨
    const result = await dbOps.upsertCellsBatch(cells);

    res.json({
      message: `${result.length}개의 셀이 저장되었습니다.`,
      count: result.length
    });
  } catch (error) {
    console.error('셀 배치 저장 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 워크시트의 모든 셀 데이터 조회
app.get('/api/worksheets/:worksheetId/cells', async (req, res) => {
  try {
    const { worksheetId } = req.params;
    const { room_id } = req.query; // 쿼리 파라미터로 room_id 받기
    const cells = await dbOps.getCellsByWorksheet(worksheetId, room_id);
    res.json(cells);
  } catch (error) {
    console.error('셀 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 특정 방(room)의 모든 셀 조회
app.get('/api/rooms/:roomId/cells', async (req, res) => {
  try {
    const { roomId } = req.params;
    const cells = await dbOps.getCellsByRoom(roomId);
    res.json(cells);
  } catch (error) {
    console.error('방 셀 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 특정 셀 데이터 조회
app.get('/api/cells/:worksheetId/:row/:col', async (req, res) => {
  try {
    const { worksheetId, row, col } = req.params;
    const cell = await dbOps.getCellByPosition(worksheetId, row, col);
    res.json(cell || null);
  } catch (error) {
    console.error('셀 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 셀 데이터 삭제
app.delete('/api/cells/:worksheetId/:row/:col', async (req, res) => {
  try {
    const { worksheetId, row, col } = req.params;
    const result = await dbOps.deleteCell(worksheetId, row, col);
    res.json({
      message: '셀이 삭제되었습니다.',
      deleted: result.length > 0
    });
  } catch (error) {
    console.error('셀 삭제 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 변경 이력 API (협업 기능용)
// ============================================

// 워크시트의 변경 이력 조회
app.get('/api/worksheets/:worksheetId/history', async (req, res) => {
  try {
    const { worksheetId } = req.params;
    const { limit = 100 } = req.query;
    const history = await dbOps.getChangeHistory(worksheetId, parseInt(limit));
    res.json(history);
  } catch (error) {
    console.error('변경 이력 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 서버 시작
// ============================================

app.listen(PORT, () => {
  console.log(`✅ 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🗄️  Supabase 데이터베이스 연결됨`);
  console.log(`🔴 LiveBlocks 인증 활성화됨`);
});
