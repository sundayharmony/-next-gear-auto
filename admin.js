// Admin Dashboard Functionality

// Initialize storage
function initializeStorage() {
    if (!localStorage.getItem('vehicles')) {
        const defaultVehicles = [
            { id: 'tesla-model-3', name: 'Tesla Model 3', type: 'Electric', seats: 5, transmission: 'Automatic', rate: 95, image: '' },
            { id: 'toyota-highlander', name: 'Toyota Highlander', type: 'SUV', seats: 7, transmission: 'Automatic', rate: 85, image: '' },
            { id: 'ram-1500', name: 'Ram 1500', type: 'Truck', seats: 5, transmission: 'Automatic', rate: 110, image: '' },
            { id: 'bmw-3-series', name: 'BMW 3 Series', type: 'Sedan', seats: 5, transmission: 'Automatic', rate: 120, image: '' },
            { id: 'ford-mustang', name: 'Ford Mustang', type: 'Sports', seats: 4, transmission: 'Manual', rate: 130, image: '' },
            { id: 'honda-cr-v', name: 'Honda CR-V', type: 'SUV', seats: 5, transmission: 'Automatic', rate: 75, image: '' }
        ];
        saveVehicles(defaultVehicles);
    }
    if (!localStorage.getItem('bookings')) {
        saveBookings([]);
    }
}

// Admin Authentication
function isAdminLoggedIn() {
    return localStorage.getItem('adminLoggedIn') === 'true';
}

function adminLogin(email, password) {
    // Hardcoded admin credentials
    if (email === 'admin@example.com' && password === 'admin123') {
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminEmail', email);
        return true;
    }
    
    // Check stored admin accounts
    const adminAccounts = JSON.parse(localStorage.getItem('adminAccounts') || '[]');
    const account = adminAccounts.find(acc => acc.email === email && acc.password === password);
    
    if (account) {
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminEmail', email);
        return true;
    }
    
    return false;
}

function adminSignUp(name, email, password, confirmPassword) {
    if (password !== confirmPassword) {
        return { success: false, message: 'Passwords do not match' };
    }
    
    if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
    }
    
    const adminAccounts = JSON.parse(localStorage.getItem('adminAccounts') || '[]');
    
    if (adminAccounts.find(acc => acc.email === email)) {
        return { success: false, message: 'Email already registered' };
    }
    
    adminAccounts.push({ name, email, password });
    localStorage.setItem('adminAccounts', JSON.stringify(adminAccounts));
    
    // Auto login after signup
    localStorage.setItem('adminLoggedIn', 'true');
    localStorage.setItem('adminEmail', email);
    
    return { success: true };
}

function adminLogout() {
    // Clear all admin authentication
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminEmail');
    // Also clear customer items to prevent conflicts
    localStorage.removeItem('customerLoggedIn');
    localStorage.removeItem('customerEmail');
    localStorage.removeItem('customerId');
    // Redirect to unified login page
    window.location.href = 'login.html';
}

function showLoginSection() {
    const loginSection = document.getElementById('admin-login-section');
    const dashboardSection = document.getElementById('admin-dashboard');
    
    if (loginSection) {
        loginSection.style.display = 'flex';
        loginSection.style.visibility = 'visible';
    }
    if (dashboardSection) {
        dashboardSection.style.display = 'none';
        dashboardSection.style.visibility = 'hidden';
    }
}

function showAdminDashboard() {
    const loginSection = document.getElementById('admin-login-section');
    const dashboardSection = document.getElementById('admin-dashboard');
    
    if (loginSection) {
        loginSection.style.display = 'none';
        loginSection.style.visibility = 'hidden';
    }
    if (dashboardSection) {
        dashboardSection.style.display = 'block';
        dashboardSection.style.visibility = 'visible';
    }
    
    // Render vehicle management initially
    renderVehicleManagement();
}

