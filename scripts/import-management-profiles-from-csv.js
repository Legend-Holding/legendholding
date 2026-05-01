/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")
const XLSX = require("xlsx")
const { createClient } = require("@supabase/supabase-js")

const PLACEHOLDER_PHOTO =
  "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770205703/5_ohvtkk.png"

function slugFromName(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizePhone(value) {
  const raw = normalizeWhitespace(value)
  if (!raw || raw.toLowerCase() === "n/a") return ""
  return raw.replace(/[^\d+]/g, "")
}

function normalizeWebsite(value) {
  const raw = normalizeWhitespace(value)
  if (!raw || raw.toLowerCase() === "n/a") return ""
  return raw
}

function normalizeEmail(value) {
  const raw = normalizeWhitespace(value)
  if (!raw || raw.toLowerCase() === "n/a") return ""
  return raw.toLowerCase()
}

function escapeCsv(value) {
  const s = String(value ?? "")
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

async function main() {
  const csvPathArg = getArg("--file")
  const csvPath = path.resolve(
    process.cwd(),
    csvPathArg || "data/outsystems/profiles-export.csv"
  )
  const isDryRun = hasFlag("--dry-run")

  if (!fs.existsSync(csvPath)) {
    console.error(`[profiles-import] CSV not found: ${csvPath}`)
    process.exit(1)
  }

  const workbook = XLSX.readFile(csvPath, { raw: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const sourceRows = XLSX.utils.sheet_to_json(sheet, { defval: "" })

  if (!sourceRows.length) {
    console.error("[profiles-import] No rows found in CSV")
    process.exit(1)
  }

  const outputDir = path.resolve(process.cwd(), "reports")
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const jsonPath = path.join(outputDir, `management-profiles-import-${timestamp}.json`)
  const csvPathOut = path.join(outputDir, `management-profiles-import-${timestamp}.csv`)

  const usedSlugs = new Set()
  const prepared = []
  const skipped = []

  sourceRows.forEach((row, index) => {
    const name = normalizeWhitespace(row.TITLE)
    const designation = normalizeWhitespace(row.POSITION)
    const company = normalizeWhitespace(row.COMPANYNAME) || "Legend Holding Group"
    const email = normalizeEmail(row.EMAIL)
    const whatsapp = normalizePhone(row.MOBILEPHONE)
    const website = normalizeWebsite(row.WEBSITE)
    const legacySlug = normalizeWhitespace(row.SLUG)
    const sourceId = normalizeWhitespace(row.ID)
    const sourceEmployeeCode = normalizeWhitespace(row.EMPLOYEECODE)

    if (!name || !designation) {
      skipped.push({
        row_number: index + 2,
        source_id: sourceId,
        name,
        designation,
        reason: "Missing required TITLE or POSITION",
      })
      return
    }

    let baseSlug = slugFromName(name)
    if (!baseSlug) {
      baseSlug = slugFromName(legacySlug || sourceEmployeeCode)
    }
    if (!baseSlug) {
      skipped.push({
        row_number: index + 2,
        source_id: sourceId,
        name,
        designation,
        reason: "Could not derive slug",
      })
      return
    }

    let slug = baseSlug
    let suffix = 2
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }
    usedSlugs.add(slug)

    prepared.push({
      slug,
      legacy_slug: legacySlug || null,
      name,
      designation,
      company,
      photo: PLACEHOLDER_PHOTO,
      email,
      whatsapp,
      linkedin: "",
      website,
      location: "",
      sort_order: prepared.length + 1,
      source: "imported",
      import_meta: {
        source_id: sourceId,
        source_employee_code: sourceEmployeeCode,
      },
    })
  })

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_file: csvPath,
        dry_run: isDryRun,
        summary: {
          source_total: sourceRows.length,
          prepared_total: prepared.length,
          skipped_total: skipped.length,
        },
        skipped,
        prepared,
      },
      null,
      2
    ),
    "utf8"
  )

  const header = [
    "row_type",
    "source_id",
    "source_employee_code",
    "legacy_slug",
    "slug",
    "name",
    "designation",
    "company",
    "email",
    "whatsapp",
    "website",
    "status_or_reason",
  ]

  const preparedLines = prepared.map((row) =>
    [
      "prepared",
      row.import_meta.source_id,
      row.import_meta.source_employee_code,
      row.legacy_slug ?? "",
      row.slug,
      row.name,
      row.designation,
      row.company,
      row.email,
      row.whatsapp,
      row.website,
      "ok",
    ]
      .map(escapeCsv)
      .join(",")
  )

  const skippedLines = skipped.map((row) =>
    [
      "skipped",
      row.source_id,
      "",
      "",
      "",
      row.name,
      row.designation,
      "",
      "",
      "",
      "",
      row.reason,
    ]
      .map(escapeCsv)
      .join(",")
  )

  fs.writeFileSync(
    csvPathOut,
    [header.join(","), ...preparedLines, ...skippedLines].join("\n"),
    "utf8"
  )

  console.log("[profiles-import] Source rows:", sourceRows.length)
  console.log("[profiles-import] Prepared rows:", prepared.length)
  console.log("[profiles-import] Skipped rows:", skipped.length)
  console.log("[profiles-import] JSON report:", jsonPath)
  console.log("[profiles-import] CSV report:", csvPathOut)

  if (isDryRun) {
    console.log("[profiles-import] Dry run enabled. No database write performed.")
    return
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[profiles-import] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const insertPayload = prepared.map(({ import_meta, ...rest }) => rest)
  const { error } = await supabase
    .from("management_profiles")
    .upsert(insertPayload, { onConflict: "slug" })

  if (error) {
    console.error("[profiles-import] Supabase upsert failed:", error.message)
    process.exit(1)
  }

  console.log("[profiles-import] Upsert successful.")
}

main().catch((err) => {
  console.error("[profiles-import] Failed:", err && err.message ? err.message : err)
  process.exit(1)
})
