const fs = require('fs');

// Read both files
const sitIns = JSON.parse(fs.readFileSync('sit-ins.json', 'utf8'));
const reservations = JSON.parse(fs.readFileSync('reservations.json', 'utf8'));

// Format sit-ins to match reservation format for fields, but keeping their unique fields
const formattedSitIns = sitIns.map(sitIn => {
  return {
    ...sitIn,
    // Add missing fields if they don't exist
    time: sitIn.timeIn || sitIn.time || '00:00',
    createdAt: sitIn.createdAt || new Date().toISOString(),
    email: sitIn.email || `${sitIn.idNumber}@example.com` // Create placeholder email if missing
  };
});

// Merge the arrays
const combinedData = [...reservations, ...formattedSitIns];

// Create backup of the existing reservations file
fs.writeFileSync('reservations.json.bak', JSON.stringify(reservations, null, 2));

// Write the combined data back to reservations.json
fs.writeFileSync('reservations.json', JSON.stringify(combinedData, null, 2));

console.log(`Combined ${sitIns.length} sit-in records with ${reservations.length} reservation records.`);
console.log(`Total records in new reservations.json: ${combinedData.length}`); 