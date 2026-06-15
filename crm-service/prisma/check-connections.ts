import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT pid, usename, client_addr, client_port, backend_start, query, application_name
    FROM pg_stat_activity
    WHERE datname = 'smartreach_db';
  `);
  console.log('--- PG STAT ACTIVITY ---');
  console.log(JSON.stringify(result, null, 2));
  console.log('------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
