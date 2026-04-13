const SOURCE_META = {
  // Bank accounts
  hdfc_savings:      { label: 'HDFC Savings',    type: 'bank',        bank: 'HDFC'    },
  sbi_savings:       { label: 'SBI Savings',      type: 'bank',        bank: 'SBI'     },
  federal_savings:   { label: 'Federal Bank',     type: 'bank',        bank: 'Federal' },
  axis_savings:      { label: 'Axis Savings',     type: 'bank',        bank: 'Axis'    },
  kotak_savings:     { label: 'Kotak Savings',    type: 'bank',        bank: 'Kotak'   },
  icici_savings:     { label: 'ICICI Savings',    type: 'bank',        bank: 'ICICI'   },

  // Credit cards
  hdfc_millennia:    { label: 'HDFC Millennia',   type: 'credit_card', bank: 'HDFC'    },
  hdfc_credit_card:  { label: 'HDFC Credit Card', type: 'credit_card', bank: 'HDFC'    },
  amazon_icici:      { label: 'Amazon Pay ICICI', type: 'credit_card', bank: 'ICICI'   },
  icici_credit_card: { label: 'ICICI Credit Card',type: 'credit_card', bank: 'ICICI'   },
  axis_credit_card:  { label: 'Axis Credit Card', type: 'credit_card', bank: 'Axis'    },
  kotak_credit_card: { label: 'Kotak Credit Card',type: 'credit_card', bank: 'Kotak'   },
  sbi_credit_card:   { label: 'SBI Credit Card',  type: 'credit_card', bank: 'SBI'     },
  bob_scapia:        { label: 'BOB Scapia',        type: 'credit_card', bank: 'BOB'     },
  icici_mmt:         { label: 'ICICI MMT',         type: 'credit_card', bank: 'ICICI'   },

  // Legacy keys — kept for backward-compat with existing DB records
  icici_amazon_credit:   { label: 'Amazon Pay ICICI', type: 'credit_card', bank: 'ICICI' },
  icici_mmt_credit:      { label: 'ICICI MMT',         type: 'credit_card', bank: 'ICICI' },
  hdfc_millennia_credit: { label: 'HDFC Millennia',    type: 'credit_card', bank: 'HDFC'  },
  bob_scapia_credit:     { label: 'BOB Scapia',         type: 'credit_card', bank: 'BOB'   },
}

function getLabel(source) {
  return SOURCE_META[source]?.label ?? source
}

function getSourcesForType(accountType) {
  return Object.entries(SOURCE_META)
    .filter(([, meta]) => meta.type === accountType)
    .map(([value, meta]) => ({ value, label: meta.label }))
}

module.exports = { SOURCE_META, getLabel, getSourcesForType }
