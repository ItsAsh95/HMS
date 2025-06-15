document.addEventListener('DOMContentLoaded', () => {
    // Find all delete buttons on the page
    const deleteButtons = document.querySelectorAll('.delete-btn');

    deleteButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const btn = event.currentTarget;
            const id = btn.dataset.id;       // Get the ID from data-id attribute
            const type = btn.dataset.type;   // Get the type from data-type attribute

            // Confirmation prompt to prevent accidental deletion
            const confirmation = confirm(`Are you sure you want to delete this ${type.slice(0, -1)} (ID: ${id})? This action cannot be undone.`);

            if (!confirmation) {
                return; // Stop if the user clicks "Cancel"
            }

            try {
                const response = await fetch(`/api/${type}/${id}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (response.ok) {
                    // If successful, find the closest table row and remove it
                    const row = btn.closest('tr');
                    if (row) {
                        row.remove();
                    }
                    alert(result.message); // Show success message from server
                } else {
                    // Handle errors by showing the message from the server
                    alert(`Error: ${result.message || 'Could not complete the request.'}`);
                }
            } catch (error) {
                console.error('Fetch error:', error);
                alert('A network error occurred. Please check the console.');
            }
        });
    });
});