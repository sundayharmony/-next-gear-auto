// Shared utility functions for the NGA website

// Booking Status Constants
const BOOKING_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    CANCELLED: 'cancelled',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed'
};

// Vehicle Management Functions
function getVehicles() {
    try {
        const vehiclesJson = localStorage.getItem('vehicles');
        if (!vehiclesJson) {
            // Initialize with default vehicles
            const defaultVehicles = [
                { id: 'tesla-model-3', name: 'Tesla Model 3', type: 'Electric', seats: 5, transmission: 'Automatic', rate: 95, image: '' },
                { id: 'toyota-highlander', name: 'Toyota Highlander', type: 'SUV', seats: 7, transmission: 'Automatic', rate: 85, image: '' },
                { id: 'ram-1500', name: 'Ram 1500', type: 'Truck', seats: 5, transmission: 'Automatic', rate: 110, image: '' },
                { id: 'bmw-3-series', name: 'BMW 3 Series', type: 'Sedan', seats: 5, transmission: 'Automatic', rate: 120, image: '' },
                { id: 'ford-mustang', name: 'Ford Mustang', type: 'Sports', seats: 4, transmission: 'Manual', rate: 130, image: '' },
                { id: 'honda-cr-v', name: 'Honda CR-V', type: 'SUV', seats: 5, transmission: 'Automatic', rate: 75, image: '' }
            ];
            saveVehicles(defaultVehicles);
            return defaultVehicles;
        }
        return JSON.parse(vehiclesJson);
    } catch (error) {
        console.error('Error getting vehicles:', error);
        return [];
    }
}

function saveVehicles(vehicles) {
    try {
        localStorage.setItem('vehicles', JSON.stringify(vehicles));
        return true;
    } catch (error) {
        console.error('Error saving vehicles:', error);
        return false;
    }
}

// Booking Management Functions
function getBookings() {
    try {
        const bookingsJson = localStorage.getItem('bookings');
        if (!bookingsJson) {
            return [];
        }
        return JSON.parse(bookingsJson);
    } catch (error) {
        console.error('Error getting bookings:', error);
        return [];
    }
}

function saveBookings(bookings) {
    try {
        localStorage.setItem('bookings', JSON.stringify(bookings));
        return true;
    } catch (error) {
        console.error('Error saving bookings:', error);
        return false;
    }
}

function saveBooking(booking) {
    try {
        const bookings = getBookings();
        bookings.push(booking);
        return saveBookings(bookings);
    } catch (error) {
        console.error('Error saving booking:', error);
        return false;
    }
}

function generateBookingId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `BK-${timestamp}-${random}`;
}

// Date and Time Formatting Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch (error) {
        return 'N/A';
    }
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';
    try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
        return timeString;
    }
}

function parseDate(dateString) {
    if (!dateString) return null;
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        return date;
    } catch (error) {
        return null;
    }
}

// Status Formatting
function formatStatus(status) {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'approved': 'status-approved',
        'cancelled': 'status-cancelled',
        'in-progress': 'status-in-progress',
        'completed': 'status-completed'
    };
    return statusMap[status] || 'status-pending';
}

// Price Calculation
function calculateTotalPrice(dailyRate, pickupDate, dropoffDate) {
    if (!dailyRate || !pickupDate || !dropoffDate) return 0;
    try {
        const pickup = new Date(pickupDate);
        const dropoff = new Date(dropoffDate);
        if (isNaN(pickup.getTime()) || isNaN(dropoff.getTime())) return 0;
        
        const diffTime = dropoff - pickup;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const days = diffDays > 0 ? diffDays : 1;
        
        return dailyRate * days;
    } catch (error) {
        console.error('Error calculating total price:', error);
        return 0;
    }
}

// Update Booking Status
function updateBookingStatus(bookingId, newStatus) {
    try {
        const bookings = getBookings();
        const bookingIndex = bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) return false;
        
        bookings[bookingIndex].status = newStatus;
        bookings[bookingIndex].updatedAt = new Date().toISOString();
        return saveBookings(bookings);
    } catch (error) {
        console.error('Error updating booking status:', error);
        return false;
    }
}

