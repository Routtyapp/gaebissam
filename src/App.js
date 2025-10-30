import "./App.css";
import { useState, useRef, useEffect } from "react";

// SpreadJS Core - 반드시 먼저 import
import * as GC from "@mescius/spread-sheets";
import "@mescius/spread-sheets/styles/gc.spread.sheets.excel2013white.css";

// SpreadJS IO - Designer보다 먼저 import (중요!)
import "@mescius/spread-sheets-io";

// SpreadJS Designer - IO 다음에 import
import "@mescius/spread-sheets-designer-resources-ko";
import { Designer } from "@mescius/spread-sheets-designer-react";
import "@mescius/spread-sheets-designer/styles/gc.spread.sheets.designer.min.css";

// SpreadJS React Components
import { SpreadSheets, Worksheet } from "@mescius/spread-sheets-react";

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

// API & Utils
import { saveCell, saveWorkbook, loadWorkbook, getWorkbook, getWorksheets, createWorksheet } from "./api/spreadsheetApi";
import { getWorkbookRoomId } from "./utils/roomUtils";

function App() {
  const [spreadInstance, setSpreadInstance] = useState(null);
  const [showNewTab, setShowNewTab] = useState(true);
  const [tabEditable, setTabEditable] = useState(true);
  const [tabStripVisible, setTabStripVisible] = useState(true);
  const [tabNavigationVisible, setTabNavigationVisible] = useState(true);
  const [allSheetsButtonVisible, setAllSheetsButtonVisible] = useState(2);
  const [tabStripPosition, setTabStripPosition] = useState(0);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [changeSheetName, setChangeSheetName] = useState("Sheet1");
  const [currentWorksheetId, setCurrentWorksheetId] = useState(1); // 임시 워크시트 ID
  const [currentWorkbookId, setCurrentWorkbookId] = useState(1); // 현재 워크북 ID (기본값: 1)
  const [currentWorkbook, setCurrentWorkbook] = useState(null); // 현재 워크북 전체 데이터

  // 협업 모드 상태 관리
  const [isCollaborative, setIsCollaborative] = useState(() => {
    // localStorage에서 이전 설정 불러오기
    return localStorage.getItem('collaboration-mode') === 'true';
  });
  const [roomId, setRoomId] = useState(null); // 워크북의 room_id를 사용

  // 옛날 localStorage 데이터 정리 (마이그레이션)
  useEffect(() => {
    localStorage.removeItem('last-room-id'); // 더 이상 사용 안함
  }, []);

  const sheetTabColorRef = useRef(null);
  const startSheetIndexRef = useRef(null);
  const tabStripRatioRef = useRef(null);
  const tabStripWidthRef = useRef(null);
  const activeSheetIndexRef = useRef(null);
  const changeSheetIndexTargetRef = useRef(null);
  const fileInputRef = useRef(null);
  const exportFileNameRef = useRef(null);

  let hostStyle = {
    width: "100%",
    height: "100vh",
    border: "1px solid darkgray",
  };

  // Designer 초기화 함수
  let initDesigner = function (designer) {
    // Designer에서 Spread 인스턴스 가져오기
    const spread = designer.getWorkbook();
    setSpreadInstance(spread);

    console.log("Designer 초기화 완료");

    // 활성 시트 변경 이벤트 리스너 추가
    spread.bind(GC.Spread.Sheets.Events.ActiveSheetChanged, function (e, args) {
      const currentIndex = spread.getActiveSheetIndex();
      setActiveSheetIndex(currentIndex);
      setChangeSheetName(spread.getActiveSheet().name());
    });

    // 셀 값 변경 이벤트 리스너는 CollaborativeSpreadsheet 컴포넌트에서 처리됨
    // (중복 호출 방지를 위해 여기서는 제거)
  };

  // 이전 SpreadSheets 컴포넌트용 초기화 함수 (주석 처리)
  let initSpread = function (spread) {
    setSpreadInstance(spread);

    // 활성 시트 변경 이벤트 리스너 추가
    spread.bind(GC.Spread.Sheets.Events.ActiveSheetChanged, function (e, args) {
      const currentIndex = spread.getActiveSheetIndex();
      setActiveSheetIndex(currentIndex);
      setChangeSheetName(spread.getActiveSheet().name());
    });

    // 셀 값 변경 이벤트 리스너는 CollaborativeSpreadsheet 컴포넌트에서 처리됨
    // (중복 호출 방지를 위해 여기서는 제거)

    let sheet = spread.getActiveSheet();

    // 값 설정하기 - Text
    sheet.setValue(1, 1, "값 설정하기");

    // 값 설정하기 - Number : B3에 "Number" 라는 텍스트를, C3에 23이라는 숫자를 삽입합니다.
    sheet.setValue(2, 1, "Number");
    sheet.setValue(2, 2, 23);
    sheet.setValue(3, 1, "Text");
    sheet.setValue(3, 2, "SpreadJS");
    sheet.setValue(4, 1, "Datetime");

    // 값 설정하기 - DateTime : B5에 "Datetime" 이라는 텍스트를, C5에 오늘 날짜를 삽입합니다.
    sheet.getCell(4, 2).value(new Date()).formatter("yyyy-mm-dd");

    // 스타일 설정하기
    // B열, C열의 너비를 200으로 설정합니다.
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 200);

    // B2:C2의 배경색과 글자색을 설정합니다.
    sheet
      .getRange(1, 1, 1, 2)
      .backColor("rgb(130, 188, 0)")
      .foreColor("rgb(255, 255, 255)");

    // B4:C4의 배경색을 설정합니다.
    sheet.getRange(3, 1, 1, 2).backColor("rgb(211, 211, 211)");

    // B2:C2의 셀을 병합합니다.
    sheet.addSpan(1, 1, 1, 2);

    // 각 범위에 테두리를 설정합니다.
    sheet
      .getRange(1, 1, 4, 2)
      .setBorder(
        new GC.Spread.Sheets.LineBorder(
          "Black",
          GC.Spread.Sheets.LineStyle.thin
        ),
        {
          all: true,
        }
      );
    sheet
      .getRange(1, 1, 4, 2)
      .setBorder(
        new GC.Spread.Sheets.LineBorder(
          "Black",
          GC.Spread.Sheets.LineStyle.dotted
        ),
        {
          inside: true,
        }
      );

    // B2:C2의 병합된 셀에 수평 가운데 정렬을 설정합니다.
    sheet.getRange(1, 1, 1, 2).hAlign(GC.Spread.Sheets.HorizontalAlign.center);

    // 데이터 바인딩
    var person = {
      name: "Peter Winston",
      age: 25,
      gender: "Male",
      address: { postcode: "10001" },
    };
    var source = new GC.Spread.Sheets.Bindings.CellBindingSource(person);

    // 데이터 바인딩 레이블 및 바인딩 경로 설정
    sheet.setValue(7, 1, "이름:");
    sheet.setBindingPath(7, 2, "name");

    sheet.setValue(8, 1, "나이:");
    sheet.setBindingPath(8, 2, "age");

    sheet.setValue(9, 1, "성별:");
    sheet.setBindingPath(9, 2, "gender");

    sheet.setValue(10, 1, "우편번호:");
    sheet.setBindingPath(10, 2, "address.postcode");

    sheet.setDataSource(source);
  };

  // 탭 스트립 옵션 변경 핸들러
  const handleNewTabChange = (e) => {
    const checked = e.target.checked;
    setShowNewTab(checked);
    if (spreadInstance) {
      spreadInstance.options.newTabVisible = checked;
    }
  };

  const handleTabEditableChange = (e) => {
    const checked = e.target.checked;
    setTabEditable(checked);
    if (spreadInstance) {
      spreadInstance.options.tabEditable = checked;
    }
  };

  const handleTabStripVisibleChange = (e) => {
    const checked = e.target.checked;
    setTabStripVisible(checked);
    if (spreadInstance) {
      spreadInstance.options.tabStripVisible = checked;
    }
  };

  const handleTabNavigationVisibleChange = (e) => {
    const checked = e.target.checked;
    setTabNavigationVisible(checked);
    if (spreadInstance) {
      spreadInstance.options.tabNavigationVisible = checked;
    }
  };

  const handleAllSheetsButtonVisibleChange = (e) => {
    const value = Number(e.target.value);
    setAllSheetsButtonVisible(value);
    if (spreadInstance) {
      spreadInstance.options.allSheetsListVisible = value;
    }
  };

  const handleTabStripPositionChange = (e) => {
    const value = Number(e.target.value);
    setTabStripPosition(value);
    if (spreadInstance) {
      spreadInstance.options.tabStripPosition = value;
    }
  };

  const handleSetSheetTabColor = () => {
    if (spreadInstance && sheetTabColorRef.current) {
      const sheet = spreadInstance.getActiveSheet();
      if (sheet) {
        const color = sheetTabColorRef.current.value;
        sheet.options.sheetTabColor = color;
      }
    }
  };

  const handleSetStartSheetIndex = () => {
    if (spreadInstance && startSheetIndexRef.current) {
      const index = parseInt(startSheetIndexRef.current.value);
      if (
        !isNaN(index) &&
        index >= 0 &&
        index < spreadInstance.getSheetCount()
      ) {
        spreadInstance.startSheetIndex(index);
      }
    }
  };

  const handleSetTabStripRatio = () => {
    if (spreadInstance && tabStripRatioRef.current) {
      const ratio = parseFloat(tabStripRatioRef.current.value);
      if (!isNaN(ratio)) {
        spreadInstance.options.tabStripRatio = ratio;
      }
    }
  };

  const handleSetTabStripWidth = () => {
    if (spreadInstance && tabStripWidthRef.current) {
      const width = parseInt(tabStripWidthRef.current.value);
      if (!isNaN(width)) {
        spreadInstance.options.tabStripWidth = width;
      }
    }
  };

  // 워크시트 관리 핸들러
  const handleAddSheet = () => {
    if (spreadInstance) {
      const activeIndex = spreadInstance.getActiveSheetIndex();
      if (activeIndex >= 0) {
        spreadInstance.addSheet(activeIndex + 1);
        spreadInstance.setActiveSheetIndex(activeIndex + 1);
      } else {
        spreadInstance.addSheet(0);
        spreadInstance.setActiveSheetIndex(0);
      }
    }
  };

  const handleRemoveSheet = () => {
    if (spreadInstance) {
      const activeIndex = spreadInstance.getActiveSheetIndex();
      if (activeIndex >= 0 && spreadInstance.getSheetCount() > 1) {
        spreadInstance.removeSheet(activeIndex);
        const newIndex = Math.min(
          activeIndex,
          spreadInstance.getSheetCount() - 1
        );
        spreadInstance.setActiveSheetIndex(newIndex);
      }
    }
  };

  const handleClearSheets = () => {
    if (spreadInstance) {
      spreadInstance.clearSheets();
      // 기본 시트 하나 추가
      spreadInstance.addSheet(0);
    }
  };

  const handleSetActiveSheetIndex = () => {
    if (spreadInstance && activeSheetIndexRef.current) {
      const index = parseInt(activeSheetIndexRef.current.value);
      if (
        !isNaN(index) &&
        index >= 0 &&
        index < spreadInstance.getSheetCount()
      ) {
        spreadInstance.setActiveSheetIndex(index);
      }
    }
  };

  const handleChangeSheetIndex = () => {
    if (spreadInstance && changeSheetIndexTargetRef.current) {
      const sheetName = changeSheetName;
      const targetIndex = parseInt(changeSheetIndexTargetRef.current.value);
      if (
        !isNaN(targetIndex) &&
        targetIndex >= 0 &&
        targetIndex <= spreadInstance.getSheetCount()
      ) {
        spreadInstance.changeSheetIndex(sheetName, targetIndex);
      }
    }
  };

  // 파일 입출력 핸들러
  const handleFileOpen = (e) => {
    if (spreadInstance && e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name;
      const fileExt = fileName
        .substring(fileName.lastIndexOf(".") + 1)
        .toLowerCase();

      if (fileExt === "sjs") {
        // SJS 파일 열기
        spreadInstance.open(
          file,
          () => console.log("파일 열기 성공"),
          (error) => console.error("파일 열기 오류:", error)
        );
      } else {
        // Excel, CSV, SSJson 가져오기
        let fileType = GC.Spread.Sheets.FileType.excel;
        const options = {};

        if (fileExt === "csv") {
          fileType = GC.Spread.Sheets.FileType.csv;
        } else if (fileExt === "ssjson" || fileExt === "json") {
          fileType = GC.Spread.Sheets.FileType.ssjson;
        } else {
          // Excel 파일
          if (fileExt === "xlsm") {
            options.excelFileType = "XLSM";
          } else if (fileExt === "xltm") {
            options.excelFileType = "XLTM";
          } else {
            options.excelFileType = "XLSX";
          }
        }

        options.fileType = fileType;

        spreadInstance.import(
          file,
          () => console.log("파일 가져오기 성공"),
          (error) => console.error("파일 가져오기 오류:", error),
          options
        );
      }

      // 파일 입력 초기화
      e.target.value = "";
    }
  };

  const handleFileSave = (fileType) => {
    if (!spreadInstance) return;

    const fileName = exportFileNameRef.current?.value || "spreadsheet";

    if (fileType === "sjs") {
      // SJS 파일 저장
      spreadInstance.save(
        (blob) => {
          saveFile(blob, `${fileName}.sjs`);
        },
        (error) => console.error("SJS 저장 오류:", error),
        {
          includeBindingSource: true,
          includeStyles: true,
          includeFormulas: true,
        }
      );
    } else {
      // Excel, CSV, SSJson 내보내기
      const options = {};

      if (fileType === "xlsx") {
        options.fileType = GC.Spread.Sheets.FileType.excel;
        options.excelFileType = "XLSX";
        options.includeBindingSource = true;
      } else if (fileType === "csv") {
        options.fileType = GC.Spread.Sheets.FileType.csv;
      } else if (fileType === "ssjson") {
        options.fileType = GC.Spread.Sheets.FileType.ssjson;
      }

      spreadInstance.export(
        (blob) => {
          saveFile(blob, `${fileName}.${fileType}`);
        },
        (error) => console.error("내보내기 오류:", error),
        options
      );
    }
  };

  const saveFile = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 데이터베이스에 워크북 저장
  const handleSaveToDatabase = async () => {
    if (!spreadInstance) return;

    const workbookName = exportFileNameRef.current?.value || "My Workbook";
    const result = await saveWorkbook(spreadInstance, workbookName);

    if (result.success) {
      alert(result.message);
    } else {
      alert("저장 실패: " + result.error);
    }
  };

  // 데이터베이스에서 워크북 로드
  const handleLoadFromDatabase = async () => {
    if (!spreadInstance) return;

    const workbookId = prompt("로드할 워크북 ID를 입력하세요:");
    if (!workbookId) return;

    const result = await loadWorkbook(spreadInstance, parseInt(workbookId));

    if (result.success) {
      alert(result.message);
    } else {
      alert("로드 실패: " + result.error);
    }
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
  }, [currentWorkbookId]);

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
