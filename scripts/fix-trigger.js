/**
 * Fix the auto_add_user_role trigger in the live database.
 * The trigger must never crash — if it does, Supabase Auth can't create users.
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnvFile() {
  const rootDir = path.join(__dirname, '..')
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.join(rootDir, envFile)
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^=:#]+)=(.*)$/)
          if (match) {
            let value = (match[2] || '').trim()
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
              value = value.slice(1, -1)
            process.env[match[1].trim()] = value
          }
        }
      })
      break
    }
  }
}
loadEnvFile()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TRIGGER_SQL = `
CREATE OR REPLACE FUNCTION auto_add_user_role()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT := 'admin';
  user_email TEXT;
BEGIN
  user_email := COALESCE(NEW.email, '');

  IF user_email = '' THEN
    RETURN NEW;
  END IF;

  IF user_email = 'mufeed.rahman@legendholding.com' OR user_email = 'sonam.lama@legendholding.com' THEN
    user_role := 'super_admin';
  END IF;

  INSERT INTO public.user_roles (user_id, email, role, permissions, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email,
    user_role,
    CASE
      WHEN user_role = 'super_admin' THEN
        '{"dashboard":true,"submissions":true,"news":true,"jobs":true,"applications":true,"newsletters":true,"settings":true,"customer_care":true,"management_profiles":true,"team_members":true}'::jsonb
      ELSE
        '{"dashboard":true,"submissions":false,"news":false,"jobs":true,"applications":true,"newsletters":false,"settings":false,"customer_care":false,"management_profiles":false,"team_members":false}'::jsonb
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, email) DO UPDATE SET
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'auto_add_user_role failed for %: %', user_email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

async function run() {
  console.log('Updating auto_add_user_role trigger function...\n')

  const { error } = await supabase.rpc('exec_sql', { sql: TRIGGER_SQL })

  if (error) {
    // rpc exec_sql may not exist — try raw SQL via postgrest
    console.log('rpc exec_sql not available, trying direct SQL...')
    // Use the Supabase Management API or just run via psql
    // For now, let's try via the SQL editor workaround
    const { error: err2 } = await supabase.from('_sqlexec').select('*').limit(0)
    console.error('Cannot run raw SQL from JS client. Run this SQL in Supabase Dashboard > SQL Editor:\n')
    console.log(TRIGGER_SQL)
    console.log('\nOr alternatively, we can bypass the trigger entirely in the API.')
    return
  }

  console.log('Trigger function updated successfully!')
}

run()
