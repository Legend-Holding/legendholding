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

const emails = process.argv.slice(2).map(e => e.trim().toLowerCase())
if (!emails.length) { console.error('Usage: node scripts/remove-users-batch.js email1 email2 ...'); process.exit(1) }

async function run() {
  const { data: { users } } = await supabase.auth.admin.listUsers()
  for (const email of emails) {
    console.log(`\nRemoving: ${email}`)
    // Remove from user_roles by email
    const { error: roleErr } = await supabase.from('user_roles').delete().eq('email', email)
    console.log(roleErr ? `  user_roles error: ${roleErr.message}` : '  Removed from user_roles.')
    // Remove from auth if found
    const authUser = users?.find(u => u.email?.toLowerCase() === email)
    if (authUser) {
      const { error: authErr } = await supabase.auth.admin.deleteUser(authUser.id)
      console.log(authErr ? `  auth error: ${authErr.message}` : '  Deleted from Supabase Auth.')
    } else {
      console.log('  Not found in Supabase Auth (already gone).')
    }
  }
  console.log('\nDone.')
}
run()
