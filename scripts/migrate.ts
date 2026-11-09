import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from '../lib/db';

async function runMigrate() {
  console.log('⏳ Menjalankan Drizzle migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Drizzle migrations berhasil diterapkan!');
  await sql.end();
}

runMigrate().catch((err) => {
  console.error('❌ Migration gagal:', err);
  process.exit(1);
});
