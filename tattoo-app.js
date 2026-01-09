// --- 1. SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.error('Service Worker Failed', err));
    });
}

// --- 2. INITIALIZATION ---
const canvas = document.getElementById('tattoo-canvas');
const ctx = canvas?.getContext('2d');
const appointmentForm = document.getElementById('appointment-form');

// HELPER: Disable past dates in the calendar picker
const datePicker = document.getElementById('date');
if(datePicker) {
    datePicker.min = new Date().toISOString().split("T")[0];
}

// --- 3. DRAWING TOOL ---
if (canvas && ctx) {
    let isDrawing = false;
    const startDraw = () => isDrawing = true;
    const stopDraw = () => { isDrawing = false; ctx.beginPath(); };

    canvas.addEventListener('mousedown', startDraw);
    window.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = document.getElementById('color-picker').value;
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });

    document.getElementById('clear').onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('save').onclick = () => {
        const link = document.createElement('a');
        link.download = 'my-tattoo-sketch.png';
        link.href = canvas.toDataURL();
        link.click();
    };
}

// --- 4. BOOKING LOGIC WITH DOUBLE-BOOKING PROTECTION ---
appointmentForm?.addEventListener('submit', function (e) {
    e.preventDefault();

    const selectedDate = document.getElementById('date').value;
    const selectedTime = document.getElementById('time').value;
    const userPhone = document.getElementById('phone').value;

    // Retrieve existing local bookings
    const localAppts = JSON.parse(localStorage.getItem('appointments')) || [];

    // CRITICAL FIX: Check if the exact date and time already exist
    const isConflict = localAppts.some(appt => 
        appt.booking_date === selectedDate && appt.booking_time === selectedTime
    );

    if (isConflict) {
        alert(`❌ Slot Already Taken: ${selectedTime} on ${selectedDate} is already booked. Please choose another time.`);
        return; // This stops the code from sending an email or saving a duplicate
    }

    const apptData = {
        user_name: document.getElementById('name').value,
        user_phone: userPhone,
        booking_date: selectedDate,
        booking_time: selectedTime,
        description: document.getElementById('tattoo-description').value
    };

    // Send via EmailJS
    emailjs.send("service_bmhafjm", "template_oztapjd", apptData)
        .then(() => {
            alert("✅ Booking Success! We will call you on " + userPhone);

            // Save locally
            localAppts.push({ ...apptData, id: Date.now() });
            localStorage.setItem('appointments', JSON.stringify(localAppts));

            appointmentForm.reset();
        })
        .catch((err) => {
            console.error("FAILED...", err);
            alert("❌ Submission error. Check your internet connection.");
        });
});

// --- 5. MANAGE BOOKINGS ---
function loadAppointments() {
    const userPhone = document.getElementById('manage-phone')?.value.trim();
    const list = document.getElementById('appointments');
    const appts = JSON.parse(localStorage.getItem('appointments')) || [];

    if (!userPhone) { alert("Please enter your phone number."); return; }

    const filtered = appts.filter(a => a.user_phone === userPhone);
    list.innerHTML = filtered.length === 0
        ? '<li>No bookings found for this number.</li>'
        : filtered.map(a => `
            <li class="appointment-card">
                <div>
                    <strong>Date:</strong> ${a.booking_date} | <strong>Time:</strong> ${a.booking_time}
                </div>
                <button class="delete-btn" onclick="deleteBooking(${a.id})">Cancel</button>
            </li>`).join('');
}

window.deleteBooking = function(id) {
    let appts = JSON.parse(localStorage.getItem('appointments')) || [];
    appts = appts.filter(a => a.id !== id);
    localStorage.setItem('appointments', JSON.stringify(appts));
    loadAppointments();
};
