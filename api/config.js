// Vercel 서버리스 함수: 클라이언트가 필요로 하는 공개 설정값을 환경변수에서 읽어 내려준다.
// 여기서 내려주는 값들은 원래 비밀값이 아니다 (Supabase anon key는 RLS로 보호되고,
// GA 측정 ID는 어차피 모든 GA 이벤트 요청에 그대로 노출된다). 그럼에도 코드에 하드코딩하지 않고
// Vercel 환경변수로 관리하면 리포에 값이 커밋되지 않고, 프로젝트별로 값을 바꿔 재사용하기 쉬워진다.
//
// 필요한 환경변수 (Vercel 프로젝트 설정 > Environment Variables):
//   SUPABASE_URL         - Supabase Project Settings > API > Project URL
//   SUPABASE_ANON_KEY     - Supabase Project Settings > API > anon public key
//   GA_MEASUREMENT_ID     - GA4 속성의 측정 ID (G-XXXXXXXXXX)

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    gaMeasurementId: process.env.GA_MEASUREMENT_ID || ''
  });
};
