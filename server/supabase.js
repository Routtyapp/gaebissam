const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials are missing. Please check your .env file.');
  throw new Error('Missing Supabase credentials');
}

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // 서버 사이드에서는 세션 저장 안함
    autoRefreshToken: false,
  },
});

console.log('✅ Supabase client initialized successfully');

module.exports = supabase;
