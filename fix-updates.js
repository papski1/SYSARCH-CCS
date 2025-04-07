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

  // Update the updateRecordsCharts function to include pending_review status
  const updatedContent = data.replace(
    /(reservation\.status === 'active' \|\| reservation\.status === 'completed')/g,
    "$1 || reservation.status === 'pending_review'"
  ).replace(
    /(walkIn\.status === 'active' \|\| walkIn\.status === 'completed')/g,
    "$1 || walkIn.status === 'pending_review'"
  );

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully updated updateRecordsCharts function to include pending_review sessions');
  });
}); 