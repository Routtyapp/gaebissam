/**
 * 워크북 권한 관리를 위한 데이터베이스 마이그레이션
 *
 * 이 스크립트는 workbook_permissions 테이블을 생성합니다.
 * 이 테이블은 사용자별 워크북 접근 권한을 관리합니다.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'spreadsheet.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 워크북 권한 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS workbook_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workbook_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      access_level TEXT NOT NULL CHECK(access_level IN ('full', 'read', 'none')),
      granted_by TEXT,
      granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workbook_id) REFERENCES workbooks(id) ON DELETE CASCADE,
      UNIQUE(workbook_id, user_id)
    )
  `, (err) => {
    if (err) {
      console.error('workbook_permissions 테이블 생성 오류:', err.message);
    } else {
      console.log('✓ workbook_permissions 테이블이 생성되었습니다.');
    }
  });

  // 워크북 소유자 테이블 (선택사항)
  db.run(`
    CREATE TABLE IF NOT EXISTS workbook_owners (
      workbook_id INTEGER PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workbook_id) REFERENCES workbooks(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('workbook_owners 테이블 생성 오류:', err.message);
    } else {
      console.log('✓ workbook_owners 테이블이 생성되었습니다.');
    }
  });

  // 인덱스 생성 (성능 향상)
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_workbook_permissions_user
    ON workbook_permissions(user_id)
  `, (err) => {
    if (err) {
      console.error('인덱스 생성 오류:', err.message);
    } else {
      console.log('✓ 인덱스가 생성되었습니다.');
    }
  });

  // 사용자 테이블 생성 (기본 사용자 정보 저장용)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('users 테이블 생성 오류:', err.message);
    } else {
      console.log('✓ users 테이블이 생성되었습니다.');
    }
  });

  console.log('\n마이그레이션이 완료되었습니다!');
});

db.close((err) => {
  if (err) {
    console.error('데이터베이스 종료 오류:', err.message);
  } else {
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
});
