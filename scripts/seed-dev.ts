import { seedDatabaseIfEmpty } from '../src/lib/db/seed';

async function run() {
  console.log('Explicitly executing developer demo database seed...');
  await seedDatabaseIfEmpty(true);
  console.log('Database successfully seeded with demo accounts and catalog.');
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
