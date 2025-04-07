const fs = require('fs');
const path = require('path');

// Path to the admin.js file
const adminJsPath = path.join(__dirname, 'public', 'admin.js');
const serverJsPath = path.join(__dirname, 'server.js');

// Read and modify the admin.js file
fs.readFile(adminJsPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading admin.js file:', err);
    return;
  }

  // 1. Update the getStatusClass function to add pending_review status
  let updatedContent = data.replace(
    /function getStatusClass\(status\) \{\s+switch \(status\) \{\s+case 'active':/g,
    `function getStatusClass(status) {
    switch (status) {
        case 'pending_review':
            return 'bg-orange-100 text-orange-800';
        case 'active':`
  );

  // 2. Update the loadTodaysSitIns filter to include pending_review instead of completed
  updatedContent = updatedContent.replace(
    /\/\/ Filter entries to only include today's sit-ins[\s\S]*?if \(entry\.status === 'completed'\) \{\s+return true;\s+\}/g,
    `// Filter entries to only include today's sit-ins
    // Include all pending_review sessions and active sessions that are not older than 24 hours
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
        return false;`
  );

  // 3. Update the console.log to show pending_review count
  updatedContent = updatedContent.replace(
    /console\.log\("Today's sit-ins after filtering:[\s\S]*?"Completed:", todaysSitIns\.filter\(e => e\.status === 'completed'\)\.length\);/g,
    `console.log("Today's sit-ins after filtering:", todaysSitIns.length, 
                "Active:", todaysSitIns.filter(e => e.status === 'active').length,
                "Pending Review:", todaysSitIns.filter(e => e.status === 'pending_review').length);`
  );

  // 4. Update the loadCompletedSessionsHistory function to filter for completed status only
  updatedContent = updatedContent.replace(
    // Find where sit-ins that are older than 24 hours are added
    /\/\/ Add sit-ins that are older than 24 hours\s+const olderSitIns = sitInsData\.filter\(sitIn => isOlderThan24Hours\(sitIn\)\);/g,
    `// Add sit-ins that are completed or older than 24 hours but not pending_review
        const olderSitIns = sitInsData.filter(sitIn => 
            // Only include completed sessions or active sessions older than 24 hours
            (sitIn.status === 'completed' || (isOlderThan24Hours(sitIn) && sitIn.status !== 'pending_review')));`
  );

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing admin.js file:', err);
      return;
    }
    console.log('Successfully updated admin.js');
  });
});

// Read and modify the server.js file
fs.readFile(serverJsPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading server.js file:', err);
    return;
  }

  // Update the /completed-sessions endpoint to filter for 'completed' status only
  let updatedContent = data.replace(
    /const completedSitIns = sitIns\s+\.filter\(s => s\.status === 'completed'\)/g,
    `const completedSitIns = sitIns
            .filter(s => s.status === 'completed') // Only include 'completed' status (not 'pending_review')`
  );

  // Also update the student-completed-sessions endpoint
  updatedContent = updatedContent.replace(
    /const completedSitIns = sitIns\s+\.filter\(s => s\.idNumber === idNumber && s\.status === 'completed'\)/g,
    `const completedSitIns = sitIns
            .filter(s => s.idNumber === idNumber && s.status === 'completed') // Only include 'completed' status (not 'pending_review')`
  );

  // Write the updated content back to the file
  fs.writeFile(serverJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing server.js file:', err);
      return;
    }
    console.log('Successfully updated server.js');
  });
}); 