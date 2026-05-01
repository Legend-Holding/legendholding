/* eslint-disable no-console */
const { createClient } = require("@supabase/supabase-js")

const FEATURED_NEW_SLUGS = new Set([
  "kai-zheng",
  "mira-wu",
  "cannon-wang",
  "jonathan-stretton",
  "nagaraj-ponnada",
  "rejeesh-raveendran",
  "waseem-khalayleh",
])

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase
    .from("management_profiles")
    .select("id, slug, name, source")

  if (error) throw new Error(`Failed to load profiles: ${error.message}`)

  const newSlugs = []
  const importedSlugs = []

  for (const row of data ?? []) {
    if (FEATURED_NEW_SLUGS.has(row.slug)) {
      if (row.source !== "new") newSlugs.push(row)
    } else if (row.source !== "imported") {
      importedSlugs.push(row)
    }
  }

  console.log(`Total profiles: ${data?.length ?? 0}`)
  console.log(`Will mark as 'new': ${newSlugs.length}`)
  console.log(`Will mark as 'imported': ${importedSlugs.length}`)

  if (newSlugs.length > 0) {
    const ids = newSlugs.map((r) => r.id)
    const { error: updateError } = await supabase
      .from("management_profiles")
      .update({ source: "new" })
      .in("id", ids)
    if (updateError) throw new Error(`Failed to mark new: ${updateError.message}`)
    newSlugs.forEach((r) => console.log(`  new      <- ${r.slug} (${r.name})`))
  }

  if (importedSlugs.length > 0) {
    const ids = importedSlugs.map((r) => r.id)
    const { error: updateError } = await supabase
      .from("management_profiles")
      .update({ source: "imported" })
      .in("id", ids)
    if (updateError) throw new Error(`Failed to mark imported: ${updateError.message}`)
    console.log(`  imported <- ${importedSlugs.length} rows`)
  }

  console.log("[classify-management-profiles-source] Done.")
}

main().catch((err) => {
  console.error("[classify-management-profiles-source] Failed:", err)
  process.exit(1)
})
