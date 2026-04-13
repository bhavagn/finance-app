export const CATEGORIES = [
  { parent: 'Food',         subcategory: 'Food & Dining'        },
  { parent: 'Food',         subcategory: 'Groceries'            },
  { parent: 'Transport',    subcategory: 'Transport'            },
  { parent: 'Transport',    subcategory: 'Fuel'                 },
  { parent: 'Shopping',     subcategory: 'Shopping'             },
  { parent: 'Lifestyle',    subcategory: 'Entertainment'        },
  { parent: 'Lifestyle',    subcategory: 'Travel'               },
  { parent: 'Lifestyle',    subcategory: 'Personal Care'        },
  { parent: 'Lifestyle',    subcategory: 'Subscriptions'        },
  { parent: 'Lifestyle',    subcategory: 'Donations'            },
  { parent: 'Utilities',    subcategory: 'Utilities'            },
  { parent: 'Healthcare',   subcategory: 'Healthcare'           },
  { parent: 'Household',    subcategory: 'Household Help'       },
  { parent: 'Household',    subcategory: 'Rent'                 },
  { parent: 'Financial',    subcategory: 'Insurance'            },
  { parent: 'Financial',    subcategory: 'EMI'                  },
  { parent: 'Investments',  subcategory: 'Gold'                 },
  { parent: 'Investments',  subcategory: 'Mutual Funds'         },
  { parent: 'Investments',  subcategory: 'Stocks'               },
  { parent: 'Investments',  subcategory: 'Chit Fund'            },
  { parent: 'Income',       subcategory: 'Salary'               },
  { parent: 'Pass-through', subcategory: 'Credit Card Payment'  },
  { parent: 'Pass-through', subcategory: 'Transfers'            },
  { parent: 'Pass-through', subcategory: 'Fees & Charges'       },
  { parent: 'Other',        subcategory: 'Other'                },
]

export const SUBCATEGORIES = CATEGORIES.map((c) => c.subcategory)
export const PARENT_CATEGORIES = [...new Set(CATEGORIES.map((c) => c.parent))]

export function getParent(subcategory) {
  return CATEGORIES.find((c) => c.subcategory === subcategory)?.parent ?? 'Other'
}

// Canonical source keys — matches server/config/sourceMeta.js
export const SOURCE_META = {
  // Bank accounts
  hdfc_savings:      { label: 'HDFC Savings',    type: 'bank'        },
  sbi_savings:       { label: 'SBI Savings',      type: 'bank'        },
  federal_savings:   { label: 'Federal Bank',     type: 'bank'        },
  axis_savings:      { label: 'Axis Savings',     type: 'bank'        },
  kotak_savings:     { label: 'Kotak Savings',    type: 'bank'        },
  icici_savings:     { label: 'ICICI Savings',    type: 'bank'        },
  // Credit cards
  hdfc_millennia:    { label: 'HDFC Millennia',   type: 'credit_card' },
  hdfc_credit_card:  { label: 'HDFC Credit Card', type: 'credit_card' },
  amazon_icici:      { label: 'Amazon Pay ICICI', type: 'credit_card' },
  icici_credit_card: { label: 'ICICI Credit Card',type: 'credit_card' },
  axis_credit_card:  { label: 'Axis Credit Card', type: 'credit_card' },
  kotak_credit_card: { label: 'Kotak Credit Card',type: 'credit_card' },
  sbi_credit_card:   { label: 'SBI Credit Card',  type: 'credit_card' },
  bob_scapia:        { label: 'BOB Scapia',        type: 'credit_card' },
  icici_mmt:         { label: 'ICICI MMT',         type: 'credit_card' },
  // Legacy keys — backward-compat for existing DB records
  icici_amazon_credit:   { label: 'Amazon Pay ICICI', type: 'credit_card' },
  icici_mmt_credit:      { label: 'ICICI MMT',         type: 'credit_card' },
  hdfc_millennia_credit: { label: 'HDFC Millennia',    type: 'credit_card' },
  bob_scapia_credit:     { label: 'BOB Scapia',         type: 'credit_card' },
}

export function getSourceLabel(source) {
  return SOURCE_META[source]?.label ?? source
}

export const SOURCE_OPTIONS = Object.entries(SOURCE_META)
  .filter(([key]) => !['icici_amazon_credit','icici_mmt_credit','hdfc_millennia_credit','bob_scapia_credit'].includes(key))
  .map(([value, meta]) => ({ value, label: meta.label, type: meta.type }))
