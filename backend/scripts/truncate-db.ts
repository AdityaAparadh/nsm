import dotenv from 'dotenv';
import prisma from '../src/lib/prisma.js';

dotenv.config();

async function truncateAllTables() {
  try {
    console.log('⚠️  WARNING: This will delete ALL data from the database!');
    console.log('🗑️  Truncating all tables...\n');

    // Delete in reverse dependency order to respect foreign keys
    console.log('   Deleting certificates...');
    await prisma.certificate.deleteMany();

    console.log('   Deleting submissions...');
    await prisma.submission.deleteMany();

    console.log('   Deleting enrollments...');
    await prisma.enrollment.deleteMany();

    console.log('   Deleting assignments...');
    await prisma.assignment.deleteMany();

    console.log('   Deleting workshop instructors...');
    await prisma.workshopInstructor.deleteMany();

    console.log('   Deleting workshops...');
    await prisma.workshop.deleteMany();

    console.log('   Deleting users...');
    await prisma.user.deleteMany();

    console.log('\n✅ All data deleted successfully!');
    console.log('💡 Run "bun run create-admin" to create a new admin user\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting data:', error);
    process.exit(1);
  }
}

truncateAllTables();
