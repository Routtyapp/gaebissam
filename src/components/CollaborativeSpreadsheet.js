import React, { useEffect, useRef, useState } from 'react';
import { Designer } from "@mescius/spread-sheets-designer-react";
import * as GC from '@mescius/spread-sheets';
import { useStorage, useMutation, useRoom } from '../liveblocks.config';
import {
  loadCellsFromDatabase,
  applyCellsToSpreadJS,
  setupPeriodicBackup,
  getCellKey,
} from '../utils/liveblocksSync';
import { SendToRoomButton } from './SendToRoomButton';

/**
 * 실시간 협업 스프레드시트 컴포넌트
 *
 * 동작 흐름:
 * 1. 초기 로드: Supabase → Liveblocks Storage → SpreadJS
 * 2. 실시간 편집: SpreadJS → Liveblocks Storage → 모든 사용자
 * 3. 주기적 백업: Liveblocks Storage → Supabase (30초마다)
 */
export function CollaborativeSpreadsheet({
  currentWorkbookId,
  currentWorksheetId,
  currentRoomId,
  initDesigner,
}) {
  const room = useRoom();
  const liveCells = useStorage((root) => root.cells);
  const [isInitialized, setIsInitialized] = useState(false);
  const [spreadInstance, setSpreadInstance] = useState(null);
  const backupTimerRef = useRef(null);
  const isLoadingRef = useRef(false);
  const userId = room.getSelf()?.id || 'unknown';

  // 최신 값을 항상 참조하기 위한 ref들
  const currentRoomIdRef = useRef(currentRoomId);
  const currentWorksheetIdRef = useRef(currentWorksheetId);

  // props가 변경될 때마다 ref 업데이트
  useEffect(() => {
    currentRoomIdRef.current = currentRoomId;
    currentWorksheetIdRef.current = currentWorksheetId;
  }, [currentRoomId, currentWorksheetId]);

  // Liveblocks Storage에 셀 업데이트하는 함수
  const updateCell = useMutation(({ storage }, row, col, value, formula = null) => {
    const cells = storage.get('cells');
    const key = getCellKey(row, col);
    const userId = room.getSelf()?.id || 'unknown';

    cells.set(key, {
      value,
      formula,
      style: null,
      updatedBy: userId,
      updatedAt: Date.now(),
    });
  }, [room]);

  // Liveblocks Storage에 모든 셀 로드하는 mutation
  const loadCellsToStorage = useMutation(async ({ storage }) => {
    const cells = storage.get('cells');
    const userId = room.getSelf()?.id || 'unknown';

    // SQLite에서 데이터 가져오기
    const dbCells = await loadCellsFromDatabase(currentWorksheetId);

    // Liveblocks Storage에 로드
    dbCells.forEach(cell => {
      const key = `${cell.row_index},${cell.col_index}`;
      cells.set(key, {
        value: cell.value,
        formula: cell.formula,
        style: cell.style ? JSON.parse(cell.style) : null,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    });

    console.log(`✓ Loaded ${dbCells.length} cells to Liveblocks Storage`);
    return dbCells.length;
  }, [currentWorksheetId, room]);

  // Designer 초기화 핸들러
  const handleDesignerInitialized = async (designer) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    console.log('🚀 Initializing collaborative spreadsheet...');

    try {
      // Designer에서 Spread 인스턴스 가져오기
      const spread = designer.getWorkbook();
      setSpreadInstance(spread);

      // 기존 initDesigner 호출 (이벤트 리스너 등)
      if (initDesigner) {
        initDesigner(designer);
      }

      const sheet = spread.getActiveSheet();

      // 1단계: Liveblocks Storage 확인 및 초기 로드
      console.log('📥 Step 1: Checking Liveblocks Storage...');

      // Storage가 비어있으면 DB에서 로드
      if (liveCells && liveCells.size === 0) {
        console.log('Storage is empty, loading from Supabase...');
        await loadCellsToStorage();
      } else {
        console.log(`Storage already has ${liveCells?.size || 0} cells, skipping DB load`);
      }

      // 2단계: Liveblocks Storage에서 SpreadJS로 적용
      // Note: 초기 로드는 생략 (useEffect에서 처리)
      console.log('📊 Step 2: Will apply cells via useEffect when liveCells updates');

      // 3단계: 실시간 동기화 설정
      console.log('⚡ Step 3: Setting up real-time sync...');

      // 셀 변경 이벤트 → Liveblocks Storage 업데이트 + 즉시 DB 저장
      spread.bind(GC.Spread.Sheets.Events.CellChanged, async (e, args) => {
        const { sheet, row, col } = args;
        const value = sheet.getValue(row, col);
        const formula = sheet.getFormula(row, col);

        console.log(`✏️ Cell changed: (${row}, ${col}) = ${value}`);

        // Liveblocks Storage 업데이트 (자동으로 다른 사용자들에게 전파됨)
        updateCell(row, col, value, formula);

        // 즉시 데이터베이스에 저장 (cells 테이블 + change_history)
        try {
          // ref를 사용하여 최신 값 참조
          const worksheetId = currentWorksheetIdRef.current;
          const roomId = currentRoomIdRef.current;

          console.log(`🔍 Saving cell with worksheet_id: ${worksheetId}, room_id: ${roomId}`);

          // room_id가 없으면 저장하지 않음 (백업 프로세스가 처리함)
          if (!roomId) {
            console.warn(`⚠️ Skipping immediate save: room_id is null. Will be saved by backup process.`);
            return;
          }

          const response = await fetch('http://localhost:5000/api/cells', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              worksheet_id: worksheetId,
              row_index: row,
              col_index: col,
              value: value !== null && value !== undefined ? String(value) : '',
              formula: formula || null,
              style: null,
              room_id: roomId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`❌ Cell save failed: (${row}, ${col})`, errorData);
          } else {
            const result = await response.json();
            console.log(`💾 Cell saved to database: (${row}, ${col})`, result);
          }
        } catch (dbError) {
          console.error('Failed to save cell to database:', dbError);
        }
      });

      // 4단계: 주기적으로 서버에서 대기 중인 전송 확인 (폴링)
      console.log('📡 Step 4: Setting up transfer polling...');
      const transferPollingInterval = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/rooms/${currentRoomId}/pending-transfers`);
          const { transfers } = await response.json();

          if (transfers && transfers.length > 0) {
            console.log(`📥 Received ${transfers.length} pending transfer(s)`);

            transfers.forEach(transfer => {
              console.log(`   Processing transfer from ${transfer.sourceRoom}`);
              console.log(`   Cells: ${transfer.data.cells.length}`);

              // Liveblocks Storage에 데이터 추가
              transfer.data.cells.forEach(cell => {
                const targetRow = cell.relativeRow; // 상대 위치 그대로 사용
                const targetCol = cell.relativeCol;
                updateCell(targetRow, targetCol, cell.value, cell.formula);
              });

              console.log(`✓ Applied ${transfer.data.cells.length} cells from transfer`);
            });
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000); // 2초마다 확인

      // 정리 함수에 폴링 타이머 추가
      backupTimerRef.current = {
        backup: null,
        polling: transferPollingInterval,
      };

      // 5단계: 주기적 Supabase 백업 설정 (30초마다)
      console.log('💾 Step 5: Setting up periodic backup...');
      if (liveCells) {
        const backupInterval = setupPeriodicBackup(
          liveCells,
          currentWorksheetId,
          30000, // 30초
          currentRoomId // room_id 추가
        );
        backupTimerRef.current.backup = backupInterval;
      }

      setIsInitialized(true);
      console.log('✅ Collaborative spreadsheet initialized successfully!');
    } catch (error) {
      console.error('❌ Failed to initialize collaborative spreadsheet:', error);
    } finally {
      isLoadingRef.current = false;
    }
  };

  // Liveblocks Storage 변경 감지 → SpreadJS 업데이트
  useEffect(() => {
    if (!spreadInstance || !isInitialized || !liveCells) {
      return;
    }

    // 약간의 딜레이를 주어 sheet가 완전히 초기화되도록 함
    const timeoutId = setTimeout(() => {
      try {
        // 안전하게 sheet 가져오기
        const sheet = spreadInstance.getActiveSheet();
        if (!sheet) {
          console.warn('Sheet is not available yet');
          return;
        }

        console.log('👂 Syncing Liveblocks Storage → SpreadJS...');

        // 이벤트 일시 중지 (성능 향상 & 무한 루프 방지)
        spreadInstance.suspendPaint();
        spreadInstance.suspendEvent();

        let updateCount = 0;

        try {
          // 모든 셀 데이터 동기화
          liveCells.forEach((cellData, key) => {
            try {
              const [row, col] = key.split(',').map(Number);

              // 유효한 좌표인지 확인
              if (isNaN(row) || isNaN(col) || row < 0 || col < 0) {
                return;
              }

              const currentValue = sheet.getValue(row, col);

              // 값이 다르면 업데이트 (무한 루프 방지)
              if (currentValue !== cellData.value) {
                console.log(`🔄 Remote update: (${row}, ${col}) = ${cellData.value}`);

                sheet.setValue(row, col, cellData.value);
                if (cellData.formula) {
                  sheet.setFormula(row, col, cellData.formula);
                }
                updateCount++;
              }
            } catch (cellError) {
              console.error(`Error updating cell:`, cellError);
            }
          });

          if (updateCount > 0) {
            console.log(`✓ Updated ${updateCount} cells from Liveblocks Storage`);
          }
        } finally {
          // 이벤트 재개 (반드시 실행)
          spreadInstance.resumeEvent();
          spreadInstance.resumePaint();
        }
      } catch (error) {
        console.error('Error in storage sync:', error);
      }
    }, 100); // 100ms 딜레이

    return () => clearTimeout(timeoutId);
  }, [spreadInstance, isInitialized, liveCells]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 백업 타이머 정지
      if (backupTimerRef.current) {
        if (backupTimerRef.current.backup) {
          clearInterval(backupTimerRef.current.backup);
        }
        if (backupTimerRef.current.polling) {
          clearInterval(backupTimerRef.current.polling);
        }
        console.log('⏹️ Timers stopped');
      }

      // 최종 백업
      if (liveCells && currentWorksheetId) {
        console.log('💾 Final backup before unmount...');
        import('../utils/liveblocksSync').then(({ backupCellsToDatabase }) => {
          backupCellsToDatabase(liveCells, currentWorksheetId, currentRoomId);
        });
      }
    };
  }, [liveCells, currentWorksheetId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 크로스 룸 전송 버튼 */}
      <div
        style={{
          padding: '8px 12px',
          background: '#f9f9f9',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <SendToRoomButton
          spreadInstance={spreadInstance}
          currentRoomId={currentRoomId}
          userId={userId}
        />
        <span style={{ fontSize: '12px', color: '#666' }}>
          셀 영역을 선택한 후 다른 방으로 전송할 수 있습니다
        </span>
      </div>

      {/* Designer */}
      <Designer
        styleInfo={{ width: "1500px", height: "calc(90vh - 50px)" }}
        designerInitialized={handleDesignerInitialized}
      />
    </div>
  );
}
