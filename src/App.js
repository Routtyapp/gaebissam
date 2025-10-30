import "./App.css";
import { useState, useEffect } from "react";

// SpreadJS Core
import * as GC from "@mescius/spread-sheets";
import "@mescius/spread-sheets/styles/gc.spread.sheets.excel2013white.css";

// SpreadJS IO
import "@mescius/spread-sheets-io";

// SpreadJS Designer
import "@mescius/spread-sheets-designer-resources-ko";
import "@mescius/spread-sheets-designer/styles/gc.spread.sheets.designer.min.css";

// Liveblocks
import { RoomProvider } from "./liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveMap } from "@liveblocks/client";

// Custom Components
import { Room } from "./Room";
import { CollaborativeSpreadsheet } from "./components/CollaborativeSpreadsheet";
import { IndependentSpreadsheet } from "./components/IndependentSpreadsheet";
import { CollaborationControl } from "./components/CollaborationControl";
import { WorkbookSelector } from "./components/WorkbookSelector";

// API
import { getWorkbook, getWorksheets, createWorksheet } from "./api/spreadsheetApi";

function App() {
  const [spreadInstance, setSpreadInstance] = useState(null);
  const [changeSheetName, setChangeSheetName] = useState("Sheet1");
  const [currentWorksheetId, setCurrentWorksheetId] = useState(1);
  const [currentWorkbookId, setCurrentWorkbookId] = useState(1);
  const [currentWorkbook, setCurrentWorkbook] = useState(null);

  // 협업 모드 상태 관리
  const [isCollaborative, setIsCollaborative] = useState(() => {
    return localStorage.getItem('collaboration-mode') === 'true';
  });
  const [roomId, setRoomId] = useState(null);

  // 옛날 localStorage 데이터 정리
  useEffect(() => {
    localStorage.removeItem('last-room-id');
  }, []);

  // Designer 초기화 함수
  let initDesigner = function (designer) {
    // Designer에서 Spread 인스턴스 가져오기
    const spread = designer.getWorkbook();
    setSpreadInstance(spread);

    console.log("Designer 초기화 완료");

    // 활성 시트 변경 이벤트 리스너 추가
    spread.bind(GC.Spread.Sheets.Events.ActiveSheetChanged, function (e, args) {
      setChangeSheetName(spread.getActiveSheet().name());
    });

    // 셀 값 변경 이벤트 리스너는 CollaborativeSpreadsheet 컴포넌트에서 처리됨
  };


  // 협업 모드 제어 함수들
  const handleJoinRoom = (newRoomId) => {
    setRoomId(newRoomId);
    setIsCollaborative(true);

    // localStorage에 협업 모드 저장
    localStorage.setItem('collaboration-mode', 'true');

    console.log(`🌐 Joining collaborative room: ${newRoomId}`);
  };

  const handleLeaveRoom = () => {
    if (window.confirm('협업을 종료하시겠습니까? 데이터는 Supabase에 저장됩니다.')) {
      setIsCollaborative(false);
      setRoomId(null);

      // localStorage 업데이트
      localStorage.setItem('collaboration-mode', 'false');

      console.log('📝 Switched to independent mode');
    }
  };

  const handleToggleCollaboration = () => {
    if (isCollaborative) {
      handleLeaveRoom();
    } else {
      // 워크북의 room_id를 자동으로 사용
      if (currentWorkbook && currentWorkbook.room_id) {
        handleJoinRoom(currentWorkbook.room_id);
      } else {
        alert('워크북 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  // 워크북이 변경될 때마다 워크북 데이터 및 워크시트 로드
  useEffect(() => {
    const loadWorkbookData = async () => {
      try {
        console.log(`📥 Loading workbook ${currentWorkbookId}...`);
        const workbook = await getWorkbook(currentWorkbookId);
        setCurrentWorkbook(workbook);
        console.log(`✓ Workbook loaded: ${workbook.name} (room: ${workbook.room_id})`);

        // 워크시트 조회 또는 생성
        console.log(`📄 Loading worksheets for workbook ${currentWorkbookId}...`);
        let worksheets = await getWorksheets(currentWorkbookId);

        // 워크시트가 없으면 기본 워크시트 생성
        if (!worksheets || worksheets.length === 0) {
          console.log(`⚠️ No worksheets found, creating default worksheet...`);
          const newWorksheet = await createWorksheet(currentWorkbookId, 'Sheet1', 0);
          setCurrentWorksheetId(newWorksheet.id);
          console.log(`✓ Created worksheet: ${newWorksheet.name} (ID: ${newWorksheet.id})`);
        } else {
          // 첫 번째 워크시트를 현재 워크시트로 설정
          setCurrentWorksheetId(worksheets[0].id);
          console.log(`✓ Using worksheet: ${worksheets[0].name} (ID: ${worksheets[0].id})`);
        }

        // 협업 모드가 켜져있으면 자동으로 room_id 설정
        if (isCollaborative && workbook.room_id) {
          setRoomId(workbook.room_id);
        }
      } catch (error) {
        console.error('Failed to load workbook:', error);
      }
    };

    loadWorkbookData();
  }, [currentWorkbookId, isCollaborative]);

  // 워크북 선택 핸들러
  const handleSelectWorkbook = async (workbookId) => {
    if (workbookId === currentWorkbookId) {
      console.log('Same workbook, no change needed');
      return;
    }

    console.log(`📚 Switching workbook: ${currentWorkbookId} → ${workbookId}`);

    // 1. 협업 모드면 먼저 종료 (자동 백업됨)
    if (isCollaborative) {
      console.log('⚠️ 협업 모드를 먼저 종료합니다...');
      setIsCollaborative(false);
      setRoomId(null);
      localStorage.setItem('collaboration-mode', 'false');

      // 백업이 완료될 시간을 줌
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 2. 워크북 ID 변경
    setCurrentWorkbookId(workbookId);

    // 3. SpreadJS 초기화 (새 워크북의 데이터는 useEffect에서 로드됨)
    if (spreadInstance) {
      spreadInstance.clearSheets();
      spreadInstance.addSheet(0);
      console.log('✓ SpreadJS cleared for new workbook');
    }

    console.log(`✓ Switched to workbook ${workbookId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 상단 제어 패널 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px', backgroundColor: '#f0f0f0', borderBottom: '2px solid #ccc', gap: '20px' }}>
        {/* 워크북 선택기 */}
        <WorkbookSelector
          currentWorkbookId={currentWorkbookId}
          onSelectWorkbook={handleSelectWorkbook}
        />

        {/* 협업 모드 제어 */}
        <CollaborationControl
          isCollaborative={isCollaborative}
          currentRoomId={roomId}
          currentWorkbookName={currentWorkbook?.name}
          onToggleCollaboration={handleToggleCollaboration}
        />
      </div>

      {/* 협업 모드: Liveblocks 연결 */}
      {isCollaborative && roomId ? (
        <>
          {/* 디버그: 현재 연결된 Room ID 표시 */}
          {console.log(`🔗 Rendering RoomProvider with ID: ${roomId}`)}
          <RoomProvider
            id={roomId}
            initialPresence={{
              cursor: null,
              selectedCell: null,
            }}
            initialStorage={() => ({
              cells: new LiveMap(),
            })}
          >
          <ClientSideSuspense fallback={<div>Loading...</div>}>
            <Room workbookId={currentWorkbookId} />
            <CollaborativeSpreadsheet
              currentWorkbookId={currentWorkbookId}
              currentWorksheetId={currentWorksheetId}
              currentRoomId={roomId}
              initDesigner={initDesigner}
            />
          </ClientSideSuspense>
        </RoomProvider>
        </>
      ) : (
        /* 독립 모드: Liveblocks 없이 로컬만 */
        <IndependentSpreadsheet
          currentWorkbookId={currentWorkbookId}
          currentWorksheetId={currentWorksheetId}
          initDesigner={initDesigner}
        />
      )}
    </div>
  );
}

export default App;
