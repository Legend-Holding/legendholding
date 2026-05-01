/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

const DUPLICATE_SLUGS = new Set([
  "kai-zheng",
  "mira-wu",
  "cannon-wang",
  "jonathan-stretton",
  "nagaraj-ponnada",
  "rejeesh-raveendran",
  "waseem-khalayleh",
])

function getArg(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

async function main() {
  const reportArg = getArg("--report")
  const reportPath = path.resolve(
    process.cwd(),
    reportArg || "reports/management-profiles-import-2026-04-23T11-01-34-064Z.json"
  )
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Import report not found: ${reportPath}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"))
  const prepared = Array.isArray(report.prepared) ? report.prepared : []
  const sourceRows = prepared.filter((row) => DUPLICATE_SLUGS.has(String(row.slug)))
  if (!sourceRows.length) {
    throw new Error("No matching imported rows found in report for duplicate set")
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: maxOrderRow } = await supabase
    .from("management_profiles")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  let nextSort = (maxOrderRow && Number(maxOrderRow.sort_order)) || 0

  // Look up the original imported photo from the latest vcard-image-sync
  // report so each imported duplicate keeps its own image (not the featured
  // profile's image).
  const reportsDir = path.resolve(process.cwd(), "reports")
  const syncReports = fs.existsSync(reportsDir)
    ? fs
        .readdirSync(reportsDir)
        .filter((f) => f.startsWith("vcard-image-sync-") && f.endsWith(".json"))
        .sort()
    : []
  const latestSyncReport = syncReports.length
    ? path.join(reportsDir, syncReports[syncReports.length - 1])
    : null
  const importedPhotoBySlug = new Map()
  if (latestSyncReport) {
    try {
      const syncData = JSON.parse(fs.readFileSync(latestSyncReport, "utf8"))
      const matched = Array.isArray(syncData.matched) ? syncData.matched : []
      for (const m of matched) {
        if (m.slug && m.photo) importedPhotoBySlug.set(m.slug, m.photo)
      }
      console.log(
        `[add-imported-duplicates] loaded photo map from ${path.basename(latestSyncReport)} (${importedPhotoBySlug.size} entries)`
      )
    } catch (err) {
      console.warn(
        `[add-imported-duplicates] could not load sync report: ${err.message || err}`
      )
    }
  }

  for (const row of sourceRows) {
    const duplicateSlug = `${row.slug}-imported`
    nextSort += 1
    const payload = {
      slug: duplicateSlug,
      legacy_slug: null,
      name: row.name,
      designation: row.designation,
      company: row.company,
      photo: importedPhotoBySlug.get(row.slug) || row.photo,
      email: row.email,
      whatsapp: row.whatsapp,
      linkedin: row.linkedin || "",
      website: row.website || "",
      location: row.location || "",
      sort_order: nextSort,
      source: "imported",
    }

    const { error } = await supabase
      .from("management_profiles")
      .upsert(payload, { onConflict: "slug" })
    if (error) {
      throw new Error(`Failed ${duplicateSlug}: ${error.message}`)
    }
    console.log(`[add-imported-duplicates] upserted ${duplicateSlug}`)
  }

  console.log("[add-imported-duplicates] done")
}

main().catch((err) => {
  console.error("[add-imported-duplicates] failed:", err.message || err)
  process.exit(1)
})
