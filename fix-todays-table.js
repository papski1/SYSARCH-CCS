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

  // Fix the refreshAllData function to fetch both reservations and sit-ins
  let updatedContent = data.replace(
    /\/\/ Refresh Today's Sit-in table in Records section[\s\S]*?fetch\("http:\/\/localhost:3000\/sit-ins\?includeCompleted=true"\)[\s\S]*?\.then\(response => response\.json\(\)\)[\s\S]*?\.then\(sitIns => \{[\s\S]*?loadTodaysSitIns\(todaySitIns\);[\s\S]*?\}\)/g,
    `// Refresh Today's Sit-in table in Records section - load BOTH reservations and sit-ins
    Promise.all([
        fetch("http://localhost:3000/reservations"),
        fetch("http://localhost:3000/sit-ins?includeCompleted=true")
    ])
    .then(responses => Promise.all(responses.map(response => response.json())))
    .then(([reservations, sitIns]) => {
        const today = new Date().toISOString().split('T')[0];
        
        // Filter both data sources for today's date and active/completed status
        const todaysReservations = reservations.filter(entry => 
            entry.date === today && (entry.status === 'active' || entry.status === 'completed')
        );
        
        const todaysSitIns = sitIns.filter(entry => 
            entry.date === today && (entry.status === 'active' || entry.status === 'completed')
        );
        
        // Combine both data sources
        const allTodaysEntries = [...todaysReservations, ...todaysSitIns];
        console.log("Loaded entries for Today's Sit-in table:", allTodaysEntries.length, 
                    "(Reservations:", todaysReservations.length, 
                    "Walk-ins:", todaysSitIns.length, ")");
        
        // Load combined data into Today's Sit-in table
        loadTodaysSitIns(allTodaysEntries);
    })`
  );

  // Replace the entire loadTodaysSitIns function to handle combined data
  updatedContent = updatedContent.replace(
    /function loadTodaysSitIns\(entries\) \{[\s\S]*?const today = new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\];[\s\S]*?const todaysSitIns = entries\.filter[\s\S]*?return false;\s*\}\);[\s\S]*?"Completed:", todaysSitIns\.filter\(e => e\.status === 'completed'\)\.length\);/g,
    `function loadTodaysSitIns(entries) {
    const tableBody = document.getElementById('todays-sit-ins-table');
    if (!tableBody) {
        console.error("Table body for today's sit-ins not found");
        return;
    }

    // No need to filter by date again, as we've already filtered in the calling function
    const todaysSitIns = entries;
    
    console.log("Processing entries for Today's Sit-in table:", todaysSitIns.length, 
                "Active:", todaysSitIns.filter(e => e.status === 'active').length,
                "Completed:", todaysSitIns.filter(e => e.status === 'completed').length);`
  );

  // Make sure the loadRecordsCharts function fetches both sit-ins and reservations
  updatedContent = updatedContent.replace(
    /async function loadRecordsCharts\(\) \{[\s\S]*?try \{[\s\S]*?const entries = await fetchSitIns\(\);/g,
    `async function loadRecordsCharts() {
    try {
        // Fetch BOTH reservations and sit-ins for the records section
        const [reservationsResponse, sitInsResponse] = await Promise.all([
            fetch("http://localhost:3000/reservations"),
            fetch("http://localhost:3000/sit-ins?includeCompleted=true")
        ]);
        
        if (!reservationsResponse.ok || !sitInsResponse.ok) {
            throw new Error("Failed to fetch data for records");
        }
        
        const reservations = await reservationsResponse.json();
        const sitIns = await sitInsResponse.json();
        
        // Combine both data sources
        const entries = [...reservations, ...sitIns];`
  );

  // Write the updated content back to the file
  fs.writeFile(adminJsPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully updated Today\'s Sit-in table to load both reservations and walk-ins');
  });
}); 