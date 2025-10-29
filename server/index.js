require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Liveblocks } = require('@liveblocks/node');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

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
// Liveblocks 인증 API
// ============================================

/**
 * 사용자의 워크북 권한을 확인하는 함수
 * 실제 프로덕션에서는 데이터베이스를 조회하여 권한을 확인해야 합니다
 */
async function getUserWorkbookPermissions(userId) {
  // TODO: 데이터베이스에서 사용자의 워크북 권한 조회
  // 현재는 모든 사용자에게 모든 워크북 접근 권한 부여 (개발 환경용)

  return new Promise((resolve) => {
    db.all('SELECT id FROM workbooks', [], (err, rows) => {
      if (err) {
        console.error('워크북 조회 오류:', err);
        resolve([]);
        return;
      }

      // 모든 워크북에 대한 전체 접근 권한 반환
      const permissions = rows.map(workbook => ({
        workbookId: workbook.id,
        access: 'full', // 'full' | 'read' | 'none'
      }));

      resolve(permissions);
    });
  });
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

    // Development mode: Allow access to all workbooks for testing
    if (process.env.NODE_ENV !== 'production') {
      session.allow('workbook:*', session.FULL_ACCESS);
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
// 워크북 API
// ============================================

// 워크북 생성
app.post('/api/workbooks', (req, res) => {
  const { name } = req.body;

  db.run(
    'INSERT INTO workbooks (name) VALUES (?)',
    [name],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, name });
    }
  );
});

// 모든 워크북 조회
app.get('/api/workbooks', (req, res) => {
  db.all('SELECT * FROM workbooks ORDER BY updated_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 특정 워크북 조회
app.get('/api/workbooks/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM workbooks WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '워크북을 찾을 수 없습니다.' });
    }
    res.json(row);
  });
});

// ============================================
// 워크시트 API
// ============================================

// 워크시트 생성
app.post('/api/worksheets', (req, res) => {
  const { workbook_id, name, sheet_index } = req.body;

  db.run(
    'INSERT INTO worksheets (workbook_id, name, sheet_index) VALUES (?, ?, ?)',
    [workbook_id, name, sheet_index],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, workbook_id, name, sheet_index });
    }
  );
});

// 워크북의 모든 워크시트 조회
app.get('/api/workbooks/:workbookId/worksheets', (req, res) => {
  const { workbookId } = req.params;

  db.all(
    'SELECT * FROM worksheets WHERE workbook_id = ? ORDER BY sheet_index',
    [workbookId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// ============================================
// 셀 데이터 API
// ============================================

// 셀 데이터 저장/업데이트 (단일)
app.post('/api/cells', (req, res) => {
  const { worksheet_id, row_index, col_index, value, formula, style } = req.body;

  db.run(
    `INSERT INTO cells (worksheet_id, row_index, col_index, value, formula, style, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(worksheet_id, row_index, col_index)
     DO UPDATE SET
       value = excluded.value,
       formula = excluded.formula,
       style = excluded.style,
       updated_at = CURRENT_TIMESTAMP`,
    [worksheet_id, row_index, col_index, value, formula, style],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 변경 이력 저장
      db.run(
        `INSERT INTO change_history (worksheet_id, row_index, col_index, new_value, user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [worksheet_id, row_index, col_index, value, 'system'],
        (historyErr) => {
          if (historyErr) {
            console.error('변경 이력 저장 오류:', historyErr.message);
          }
        }
      );

      res.json({
        id: this.lastID,
        worksheet_id,
        row_index,
        col_index,
        value,
        formula,
        style
      });
    }
  );
});

// 셀 데이터 대량 저장/업데이트
app.post('/api/cells/batch', (req, res) => {
  const { cells } = req.body;

  if (!Array.isArray(cells) || cells.length === 0) {
    return res.status(400).json({ error: '유효한 셀 데이터 배열이 필요합니다.' });
  }

  const stmt = db.prepare(
    `INSERT INTO cells (worksheet_id, row_index, col_index, value, formula, style, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(worksheet_id, row_index, col_index)
     DO UPDATE SET
       value = excluded.value,
       formula = excluded.formula,
       style = excluded.style,
       updated_at = CURRENT_TIMESTAMP`
  );

  // serialize() 대신 직접 트랜잭션 관리
  db.run('BEGIN TRANSACTION', (beginErr) => {
    if (beginErr) {
      return res.status(500).json({ error: beginErr.message });
    }

    let completed = 0;
    let hasError = false;

    cells.forEach((cell, index) => {
      stmt.run(
        [
          cell.worksheet_id,
          cell.row_index,
          cell.col_index,
          cell.value,
          cell.formula || null,
          cell.style || null
        ],
        (err) => {
          if (err && !hasError) {
            hasError = true;
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          completed++;

          // 모든 셀 처리 완료
          if (completed === cells.length && !hasError) {
            stmt.finalize((finalizeErr) => {
              if (finalizeErr) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: finalizeErr.message });
              }

              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  return res.status(500).json({ error: commitErr.message });
                }
                res.json({ message: `${cells.length}개의 셀이 저장되었습니다.` });
              });
            });
          }
        }
      );
    });
  });
});

// 워크시트의 모든 셀 데이터 조회
app.get('/api/worksheets/:worksheetId/cells', (req, res) => {
  const { worksheetId } = req.params;

  db.all(
    'SELECT * FROM cells WHERE worksheet_id = ? ORDER BY row_index, col_index',
    [worksheetId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// 특정 셀 데이터 조회
app.get('/api/cells/:worksheetId/:row/:col', (req, res) => {
  const { worksheetId, row, col } = req.params;

  db.get(
    'SELECT * FROM cells WHERE worksheet_id = ? AND row_index = ? AND col_index = ?',
    [worksheetId, row, col],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(row || null);
    }
  );
});

// 셀 데이터 삭제
app.delete('/api/cells/:worksheetId/:row/:col', (req, res) => {
  const { worksheetId, row, col } = req.params;

  db.run(
    'DELETE FROM cells WHERE worksheet_id = ? AND row_index = ? AND col_index = ?',
    [worksheetId, row, col],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: '셀이 삭제되었습니다.', changes: this.changes });
    }
  );
});

// ============================================
// 변경 이력 API (협업 기능용)
// ============================================

// 워크시트의 변경 이력 조회
app.get('/api/worksheets/:worksheetId/history', (req, res) => {
  const { worksheetId } = req.params;
  const { limit = 100 } = req.query;

  db.all(
    'SELECT * FROM change_history WHERE worksheet_id = ? ORDER BY changed_at DESC LIMIT ?',
    [worksheetId, limit],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// ============================================
// 서버 시작
// ============================================

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

// 정리 함수
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('데이터베이스 연결이 종료되었습니다.');
    process.exit(0);
  });
});
