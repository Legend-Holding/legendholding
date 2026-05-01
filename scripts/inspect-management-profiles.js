/* eslint-disable no-console */
const { createClient } = require("@supabase/supabase-js")

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error, count } = await supabase
    .from("management_profiles")
    .select("id, slug, name, legacy_slug, photo, sort_order", { count: "exact" })
    .order("sort_order", { ascending: true })

  if (error) throw new Error(error.message)

  const total = count ?? data?.length ?? 0
  const oldRows = (data ?? []).filter(
    (r) => r.legacy_slug !== null && r.legacy_slug !== ""
  )
  const newRows = (data ?? []).filter(
    (r) => r.legacy_slug === null || r.legacy_slug === ""
  )

  console.log(`Total: ${total}`)
  console.log(`New (legacy_slug NULL/empty): ${newRows.length}`)
  console.log(`Old (legacy_slug populated):  ${oldRows.length}`)

  console.log(`\n--- New profiles (first 30) ---`)
  newRows.slice(0, 30).forEach((r) => {
    console.log(
      `  ${String(r.sort_order).padStart(4)} | ${r.slug} | ${r.name} | legacy_slug=${JSON.stringify(r.legacy_slug)} | photo=${r.photo ? "ok" : "MISSING"}`
    )
  })

  console.log(`\n--- Old profiles (first 30) ---`)
  oldRows.slice(0, 30).forEach((r) => {
    console.log(
      `  ${String(r.sort_order).padStart(4)} | ${r.slug} | ${r.name} | legacy_slug=${JSON.stringify(r.legacy_slug)}`
    )
  })

  const photoIssues = (data ?? []).filter(
    (r) => !r.photo || !/^https?:\/\//i.test(r.photo)
  )
  console.log(`\n--- Photo issues (count=${photoIssues.length}) ---`)
  photoIssues.slice(0, 30).forEach((r) => {
    console.log(`  ${r.slug} (${r.name}) photo=${JSON.stringify(r.photo)}`)
  })
}

main().catch((err) => {
  console.error("[inspect] Failed:", err)
  process.exit(1)
})
