import * as GC from '@mescius/spread-sheets';

// SpreadJS 라이선스 설정
// .env 파일의 환경 변수에서 라이선스 키를 가져옵니다

// 디버깅: 환경 변수가 제대로 로드되었는지 확인
console.log('Environment Check:', {
  NODE_ENV: process.env.NODE_ENV,
  hasLicenseKey: !!process.env.REACT_APP_LICENSE_KEY,
  licenseKeyPrefix: process.env.REACT_APP_LICENSE_KEY?.substring(0, 20) + '...',
});

const licenseKey = process.env.REACT_APP_LICENSE_KEY;

if (!licenseKey) {
  console.error('❌ REACT_APP_LICENSE_KEY is not defined!');
  console.error('Please check your Vercel Environment Variables settings.');
  console.error('Make sure to:');
  console.error('1. Add REACT_APP_LICENSE_KEY in Vercel Dashboard');
  console.error('2. Select correct environments (Production, Preview, Development)');
  console.error('3. Redeploy your application after adding the variable');
} else {
  console.log('✅ License key loaded successfully');
  GC.Spread.Sheets.LicenseKey = licenseKey;
}

// Designer 라이선스가 필요한 경우 아래 주석을 해제하세요
// import '@mescius/spread-sheets-designer';
// const designerKey = process.env.REACT_APP_DESIGNER_KEY;
// if (designerKey) {
//   GC.Spread.Sheets.Designer.LicenseKey = designerKey;
// }
