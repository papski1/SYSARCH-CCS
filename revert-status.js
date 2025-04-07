const fs = require('fs');
const path = require('path');

// Path to the admin.js file
const adminJsPath = path.join(__dirname, 'public', 'admin.js');
const serverJsPath = path.join(__dirname, 'server.js');

// Read and update admin.js file
fs.readFile(adminJsPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading admin.js file:', err);
    return;
  }

  // Change back status: "pending_review" to status: "completed"
  let updatedContent = data.replace(
    /status: "pending_review"/g,
    'status: "completed"'
  );

  // Update the filter for Today's Sit-in table to include recently completed sessions
  updatedContent = updatedContent.replace(
    /\/\/ Filter for today's date and include pending_review sessions[\s\S]*?const todaySitIns = sitIns\.filter\(entry => [\s\S]*?\);/g,
    `// Filter for today's date and include recently completed sessions
            const today = new Date().toISOString().split('T')[0];
            // Include today's active and completed sessions from today
            const todaySitIns = sitIns.filter(entry => 
                entry.date === today && (
                  entry.status === 'active' || 
                  entry.status === 'completed'
                )
            );`
  );

  // Update loadTodaysSitIns function to include completed sessions
  updatedContent = updatedContent.replace(
    /\/\/ Filter entries to include:[\s\S]*?const todaySitIns = entries\.filter\(entry => \{[\s\S]*?if \(entry\.status === 'pending_review'\) \{[\s\S]*?return false;\s*\}\);/g,
    `// Filter entries to include today's active and completed sessions
    const todaySitIns = entries.filter(entry => {
        if (entry.date === today) {
            // Include both active and completed sessions from today
            if (entry.status === 'active' || entry.status === 'completed') {
                return true;
            }
        }
        return false;
    });`
  );

  // Update the reference to pending_review in console.log
  updatedContent = updatedContent.replace(
    /"Pending Review:", todaySitIns\.filter\(e => e\.status === 'pending_review'\)\.length/g,
    '"Completed:", todaySitIns.filter(e => e.status === \'completed\').length'
  );

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing admin.js file:', err);
      return;
    }
    console.log('Successfully reverted status to "completed" in admin.js');
  });
});

// Read and update server.js file
fs.readFile(serverJsPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading server.js file:', err);
    return;
  }

  // Revert the update-sit-in-status endpoint to use completed status directly
  let updatedContent = data.replace(
    /\/\/ If status is being changed to completed, use pending_review instead[\s\S]*?if \(status === 'completed'\) \{[\s\S]*?sitIns\[sitInIndex\]\.status = 'pending_review';[\s\S]*?sitIns\[sitInIndex\]\.completedAt = new Date\(\)\.toISOString\(\);[\s\S]*?console\.log\(`Session \${sitInId\} marked as pending_review with timestamp \${sitIns\[sitInIndex\]\.completedAt\}`\);[\s\S]*?\} else \{/g,
    `// Update the status directly
            sitIns[sitInIndex].status = status;
            
            // If status is being changed to completed, add a timestamp
            if (status === 'completed') {
                sitIns[sitInIndex].completedAt = new Date().toISOString();
                console.log(\`Session \${sitInId} marked as completed with timestamp \${sitIns[sitInIndex].completedAt}\`);
            `
  );

  // Remove or comment out the processCompletedSessions function
  updatedContent = updatedContent.replace(
    /\/\/ Add this new function to handle session status transitions[\s\S]*?function processCompletedSessions\(\) \{[\s\S]*?\}[\s\S]*?\/\/ Set up a scheduled task to process sessions every hour[\s\S]*?setInterval\(processCompletedSessions, 60 \* 60 \* 1000\);[\s\S]*?\/\/ Also run it once at startup[\s\S]*?processCompletedSessions\(\);/g,
    `// Removed session auto-processing as requested by client`
  );

  // Write the updated content back to the file
  fs.writeFile(serverJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing server.js file:', err);
      return;
    }
    console.log('Successfully reverted changes in server.js');
  });
}); 