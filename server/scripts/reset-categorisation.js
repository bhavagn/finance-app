/**
 * One-time reset: sets all transaction categories to NULL.
 * Run before re-categorising with the new no-rules-engine approach.
 * Usage (from server/): node scripts/reset-categorisation.js
 * Delete this file after running.
 */
require('dotenv').config()
const { resetTransactionCategories } = require('../services/categoriser')

resetTransactionCategories()
  .then(() => { console.log('Done. Now hit POST /api/transactions/categorise-all to re-run.'); process.exit(0) })
  .catch((e) => { console.error(e.message); process.exit(1) })