// Vehicle Management
function renderVehicleManagement() {
    const tbody = document.getElementById('vehicles-table-body');
    if (!tbody) return;
    
    const vehicles = getVehicles();
    
    if (vehicles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">No vehicles found</td></tr>';
        return;
    }
    
    tbody.innerHTML = vehicles.map(vehicle => {
        const imageHTML = vehicle.image
            ? `<img src="${vehicle.image}" alt="${vehicle.name}" class="admin-vehicle-thumbnail">`
            : '<div class="admin-vehicle-thumbnail-placeholder">No Image</div>';
        
        return `
            <tr>
                <td>${imageHTML}</td>
                <td>${vehicle.name}</td>
                <td>${vehicle.type}</td>
                <td>${vehicle.seats}</td>
                <td>${vehicle.transmission}</td>
                <td>$${vehicle.rate}/day</td>
                <td>
                    <div class="admin-actions">
                        <button class="btn btn-small btn-primary" onclick="openEditVehicleModal('${vehicle.id}')">Edit</button>
                        <button class="btn btn-small" style="background: var(--error); color: white;" onclick="deleteVehicle('${vehicle.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function addVehicle(vehicleData) {
    const vehicles = getVehicles();
    const newVehicle = {
        id: vehicleData.name.toLowerCase().replace(/\s+/g, '-'),
        name: vehicleData.name,
        type: vehicleData.type,
        seats: parseInt(vehicleData.seats),
        transmission: vehicleData.transmission,
        rate: parseFloat(vehicleData.rate),
        image: vehicleData.image || ''
    };
    
    vehicles.push(newVehicle);
    if (saveVehicles(vehicles)) {
        renderVehicleManagement();
        return true;
    }
    return false;
}

function editVehicle(vehicleId, vehicleData) {
    const vehicles = getVehicles();
    const index = vehicles.findIndex(v => v.id === vehicleId);
    
    if (index === -1) return false;
    
    vehicles[index] = {
        ...vehicles[index],
        name: vehicleData.name,
        type: vehicleData.type,
        seats: parseInt(vehicleData.seats),
        transmission: vehicleData.transmission,
        rate: parseFloat(vehicleData.rate),
        image: vehicleData.image || vehicles[index].image
    };
    
    if (saveVehicles(vehicles)) {
        renderVehicleManagement();
        return true;
    }
    return false;
}

function deleteVehicle(vehicleId) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    const vehicles = getVehicles();
    const filtered = vehicles.filter(v => v.id !== vehicleId);
    
    if (saveVehicles(filtered)) {
        renderVehicleManagement();
        return true;
    }
    return false;
}

function openAddVehicleModal() {
    const modal = document.getElementById('vehicle-modal');
    const form = document.getElementById('vehicle-form');
    const title = document.getElementById('vehicle-modal-title');
    
    if (modal && form && title) {
        form.reset();
        form.removeAttribute('data-vehicle-id');
        title.textContent = 'Add Vehicle';
        document.getElementById('vehicle-image-preview').innerHTML = '';
        
        // Reset transmission dropdown
        const transmissionInput = document.getElementById('vehicle-transmission');
        const transmissionHidden = document.getElementById('vehicle-transmission-value');
        if (transmissionInput && transmissionHidden) {
            transmissionInput.value = '';
            transmissionHidden.value = '';
            const dropdown = document.getElementById('vehicle-transmission-dropdown');
            if (dropdown) {
                const options = dropdown.querySelectorAll('.dropdown-option');
                options.forEach(opt => opt.classList.remove('selected'));
            }
            // Remove initialization flag so it can be re-initialized
            transmissionInput.removeAttribute('data-dropdown-initialized');
        }
        
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Initialize transmission dropdown after modal opens
        setTimeout(() => {
            initTransmissionDropdown();
        }, 100);
    }
}

function openEditVehicleModal(vehicleId) {
    const vehicles = getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!vehicle) return;
    
    const modal = document.getElementById('vehicle-modal');
    const form = document.getElementById('vehicle-form');
    const title = document.getElementById('vehicle-modal-title');
    
    if (modal && form && title) {
        document.getElementById('vehicle-name').value = vehicle.name;
        document.getElementById('vehicle-type').value = vehicle.type;
        document.getElementById('vehicle-seats').value = vehicle.seats;
        
        // Set transmission dropdown
        const transmissionInput = document.getElementById('vehicle-transmission');
        const transmissionHidden = document.getElementById('vehicle-transmission-value');
        if (transmissionInput && transmissionHidden) {
            transmissionInput.value = vehicle.transmission;
            transmissionHidden.value = vehicle.transmission;
            // Mark the selected option
            const dropdown = document.getElementById('vehicle-transmission-dropdown');
            if (dropdown) {
                const options = dropdown.querySelectorAll('.dropdown-option');
                options.forEach(opt => {
                    opt.classList.remove('selected');
                    if (opt.getAttribute('data-value') === vehicle.transmission) {
                        opt.classList.add('selected');
                    }
                });
            }
        }
        
        document.getElementById('vehicle-rate').value = vehicle.rate;
        
        const preview = document.getElementById('vehicle-image-preview');
        if (vehicle.image) {
            preview.innerHTML = `
                <img src="${vehicle.image}" alt="Vehicle preview" class="vehicle-preview-image">
                <button type="button" class="remove-image-btn" id="remove-vehicle-image">Remove</button>
            `;
        } else {
            preview.innerHTML = '';
        }
        
        form.setAttribute('data-vehicle-id', vehicleId);
        title.textContent = 'Edit Vehicle';
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Initialize transmission dropdown after modal opens
        setTimeout(() => {
            initTransmissionDropdown();
        }, 100);
    }
}

function closeVehicleModal() {
    const modal = document.getElementById('vehicle-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

// Booking Management
let currentPage = 1;
const itemsPerPage = 10;

function renderBookingStats() {
    const statsContainer = document.getElementById('booking-stats');
    if (!statsContainer) return;
    
    const bookings = getBookings();
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === BOOKING_STATUS.PENDING).length;
    const approved = bookings.filter(b => b.status === BOOKING_STATUS.APPROVED).length;
    const cancelled = bookings.filter(b => b.status === BOOKING_STATUS.CANCELLED).length;
    const inProgress = bookings.filter(b => b.status === BOOKING_STATUS.IN_PROGRESS).length;
    const completed = bookings.filter(b => b.status === BOOKING_STATUS.COMPLETED).length;
    
    const revenue = bookings
        .filter(b => b.status === BOOKING_STATUS.APPROVED || b.status === BOOKING_STATUS.COMPLETED)
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <h3>Total Bookings</h3>
            <p>${total}</p>
        </div>
        <div class="stat-item">
            <h3>Pending</h3>
            <p>${pending}</p>
        </div>
        <div class="stat-item">
            <h3>Approved</h3>
            <p>${approved}</p>
        </div>
        <div class="stat-item">
            <h3>Cancelled</h3>
            <p>${cancelled}</p>
        </div>
        <div class="stat-item">
            <h3>In Progress</h3>
            <p>${inProgress}</p>
        </div>
        <div class="stat-item">
            <h3>Completed</h3>
            <p>${completed}</p>
        </div>
        <div class="stat-item stat-revenue">
            <h3>Total Revenue</h3>
            <p>$${revenue.toFixed(2)}</p>
        </div>
    `;
}

function searchBookings(bookings, query) {
    if (!query) return bookings;
    const lowerQuery = query.toLowerCase();
    return bookings.filter(booking => {
        return booking.id.toLowerCase().includes(lowerQuery) ||
               booking.vehicleName.toLowerCase().includes(lowerQuery) ||
               booking.customerName.toLowerCase().includes(lowerQuery) ||
               booking.customerEmail.toLowerCase().includes(lowerQuery);
    });
}

function filterBookingsByDateRange(bookings, dateFrom, dateTo) {
    if (!dateFrom && !dateTo) return bookings;
    
    return bookings.filter(booking => {
        const pickupDate = new Date(booking.pickupDate);
        if (dateFrom && pickupDate < new Date(dateFrom)) return false;
        if (dateTo && pickupDate > new Date(dateTo)) return false;
        return true;
    });
}

function sortBookings(bookings, sortBy, sortOrder) {
    const sorted = [...bookings];
    sorted.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (sortBy === 'createdAt' || sortBy === 'pickupDate') {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
        }
        
        if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    return sorted;
}

function renderBookingManagement(searchQuery = '', dateFrom = '', dateTo = '', sortBy = 'createdAt', sortOrder = 'desc') {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;
    
    let bookings = getBookings();
    
    // Apply filters
    if (searchQuery) {
        bookings = searchBookings(bookings, searchQuery);
    }
    
    if (dateFrom || dateTo) {
        bookings = filterBookingsByDateRange(bookings, dateFrom, dateTo);
    }
    
    // Apply status filter
    const statusFilter = document.getElementById('booking-status-filter')?.value;
    if (statusFilter) {
        bookings = bookings.filter(b => b.status === statusFilter);
    }
    
    // Sort
    bookings = sortBookings(bookings, sortBy, sortOrder);
    
    // Render stats
    renderBookingStats();
    
    // Pagination
    const totalItems = bookings.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = bookings.slice(startIndex, endIndex);
    
    // Update pagination info
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems} bookings`;
    }
    
    // Update pagination buttons
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    if (paginatedBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">No bookings found</td></tr>';
        return;
    }
    
    tbody.innerHTML = paginatedBookings.map(booking => {
        const statusClass = getStatusClass(booking.status);
        const statusText = formatStatus(booking.status);
        
        let actionButtons = '';
        if (booking.status === BOOKING_STATUS.PENDING) {
            actionButtons = `
                <button class="btn btn-small btn-primary approve-booking-btn" data-booking-id="${booking.id}">Approve</button>
                <button class="btn btn-small" style="background: var(--error); color: white;" data-booking-id="${booking.id}" onclick="cancelBooking('${booking.id}')">Cancel</button>
                <button class="btn btn-small btn-secondary edit-booking-btn" data-booking-id="${booking.id}">Edit</button>
            `;
        } else if (booking.status === BOOKING_STATUS.APPROVED) {
            actionButtons = `
                <button class="btn btn-small btn-primary" data-booking-id="${booking.id}" onclick="startBooking('${booking.id}')">Start</button>
            `;
        } else if (booking.status === BOOKING_STATUS.IN_PROGRESS) {
            actionButtons = `
                <button class="btn btn-small" style="background: var(--success); color: white;" data-booking-id="${booking.id}" onclick="completeBooking('${booking.id}')">Complete</button>
            `;
        }
        
        return `
            <tr>
                <td>${booking.id}</td>
                <td>${booking.vehicleName}</td>
                <td>${booking.customerName}<br><small style="color: var(--text-secondary);">${booking.customerEmail}</small></td>
                <td>${formatDate(booking.pickupDate)}<br><small style="color: var(--text-secondary);">${formatTime(booking.pickupTime)}</small></td>
                <td>${formatDate(booking.dropoffDate)}<br><small style="color: var(--text-secondary);">${formatTime(booking.dropoffTime)}</small></td>
                <td>$${(booking.totalPrice || 0).toFixed(2)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="admin-actions">
                        <button class="btn btn-small btn-secondary view-booking-btn" data-booking-id="${booking.id}">View</button>
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function refreshBookingManagement() {
    const searchQuery = document.getElementById('booking-search')?.value || '';
    const dateFrom = document.getElementById('booking-date-from')?.value || '';
    const dateTo = document.getElementById('booking-date-to')?.value || '';
    const sortBy = document.getElementById('booking-sort-by')?.value || 'createdAt';
    const sortOrder = document.getElementById('booking-sort-order')?.value || 'desc';
    
    renderBookingManagement(searchQuery, dateFrom, dateTo, sortBy, sortOrder);
}

function approveBooking(bookingId) {
    if (updateBookingStatus(bookingId, BOOKING_STATUS.APPROVED)) {
        refreshBookingManagement();
    }
}

function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    if (updateBookingStatus(bookingId, BOOKING_STATUS.CANCELLED)) {
        refreshBookingManagement();
    }
}

function startBooking(bookingId) {
    if (updateBookingStatus(bookingId, BOOKING_STATUS.IN_PROGRESS)) {
        refreshBookingManagement();
    }
}

function completeBooking(bookingId) {
    if (updateBookingStatus(bookingId, BOOKING_STATUS.COMPLETED)) {
        refreshBookingManagement();
    }
}

function openBookingDetailsModal(bookingId) {
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) return;
    
    const modal = document.getElementById('booking-details-modal');
    const content = document.getElementById('booking-details-content');
    
    if (!modal || !content) return;
    
    const createdAt = formatDate(booking.createdAt);
    const updatedAt = booking.updatedAt ? formatDate(booking.updatedAt) : 'N/A';
    const statusClass = getStatusClass(booking.status);
    const statusText = formatStatus(booking.status);
    
    content.innerHTML = `
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
                <span class="detail-label">Created:</span>
                <span class="detail-value">${createdAt}</span>
            </div>
            ${updatedAt !== 'N/A' ? `
            <div class="detail-item">
                <span class="detail-label">Last Updated:</span>
                <span class="detail-value">${updatedAt}</span>
            </div>
            ` : ''}
        </div>
        <div class="booking-detail-section">
            <h3>Vehicle Information</h3>
            <div class="detail-item">
                <span class="detail-label">Vehicle:</span>
                <span class="detail-value">${booking.vehicleName}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Vehicle ID:</span>
                <span class="detail-value">${booking.vehicleId}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Daily Rate:</span>
                <span class="detail-value">$${(booking.dailyRate || 0).toFixed(2)}/day</span>
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
        <div class="booking-detail-section">
            <h3>Rental Details</h3>
            <div class="detail-item">
                <span class="detail-label">Pickup Date:</span>
                <span class="detail-value">${formatDate(booking.pickupDate)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Pickup Time:</span>
                <span class="detail-value">${formatTime(booking.pickupTime)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Pickup Location:</span>
                <span class="detail-value">${booking.pickupLocationText || booking.pickupLocation || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Dropoff Date:</span>
                <span class="detail-value">${formatDate(booking.dropoffDate)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Dropoff Time:</span>
                <span class="detail-value">${formatTime(booking.dropoffTime)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Dropoff Location:</span>
                <span class="detail-value">${booking.dropoffLocationText || booking.dropoffLocation || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Total Price:</span>
                <span class="detail-value">$${(booking.totalPrice || 0).toFixed(2)}</span>
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

function openEditBookingModal(bookingId) {
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) return;
    
    const modal = document.getElementById('edit-booking-modal');
    const form = document.getElementById('edit-booking-form');
    
    if (!modal || !form) return;
    
    // Format dates for input fields
    const pickupDate = new Date(booking.pickupDate).toISOString().split('T')[0];
    const dropoffDate = new Date(booking.dropoffDate).toISOString().split('T')[0];
    
    document.getElementById('edit-pickup-date').value = pickupDate;
    document.getElementById('edit-pickup-time').value = booking.pickupTime || '10:00';
    document.getElementById('edit-dropoff-date').value = dropoffDate;
    document.getElementById('edit-dropoff-time').value = booking.dropoffTime || '10:00';
    document.getElementById('edit-pickup-location').value = booking.pickupLocationText || booking.pickupLocation || '';
    document.getElementById('edit-dropoff-location').value = booking.dropoffLocationText || booking.dropoffLocation || '';
    
    form.setAttribute('data-booking-id', bookingId);
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

function updateBooking(bookingId, bookingData) {
    const bookings = getBookings();
    const index = bookings.findIndex(b => b.id === bookingId);
    
    if (index === -1) return false;
    
    const booking = bookings[index];
    const pickupDate = new Date(bookingData.pickupDate);
    const dropoffDate = new Date(bookingData.dropoffDate);
    const totalPrice = calculateTotalPrice(booking.dailyRate, bookingData.pickupDate, bookingData.dropoffDate);
    
    bookings[index] = {
        ...booking,
        pickupDate: bookingData.pickupDate,
        pickupTime: bookingData.pickupTime,
        dropoffDate: bookingData.dropoffDate,
        dropoffTime: bookingData.dropoffTime,
        pickupLocation: bookingData.pickupLocation,
        dropoffLocation: bookingData.dropoffLocation,
        totalPrice: totalPrice,
        updatedAt: new Date().toISOString()
    };
    
    if (saveBookings(bookings)) {
        refreshBookingManagement();
        return true;
    }
    return false;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeStorage();
    
    // Check if already logged in
    if (isAdminLoggedIn()) {
        showAdminDashboard();
    } else {
        showLoginSection();
    }
    
    // Tab switching for auth forms
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('admin-signin-form');
    const signupForm = document.getElementById('admin-signup-form');
    
    if (signinTab && signupTab && signinForm && signupForm) {
        signinTab.addEventListener('click', function() {
            signinTab.classList.add('active');
            signupTab.classList.remove('active');
            signinForm.classList.add('active');
            signupForm.classList.remove('active');
            
            // Toggle required attributes
            signinForm.querySelectorAll('input').forEach(input => input.setAttribute('required', ''));
            signupForm.querySelectorAll('input').forEach(input => input.removeAttribute('required'));
        });
        
        signupTab.addEventListener('click', function() {
            signupTab.classList.add('active');
            signinTab.classList.remove('active');
            signupForm.classList.add('active');
            signinForm.classList.remove('active');
            
            // Toggle required attributes
            signupForm.querySelectorAll('input').forEach(input => input.setAttribute('required', ''));
            signinForm.querySelectorAll('input').forEach(input => input.removeAttribute('required'));
        });
    }
    
    // Admin Login
    const adminLoginBtn = document.getElementById('admin-login-btn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            
            if (!email || !password) {
                alert('Please enter email and password');
                return;
            }
            
            if (adminLogin(email, password)) {
                alert('Login successful! Redirecting...');
                setTimeout(() => {
                    showAdminDashboard();
                }, 500);
            } else {
                alert('Invalid email or password');
            }
        });
    }
    
    // Admin Sign Up
    const adminSignupBtn = document.getElementById('admin-signup-btn');
    if (adminSignupBtn) {
        adminSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            
            if (!name || !email || !password || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            
            const result = adminSignUp(name, email, password, confirmPassword);
            if (result.success) {
                alert('Account created successfully! Redirecting...');
                setTimeout(() => {
                    showAdminDashboard();
                }, 500);
            } else {
                alert(result.message);
            }
        });
    }
    
    // Admin Logout
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', function() {
            adminLogout();
        });
    }
    
    // Tab switching for admin panels
    const vehiclesTab = document.getElementById('vehicles-tab');
    const bookingsTab = document.getElementById('bookings-tab');
    const vehiclePanel = document.getElementById('vehicle-management-panel');
    const bookingPanel = document.getElementById('booking-management-panel');
    
    if (vehiclesTab && bookingsTab && vehiclePanel && bookingPanel) {
        vehiclesTab.addEventListener('click', function() {
            vehiclesTab.classList.add('active');
            bookingsTab.classList.remove('active');
            vehiclePanel.classList.add('active');
            bookingPanel.classList.remove('active');
            renderVehicleManagement();
        });
        
        bookingsTab.addEventListener('click', function() {
            bookingsTab.classList.add('active');
            vehiclesTab.classList.remove('active');
            bookingPanel.classList.add('active');
            vehiclePanel.classList.remove('active');
            currentPage = 1;
            refreshBookingManagement();
        });
    }
    
    // Vehicle Form
    const vehicleForm = document.getElementById('vehicle-form');
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const vehicleId = this.getAttribute('data-vehicle-id');
            const formData = new FormData(this);
            
            // Handle image upload
            const imageFile = document.getElementById('vehicle-image').files[0];
            let imageBase64 = '';
            
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imageBase64 = e.target.result;
                    saveVehicleData(vehicleId, formData, imageBase64);
                };
                reader.readAsDataURL(imageFile);
            } else {
                // Use existing image if editing
                if (vehicleId) {
                    const vehicles = getVehicles();
                    const vehicle = vehicles.find(v => v.id === vehicleId);
                    imageBase64 = vehicle ? vehicle.image : '';
                }
                saveVehicleData(vehicleId, formData, imageBase64);
            }
        });
    }
    
    function saveVehicleData(vehicleId, formData, imageBase64) {
        // Get transmission from hidden input (custom dropdown)
        const transmissionValue = document.getElementById('vehicle-transmission-value') 
            ? document.getElementById('vehicle-transmission-value').value 
            : formData.get('transmission');
        
        const vehicleData = {
            name: formData.get('name'),
            type: formData.get('type'),
            seats: formData.get('seats'),
            transmission: transmissionValue,
            rate: formData.get('rate'),
            image: imageBase64
        };
        
        let success = false;
        if (vehicleId) {
            success = editVehicle(vehicleId, vehicleData);
        } else {
            success = addVehicle(vehicleData);
        }
        
        if (success) {
            closeVehicleModal();
        } else {
            alert('Error saving vehicle');
        }
    }
    
    // Add Vehicle Button
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    if (addVehicleBtn) {
        addVehicleBtn.addEventListener('click', openAddVehicleModal);
    }
    
    // Vehicle Modal Close
    const vehicleModalClose = document.getElementById('vehicle-modal-close');
    const cancelVehicleBtn = document.getElementById('cancel-vehicle-btn');
    
    if (vehicleModalClose) {
        vehicleModalClose.addEventListener('click', closeVehicleModal);
    }
    
    if (cancelVehicleBtn) {
        cancelVehicleBtn.addEventListener('click', closeVehicleModal);
    }
    
    // Vehicle Image Preview
    const vehicleImageInput = document.getElementById('vehicle-image');
    const vehicleImagePreview = document.getElementById('vehicle-image-preview');
    
    if (vehicleImageInput && vehicleImagePreview) {
        vehicleImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    vehicleImagePreview.innerHTML = `
                        <img src="${e.target.result}" alt="Vehicle preview" class="vehicle-preview-image">
                        <button type="button" class="remove-image-btn" id="remove-vehicle-image">Remove</button>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Remove image handler
        document.addEventListener('click', function(e) {
            if (e.target.id === 'remove-vehicle-image') {
                if (vehicleImageInput) vehicleImageInput.value = '';
                if (vehicleImagePreview) vehicleImagePreview.innerHTML = '';
            }
        });
    }
    
    // Booking Status Filter
    const bookingStatusFilter = document.getElementById('booking-status-filter');
    if (bookingStatusFilter) {
        bookingStatusFilter.addEventListener('change', function(e) {
            currentPage = 1;
            refreshBookingManagement();
        });
    }
    
    // Booking Search
    const bookingSearch = document.getElementById('booking-search');
    if (bookingSearch) {
        let searchTimeout;
        bookingSearch.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                refreshBookingManagement();
            }, 300);
        });
    }
    
    // Booking Date Filters
    const bookingDateFrom = document.getElementById('booking-date-from');
    const bookingDateTo = document.getElementById('booking-date-to');
    
    if (bookingDateFrom) {
        bookingDateFrom.addEventListener('change', function() {
            currentPage = 1;
            refreshBookingManagement();
        });
    }
    
    if (bookingDateTo) {
        bookingDateTo.addEventListener('change', function() {
            currentPage = 1;
            refreshBookingManagement();
        });
    }
    
    // Booking Sort
    const bookingSortBy = document.getElementById('booking-sort-by');
    const bookingSortOrder = document.getElementById('booking-sort-order');
    
    if (bookingSortBy) {
        bookingSortBy.addEventListener('change', function() {
            refreshBookingManagement();
        });
    }
    
    if (bookingSortOrder) {
        bookingSortOrder.addEventListener('change', function() {
            refreshBookingManagement();
        });
    }
    
    // Booking Actions (using event delegation)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('approve-booking-btn')) {
            const bookingId = e.target.getAttribute('data-booking-id');
            approveBooking(bookingId);
        }
        
        if (e.target.classList.contains('cancel-booking-btn')) {
            const bookingId = e.target.getAttribute('data-booking-id');
            cancelBooking(bookingId);
        }
        
        if (e.target.classList.contains('view-booking-btn')) {
            const bookingId = e.target.getAttribute('data-booking-id');
            openBookingDetailsModal(bookingId);
        }
        
        if (e.target.classList.contains('edit-booking-btn')) {
            const bookingId = e.target.getAttribute('data-booking-id');
            openEditBookingModal(bookingId);
        }
    });
    
    // Edit Booking Form Handler
    const editBookingForm = document.getElementById('edit-booking-form');
    const editBookingClose = document.getElementById('edit-booking-close');
    const cancelEditBookingBtn = document.getElementById('cancel-edit-booking-btn');
    
    if (editBookingClose) {
        editBookingClose.addEventListener('click', closeEditBookingModal);
    }
    
    if (cancelEditBookingBtn) {
        cancelEditBookingBtn.addEventListener('click', closeEditBookingModal);
    }
    
    if (editBookingForm) {
        editBookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const form = e.target;
            const bookingId = form.getAttribute('data-booking-id');
            if (!bookingId) return;
            
            const bookingData = {
                pickupDate: document.getElementById('edit-pickup-date').value,
                pickupTime: document.getElementById('edit-pickup-time').value,
                dropoffDate: document.getElementById('edit-dropoff-date').value,
                dropoffTime: document.getElementById('edit-dropoff-time').value,
                pickupLocation: document.getElementById('edit-pickup-location').value,
                dropoffLocation: document.getElementById('edit-dropoff-location').value
            };
            
            if (updateBooking(bookingId, bookingData)) {
                closeEditBookingModal();
            } else {
                alert('Error updating booking');
            }
        });
    }
    
    // Pagination
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                refreshBookingManagement();
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            currentPage++;
            refreshBookingManagement();
        });
    }
    
    // Close edit booking modal when clicking outside
    const editBookingModal = document.getElementById('edit-booking-modal');
    if (editBookingModal) {
        editBookingModal.addEventListener('click', function(e) {
            if (e.target === editBookingModal) {
                closeEditBookingModal();
            }
        });
    }
    
    // Booking Details Modal Close
    const bookingDetailsClose = document.getElementById('booking-details-close');
    if (bookingDetailsClose) {
        bookingDetailsClose.addEventListener('click', closeBookingDetailsModal);
    }
    
    // Close booking details modal when clicking outside
    const bookingDetailsModal = document.getElementById('booking-details-modal');
    if (bookingDetailsModal) {
        bookingDetailsModal.addEventListener('click', function(e) {
            if (e.target === bookingDetailsModal) {
                closeBookingDetailsModal();
            }
        });
    }
    
    // Close modal when clicking outside
    const vehicleModal = document.getElementById('vehicle-modal');
    if (vehicleModal) {
        vehicleModal.addEventListener('click', function(e) {
            if (e.target === vehicleModal) {
                closeVehicleModal();
            }
        });
    }
    
    // Initialize transmission dropdown when vehicle modal opens
    const vehicleModalObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const modal = document.getElementById('vehicle-modal');
                if (modal && modal.classList.contains('active')) {
                    // Check if dropdown is already initialized
                    const transmissionInput = document.getElementById('vehicle-transmission');
                    if (transmissionInput && !transmissionInput.hasAttribute('data-dropdown-initialized')) {
                        initTransmissionDropdown();
                        transmissionInput.setAttribute('data-dropdown-initialized', 'true');
                    }
                }
            }
        });
    });
    
    if (vehicleModal) {
        vehicleModalObserver.observe(vehicleModal, { attributes: true });
    }
});

