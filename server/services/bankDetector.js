/**
 * Detects the bank/card source key from the first 3000 chars of PDF text.
 * @param {string} pdfText - First ~3000 characters of extracted PDF text
 * @param {'bank'|'credit_card'} accountType
 * @returns {string|null} source key (e.g. "hdfc_savings") or null if undetected
 */
function detectBank(pdfText, accountType) {
  const t = pdfText.toLowerCase()

  const has = (...terms) => terms.every((term) => t.includes(term))

  if (accountType === 'bank') {
    if (has('hdfc bank', 'account statement'))   return 'hdfc_savings'
    if (has('state bank of india'))              return 'sbi_savings'
    if (has('federal bank'))                     return 'federal_savings'
    if (has('axis bank'))                        return 'axis_savings'
    if (has('kotak mahindra bank'))              return 'kotak_savings'
    if (has('icici bank') && !t.includes('amazon')) return 'icici_savings'
  }

  if (accountType === 'credit_card') {
    if (has('hdfc bank credit cards', 'millennia'))                          return 'hdfc_millennia'
    if (has('hdfc bank credit cards') && !t.includes('millennia'))          return 'hdfc_credit_card'
    if (has('amazon pay') && has('icici'))                                   return 'amazon_icici'
    if (has('icici bank', 'credit card'))                                    return 'icici_credit_card'
    if (has('axis bank', 'credit card'))                                     return 'axis_credit_card'
    if (has('kotak') && has('credit card'))                                  return 'kotak_credit_card'
    if (t.includes('sbi card') || t.includes('sbi credit'))                 return 'sbi_credit_card'
    if (has('bob') && has('scapia'))                                         return 'bob_scapia'
    if (has('make my trip') && has('icici'))                                 return 'icici_mmt'
  }

  return null
}

module.exports = { detectBank }
