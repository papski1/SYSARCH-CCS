function addFeedbackToAdmin(message, user, type = "success") {
    const feedbackTable = document.getElementById("feedbackTableBody");

    // Create a new row
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td class="border border-gray-300 px-4 py-2">${new Date().toLocaleString()}</td>
        <td class="border border-gray-300 px-4 py-2">${user}</td>
        <td class="border border-gray-300 px-4 py-2">${message}</td>
        <td class="border border-gray-300 px-4 py-2 ${type === "success" ? "text-green-600" : "text-red-600"}">
            ${type.charAt(0).toUpperCase() + type.slice(1)}
        </td>
    `;

    // Append the row to the table
    feedbackTable.appendChild(newRow);
}
function approveReservation(button) {
    let row = button.closest('tr');
    row.remove();
    alert('Reservation approved!');
}

function rejectReservation(button) {
    let row = button.closest('tr');
    row.remove();
    alert('Reservation rejected!');
}