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

/**
 * 실시간 협업 스프레드시트 컴포넌트
 *
 * 동작 흐름:
 * 1. 초기 로드: SQLite → Liveblocks Storage → SpreadJS
 * 2. 실시간 편집: SpreadJS → Liveblocks Storage → 모든 사용자
 * 3. 주기적 백업: Liveblocks Storage → SQLite (30초마다)
 */
export function CollaborativeSpreadsheet({
  currentWorkbookId,
  currentWorksheetId,
  initDesigner,
}) {
  const room = useRoom();
  const liveCells = useStorage((root) => root.cells);
  const [isInitialized, setIsInitialized] = useState(false);
  const [spreadInstance, setSpreadInstance] = useState(null);
  const backupTimerRef = useRef(null);
  const isLoadingRef = useRef(false);

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
        console.log('Storage is empty, loading from SQLite...');
        await loadCellsToStorage();
      } else {
        console.log(`Storage already has ${liveCells?.size || 0} cells, skipping DB load`);
      }

      // 2단계: Liveblocks Storage에서 SpreadJS로 적용
      // Note: 초기 로드는 생략 (useEffect에서 처리)
      console.log('📊 Step 2: Will apply cells via useEffect when liveCells updates');

      // 3단계: 실시간 동기화 설정
      console.log('⚡ Step 3: Setting up real-time sync...');

      // 셀 변경 이벤트 → Liveblocks Storage 업데이트
      spread.bind(GC.Spread.Sheets.Events.CellChanged, (e, args) => {
        const { sheet, row, col } = args;
        const value = sheet.getValue(row, col);
        const formula = sheet.getFormula(row, col);

        console.log(`✏️ Cell changed: (${row}, ${col}) = ${value}`);

        // Liveblocks Storage 업데이트 (자동으로 다른 사용자들에게 전파됨)
        updateCell(row, col, value, formula);
      });

      // 4단계: 주기적 SQLite 백업 설정 (30초마다)
      console.log('💾 Step 4: Setting up periodic backup...');
      if (liveCells) {
        backupTimerRef.current = setupPeriodicBackup(
          liveCells,
          currentWorksheetId,
          30000 // 30초
        );
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
        clearInterval(backupTimerRef.current);
        console.log('⏹️ Periodic backup stopped');
      }

      // 최종 백업
      if (liveCells && currentWorksheetId) {
        console.log('💾 Final backup before unmount...');
        import('../utils/liveblocksSync').then(({ backupCellsToDatabase }) => {
          backupCellsToDatabase(liveCells, currentWorksheetId);
        });
      }
    };
  }, [liveCells, currentWorksheetId]);

  return (
    <Designer
      styleInfo={{ width: "1500px", height: "90vh" }}
      designerInitialized={handleDesignerInitialized}
    />
  );
}
