// ============ VOTER ID DATABASE ============
// Format: VID followed by 4-digit zero-padded number
// Range: VID0001 to VID5000 (supports 5000+ students)
//
// In production, replace this list with the actual voter IDs
// loaded from your database or Excel export.
//
// QR codes encode only the numeric part (e.g., "0001", "5000")
// The server automatically reconstructs the full ID.

const VALID_VOTER_IDS = [
  'VID0001',
  'VID0002',
  'VID0003',
  'VID0004',
  'VID0005',
  'VID0006',
  'VID0007',
  'VID0008',
  'VID0009',
  'VID0010',
  'VID0011',
  'VID0012',
  'VID0013',
  'VID0014',
  'VID0015',
  // Add all voter IDs up to VID5000 here...
];

module.exports = {
  VALID_VOTER_IDS
};
