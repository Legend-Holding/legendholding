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

async function run() {
  // Check current state
  const { data, error } = await supabase.from('user_roles').select('*').eq('email', 'admin@legendholding.com').single()
  if (error) { console.error('Not found:', error.message); process.exit(1) }
  console.log('Current permissions:', JSON.stringify(data.permissions, null, 2))

  // Fix: only management_profiles should be true
  const correctPermissions = {
    dashboard: false,
    submissions: false,
    news: false,
    jobs: false,
    applications: false,
    newsletters: false,
    settings: false,
    customer_care: false,
    management_profiles: true,
    team_members: false
  }

  const { error: updateErr } = await supabase.from('user_roles').update({
    permissions: correctPermissions,
    updated_at: new Date().toISOString()
  }).eq('user_id', data.user_id)

  if (updateErr) { console.error('Update error:', updateErr.message); process.exit(1) }
  console.log('\nFixed! New permissions:', JSON.stringify(correctPermissions, null, 2))
}
run()
