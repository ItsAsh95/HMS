document.addEventListener('DOMContentLoaded', () => {
    // Find all forms with the class 'ajax-form'
    const forms = document.querySelectorAll('form.ajax-form');

    forms.forEach(form => {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            const form = event.target;
            const action = form.action; // The URL to submit to (e.g., /api/appointments)
            const method = form.method.toUpperCase(); // POST, etc.
            const formData = new FormData(form);
            const body = JSON.stringify(Object.fromEntries(formData));

            const messageDiv = form.querySelector('.message');
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'message'; // Reset classes
            }

            try {
                const response = await fetch(action, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });

                const result = await response.json();

                if (response.ok) {
                    if (messageDiv) {
                        messageDiv.textContent = result.message || 'Operation successful!';
                        messageDiv.classList.add('success');
                    }
                    form.reset(); // Clear the form on success
                } else {
                    if (messageDiv) {
                        messageDiv.textContent = result.message || 'An error occurred.';
                        messageDiv.classList.add('error');
                    }
                }
            } catch (error) {
                console.error('Form submission error:', error);
                if (messageDiv) {
                    messageDiv.textContent = 'A network error occurred. Please try again.';
                    messageDiv.classList.add('error');
                }
            }
        });
    });
});