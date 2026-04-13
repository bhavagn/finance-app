const supabase = require('./supabase')

const BUCKET = 'statements'

/**
 * Uploads a PDF buffer to Supabase Storage.
 * Returns the storage path.
 *
 * Path pattern: {source}/{YYYY-MM}/{timestamp}_{filename}
 */
async function uploadPdf(buffer, source, originalName) {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const timestamp = now.getTime()
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${source}/${yearMonth}/${timestamp}_${safeName}`

  console.log('[storage] Uploading to Supabase Storage:', storagePath)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (error) {
    console.error('[storage] Upload failed:', error.message)
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  console.log('[storage] Upload successful:', storagePath)
  return storagePath
}

module.exports = { uploadPdf }
