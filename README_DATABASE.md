# SpreadJS SQLite 연동 가이드

## 개요

이 프로젝트는 SpreadJS 스프레드시트 애플리케이션에 SQLite 데이터베이스를 연동하여, 셀 데이터를 영구적으로 저장하고 협업 기능을 위한 기반을 마련한 프로젝트입니다.

## 아키텍처

### 백엔드 (Node.js + Express + SQLite)
- **위치**: `server/` 폴더
- **주요 파일**:
  - `server/index.js`: Express API 서버
  - `server/db.js`: SQLite 데이터베이스 초기화 및 연결
  - `server/spreadsheet.db`: SQLite 데이터베이스 파일 (자동 생성)

### 프론트엔드 (React + SpreadJS)
- **위치**: `src/` 폴더
- **주요 파일**:
  - `src/App.js`: 메인 애플리케이션
  - `src/api/spreadsheetApi.js`: API 통신 모듈

## 데이터베이스 스키마

### 1. workbooks 테이블
워크북(통합 문서) 정보를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | 기본 키 (자동 증가) |
| name | TEXT | 워크북 이름 |
| created_at | DATETIME | 생성 시간 |
| updated_at | DATETIME | 수정 시간 |

### 2. worksheets 테이블
워크북 내의 개별 시트 정보를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | 기본 키 (자동 증가) |
| workbook_id | INTEGER | 워크북 ID (외래 키) |
| name | TEXT | 시트 이름 |
| sheet_index | INTEGER | 시트 순서 |
| created_at | DATETIME | 생성 시간 |
| updated_at | DATETIME | 수정 시간 |

### 3. cells 테이블
각 셀의 데이터를 저장합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | 기본 키 (자동 증가) |
| worksheet_id | INTEGER | 워크시트 ID (외래 키) |
| row_index | INTEGER | 행 인덱스 |
| col_index | INTEGER | 열 인덱스 |
| value | TEXT | 셀 값 |
| formula | TEXT | 수식 (있을 경우) |
| style | TEXT | 스타일 (JSON 형식) |
| created_at | DATETIME | 생성 시간 |
| updated_at | DATETIME | 수정 시간 |

**제약 조건**: (worksheet_id, row_index, col_index)는 UNIQUE

### 4. change_history 테이블
셀 변경 이력을 저장합니다. (협업 기능을 위한 사전 작업)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER | 기본 키 (자동 증가) |
| worksheet_id | INTEGER | 워크시트 ID (외래 키) |
| row_index | INTEGER | 행 인덱스 |
| col_index | INTEGER | 열 인덱스 |
| old_value | TEXT | 이전 값 |
| new_value | TEXT | 새로운 값 |
| user_id | TEXT | 사용자 ID |
| changed_at | DATETIME | 변경 시간 |

## API 엔드포인트

### 워크북 API

#### POST /api/workbooks
새 워크북을 생성합니다.
```json
{
  "name": "My Workbook"
}
```

#### GET /api/workbooks
모든 워크북 목록을 조회합니다.

#### GET /api/workbooks/:id
특정 워크북 정보를 조회합니다.

### 워크시트 API

#### POST /api/worksheets
새 워크시트를 생성합니다.
```json
{
  "workbook_id": 1,
  "name": "Sheet1",
  "sheet_index": 0
}
```

#### GET /api/workbooks/:workbookId/worksheets
특정 워크북의 모든 워크시트를 조회합니다.

### 셀 데이터 API

#### POST /api/cells
단일 셀 데이터를 저장/업데이트합니다.
```json
{
  "worksheet_id": 1,
  "row_index": 0,
  "col_index": 0,
  "value": "Hello",
  "formula": null,
  "style": null
}
```

#### POST /api/cells/batch
여러 셀 데이터를 일괄 저장/업데이트합니다.
```json
{
  "cells": [
    {
      "worksheet_id": 1,
      "row_index": 0,
      "col_index": 0,
      "value": "A1"
    },
    {
      "worksheet_id": 1,
      "row_index": 0,
      "col_index": 1,
      "value": "B1"
    }
  ]
}
```

