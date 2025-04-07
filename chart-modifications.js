/**
 * Chart Modifications for SYSARCH-CCS
 * 
 * This file contains the modified chart functions to:
 * 1. Extract only the programming language name from purpose field
 * 2. Sort languages alphabetically
 * 
 * Instructions:
 * 1. Copy the extractLanguageName function to the top of your admin.js file
 * 2. Replace the chart creation code in admin.js with the modified versions below
 */

// =============== ADD THIS FUNCTION TO THE TOP OF YOUR admin.js FILE ===============

/**
 * Extract just the programming language name from purpose field
 * @param {string} purpose - The purpose field (e.g., "Programming assistance (Java)")
 * @returns {string} - Just the language name (e.g., "Java")
 */
function extractLanguageName(purpose) {
    if (!purpose) return 'Not Specified';
    
    // Check if it matches the pattern "Programming assistance (LanguageName)"
    const match = purpose.match(/Programming assistance \(([^)]+)\)/i);
    if (match && match[1]) {
        return match[1]; // Return just the language name
    }
    
    return purpose; // Return the original if no match
}

// =============== REPLACE THE updateDashboardChart FUNCTION ===============

function updateDashboardChart(sessions) {
    const ctx = document.getElementById('studentStatsChart');
    if (!ctx) return;

    // Count programming language usage from both sit-ins and reservations
    const languageStats = {};
    sessions.forEach(session => {
        if (session.purpose) {
            // Extract just the language name from the purpose
            const language = extractLanguageName(session.purpose.trim());
            languageStats[language] = (languageStats[language] || 0) + 1;
        }
    });

    // Sort the languages alphabetically
    const sortedLanguages = Object.keys(languageStats).sort();
    const sortedData = sortedLanguages.map(lang => languageStats[lang]);

    // Count lab room usage
    const labStats = {};
    sessions.forEach(session => {
        if (session.labRoom) {
            // Normalize lab room name
            const lab = session.labRoom.trim();
            labStats[lab] = (labStats[lab] || 0) + 1;
        }
    });

    // Safely destroy existing chart if it exists
    if (window.studentStatsChart && typeof window.studentStatsChart.destroy === 'function') {
        window.studentStatsChart.destroy();
    }

    // Create new chart only if Chart.js is loaded
    if (typeof Chart !== 'undefined') {
        window.studentStatsChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: sortedLanguages,
                datasets: [{
                    data: sortedData,
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',  // Blue for C#
                        'rgba(255, 99, 132, 0.7)',  // Pink for C
                        'rgba(255, 206, 86, 0.7)',  // Yellow for Java
                        'rgba(255, 159, 64, 0.7)',  // Orange for ASP.Net
                        'rgba(75, 192, 192, 0.7)',  // Teal for PHP
                        'rgba(153, 102, 255, 0.7)', // Purple
                        'rgba(199, 199, 199, 0.7)', // Grey
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(255, 159, 64, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(199, 199, 199, 1)'
                    ],
                    borderWidth: 1,
                    radius: '90%', // Set consistent radius
                    cutout: '0%'   // No cutout (solid pie)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1,
                layout: {
                    padding: {
                        top: 10,
                        right: 10,
                        bottom: 10,
                        left: 10
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        maxWidth: 300,
                        maxHeight: 180,
                        labels: {
                            usePointStyle: true,
                            padding: 10,
                            boxWidth: 10,
                            font: {
                                size: 11,
                                family: "'Inter', sans-serif"
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const total = data.datasets[0].data.reduce((acc, val) => acc + val, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        // Add appropriate icons based on programming language
                                        let icon = 'ðŸ'»';
                                        if (label.toLowerCase().includes('c#')) icon = 'ðŸ"µ';
                                        if (label.toLowerCase() === 'c') icon = 'ðŸ"´';
                                        if (label.toLowerCase().includes('java')) icon = 'ðŸŸ¡';
                                        if (label.toLowerCase().includes('asp')) icon = 'ðŸŸ ';
                                        if (label.toLowerCase().includes('php')) icon = 'ðŸŸ¢';
                                        if (label.toLowerCase().includes('python')) icon = 'ðŸ';
                                        return {
                                            text: `${icon} ${label} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    title: {
                        display: false // Hide title since we have a blue header now
                    }
                }
            }
        });
    } else {
        console.warn('Chart.js is not loaded yet');
    }
}

// =============== MODIFY THE refreshRecords FUNCTION ===============

// Find the code that looks like this in the refreshRecords function:
// Count programming languages
const languageStats = {};
todaysSitIns.forEach(record => {
    const lang = record.purpose || 'Not Specified';
    languageStats[lang] = (languageStats[lang] || 0) + 1;
});

// Replace it with:
// Count programming languages
const languageStats = {};
todaysSitIns.forEach(record => {
    const lang = extractLanguageName(record.purpose || 'Not Specified');
    languageStats[lang] = (languageStats[lang] || 0) + 1;
});

// Then find where the chart is created, something like:
window.programmingLanguageChart = new Chart(programmingLanguageCanvas, {
    type: 'pie',
    data: {
        labels: Object.keys(languageStats),
        datasets: [{
            data: Object.values(languageStats),
            // more code...

// Replace it with:
// Sort languages alphabetically
const sortedLanguages = Object.keys(languageStats).sort();
const sortedData = sortedLanguages.map(lang => languageStats[lang]);

window.programmingLanguageChart = new Chart(programmingLanguageCanvas, {
    type: 'pie',
    data: {
        labels: sortedLanguages,
        datasets: [{
            data: sortedData,
            // more code...

// =============== END OF MODIFICATIONS =============== 