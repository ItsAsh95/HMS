document.addEventListener('DOMContentLoaded', () => {
    const updateForms = document.querySelectorAll('form.ajax-update-form');

    updateForms.forEach(form => {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            const form = event.target;
            const entityType = form.dataset.type; // 'doctors' or 'patients'
            const entityId = form.querySelector('input[name="id"]').value;
            const actionUrl = `/api/${entityType}/${entityId}`;
            
            const formData = new FormData(form);
            // We don't need the ID in the body, it's in the URL
            formData.delete('id'); 
            const body = JSON.stringify(Object.fromEntries(formData));

            const messageDiv = form.querySelector('.message');
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }

            if (!entityId) {
                if(messageDiv) {
                    messageDiv.textContent = 'Entity ID is required for an update.';
                    messageDiv.classList.add('error');
                }
                return;
            }

            try {
                const response = await fetch(actionUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                });

                const result = await response.json();

                if (response.ok) {
                    if (messageDiv) {
                        messageDiv.textContent = result.message || 'Update successful!';
                        messageDiv.classList.add('success');
                    }
                    // Optionally clear the form, but maybe not for updates
                    // form.reset(); 
                } else {
                    if (messageDiv) {
                        messageDiv.textContent = result.message || 'An error occurred.';
                        messageDiv.classList.add('error');
                    }
                }
            } catch (error) {
                console.error('Update form submission error:', error);
                if (messageDiv) {
                    messageDiv.textContent = 'A network error occurred.';
                    messageDiv.classList.add('error');
                }
            }
        });
    });
});