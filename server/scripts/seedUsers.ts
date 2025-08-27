// Script to seed demo users for testing
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, companies, memberships } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function seedDemoUsers() {
  console.log('Creating demo users...');
  
  try {
    // Hash passwords
    const adminPassword = await bcrypt.hash('ForhandlerPRO2025!', 10);
    const userPassword = await bcrypt.hash('test123', 10);
    
    // Create test company
    const existingCompany = await db.select().from(companies).where(eq(companies.name, 'Hansen Bil AS')).limit(1);
    
    let companyId: string;
    if (existingCompany.length === 0) {
      const [testCompany] = await db.insert(companies).values({
        name: 'Hansen Bil AS',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        maxUsers: 5,
        maxCars: 100,
        monthlyRevenue: 3990,
      }).returning();
      companyId = testCompany.id;
    } else {
      companyId = existingCompany[0].id;
    }
    
    // Create admin user
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@forhandlerpro.no')).limit(1);
    
    if (existingAdmin.length === 0) {
      const [adminUser] = await db.insert(users).values({
        email: 'admin@forhandlerpro.no',
        passwordHash: adminPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin'
      }).returning();
      
      console.log('Created admin user:', adminUser.email);
      
      // Create membership for admin
      await db.insert(memberships).values({
        userId: adminUser.id,
        companyId: companyId,
        role: 'admin',
      }).onConflictDoNothing();
    }
    
    // Create test user
    const existingUser = await db.select().from(users).where(eq(users.email, 'ole@hansenbil.no')).limit(1);
    
    if (existingUser.length === 0) {
      const [testUser] = await db.insert(users).values({
        email: 'ole@hansenbil.no',
        passwordHash: userPassword,
        firstName: 'Ole',
        lastName: 'Hansen',
        role: 'user'
      }).returning();
      
      console.log('Created test user:', testUser.email);
      
      // Create membership for test user
      await db.insert(memberships).values({
        userId: testUser.id,
        companyId: companyId,
        role: 'sales',
      }).onConflictDoNothing();
    }
    
    console.log('Demo users created successfully!');
    console.log('Login credentials:');
    console.log('Admin: admin@forhandlerpro.no / ForhandlerPRO2025!');
    console.log('User: ole@hansenbil.no / test123');
    
  } catch (error) {
    console.error('Error creating demo users:', error);
  }
  
  process.exit(0);
}

seedDemoUsers();