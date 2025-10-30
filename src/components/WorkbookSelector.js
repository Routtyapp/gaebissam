import { useState, useEffect } from 'react';
import { getWorkbooks, createWorkbook } from '../api/spreadsheetApi';

/**
 * 워크북 선택/생성/검색 컴포넌트
 */
export function WorkbookSelector({ currentWorkbookId, onSelectWorkbook }) {
  const [workbooks, setWorkbooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 워크북 목록 로드
  useEffect(() => {
    loadWorkbooks();
  }, []);

  const loadWorkbooks = async () => {
    try {
      const data = await getWorkbooks();
      setWorkbooks(data);
    } catch (error) {
      console.error('Failed to load workbooks:', error);
    }
  };

  // 새 워크북 생성
  const handleCreateWorkbook = async () => {
    const name = prompt('새 워크북 이름을 입력하세요:');
    if (!name) return;

    setIsCreating(true);
    try {
      const newWorkbook = await createWorkbook(name);
      setWorkbooks([newWorkbook, ...workbooks]);
      onSelectWorkbook(newWorkbook.id);
      alert(`워크북 "${newWorkbook.name}" (ID: ${newWorkbook.id}, 방: ${newWorkbook.room_id}) 생성 완료!`);
    } catch (error) {
      console.error('Failed to create workbook:', error);
      alert('워크북 생성 실패: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  // 워크북 선택
  const handleSelectWorkbook = (workbookId) => {
    onSelectWorkbook(workbookId);
    setIsDropdownOpen(false);
  };

  // 검색 필터링
  const filteredWorkbooks = workbooks.filter(wb =>
    wb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wb.id.toString().includes(searchQuery)
  );

  // 현재 워크북 정보
  const currentWorkbook = workbooks.find(wb => wb.id === currentWorkbookId);

  return (
    <div style={styles.container}>
      {/* 현재 워크북 표시 */}
      <div style={styles.currentWorkbook}>
        <span style={styles.label}>📚 워크북:</span>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={styles.currentButton}
        >
          {currentWorkbook
            ? `${currentWorkbook.name} (ID: ${currentWorkbook.id})`
            : `워크북 #${currentWorkbookId}`}
          <span style={styles.arrow}>{isDropdownOpen ? '▲' : '▼'}</span>
        </button>

        {/* 새 워크북 생성 버튼 */}
        <button
          onClick={handleCreateWorkbook}
          disabled={isCreating}
          style={styles.createButton}
          title="새 워크북 생성"
        >
          {isCreating ? '⏳' : '➕'}
        </button>
      </div>

      {/* 드롭다운 목록 */}
      {isDropdownOpen && (
        <div style={styles.dropdown}>
          {/* 검색 입력 */}
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="워크북 검색... (이름 또는 ID)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              autoFocus
            />
          </div>

          {/* 워크북 목록 */}
          <div style={styles.workbookList}>
            {filteredWorkbooks.length === 0 ? (
              <div style={styles.emptyMessage}>
                {searchQuery ? '검색 결과가 없습니다.' : '워크북이 없습니다.'}
              </div>
            ) : (
              filteredWorkbooks.map(wb => (
                <button
                  key={wb.id}
                  onClick={() => handleSelectWorkbook(wb.id)}
                  style={{
                    ...styles.workbookItem,
                    ...(wb.id === currentWorkbookId ? styles.workbookItemActive : {})
                  }}
                >
                  <div style={styles.workbookInfo}>
                    <div style={styles.workbookName}>{wb.name}</div>
                    <div style={styles.workbookMeta}>
                      ID: {wb.id} | 방: {wb.room_id || 'N/A'}
                    </div>
                  </div>
                  {wb.id === currentWorkbookId && (
                    <span style={styles.checkmark}>✓</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* 총 개수 표시 */}
          <div style={styles.footer}>
            총 {filteredWorkbooks.length}개의 워크북
          </div>
        </div>
      )}
    </div>
  );
}

// 스타일
const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
    marginRight: '10px',
  },
  currentWorkbook: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  currentButton: {
    padding: '6px 12px',
    border: '2px solid #007bff',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '200px',
    justifyContent: 'space-between',
  },
  arrow: {
    fontSize: '12px',
    color: '#666',
  },
  createButton: {
    padding: '6px 12px',
    border: '2px solid #28a745',
    borderRadius: '4px',
    backgroundColor: '#28a745',
    color: 'white',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: 'white',
    border: '2px solid #007bff',
    borderRadius: '4px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1000,
    minWidth: '400px',
    maxHeight: '500px',
    display: 'flex',
    flexDirection: 'column',
  },
  searchContainer: {
    padding: '10px',
    borderBottom: '1px solid #ddd',
  },
  searchInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  workbookList: {
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '4px',
  },
  workbookItem: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderBottom: '1px solid #eee',
    backgroundColor: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.2s',
  },
  workbookItemActive: {
    backgroundColor: '#e7f3ff',
    fontWeight: 'bold',
  },
  workbookInfo: {
    flex: 1,
  },
  workbookName: {
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '4px',
  },
  workbookMeta: {
    fontSize: '12px',
    color: '#666',
  },
  checkmark: {
    color: '#007bff',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  emptyMessage: {
    padding: '20px',
    textAlign: 'center',
    color: '#999',
  },
  footer: {
    padding: '8px 12px',
    borderTop: '1px solid #ddd',
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#f8f9fa',
  },
};
