async function fetchReservations() {
    try {
        const response = await fetch("http://localhost:3000/reservations"); // Fetch data from server
        const reservations = await response.json();

        const tableBody = document.getElementById("reservationTableBody");
        tableBody.innerHTML = ""; // Clear previous data

        reservations.forEach((reservation) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="border px-4 py-2">${reservation.id}</td>
                <td class="border px-4 py-2">${reservation.name}</td>
                <td class="border px-4 py-2">${reservation.purpose}</td>
                <td class="border px-4 py-2">${reservation.date}</td>
                <td class="border px-4 py-2">${reservation.time}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error fetching reservations:", error);
    }
}

// Fetch reservations when the admin page loads
document.addEventListener("DOMContentLoaded", () => {
    fetch("/reservations")
        .then(response => response.json())
        .then(data => {
            const reservationsTable = document.getElementById("reservations-table");

            reservationsTable.innerHTML = data.map(reservation => `
                <tr>
                    <td>${reservation.idNumber}</td>
                    <td>${reservation.name}</td>
                    <td>${reservation.purpose}</td>
                    <td>${reservation.date}</td>
                    <td>${reservation.time}</td>
                </tr>
            `).join("");
        })
        .catch(error => console.error("Error loading reservations:", error));
});