// Customer Account Management Functions
function getCustomerAccounts() {
    try {
        const accountsJson = localStorage.getItem('customerAccounts');
        if (!accountsJson) {
            // Initialize with default customer account
            const defaultAccount = {
                id: 'CUST-DEFAULT-001',
                name: 'Sample Customer',
                email: 'customer@example.com',
                password: 'customer123',
                phone: '',
                createdAt: new Date().toISOString()
            };
            saveCustomerAccounts([defaultAccount]);
            return [defaultAccount];
        }
        const accounts = JSON.parse(accountsJson);
        // Ensure default account exists even if accounts array exists
        const hasDefault = accounts.find(acc => acc.email === 'customer@example.com');
        if (!hasDefault) {
            const defaultAccount = {
                id: 'CUST-DEFAULT-001',
                name: 'Sample Customer',
                email: 'customer@example.com',
                password: 'customer123',
                phone: '',
                createdAt: new Date().toISOString()
            };
            accounts.push(defaultAccount);
            saveCustomerAccounts(accounts);
            return accounts;
        }
        return accounts;
    } catch (error) {
        console.error('Error getting customer accounts:', error);
        return [];
    }
}

function saveCustomerAccounts(accounts) {
    try {
        localStorage.setItem('customerAccounts', JSON.stringify(accounts));
        return true;
    } catch (error) {
        console.error('Error saving customer accounts:', error);
        return false;
    }
}

function createCustomerAccount(name, email, password, phone) {
    const accounts = getCustomerAccounts();
    
    // Check if email already exists
    if (accounts.find(acc => acc.email === email)) {
        return { success: false, message: 'Email already registered' };
    }
    
    if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
    }
    
    const newAccount = {
        id: generateCustomerId(),
        name: name,
        email: email,
        password: password,
        phone: phone || '',
        createdAt: new Date().toISOString()
    };
    
    accounts.push(newAccount);
    if (saveCustomerAccounts(accounts)) {
        // Link existing bookings to this account
        linkBookingsToCustomer(email);
        return { success: true, account: newAccount };
    }
    
    return { success: false, message: 'Error creating account' };
}

function generateCustomerId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `CUST-${timestamp}-${random}`;
}

function customerLogin(email, password) {
    // Trim inputs to handle whitespace
    email = email.trim();
    password = password.trim();
    
    // Check hardcoded default customer credentials first
    if (email === 'customer@example.com' && password === 'customer123') {
        // Ensure default account exists in storage
        const accounts = getCustomerAccounts();
        const defaultAccount = accounts.find(acc => acc.email === 'customer@example.com') || {
            id: 'CUST-DEFAULT-001',
            name: 'Sample Customer',
            email: 'customer@example.com',
            password: 'customer123',
            phone: '',
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('customerLoggedIn', 'true');
        localStorage.setItem('customerEmail', email);
        localStorage.setItem('customerId', defaultAccount.id);
        return { success: true, account: defaultAccount };
    }
    
    // Check stored customer accounts
    const accounts = getCustomerAccounts();
    const account = accounts.find(acc => acc.email === email && acc.password === password);
    
    if (account) {
        localStorage.setItem('customerLoggedIn', 'true');
        localStorage.setItem('customerEmail', email);
        localStorage.setItem('customerId', account.id);
        return { success: true, account: account };
    }
    
    return { success: false, message: 'Invalid email or password' };
}

function customerLogout() {
    localStorage.removeItem('customerLoggedIn');
    localStorage.removeItem('customerEmail');
    localStorage.removeItem('customerId');
    // Also clear admin items to prevent conflicts
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminEmail');
}

function isCustomerLoggedIn() {
    return localStorage.getItem('customerLoggedIn') === 'true';
}

function getCurrentCustomer() {
    if (!isCustomerLoggedIn()) return null;
    
    const email = localStorage.getItem('customerEmail');
    const accounts = getCustomerAccounts();
    return accounts.find(acc => acc.email === email) || null;
}

function getCurrentCustomerEmail() {
    return localStorage.getItem('customerEmail');
}

function linkBookingsToCustomer(email) {
    try {
        const bookings = getBookings();
        let updated = false;
        
        bookings.forEach(booking => {
            if (booking.customerEmail === email && !booking.customerId) {
                const accounts = getCustomerAccounts();
                const account = accounts.find(acc => acc.email === email);
                if (account) {
                    booking.customerId = account.id;
                    updated = true;
                }
            }
        });
        
        if (updated) {
            saveBookings(bookings);
        }
        
        return true;
    } catch (error) {
        console.error('Error linking bookings to customer:', error);
        return false;
    }
}

function getCustomerBookings(customerEmail) {
    try {
        const bookings = getBookings();
        return bookings.filter(booking => booking.customerEmail === customerEmail);
    } catch (error) {
        console.error('Error getting customer bookings:', error);
        return [];
    }
}

function updateCustomerAccount(email, updates) {
    try {
        const accounts = getCustomerAccounts();
        const accountIndex = accounts.findIndex(acc => acc.email === email);
        
        if (accountIndex === -1) return false;
        
        accounts[accountIndex] = {
            ...accounts[accountIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        return saveCustomerAccounts(accounts);
    } catch (error) {
        console.error('Error updating customer account:', error);
        return false;
    }
}

