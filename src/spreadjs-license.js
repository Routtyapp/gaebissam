import * as GC from '@mescius/spread-sheets';

// SpreadJS 라이선스 설정
// .env 파일의 환경 변수에서 라이선스 키를 가져옵니다
GC.Spread.Sheets.LicenseKey = process.env.REACT_APP_LICENSE_KEY;

// Designer 라이선스가 필요한 경우 아래 주석을 해제하세요
// import '@mescius/spread-sheets-designer';
// GC.Spread.Sheets.Designer.LicenseKey = process.env.REACT_APP_DESIGNER_KEY;
