const CATEGORY_PARENTS = {
  'Food & Dining':       'Food',
  'Groceries':           'Food',
  'Transport':           'Transport',
  'Fuel':                'Transport',
  'Shopping':            'Shopping',
  'Entertainment':       'Lifestyle',
  'Travel':              'Lifestyle',
  'Personal Care':       'Lifestyle',
  'Subscriptions':       'Lifestyle',
  'Donations':           'Lifestyle',
  'Utilities':           'Utilities',
  'Healthcare':          'Healthcare',
  'Household Help':      'Household',
  'Rent':                'Household',
  'Insurance':           'Financial',
  'EMI':                 'Financial',
  'Gold':                'Investments',
  'Mutual Funds':        'Investments',
  'Stocks':              'Investments',
  'Chit Fund':           'Investments',
  'Salary':              'Income',
  'Credit Card Payment': 'Pass-through',
  'Transfers':           'Pass-through',
  'Fees & Charges':      'Pass-through',
  'Other':               'Other',
}

function getParent(subcategory) {
  return CATEGORY_PARENTS[subcategory] || 'Other'
}

module.exports = { CATEGORY_PARENTS, getParent }
