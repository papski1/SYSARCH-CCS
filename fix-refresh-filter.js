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

  // Update the filter in refreshAllData
  const updatedContent = data.replace(
    /\/\/ Filter for today's date and include recently completed sessions[\s\S]*?const todaySitIns = sitIns\.filter\(entry => [\s\S]*?\);/g,
    `// Filter for today's date and include completed sessions
            const today = new Date().toISOString().split('T')[0];
            // Include today's active and completed sessions
            const todaySitIns = sitIns.filter(entry => 
                entry.date === today && (entry.status === 'active' || entry.status === 'completed')
            );`
  );

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully updated refreshAllData filter');
  });
}); 