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

  // Find the refreshAllData function's code to update the Records section
  let updatedContent = data.replace(
    /\/\/ Filter for today's date\s+const today = new Date\(\).toISOString\(\).split\('T'\)\[0\];\s+const todaySitIns = sitIns.filter\(entry => entry.date === today\);/g,
    `// Filter for today's date and include pending_review sessions
            const today = new Date().toISOString().split('T')[0];
            // Include today's active sessions and all pending_review sessions
            const todaySitIns = sitIns.filter(entry => 
                (entry.date === today && entry.status === 'active') ||
                entry.status === 'pending_review'
            );`
  );

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully updated refreshAllData function to include pending_review sessions');
  });
}); 