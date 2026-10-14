const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@192.168.107.58:5432/aaas_enterprise';
const pool = new Pool({ connectionString });

async function main() {
  console.log('Connecting to PostgreSQL to setup non-superuser app role...');
  
  // 1. Create shopmate_app non-superuser role
  await pool.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'shopmate_app') THEN 
        CREATE ROLE shopmate_app WITH LOGIN PASSWORD 'shopmate_secure_app_pwd_2026'; 
      END IF; 
    END $$;
  `);
  
  // 2. Grant permissions
  await pool.query(`
    GRANT CONNECT ON DATABASE aaas_enterprise TO shopmate_app;
    GRANT USAGE, CREATE ON SCHEMA public TO shopmate_app;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shopmate_app;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shopmate_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO shopmate_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO shopmate_app;
  `);

  console.log('Successfully configured shopmate_app non-superuser role and grants.');

  // Verify connection as shopmate_app
  const appPool = new Pool({
    connectionString: connectionString.replace('postgres:postgres', 'shopmate_app:shopmate_secure_app_pwd_2026')
  });

  const res = await appPool.query('SELECT current_user, session_user;');
  console.log('Verified connection as non-superuser:', res.rows[0]);

  await appPool.end();
  await pool.end();
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
