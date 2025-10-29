const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 데이터베이스 파일 경로
const dbPath = path.join(__dirname, 'spreadsheet.db');

// 데이터베이스 연결
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('데이터베이스 연결 오류:', err.message);
  } else {
    console.log('SQLite 데이터베이스에 연결되었습니다.');
    initDatabase();
  }
});

// 데이터베이스 초기화
function initDatabase() {
  // 워크북 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS workbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('workbooks 테이블 생성 오류:', err.message);
    }
  });

  // 워크시트 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS worksheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workbook_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sheet_index INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workbook_id) REFERENCES workbooks (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('worksheets 테이블 생성 오류:', err.message);
    }
  });

  // 셀 데이터 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS cells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worksheet_id INTEGER NOT NULL,
      row_index INTEGER NOT NULL,
      col_index INTEGER NOT NULL,
      value TEXT,
      formula TEXT,
      style TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worksheet_id) REFERENCES worksheets (id) ON DELETE CASCADE,
      UNIQUE(worksheet_id, row_index, col_index)
    )
  `, (err) => {
    if (err) {
      console.error('cells 테이블 생성 오류:', err.message);
    } else {
      console.log('데이터베이스 테이블이 준비되었습니다.');
    }
  });

  // 변경 이력 테이블 생성 (협업 기능을 위한 사전 작업)
  db.run(`
    CREATE TABLE IF NOT EXISTS change_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worksheet_id INTEGER NOT NULL,
      row_index INTEGER NOT NULL,
      col_index INTEGER NOT NULL,
      old_value TEXT,
      new_value TEXT,
      user_id TEXT,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worksheet_id) REFERENCES worksheets (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('change_history 테이블 생성 오류:', err.message);
    }
  });
}

module.exports = db;
