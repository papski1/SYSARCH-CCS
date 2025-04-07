const fs = require('fs');
const path = require('path');

// Path to the admin.js file
const adminJsPath = path.join(__dirname, 'public', 'admin.js');

// Read the file
fs.readFile(adminJsPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Fix the broken filter code (between lines 10090-10115)
  let updatedContent = data.replace(
    /\/\/ Get today's date in YYYY-MM-DD format\s+const today = new Date\(\).toISOString\(\).split\('T'\)\[0\];[\s\S]*?"Pending Review:", todaysSitIns\.filter\(e => e\.status === 'pending_review'\)\.length\);/g,
    `// Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Filter entries to include:
    // 1. All sessions with status 'pending_review' (from any date)
    // 2. Today's active sessions that are not older than 24 hours
    const todaysSitIns = entries.filter(entry => {
        // Always include pending_review sessions (regardless of date)
        if (entry.status === 'pending_review') {
            return true;
        }
        
        if (entry.date === today) {
            // For active sessions, only include those not older than 24 hours
            if (entry.status === 'active') {
                return !isOlderThan24Hours(entry);
            }
        }
        return false;
    });
    
    console.log("Today's sit-ins after filtering:", todaysSitIns.length, 
                "Active:", todaysSitIns.filter(e => e.status === 'active').length,
                "Pending Review:", todaysSitIns.filter(e => e.status === 'pending_review').length);`
  );

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully fixed admin.js');
  });
}); 