// Initialize Transmission Dropdown (Tesla-style)
function initTransmissionDropdown() {
    const inputId = 'vehicle-transmission';
    const dropdownId = 'vehicle-transmission-dropdown';
    const hiddenInputId = 'vehicle-transmission-value';
    
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!input || !dropdown || !hiddenInput) return;
    
    const wrapper = input.closest('.custom-dropdown-wrapper');
    if (!wrapper) return;
    
    const scrollContainer = dropdown.querySelector('.dropdown-scroll-container');
    if (!scrollContainer) return;
    
    const options = scrollContainer.querySelectorAll('.dropdown-option');
    let animationFrameId = null;
    
    // Initialize opacity and scale
    options.forEach(opt => {
        opt.style.opacity = '0.5';
        opt.style.transform = 'scale(0.95)';
        if (opt.classList.contains('selected')) {
            opt.style.opacity = '1';
            opt.style.transform = 'scale(1)';
        }
    });
    
    // Update option styles
    function updateOptionStyles(container, opts) {
        if (animationFrameId) return;
        
        animationFrameId = requestAnimationFrame(() => {
            const containerRect = container.getBoundingClientRect();
            const centerY = containerRect.top + containerRect.height / 2;
            
            opts.forEach(option => {
                const optionRect = option.getBoundingClientRect();
                const optionCenterY = optionRect.top + optionRect.height / 2;
                const distance = Math.abs(centerY - optionCenterY);
                
                const opacity = Math.max(0.3, Math.min(1, 1 - (distance / 100)));
                const scale = Math.max(0.92, Math.min(1, 1 - (distance / 250)));
                
                option.style.opacity = opacity;
                option.style.transform = `scale(${scale})`;
                
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
    
    // Prevent page scrolling
    function handleWheel(e) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isAtTop = scrollTop <= 1;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
        
        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    
    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    // Toggle dropdown
    input.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.custom-dropdown-wrapper').forEach(w => {
            if (w !== wrapper) w.classList.remove('active');
        });
        wrapper.classList.toggle('active');
        
        if (wrapper.classList.contains('active')) {
            const selected = scrollContainer.querySelector('.dropdown-option.selected');
            if (selected) {
                setTimeout(() => {
                    selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    updateOptionStyles(scrollContainer, options);
                }, 10);
            } else if (options.length > 0) {
                setTimeout(() => {
                    options[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    updateOptionStyles(scrollContainer, options);
                }, 10);
            }
        }
    });
    
    // Handle option selection
    options.forEach(option => {
        option.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            const text = this.textContent;
            
            input.value = text;
            hiddenInput.value = value;
            
            options.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
            
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => {
                wrapper.classList.remove('active');
            }, 200);
        });
    });
    
    // Scroll wheel behavior
    let scrollTimeout;
    let isScrolling = false;
    scrollContainer.addEventListener('scroll', function() {
        updateOptionStyles(scrollContainer, options);
        
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
    
    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
        }
    });
}

