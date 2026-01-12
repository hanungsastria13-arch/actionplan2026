/**
 * Werkudara Group - Department User Seeding Script
 * 
 * This script creates login credentials for all 11 departments.
 * 
 * SETUP:
 * 1. Get your SERVICE_ROLE_KEY from Supabase Dashboard:
 *    - Go to: Settings > API > Project API keys
 *    - Copy the "service_role" key (NOT the anon key)
 *    - ⚠️ NEVER expose this key in frontend code!
 * 
 * 2. Create a .env file in the scripts folder or set environment variables:
 *    SUPABASE_URL=https://your-project.supabase.co
 *    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * 3. Run the script:
 *    cd action-plan-tracker/scripts
 *    node seedUsers.js
 * 
 * OUTPUT:
 * - 11 department head accounts created
 * - Email format: [dept_code]@werkudara.com
 * - Default password: Werkudara2025!
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('');
  console.error('Please set:');
  console.error('  SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('');
  console.error('You can find the SERVICE_ROLE_KEY in:');
  console.error('  Supabase Dashboard > Settings > API > Project API keys > service_role');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Department data
const DEPARTMENTS = [
  { code: 'BAS', name: 'Business & Administration Services' },
  { code: 'PD', name: 'Product Development' },
  { code: 'CFC', name: 'Corporate Finance Controller' },
  { code: 'SS', name: 'Strategic Sourcing' },
  { code: 'ACC', name: 'Accounting' },
  { code: 'HR', name: 'Human Resources' },
  { code: 'BID', name: 'Business & Innovation Development' },
  { code: 'TEP', name: 'Tour and Event Planning' },
  { code: 'GA', name: 'General Affairs' },
  { code: 'ACS', name: 'Art & Creative Support' },
  { code: 'SO', name: 'Sales Operation' },
];

const DEFAULT_PASSWORD = 'Werkudara2025!';

async function createDepartmentUser(dept) {
  const email = `${dept.code.toLowerCase()}@werkudara.com`;
  const fullName = `${dept.name} Head`;

  console.log(`\n📧 Processing: ${email}`);

  try {
    // Step 1: Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId;

    if (existingUser) {
      console.log(`   ⚠️  User already exists, updating profile...`);
      userId = existingUser.id;
    } else {
      // Step 2: Create new auth user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
          role: 'dept_head',
          department_code: dept.code,
        },
      });

      if (createError) {
        throw createError;
      }

      userId = newUser.user.id;
      console.log(`   ✅ Auth user created: ${userId}`);
    }

    // Step 3: Upsert profile (insert or update)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'dept_head',
        department_code: dept.code,
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      throw profileError;
    }

    console.log(`   ✅ Profile created/updated for ${dept.code}`);
    return { success: true, email, dept: dept.code };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, email, dept: dept.code, error: error.message };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Werkudara Group - Department User Seeding Script       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  console.log('');
  console.log('Creating 11 department head accounts...');

  const results = [];

  for (const dept of DEPARTMENTS) {
    const result = await createDepartmentUser(dept);
    results.push(result);
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successfully created/updated: ${successful.length} accounts`);
  
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length} accounts`);
    failed.forEach(f => console.log(`   - ${f.email}: ${f.error}`));
  }

  console.log('\n📋 Login Credentials:');
  console.log('─'.repeat(60));
  console.log('| Dept Code | Email                      | Password        |');
  console.log('─'.repeat(60));
  
  DEPARTMENTS.forEach(dept => {
    const email = `${dept.code.toLowerCase()}@werkudara.com`;
    console.log(`| ${dept.code.padEnd(9)} | ${email.padEnd(26)} | ${DEFAULT_PASSWORD} |`);
  });
  
  console.log('─'.repeat(60));
  console.log('\n🎉 Done! Users can now log in to the application.');
}

main().catch(console.error);
