import dotenv from 'dotenv';
import prisma from '../src/lib/prisma.js';
import { hashPassword } from '../src/utils/password.js';
import { Role } from '../generated/prisma/index.js';

dotenv.config();

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!@#';
const ADMIN_NAME = 'System Administrator';

async function createOrUpdateAdmin() {
  try {
    console.log('🔍 Checking for existing admin user...');

    // Check if admin user exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    const hashedPassword = await hashPassword(ADMIN_PASSWORD);

    if (existingAdmin) {
      console.log('📝 Admin user exists. Updating...');

      // Update existing admin
      const updatedAdmin = await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          password: hashedPassword,
          roles: [Role.ADMIN],
          fullName: ADMIN_NAME,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          roles: true,
        },
      });

      console.log('✅ Admin user updated successfully:');
      console.log(`   ID: ${updatedAdmin.id}`);
      console.log(`   Email: ${updatedAdmin.email}`);
      console.log(`   Name: ${updatedAdmin.fullName}`);
      console.log(`   Roles: ${updatedAdmin.roles.join(', ')}`);
    } else {
      console.log('➕ Creating new admin user...');

      // Create new admin
      const newAdmin = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          fullName: ADMIN_NAME,
          roles: [Role.ADMIN],
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          roles: true,
        },
      });

      console.log('✅ Admin user created successfully:');
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Name: ${newAdmin.fullName}`);
      console.log(`   Roles: ${newAdmin.roles.join(', ')}`);
    }

    console.log('\n🔐 Login credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n💡 Set ADMIN_PASSWORD in .env to use a custom password\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating/updating admin user:', error);
    process.exit(1);
  }
}

createOrUpdateAdmin();
