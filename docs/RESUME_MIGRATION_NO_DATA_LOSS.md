# Resume Migration (No Data Loss)

Use this checklist before removing Supabase Storage or changing resume file hosting.

## 1) Export a migration manifest

Run:

```bash
npm run resumes:manifest:staging
```

This creates files in `reports/`:

- `resume-migration-manifest-<timestamp>.json`
- `resume-migration-manifest-<timestamp>.csv`

The manifest includes each application id and its `resume_url` classification:

- `base64`
- `absolute_url`
- `relative_or_storage_path`
- `empty`

## 2) Backup first (required)

- Backup the PostgreSQL database (at minimum `job_applications` table).
- Keep current file storage read-only during migration window.

## 3) Migrate files in batches

- Start with `absolute_url` and `relative_or_storage_path`.
- For each resume:
  - Download file from current source.
  - Upload to target storage.
  - Record old URL -> new URL mapping.

## 4) Update DB references

Update `job_applications.resume_url` using your mapping (id-based updates recommended).

## 5) Verify before cutover

- Randomly test at least 20 resumes from different dates/statuses.
- Verify:
  - Admin preview works
  - Admin download works
  - No broken links in application detail pages

## 6) Keep rollback ready

- Keep old storage available until verification is complete.
- Keep URL mapping + DB backup so you can restore quickly if needed.

---

## Notes

- Existing data is not deleted by this toolkit.
- Deleting an application from admin may remove its resume file depending on current deletion flow.
- Perform migration during low-traffic hours.
