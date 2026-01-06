// Customer Dashboard Functionality

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if customer is already logged in
    if (isCustomerLoggedIn()) {
        showCustomerDashboard();
    } else {
        showLoginSection();
    }
    
    // Tab switching
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('customer-signin-form');
    const signupForm = document.getElementById('customer-signup-form');
    
    if (signinTab && signupTab) {
        signinTab.addEventListener('click', function() {
            signinTab.classList.add('active');
            signupTab.classList.remove('active');
            signinForm.classList.add('active');
            signupForm.classList.remove('active');
            
            // Toggle required attributes
            signinForm.querySelectorAll('input[required]').forEach(input => {
                input.setAttribute('required', 'required');
            });
            signupForm.querySelectorAll('input').forEach(input => {
                input.removeAttribute('required');
            });
        });
        
        signupTab.addEventListener('click', function() {
            signupTab.classList.add('active');
            signinTab.classList.remove('active');
            signupForm.classList.add('active');
            signinForm.classList.remove('active');
            
            // Toggle required attributes
            signupForm.querySelectorAll('input').forEach(input => {
                if (input.id !== 'signup-phone') {
                    input.setAttribute('required', 'required');
                }
            });
            signinForm.querySelectorAll('input[required]').forEach(input => {
                input.removeAttribute('required');
            });
        });
    }
    
    // Login form submission
    const loginBtn = document.getElementById('customer-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const email = document.getElementById('customer-email').value.trim();
            const password = document.getElementById('customer-password').value.trim();
            
            if (!email || !password) {
                showAuthMessage('Please fill in all fields', 'error');
                return;
            }
            
            const result = customerLogin(email, password);
            if (result.success) {
                showAuthMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    showCustomerDashboard();
                }, 500);
            } else {
                showAuthMessage(result.message || 'Invalid email or password', 'error');
            }
        });
    }
    
    // Signup form submission
    const signupBtn = document.getElementById('customer-signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            const phone = document.getElementById('signup-phone').value;
            
            if (!name || !email || !password || !confirmPassword) {
                showAuthMessage('Please fill in all required fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showAuthMessage('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showAuthMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            const result = createCustomerAccount(name, email, password, phone);
            if (result.success) {
                showAuthMessage('Account created successfully! Logging in...', 'success');
                setTimeout(() => {
                    customerLogin(email, password);
                    showCustomerDashboard();
                }, 500);
            } else {
                showAuthMessage(result.message || 'Error creating account', 'error');
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('customer-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            customerLogout();
            // Also clear admin items to prevent conflicts
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminEmail');
            // Redirect to unified login page
            window.location.href = 'login.html';
        });
    }
    
    // Dashboard tab switching
    const bookingsTab = document.getElementById('bookings-tab');
    const profileTab = document.getElementById('profile-tab');
    const bookingsPanel = document.getElementById('bookings-panel');
    const profilePanel = document.getElementById('profile-panel');
    
    if (bookingsTab && profileTab) {
        bookingsTab.addEventListener('click', function() {
            bookingsTab.classList.add('active');
            profileTab.classList.remove('active');
            bookingsPanel.classList.add('active');
            profilePanel.classList.remove('active');
            renderCustomerBookings();
        });
        
        profileTab.addEventListener('click', function() {
            profileTab.classList.add('active');
            bookingsTab.classList.remove('active');
            profilePanel.classList.add('active');
            bookingsPanel.classList.remove('active');
            renderProfile();
        });
    }
    
    // Booking search and filter
    const bookingSearch = document.getElementById('booking-search');
    const bookingStatusFilter = document.getElementById('booking-status-filter');
    
    let searchTimeout;
    if (bookingSearch) {
        bookingSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderCustomerBookings();
            }, 300);
        });
    }
    
    if (bookingStatusFilter) {
        bookingStatusFilter.addEventListener('change', function() {
            renderCustomerBookings();
        });
    }
    
    // Save profile button
    const saveProfileBtn = document.getElementById('save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            saveProfile();
        });
    }
    
    // Booking details modal close
    const bookingDetailsClose = document.getElementById('booking-details-close');
    if (bookingDetailsClose) {
        bookingDetailsClose.addEventListener('click', closeBookingDetailsModal);
    }
    
    // Edit booking modal close
    const editBookingClose = document.getElementById('edit-booking-close');
    if (editBookingClose) {
        editBookingClose.addEventListener('click', closeEditBookingModal);
    }
    
    const cancelEditBookingBtn = document.getElementById('cancel-edit-booking-btn');
    if (cancelEditBookingBtn) {
        cancelEditBookingBtn.addEventListener('click', closeEditBookingModal);
    }
    
    // Save booking changes
    const saveBookingBtn = document.getElementById('save-booking-btn');
    if (saveBookingBtn) {
        saveBookingBtn.addEventListener('click', function() {
            saveBookingChanges();
        });
    }
    
    // Close modals on outside click
    document.addEventListener('click', function(e) {
        const bookingDetailsModal = document.getElementById('booking-details-modal');
        const editBookingModal = document.getElementById('edit-booking-modal');
        
        if (bookingDetailsModal && e.target === bookingDetailsModal) {
            closeBookingDetailsModal();
        }
        if (editBookingModal && e.target === editBookingModal) {
            closeEditBookingModal();
        }
    });
});

