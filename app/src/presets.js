export const presets = {
  normal: {
    labelKey: 'preset_normal',
    transaction: {
      transaction_id: 1,
      amount: 107.55,
      merchant_category: 'dining',
      device_change_flag: 0,
      ip_change_flag: 0,
      hour_of_day: 21,
      user_txn_count_30d: 11,
      time_since_last_txn_min: 346.8,
    },
  },
  obvious_fraud: {
    labelKey: 'preset_obvious_fraud',
    transaction: {
      transaction_id: 114,
      amount: 260.02,
      merchant_category: 'entertainment',
      device_change_flag: 1,
      ip_change_flag: 1,
      hour_of_day: 5,
      user_txn_count_30d: 8,
      time_since_last_txn_min: 57.1,
    },
  },
  ambiguous: {
    labelKey: 'preset_ambiguous',
    transaction: {
      transaction_id: 20,
      amount: 54.74,
      merchant_category: 'grocery',
      device_change_flag: 0,
      ip_change_flag: 0,
      hour_of_day: 9,
      user_txn_count_30d: 11,
      time_since_last_txn_min: 268.7,
    },
  },
  unseen_pattern: {
    labelKey: 'preset_unseen_pattern',
    transaction: {
      transaction_id: 900000,
      amount: 13.43,
      merchant_category: 'dining',
      device_change_flag: 0,
      ip_change_flag: 0,
      hour_of_day: 12,
      user_txn_count_30d: 45,
      time_since_last_txn_min: 2.7,
    },
  },
}