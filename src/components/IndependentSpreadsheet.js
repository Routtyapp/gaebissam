import React from 'react';
import { Designer } from "@mescius/spread-sheets-designer-react";

/**
 * 독립 모드 스프레드시트 컴포넌트
 * Liveblocks 없이 로컬에서만 작동
 * SQLite에만 데이터 저장
 */
export function IndependentSpreadsheet({
  currentWorkbookId,
  currentWorksheetId,
  initDesigner,
}) {
  const handleDesignerInitialized = (designer) => {
    console.log('📝 Independent mode initialized (no real-time collaboration)');

    // 기존 initDesigner 호출 (DB 저장 이벤트 등)
    if (initDesigner) {
      initDesigner(designer);
    }
  };

  return (
    <div>
      <Designer
        styleInfo={{ width: "1500px", height: "90vh" }}
        designerInitialized={handleDesignerInitialized}
      />
    </div>
  );
}