// Show/Hide Functions
function showLoginSection() {
    const loginSection = document.getElementById('customer-login-section');
    const dashboardSection = document.getElementById('customer-dashboard');
    
    if (loginSection) {
        loginSection.style.display = 'flex';
        loginSection.style.visibility = 'visible';
    }
    if (dashboardSection) {
        dashboardSection.style.display = 'none';
        dashboardSection.style.visibility = 'hidden';
    }
}

function showCustomerDashboard() {
    const loginSection = document.getElementById('customer-login-section');
    const dashboardSection = document.getElementById('customer-dashboard');
    
    if (loginSection) {
        loginSection.style.display = 'none';
        loginSection.style.visibility = 'hidden';
    }
    if (dashboardSection) {
        dashboardSection.style.display = 'block';
        dashboardSection.style.visibility = 'visible';
    }
    
    // Render bookings initially
    renderCustomerBookings();
}

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('customer-auth-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
}

// Render Customer Bookings
let currentPage = 1;
const itemsPerPage = 10;

function renderCustomerBookings() {
    const tbody = document.getElementById('customer-bookings-table-body');
    if (!tbody) return;
    
    const customerEmail = getCurrentCustomerEmail();
    if (!customerEmail) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Please log in to view your bookings</td></tr>';
        return;
    }
    
    let bookings = getCustomerBookings(customerEmail);
    
    // Apply search filter
    const searchQuery = document.getElementById('booking-search')?.value.toLowerCase() || '';
    if (searchQuery) {
        bookings = bookings.filter(booking => 
            booking.vehicleName.toLowerCase().includes(searchQuery) ||
            booking.id.toLowerCase().includes(searchQuery)
        );
    }
    
    // Apply status filter
    const statusFilter = document.getElementById('booking-status-filter')?.value || '';
    if (statusFilter) {
        bookings = bookings.filter(booking => booking.status === statusFilter);
    }
    
    // Sort by date (newest first)
    bookings.sort((a, b) => new Date(b.createdAt || b.pickupDate) - new Date(a.createdAt || a.pickupDate));
    
    // Pagination
    const totalPages = Math.ceil(bookings.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = bookings.slice(startIndex, endIndex);
    
    if (paginatedBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No bookings found</td></tr>';
        renderPagination(0, 1);
        return;
    }
    
    tbody.innerHTML = paginatedBookings.map(booking => {
        const statusClass = getStatusClass(booking.status);
        const statusText = formatStatus(booking.status);
        
        let actionsHTML = `<button class="btn btn-small btn-primary" onclick="openBookingDetailsModal('${booking.id}')">View</button>`;
        
        // Allow cancel for pending or approved bookings
        if (booking.status === BOOKING_STATUS.PENDING || booking.status === BOOKING_STATUS.APPROVED) {
            actionsHTML += ` <button class="btn btn-small" onclick="cancelCustomerBooking('${booking.id}')" style="background: var(--error); color: white;">Cancel</button>`;
        }
        
        // Allow edit for pending bookings
        if (booking.status === BOOKING_STATUS.PENDING) {
            actionsHTML += ` <button class="btn btn-small btn-secondary" onclick="openEditBookingModal('${booking.id}')">Edit</button>`;
        }
        
        return `
            <tr>
                <td>${booking.id}</td>
                <td>${booking.vehicleName}</td>
                <td>${formatDate(booking.pickupDate)}</td>
                <td>${formatDate(booking.dropoffDate)}</td>
                <td>$${booking.totalPrice.toFixed(2)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="admin-actions">
                        ${actionsHTML}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    renderPagination(bookings.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
    const paginationEl = document.getElementById('bookings-pagination');
    if (!paginationEl) return;
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination-info">';
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    paginationHTML += `Showing ${startItem}-${endItem} of ${totalItems} bookings</div>`;
    
    paginationHTML += '<div class="pagination-buttons">';
    
    // Previous button
    paginationHTML += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Next button
    paginationHTML += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">Next</button>`;
    
    paginationHTML += '</div>';
    paginationEl.innerHTML = paginationHTML;
}

function goToPage(page) {
    const totalBookings = getCustomerBookings(getCurrentCustomerEmail()).length;
    const totalPages = Math.ceil(totalBookings / itemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderCustomerBookings();
    }
}

// Booking Details Modal
function openBookingDetailsModal(bookingId) {
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) {
        alert('Booking not found');
        return;
    }
    
    const modal = document.getElementById('booking-details-modal');
    const body = document.getElementById('booking-details-body');
    
    if (!modal || !body) return;
    
    const statusClass = getStatusClass(booking.status);
    const statusText = formatStatus(booking.status);
    
    body.innerHTML = `
        <div class="booking-detail-section">
            <h3>Booking Information</h3>
            <div class="detail-item">
                <span class="detail-label">Booking ID:</span>
                <span class="detail-value">${booking.id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value"><span class="status-badge ${statusClass}">${statusText}</span></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Vehicle:</span>
                <span class="detail-value">${booking.vehicleName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Total Price:</span>
                <span class="detail-value">$${booking.totalPrice.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="booking-detail-section">
            <h3>Pickup Details</h3>
            <div class="detail-item">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formatDate(booking.pickupDate)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${formatTime(booking.pickupTime)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${booking.pickupLocationText || booking.pickupLocation}</span>
            </div>
        </div>
        
        <div class="booking-detail-section">
            <h3>Drop-off Details</h3>
            <div class="detail-item">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formatDate(booking.dropoffDate)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${formatTime(booking.dropoffTime)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${booking.dropoffLocationText || booking.dropoffLocation}</span>
            </div>
        </div>
        
        <div class="booking-detail-section">
            <h3>Customer Information</h3>
            <div class="detail-item">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${booking.customerName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${booking.customerEmail}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${booking.customerPhone || 'N/A'}</span>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
}

function closeBookingDetailsModal() {
    const modal = document.getElementById('booking-details-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

// Edit Booking Modal
function openEditBookingModal(bookingId) {
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) {
        alert('Booking not found');
        return;
    }
    
    if (booking.status !== BOOKING_STATUS.PENDING) {
        alert('Only pending bookings can be edited');
        return;
    }
    
    const modal = document.getElementById('edit-booking-modal');
    if (!modal) return;
    
    // Set form values
    document.getElementById('edit-booking-id').value = booking.id;
    document.getElementById('edit-vehicle-id').value = booking.vehicleId;
    document.getElementById('edit-daily-rate').value = booking.dailyRate;
    document.getElementById('edit-pickup-date').value = booking.pickupDate;
    document.getElementById('edit-dropoff-date').value = booking.dropoffDate;
    
    // Initialize time dropdowns
    initializeTimeDropdowns();
    
    // Set time values
    setTimeout(() => {
        setDropdownValue('edit-pickup-time', 'edit-pickup-time-value', booking.pickupTime);
        setDropdownValue('edit-dropoff-time', 'edit-dropoff-time-value', booking.dropoffTime);
        setDropdownValue('edit-pickup-location', 'edit-pickup-location-value', booking.pickupLocation);
        setDropdownValue('edit-dropoff-location', 'edit-dropoff-location-value', booking.dropoffLocation);
        
        updateTotalPrice();
    }, 100);
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
}

function closeEditBookingModal() {
    const modal = document.getElementById('edit-booking-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

function initializeTimeDropdowns() {
    // Generate time options
    const timeOptions = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
            timeOptions.push({ value: timeString, display: displayTime });
        }
    }
    
    // Populate pickup time dropdown
    const pickupTimeDropdown = document.getElementById('edit-pickup-time-dropdown');
    if (pickupTimeDropdown) {
        pickupTimeDropdown.innerHTML = timeOptions.map(opt => 
            `<div class="dropdown-option" data-value="${opt.value}">${opt.display}</div>`
        ).join('');
        createCustomDropdown('edit-pickup-time', 'edit-pickup-time-dropdown', 'edit-pickup-time-value');
    }
    
    // Populate dropoff time dropdown
    const dropoffTimeDropdown = document.getElementById('edit-dropoff-time-dropdown');
    if (dropoffTimeDropdown) {
        dropoffTimeDropdown.innerHTML = timeOptions.map(opt => 
            `<div class="dropdown-option" data-value="${opt.value}">${opt.display}</div>`
        ).join('');
        createCustomDropdown('edit-dropoff-time', 'edit-dropoff-time-dropdown', 'edit-dropoff-time-value');
    }
    
    // Initialize location dropdowns
    createCustomDropdown('edit-pickup-location', 'edit-pickup-location-dropdown', 'edit-pickup-location-value');
    createCustomDropdown('edit-dropoff-location', 'edit-dropoff-location-dropdown', 'edit-dropoff-location-value');
    
    // Add event listeners for date changes to update total price
    document.getElementById('edit-pickup-date').addEventListener('change', updateTotalPrice);
    document.getElementById('edit-dropoff-date').addEventListener('change', updateTotalPrice);
}

function setDropdownValue(inputId, hiddenId, value) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const dropdown = document.getElementById(inputId + '-dropdown');
    
    if (!input || !hidden || !dropdown) return;
    
    const option = dropdown.querySelector(`.dropdown-option[data-value="${value}"]`);
    if (option) {
        input.value = option.textContent;
        hidden.value = value;
        dropdown.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
    }
}

function updateTotalPrice() {
    const pickupDate = document.getElementById('edit-pickup-date').value;
    const dropoffDate = document.getElementById('edit-dropoff-date').value;
    const dailyRate = parseFloat(document.getElementById('edit-daily-rate').value);
    
    if (pickupDate && dropoffDate && dailyRate) {
        const totalPrice = calculateTotalPrice(dailyRate, pickupDate, dropoffDate);
        document.getElementById('edit-total-price').value = `$${totalPrice.toFixed(2)}`;
    }
}

function saveBookingChanges() {
    const bookingId = document.getElementById('edit-booking-id').value;
    const pickupDate = document.getElementById('edit-pickup-date').value;
    const dropoffDate = document.getElementById('edit-dropoff-date').value;
    const pickupTime = document.getElementById('edit-pickup-time-value').value;
    const dropoffTime = document.getElementById('edit-dropoff-time-value').value;
    const pickupLocation = document.getElementById('edit-pickup-location-value').value;
    const dropoffLocation = document.getElementById('edit-dropoff-location-value').value;
    
    if (!pickupDate || !dropoffDate || !pickupTime || !dropoffTime || !pickupLocation || !dropoffLocation) {
        alert('Please fill in all fields');
        return;
    }
    
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    if (dropoff < pickup) {
        alert('Drop-off date must be after pickup date');
        return;
    }
    
    const bookings = getBookings();
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    
    if (bookingIndex === -1) {
        alert('Booking not found');
        return;
    }
    
    const booking = bookings[bookingIndex];
    const dailyRate = parseFloat(document.getElementById('edit-daily-rate').value);
    const totalPrice = calculateTotalPrice(dailyRate, pickupDate, dropoffDate);
    
    // Get text values from dropdowns
    const pickupTimeText = document.getElementById('edit-pickup-time').value;
    const dropoffTimeText = document.getElementById('edit-dropoff-time').value;
    const pickupLocationText = document.getElementById('edit-pickup-location').value;
    const dropoffLocationText = document.getElementById('edit-dropoff-location').value;
    
    // Update booking
    bookings[bookingIndex] = {
        ...booking,
        pickupDate: pickupDate,
        dropoffDate: dropoffDate,
        pickupTime: pickupTime,
        pickupTimeText: pickupTimeText,
        dropoffTime: dropoffTime,
        dropoffTimeText: dropoffTimeText,
        pickupLocation: pickupLocation,
        pickupLocationText: pickupLocationText,
        dropoffLocation: dropoffLocation,
        dropoffLocationText: dropoffLocationText,
        totalPrice: totalPrice,
        updatedAt: new Date().toISOString()
    };
    
    if (saveBookings(bookings)) {
        alert('Booking updated successfully!');
        closeEditBookingModal();
        renderCustomerBookings();
    } else {
        alert('Error updating booking');
    }
}

// Cancel Booking
function cancelCustomerBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    if (updateBookingStatus(bookingId, BOOKING_STATUS.CANCELLED)) {
        alert('Booking cancelled successfully');
        renderCustomerBookings();
    } else {
        alert('Error cancelling booking');
    }
}

// Profile Management
function renderProfile() {
    const customer = getCurrentCustomer();
    if (!customer) return;
    
    document.getElementById('profile-name').value = customer.name || '';
    document.getElementById('profile-email').value = customer.email || '';
    document.getElementById('profile-phone').value = customer.phone || '';
    document.getElementById('profile-current-password').value = '';
    document.getElementById('profile-new-password').value = '';
    document.getElementById('profile-confirm-password').value = '';
}

function saveProfile() {
    const customer = getCurrentCustomer();
    if (!customer) {
        alert('Please log in to update your profile');
        return;
    }
    
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const currentPassword = document.getElementById('profile-current-password').value;
    const newPassword = document.getElementById('profile-new-password').value;
    const confirmPassword = document.getElementById('profile-confirm-password').value;
    
    if (!name) {
        showProfileMessage('Name is required', 'error');
        return;
    }
    
    const updates = { name, phone };
    
    // Update password if provided
    if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showProfileMessage('All password fields are required to change password', 'error');
            return;
        }
        
        const accounts = getCustomerAccounts();
        const account = accounts.find(acc => acc.email === customer.email);
        
        if (!account || account.password !== currentPassword) {
            showProfileMessage('Current password is incorrect', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            showProfileMessage('New password must be at least 6 characters', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showProfileMessage('New passwords do not match', 'error');
            return;
        }
        
        updates.password = newPassword;
    }
    
    if (updateCustomerAccount(customer.email, updates)) {
        showProfileMessage('Profile updated successfully!', 'success');
        // Update localStorage if password changed
        if (updates.password) {
            const accounts = getCustomerAccounts();
            const account = accounts.find(acc => acc.email === customer.email);
            if (account) {
                localStorage.setItem('customerId', account.id);
            }
        }
    } else {
        showProfileMessage('Error updating profile', 'error');
    }
}

function showProfileMessage(message, type) {
    const messageEl = document.getElementById('profile-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
}

// Include createCustomDropdown function from script.js
function createCustomDropdown(inputId, dropdownId, hiddenInputId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!input || !dropdown || !hiddenInput) return;
    
    const wrapper = input.closest('.custom-dropdown-wrapper');
    if (!wrapper) return;
    
    // Wrap options in scroll container if not already wrapped
    let scrollContainer = dropdown.querySelector('.dropdown-scroll-container');
    if (!scrollContainer) {
        const options = Array.from(dropdown.querySelectorAll('.dropdown-option'));
        if (options.length > 0) {
            scrollContainer = document.createElement('div');
            scrollContainer.className = 'dropdown-scroll-container';
            options.forEach(opt => scrollContainer.appendChild(opt));
            dropdown.innerHTML = '';
            dropdown.appendChild(scrollContainer);
        } else {
            console.warn(`No options found for dropdown ${dropdownId}`);
            return;
        }
    }
    
    const options = scrollContainer.querySelectorAll('.dropdown-option');
    
    // Initialize opacity and scale for all options
    options.forEach((opt, index) => {
        opt.style.opacity = '0.5';
        opt.style.transform = 'scale(0.95)';
        if (opt.classList.contains('selected')) {
            opt.style.opacity = '1';
            opt.style.transform = 'scale(1)';
        }
    });
    
    // Toggle dropdown on input click
    input.addEventListener('click', function(e) {
        e.preventDefault();
        // Close other dropdowns
        document.querySelectorAll('.custom-dropdown-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('active');
        });
        wrapper.classList.toggle('active');
        
        if (wrapper.classList.contains('active')) {
            // Scroll to selected option
            const selected = scrollContainer.querySelector('.dropdown-option.selected');
            if (selected) {
                setTimeout(() => {
                    selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    updateOptionStyles(scrollContainer, options);
                }, 10);
            } else {
                // If no selection, scroll first option to center
                if (options.length > 0) {
                    setTimeout(() => {
                        options[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        updateOptionStyles(scrollContainer, options);
                    }, 10);
                }
            }
        }
    });
    
    // Update option styles based on scroll position - using requestAnimationFrame for smoothness
    let animationFrameId = null;
    function updateOptionStyles(container, opts) {
        if (animationFrameId) return; // Already scheduled
        
        animationFrameId = requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect();
            const centerY = containerRect.top + containerRect.height / 2;
            
            opts.forEach(option => {
                const optionRect = option.getBoundingClientRect();
                const optionCenterY = optionRect.top + optionRect.height / 2;
                const distance = Math.abs(centerY - optionCenterY);
                
                // Smoother opacity and scale calculations
                const opacity = Math.max(0.3, Math.min(1, 1 - (distance / 100)));
                const scale = Math.max(0.92, Math.min(1, 1 - (distance / 250)));
                
                option.style.opacity = opacity;
                option.style.transform = `scale(${scale})`;
                
                // Highlight closest option
                if (distance < 24) {
                    if (!option.classList.contains('selected')) {
                        opts.forEach(opt => opt.classList.remove('selected'));
                        option.classList.add('selected');
                    }
                    option.style.opacity = '1';
                    option.style.transform = 'scale(1)';
                }
            });
            
            animationFrameId = null;
        });
    }
    
    // Prevent page scrolling when at scroll limits
    function handleWheel(e) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isAtTop = scrollTop <= 1;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
        
        // If scrolling up at top or down at bottom, prevent default to stop page scroll
        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    
    // Add wheel event listener to prevent page scrolling
    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    // Handle option selection with scroll wheel effect
    options.forEach(option => {
        option.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            const text = this.textContent;
            
            input.value = text;
            if (hiddenInput) {
                hiddenInput.value = value;
            }
            
            // Update selected state
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
            
            // Scroll to center
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Close dropdown after a brief delay
            setTimeout(() => {
                wrapper.classList.remove('active');
            }, 200);
        });
    });
    
    // Scroll wheel behavior - update selection as user scrolls (throttled with requestAnimationFrame)
    let scrollTimeout;
    let isScrolling = false;
    scrollContainer.addEventListener('scroll', function() {
        updateOptionStyles(scrollContainer, options);
        
        // Update hidden input with selected value after scroll settles
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const selected = scrollContainer.querySelector('.dropdown-option.selected');
            if (selected && hiddenInput) {
                const value = selected.getAttribute('data-value');
                const text = selected.textContent;
                hiddenInput.value = value;
                input.value = text;
            }
            isScrolling = false;
        }, 150);
        
        if (!isScrolling) {
            isScrolling = true;
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
        }
    });
}

