import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(process.env.DATABASE_URL);

async function main() {
  console.log('🗑️  Dropping all tables and types...');

  try {
    // 既存のテーブルを削除（依存関係の順序で）
    await client`DROP TABLE IF EXISTS enrollments CASCADE`;
    await client`DROP TABLE IF EXISTS subject_instructors CASCADE`;
    await client`DROP TABLE IF EXISTS subjects CASCADE`;
    await client`DROP TABLE IF EXISTS students CASCADE`;
    await client`DROP TABLE IF EXISTS groups CASCADE`;
    await client`DROP TABLE IF EXISTS users CASCADE`;
    await client`DROP TABLE IF EXISTS teachers CASCADE`;
    
    // ENUMタイプを削除
    await client`DROP TYPE IF EXISTS user_role CASCADE`;
    await client`DROP TYPE IF EXISTS subject_category CASCADE`;
    await client`DROP TYPE IF EXISTS class_type CASCADE`;
    
    console.log('✅ Database reset successfully');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();