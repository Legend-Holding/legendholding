/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")
const cloudinary = require("cloudinary").v2
const { createClient } = require("@supabase/supabase-js")

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
}

function getScore(row, key) {
  if (!key) return 0
  const slugKey = normalize(row.slug)
  const legacyKey = normalize(row.legacy_slug)
  const nameKey = normalize(row.name)
  const firstToken = normalize(String(row.name || "").trim().split(/\s+/)[0] || "")
  const employeeCodeKey = normalize(
    row.import_meta && typeof row.import_meta === "object" ? row.import_meta.source_employee_code : ""
  )

  if (key === employeeCodeKey) return 100
  if (key === legacyKey) return 90
  if (key === slugKey) return 80
  if (key === nameKey) return 70
  if (key === firstToken) return 50
  return 0
}

function listImageFiles(imagesDir) {
  return fs
    .readdirSync(imagesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(jpg|jpeg|png)$/i.test(name))
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

async function main() {
  const isDryRun = hasFlag("--dry-run")
  const reportPathArg = getArg("--report")
  const imagesDirArg = getArg("--images-dir")
  const cloudinaryFolder = getArg("--folder") || "management-profiles"

  const reportPath = path.resolve(
    process.cwd(),
    reportPathArg || "reports/management-profiles-import-2026-04-23T11-01-34-064Z.json"
  )
  const imagesDir = path.resolve(process.cwd(), imagesDirArg || "public/vcard-images")

  if (!fs.existsSync(reportPath)) {
    console.error(`[vcard-image-sync] Import report not found: ${reportPath}`)
    process.exit(1)
  }
  if (!fs.existsSync(imagesDir)) {
    console.error(`[vcard-image-sync] Images directory not found: ${imagesDir}`)
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(reportPath, "utf8"))
  const rows = Array.isArray(raw.prepared) ? raw.prepared : []
  if (!rows.length) {
    console.error("[vcard-image-sync] No prepared rows found in import report")
    process.exit(1)
  }

  const imageFiles = listImageFiles(imagesDir)
  if (!imageFiles.length) {
    console.error("[vcard-image-sync] No image files found (.jpg/.jpeg/.png)")
    process.exit(1)
  }

  const matches = []
  const unmatchedFiles = []
  const ambiguousFiles = []

  for (const fileName of imageFiles) {
    const baseName = path.parse(fileName).name
    const key = normalize(baseName)
    const scored = rows
      .map((row) => ({ row, score: getScore(row, key) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)

    if (!scored.length) {
      unmatchedFiles.push(fileName)
      continue
    }

    const topScore = scored[0].score
    const topCandidates = scored.filter((entry) => entry.score === topScore)
    if (topCandidates.length === 1) {
      matches.push({
        fileName,
        filePath: path.join(imagesDir, fileName),
        profile: topCandidates[0].row,
        matchKey: key,
        score: topScore,
      })
      continue
    }
    if (topCandidates.length > 1) {
      ambiguousFiles.push({
        fileName,
        key,
        score: topScore,
        candidates: topCandidates.map((entry) => ({
          slug: entry.row.slug,
          name: entry.row.name,
          legacy_slug: entry.row.legacy_slug || "",
        })),
      })
      continue
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outputDir = path.resolve(process.cwd(), "reports")
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `vcard-image-sync-${timestamp}.json`)

  const summary = {
    profiles_total: rows.length,
    files_total: imageFiles.length,
    matched_files: matches.length,
    unmatched_files: unmatchedFiles.length,
    ambiguous_files: ambiguousFiles.length,
    dry_run: isDryRun,
  }

  if (isDryRun) {
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          report_source: reportPath,
          images_dir: imagesDir,
          summary,
          matched: matches.map((m) => ({
            file: m.fileName,
            slug: m.profile.slug,
            name: m.profile.name,
            legacy_slug: m.profile.legacy_slug || "",
          })),
          unmatched_files: unmatchedFiles,
          ambiguous_files: ambiguousFiles,
        },
        null,
        2
      ),
      "utf8"
    )
    console.log("[vcard-image-sync] Dry run summary:", summary)
    console.log("[vcard-image-sync] Report:", outputPath)
    return
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("[vcard-image-sync] Missing Cloudinary env vars")
    process.exit(1)
  }
  if (!supabaseUrl || !serviceKey) {
    console.error("[vcard-image-sync] Missing Supabase env vars")
    process.exit(1)
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const uploaded = []
  const failed = []

  for (const item of matches) {
    try {
      const publicId = `${cloudinaryFolder}/${item.profile.slug}`
      const uploadResult = await cloudinary.uploader.upload(item.filePath, {
        folder: cloudinaryFolder,
        public_id: item.profile.slug,
        overwrite: true,
        resource_type: "image",
      })

      const url = uploadResult.secure_url
      const { error } = await supabase
        .from("management_profiles")
        .update({ photo: url })
        .eq("slug", item.profile.slug)

      if (error) {
        throw new Error(`Supabase update failed for ${item.profile.slug}: ${error.message}`)
      }

      uploaded.push({
        file: item.fileName,
        slug: item.profile.slug,
        name: item.profile.name,
        public_id: publicId,
        photo: url,
      })
      console.log(`[vcard-image-sync] Updated ${item.profile.slug} <- ${item.fileName}`)
    } catch (err) {
      failed.push({
        file: item.fileName,
        slug: item.profile.slug,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        report_source: reportPath,
        images_dir: imagesDir,
        summary: {
          ...summary,
          uploaded: uploaded.length,
          failed: failed.length,
        },
        uploaded,
        unmatched_files: unmatchedFiles,
        ambiguous_files: ambiguousFiles,
        failed,
      },
      null,
      2
    ),
    "utf8"
  )

  console.log("[vcard-image-sync] Upload/update complete")
  console.log("[vcard-image-sync] Uploaded:", uploaded.length)
  console.log("[vcard-image-sync] Failed:", failed.length)
  console.log("[vcard-image-sync] Unmatched:", unmatchedFiles.length)
  console.log("[vcard-image-sync] Ambiguous:", ambiguousFiles.length)
  console.log("[vcard-image-sync] Report:", outputPath)
}

main().catch((err) => {
  console.error("[vcard-image-sync] Failed:", err instanceof Error ? err.message : String(err))
  process.exit(1)
})
