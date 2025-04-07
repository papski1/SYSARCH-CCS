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

  // Find the setupTodaysSitInsSearch function
  const setupSearchMatch = data.match(/function setupTodaysSitInsSearch\s*\(sitIns\)\s*\{[\s\S]+?filteredEntries\.forEach\(entry[\s\S]+?}\);[\s\S]+?}\);/);
  
  if (!setupSearchMatch) {
    console.error('Could not find the setupTodaysSitInsSearch function in the file');
    return;
  }
  
  // Get the full search setup function with the forEach
  const originalSearchSetup = setupSearchMatch[0];
  
  // Create a completely new version of the function
  const newSearchSetup = `function setupTodaysSitInsSearch(sitIns) {
    const searchInput = document.getElementById('todays-sit-in-search');
    if (!searchInput) return;
    
    // Clear existing event listeners by replacing the search input
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    newSearchInput.addEventListener("input", function() {
        const query = this.value.toLowerCase();
        
        // Filter sit-ins based on search query
        const filteredEntries = sitIns.filter(entry => {
            const idMatch = entry.idNumber && entry.idNumber.toLowerCase().includes(query);
            const nameMatch = entry.name && entry.name.toLowerCase().includes(query);
            return idMatch || nameMatch;
        });
        
        const tableBody = document.getElementById('todays-sit-ins-table');
        if (!tableBody) return;
        
        // Clear the table body
        tableBody.innerHTML = '';
        
        if (filteredEntries.length === 0) {
            tableBody.innerHTML = \`
                <tr>
                    <td colspan="9" class="px-6 py-3 text-center text-gray-500">
                        No matching sit-ins found.
                    </td>
                </tr>
            \`;
            return;
        }
        
        // Add each filtered sit-in to the table
        filteredEntries.forEach(entry => {
            // The same row creation logic as in loadTodaysSitIns
            const statusClass = getStatusClass(entry.status);
            const entryType = entry.isWalkIn ? 'Walk-in' : 'Reservation';
            const entryId = entry.id.toString();
            
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors';
            row.dataset.entryId = entryId;
            
            row.innerHTML = \`
                <td class="px-6 py-3">\${entry.idNumber || '-'}</td>
                <td class="px-6 py-3">\${entry.name || '-'}</td>
                <td class="px-6 py-3">\${entry.course || '-'}</td>
                <td class="px-6 py-3">\${entry.year || '-'}</td>
                <td class="px-6 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium \${entry.isWalkIn ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                        \${entryType}
                    </span>
                </td>
                <td class="px-6 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium \${statusClass}">
                        \${entry.status || 'Unknown'}
                    </span>
                </td>
                <td class="px-6 py-3">\${entry.purpose || '-'}</td>
                <td class="px-6 py-3">\${entry.labRoom || '-'}</td>
                <td class="px-6 py-3">\${entry.time || entry.timeIn || '-'}</td>
            \`;
            
            tableBody.appendChild(row);
        });
        
        // No complete buttons to add event listeners to
    });
}`;

  // Replace the original search function with our new version
  const updatedData = data.replace(originalSearchSetup, newSearchSetup);

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully fixed the search function in Today\'s Sit-in table');
  });
}); 