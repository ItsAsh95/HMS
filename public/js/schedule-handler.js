document.addEventListener('DOMContentLoaded', () => {
    const scheduleForm = document.getElementById('schedule-form');
    if (!scheduleForm) return; // Exit if not on the right page

    const loadBtn = document.getElementById('load-schedule-btn');
    const scheduleInputs = document.getElementById('schedule-inputs');
    const messageDiv = document.getElementById('schedule-message');

    document.querySelectorAll('.form-check-input[data-day]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const dayIndex = e.target.dataset.day;
            const startInput = document.getElementById(`day-${dayIndex}-start`);
            const endInput = document.getElementById(`day-${dayIndex}-end`);
            startInput.disabled = !e.target.checked;
            endInput.disabled = !e.target.checked;
        });
    });

    const populateScheduleForm = (scheduleData) => {
        for (let i = 0; i < 7; i++) {
            const checkbox = document.getElementById(`day-${i}-active`);
            const startInput = document.getElementById(`day-${i}-start`);
            const endInput = document.getElementById(`day-${i}-end`);
            checkbox.checked = false;
            startInput.value = '';
            endInput.value = '';
            startInput.disabled = true;
            endInput.disabled = true;
        }
        scheduleData.forEach(day => {
            const checkbox = document.getElementById(`day-${day.day_of_week}-active`);
            const startInput = document.getElementById(`day-${day.day_of_week}-start`);
            const endInput = document.getElementById(`day-${day.day_of_week}-end`);
            checkbox.checked = true;
            startInput.disabled = false;
            endInput.disabled = false;
            startInput.value = day.start_time;
            endInput.value = day.end_time;
        });
    };

    loadBtn.addEventListener('click', async () => {
        const doctorId = document.getElementById('schedule-doctor-id').value;
        if (!doctorId) {
            alert('Please enter a Doctor ID.');
            return;
        }
        try {
            const response = await fetch(`/api/doctors/${doctorId}/schedule`);
            if (response.ok) {
                const scheduleData = await response.json();
                populateScheduleForm(scheduleData);
                scheduleInputs.classList.remove('d-none');
                messageDiv.className = 'message';
            } else {
                alert('Doctor not found or error fetching schedule.');
                scheduleInputs.classList.add('d-none');
            }
        } catch (error) {
            console.error('Error fetching schedule:', error);
            alert('A network error occurred.');
        }
    });

    scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const doctorId = document.getElementById('schedule-doctor-id').value;
        if (!doctorId) {
            alert('Please load a doctor\'s schedule first.');
            return;
        }
        
        const schedules = {};
        for (let i = 0; i < 7; i++) {
            if (document.getElementById(`day-${i}-active`).checked) {
                const start = document.getElementById(`day-${i}-start`).value;
                const end = document.getElementById(`day-${i}-end`).value;
                if (start && end) schedules[i] = { start, end };
            }
        }

        try {
            const response = await fetch(`/api/doctors/${doctorId}/schedule`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedules })
            });
            const result = await response.json();
            messageDiv.textContent = result.message;
            messageDiv.className = response.ok ? 'message success' : 'message error';
        } catch (error) {
            console.error('Error updating schedule:', error);
            messageDiv.textContent = 'A network error occurred.';
            messageDiv.className = 'message error';
        }
    });
});