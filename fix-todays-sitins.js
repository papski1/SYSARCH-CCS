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

  // Replace the entire loadTodaysSitIns function
  const updatedContent = data.replace(
    /function loadTodaysSitIns\(entries\) \{[\s\S]*?const today = new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\];[\s\S]*?const todaysSitIns = entries\.filter[\s\S]*?return false;\s*\}\);[\s\S]*?"Pending Review:", todaysSitIns\.filter\(e => e\.status === 'pending_review'\)\.length\);/g,
    `function loadTodaysSitIns(entries) {
    const tableBody = document.getElementById('todays-sit-ins-table');
    if (!tableBody) {
        console.error("Table body for today's sit-ins not found");
        return;
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Filter entries to include today's active and completed sessions
    const todaysSitIns = entries.filter(entry => {
        if (entry.date === today) {
            // Include all active and completed sessions from today
            return (entry.status === 'active' || entry.status === 'completed');
        }
        return false;
    });
    
    console.log("Today's sit-ins after filtering:", todaysSitIns.length, 
                "Active:", todaysSitIns.filter(e => e.status === 'active').length,
                "Completed:", todaysSitIns.filter(e => e.status === 'completed').length);`
  );

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully fixed loadTodaysSitIns function');
  });
}); 