#### GET /api/worksheets/:worksheetId/cells
특정 워크시트의 모든 셀 데이터를 조회합니다.

#### GET /api/cells/:worksheetId/:row/:col
특정 셀 데이터를 조회합니다.

#### DELETE /api/cells/:worksheetId/:row/:col
특정 셀 데이터를 삭제합니다.

### 변경 이력 API

#### GET /api/worksheets/:worksheetId/history
특정 워크시트의 변경 이력을 조회합니다.
- Query Parameter: `limit` (기본값: 100)

## 실행 방법

### 1. 백엔드 서버만 실행
```bash
npm run server
```
서버가 포트 5000에서 실행됩니다.

### 2. 프론트엔드만 실행
```bash
npm start
```
React 앱이 포트 3000에서 실행됩니다.

### 3. 백엔드 + 프론트엔드 동시 실행 (권장)
```bash
npm run dev
```
백엔드(5000)와 프론트엔드(3000)가 동시에 실행됩니다.

## 주요 기능

### 1. 실시간 셀 데이터 저장
- 사용자가 셀 값을 변경하면 `CellChanged` 이벤트가 발생합니다.
- 자동으로 백엔드 API를 호출하여 데이터베이스에 저장합니다.
- 콘솔에서 저장 로그를 확인할 수 있습니다.

### 2. 워크북 저장
- "DB에 저장" 버튼을 클릭하면 전체 워크북이 데이터베이스에 저장됩니다.
- 모든 시트와 셀 데이터가 포함됩니다.

### 3. 워크북 로드
- "DB에서 로드" 버튼을 클릭하면 워크북 ID를 입력할 수 있습니다.
- 해당 워크북의 모든 데이터가 복원됩니다.

## 협업 기능 준비

### 현재 구현된 사항
1. **변경 이력 테이블**: 모든 셀 변경 내역이 `change_history` 테이블에 기록됩니다.
2. **사용자 ID 필드**: 향후 사용자 인증 시스템 연동을 위한 `user_id` 필드가 있습니다.
3. **타임스탬프**: 모든 변경 사항에 시간 정보가 기록됩니다.

### 향후 추가 가능한 기능
1. **실시간 동기화**: WebSocket을 사용한 실시간 협업
2. **사용자 인증**: JWT 또는 세션 기반 인증 시스템
3. **충돌 해결**: 동시 편집 시 충돌 처리 메커니즘
4. **권한 관리**: 읽기 전용, 편집 가능 등의 권한 설정
5. **변경 내역 조회**: 누가, 언제, 무엇을 변경했는지 확인

## 환경 요구사항

- Node.js 14 이상
- npm 또는 yarn
- SQLite3 (자동으로 설치됨)

## 주의사항

1. **CORS 설정**: 백엔드 서버는 모든 origin을 허용하도록 설정되어 있습니다. 프로덕션 환경에서는 특정 도메인만 허용하도록 변경해야 합니다.

2. **데이터베이스 파일**: `server/spreadsheet.db` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

3. **에러 처리**: 현재는 기본적인 에러 처리만 구현되어 있습니다. 프로덕션 환경에서는 더 정교한 에러 처리가 필요합니다.

4. **성능 최적화**: 대량의 셀 데이터 처리 시 배치 저장 API(`/api/cells/batch`)를 사용하는 것이 좋습니다.

## 문제 해결

### 서버 연결 오류
- 백엔드 서버가 실행 중인지 확인하세요 (`npm run server`).
- 포트 5000이 다른 프로세스에 의해 사용 중인지 확인하세요.

### 데이터베이스 초기화
- `server/spreadsheet.db` 파일을 삭제하고 서버를 재시작하면 데이터베이스가 새로 생성됩니다.

### CORS 오류
- 백엔드 서버가 포트 5000에서 실행 중인지 확인하세요.
- `src/api/spreadsheetApi.js`의 `API_BASE_URL`이 올바른지 확인하세요.
