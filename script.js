// Calendar Creation Function
function createCalendar(inputId, calendarId, hiddenInputId, initialDate, onDateSelect) {
    const input = document.getElementById(inputId);
    const calendar = document.getElementById(calendarId);
    const hiddenInput = document.getElementById(hiddenInputId);
    
    if (!input || !calendar || !hiddenInput) return null;
    
    let currentDate = initialDate ? new Date(initialDate) : new Date();
    let minDate = null;
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Create month/year selector with custom dropdowns
        let monthYearHTML = `
            <div class="calendar-month-year">
                <div class="custom-dropdown-wrapper calendar-month-select-wrapper">
                    <input type="text" class="calendar-month-select" id="calendar-month-input-${calendarId}" value="${months[month]}" readonly>
                    <input type="hidden" id="calendar-month-value-${calendarId}" value="${month}">
                    <div class="custom-dropdown-menu" id="calendar-month-dropdown-${calendarId}">
                        <div class="dropdown-scroll-container">
        `;
        for (let i = 0; i < 12; i++) {
            monthYearHTML += `<div class="dropdown-option ${i === month ? 'selected' : ''}" data-value="${i}">${months[i]}</div>`;
        }
        monthYearHTML += `
                        </div>
                    </div>
                </div>
                <div class="custom-dropdown-wrapper calendar-year-select-wrapper">
                    <input type="text" class="calendar-year-select" id="calendar-year-input-${calendarId}" value="${year}" readonly>
                    <input type="hidden" id="calendar-year-value-${calendarId}" value="${year}">
                    <div class="custom-dropdown-menu" id="calendar-year-dropdown-${calendarId}">
                        <div class="dropdown-scroll-container">
        `;
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i <= currentYear + 5; i++) {
            monthYearHTML += `<div class="dropdown-option ${i === year ? 'selected' : ''}" data-value="${i}">${i}</div>`;
        }
        monthYearHTML += `
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Create calendar HTML
        let calendarHTML = `
            <div class="calendar-header">
                ${monthYearHTML}
            </div>
            <div class="calendar-weekdays">
        `;
        
        weekdays.forEach(day => {
            calendarHTML += `<div class="calendar-weekday">${day}</div>`;
        });
        
        calendarHTML += '</div><div class="calendar-days">';
        
        // Empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day other-month"></div>';
        }
        
        // Days of the month
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            
            let classes = 'calendar-day';
            if (date.getTime() === today.getTime()) {
                classes += ' today';
            }
            if (minDate && date < minDate) {
                classes += ' disabled';
            }
            
            calendarHTML += `<div class="${classes}" data-date="${date.toISOString()}">${day}</div>`;
        }
        
        calendarHTML += '</div>';
        calendar.innerHTML = calendarHTML;
        
        // Initialize custom dropdowns for month/year
        const monthInputId = `calendar-month-input-${calendarId}`;
        const monthDropdownId = `calendar-month-dropdown-${calendarId}`;
        const monthHiddenId = `calendar-month-value-${calendarId}`;
        const yearInputId = `calendar-year-input-${calendarId}`;
        const yearDropdownId = `calendar-year-dropdown-${calendarId}`;
        const yearHiddenId = `calendar-year-value-${calendarId}`;
        
        // Create month dropdown
        createCalendarDropdown(monthInputId, monthDropdownId, monthHiddenId, function(value) {
            currentDate.setMonth(parseInt(value));
            renderCalendar();
        });
        
        // Create year dropdown
        createCalendarDropdown(yearInputId, yearDropdownId, yearHiddenId, function(value) {
            currentDate.setFullYear(parseInt(value));
            renderCalendar();
        });
        
        // Add event listeners for day clicks
        const dayElements = calendar.querySelectorAll('.calendar-day:not(.disabled):not(.other-month)');
        dayElements.forEach(dayEl => {
            dayEl.addEventListener('click', function() {
                const selectedDate = new Date(this.getAttribute('data-date'));
                
                // Update input
                const dateStr = selectedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                input.value = dateStr;
                hiddenInput.value = selectedDate.toISOString();
                
                // Update selected state
                dayElements.forEach(d => d.classList.remove('selected'));
                this.classList.add('selected');
                
                // Close calendar
                calendar.classList.remove('active');
                
                // Call callback if provided
                if (onDateSelect) {
                    onDateSelect(selectedDate);
                }
            });
        });
    }
    
    // Toggle calendar on input click
    input.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.calendar-dropdown').forEach(cal => {
            if (cal !== calendar) cal.classList.remove('active');
        });
        calendar.classList.toggle('active');
    });
    
    // Close calendar when clicking outside
    document.addEventListener('click', function(e) {
        if (!calendar.contains(e.target) && e.target !== input) {
            calendar.classList.remove('active');
        }
    });
    
    // Set min date function
    function setMinDate(date) {
        minDate = date ? new Date(date) : null;
        if (minDate) minDate.setHours(0, 0, 0, 0);
        renderCalendar();
    }
    
    renderCalendar();
    
    return {
        setMinDate: setMinDate,
        render: renderCalendar
    };
}

// Calendar Month/Year Dropdown Function
function createCalendarDropdown(inputId, dropdownId, hiddenInputId, onChange) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!input || !dropdown || !hiddenInput) return;
    
    const wrapper = input.closest('.custom-dropdown-wrapper');
    if (!wrapper) return;
    
    const scrollContainer = dropdown.querySelector('.dropdown-scroll-container');
    if (!scrollContainer) return;
    
    const options = scrollContainer.querySelectorAll('.dropdown-option');
    
    // Initialize opacity and scale
    options.forEach(opt => {
        opt.style.opacity = '0.5';
        opt.style.transform = 'scale(0.95)';
        if (opt.classList.contains('selected')) {
            opt.style.opacity = '1';
            opt.style.transform = 'scale(1)';
        }
    });
    
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
                    updateCalendarOptionStyles(scrollContainer, options);
                }, 10);
            }
        }
    });
    
    // Update option styles - using requestAnimationFrame for smoothness
    let calendarAnimationFrameId = null;
    function updateCalendarOptionStyles(container, opts) {
        if (calendarAnimationFrameId) return; // Already scheduled
        
        calendarAnimationFrameId = requestAnimationFrame(() => {
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
                
                if (distance < 24) {
                    if (!option.classList.contains('selected')) {
                        opts.forEach(opt => opt.classList.remove('selected'));
                        option.classList.add('selected');
                    }
                    option.style.opacity = '1';
                    option.style.transform = 'scale(1)';
                }
            });
            
            calendarAnimationFrameId = null;
        });
    }
    
    // Prevent page scrolling when at scroll limits
    function handleCalendarWheel(e) {
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
    scrollContainer.addEventListener('wheel', handleCalendarWheel, { passive: false });
    
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
                if (onChange) onChange(value);
            }, 200);
        });
    });
    
    // Scroll wheel behavior - throttled with requestAnimationFrame
    let calendarScrollTimeout;
    let isCalendarScrolling = false;
    scrollContainer.addEventListener('scroll', function() {
        updateCalendarOptionStyles(scrollContainer, options);
        
        // Update values after scroll settles
        clearTimeout(calendarScrollTimeout);
        calendarScrollTimeout = setTimeout(() => {
            const selected = scrollContainer.querySelector('.dropdown-option.selected');
            if (selected) {
                const value = selected.getAttribute('data-value');
                const text = selected.textContent;
                hiddenInput.value = value;
                input.value = text;
            }
            isCalendarScrolling = false;
        }, 150);
        
        if (!isCalendarScrolling) {
            isCalendarScrolling = true;
        }
    });
    
    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
        }
    });
}

// Smooth Scrolling for Navigation Links
document.addEventListener('DOMContentLoaded', function() {
    // Initialize calendars
    let pickupCalendar = null;
    let dropoffCalendar = null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    pickupCalendar = createCalendar('pickup-date', 'pickup-calendar', 'pickup-date-value', today, function(selectedDate) {
        // Update dropoff calendar min date when pickup date changes
        if (dropoffCalendar) {
            const minDropoffDate = new Date(selectedDate);
            minDropoffDate.setDate(minDropoffDate.getDate() + 1);
            dropoffCalendar.setMinDate(minDropoffDate);
        }
    });
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dropoffCalendar = createCalendar('dropoff-date', 'dropoff-calendar', 'dropoff-date-value', tomorrow);
    
    // Set initial min date for dropoff to tomorrow
    if (dropoffCalendar) {
        dropoffCalendar.setMinDate(tomorrow);
    }
    
    // Custom Dropdown Functionality with Tesla-style scroll wheel
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
    
    // Initialize custom dropdowns
    createCustomDropdown('pickup-time', 'pickup-time-dropdown', 'pickup-time-value');
    createCustomDropdown('dropoff-time', 'dropoff-time-dropdown', 'dropoff-time-value');
    createCustomDropdown('pickup-location', 'pickup-location-dropdown', 'pickup-location-value');
    createCustomDropdown('dropoff-location', 'dropoff-location-dropdown', 'dropoff-location-value');
    
    // Get all navigation links and CTA buttons
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Render Fleet Section
    renderFleetSection();
    
    // Hero Car Scroll Animation
    initHeroCarAnimation();
    
    // Update navigation based on login status
    updateCustomerNavigation();
    
    // Customer logout link
    const customerLogoutLink = document.getElementById('customer-logout-link');
    if (customerLogoutLink) {
        customerLogoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            customerLogout();
            // Also clear admin items to prevent conflicts
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminEmail');
            // Redirect to unified login page
            window.location.href = 'login.html';
        });
    }
    
    // Booking Form Submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const pickupDateValue = document.getElementById('pickup-date-value').value;
            const dropoffDateValue = document.getElementById('dropoff-date-value').value;
            const pickupTimeValue = document.getElementById('pickup-time-value').value;
            const dropoffTimeValue = document.getElementById('dropoff-time-value').value;
            const pickupLocationValue = document.getElementById('pickup-location-value').value;
            const dropoffLocationValue = document.getElementById('dropoff-location-value').value;
            
            if (!pickupDateValue || !dropoffDateValue || !pickupTimeValue || !dropoffTimeValue || !pickupLocationValue || !dropoffLocationValue) {
                alert('Please fill in all fields');
                return;
            }
            
            // Get available vehicles
            const vehicles = getVehicles();
            const pickupDate = new Date(pickupDateValue);
            const dropoffDate = new Date(dropoffDateValue);
            
            // Filter available vehicles (simple check - can be enhanced)
            const availableVehicles = vehicles.filter(vehicle => {
                // Basic availability check - can be enhanced with actual booking conflicts
                return true;
            });
            
            if (availableVehicles.length === 0) {
                alert('No vehicles available for the selected dates');
                return;
            }
            
            // Show available vehicles
            renderAvailableVehicles(availableVehicles, pickupDateValue, dropoffDateValue, pickupTimeValue, dropoffTimeValue, pickupLocationValue, dropoffLocationValue);
            
            // Scroll to available vehicles
            const availableSection = document.getElementById('available-vehicles');
            if (availableSection) {
                const headerOffset = 80;
                const elementPosition = availableSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    }
});

// Render Fleet Section
function renderFleetSection() {
    const fleetGrid = document.getElementById('fleet-grid');
    if (!fleetGrid) return;
    
    const vehicles = getVehicles();
    
    if (vehicles.length === 0) {
        fleetGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No vehicles available</p>';
        return;
    }
    
    fleetGrid.innerHTML = vehicles.map(vehicle => {
        const imageHTML = vehicle.image 
            ? `<img src="${vehicle.image}" alt="${vehicle.name}" class="fleet-vehicle-image">`
            : '<div class="vehicle-image-placeholder">No Image</div>';
        
        return `
            <div class="vehicle-card">
                ${imageHTML}
                <div class="vehicle-info">
                    <h3 class="vehicle-name">${vehicle.name}</h3>
                    <p class="vehicle-type">${vehicle.type}</p>
                    <div class="vehicle-details">
                        <span>${vehicle.seats} Seats</span>
                        <span>${vehicle.transmission}</span>
                        <span class="vehicle-rate">$${vehicle.rate}/day</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render Available Vehicles
function renderAvailableVehicles(vehicles, pickupDate, dropoffDate, pickupTime, dropoffTime, pickupLocation, dropoffLocation) {
    const availableGrid = document.getElementById('available-vehicles-grid');
    const availableSection = document.getElementById('available-vehicles');
    
    if (!availableGrid || !availableSection) return;
    
    availableSection.style.display = 'block';
    
    if (vehicles.length === 0) {
        availableGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No vehicles available</p>';
        return;
    }
    
    availableGrid.innerHTML = vehicles.map(vehicle => {
        const imageHTML = vehicle.image 
            ? `<img src="${vehicle.image}" alt="${vehicle.name}" class="available-vehicle-image">`
            : '<div class="vehicle-image-placeholder">No Image</div>';
        
        return `
            <div class="vehicle-card">
                ${imageHTML}
                <div class="vehicle-info">
                    <h3 class="vehicle-name">${vehicle.name}</h3>
                    <p class="vehicle-type">${vehicle.type}</p>
                    <div class="vehicle-details">
                        <span>${vehicle.seats} Seats</span>
                        <span>${vehicle.transmission}</span>
                        <span class="vehicle-rate">$${vehicle.rate}/day</span>
                    </div>
                    <button class="btn btn-primary btn-full" style="margin-top: 1rem;" onclick="selectVehicle('${vehicle.id}', '${vehicle.name}', ${vehicle.rate}, '${pickupDate}', '${dropoffDate}', '${pickupTime}', '${dropoffTime}', '${pickupLocation}', '${dropoffLocation}')">Select Vehicle</button>
                </div>
            </div>
        `;
    }).join('');
}

// Select Vehicle and Show Booking Form
function selectVehicle(vehicleId, vehicleName, dailyRate, pickupDate, dropoffDate, pickupTime, dropoffTime, pickupLocation, dropoffLocation) {
    // Check if customer is logged in
    if (!isCustomerLoggedIn()) {
        if (confirm('You must be logged in to book a vehicle. Would you like to go to the login page?')) {
            window.location.href = 'customer.html';
        }
        return;
    }
    
    // Get customer information from logged-in account
    const customer = getCurrentCustomer();
    if (!customer) {
        alert('Error: Customer information not found. Please log in again.');
        window.location.href = 'customer.html';
        return;
    }
    
    // Calculate total price
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    const diffTime = dropoff - pickup;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays > 0 ? diffDays : 1;
    const totalPrice = dailyRate * days;
    
    // Get time and location text values
    const pickupTimeText = document.getElementById('pickup-time').value;
    const dropoffTimeText = document.getElementById('dropoff-time').value;
    const pickupLocationText = document.getElementById('pickup-location').value;
    const dropoffLocationText = document.getElementById('dropoff-location').value;
    
    // Create booking object
    const booking = {
        id: generateBookingId(),
        vehicleId: vehicleId,
        vehicleName: vehicleName,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone || '',
        pickupDate: pickupDate,
        pickupTime: pickupTime,
        pickupTimeText: pickupTimeText,
        pickupLocation: pickupLocation,
        pickupLocationText: pickupLocationText,
        dropoffDate: dropoffDate,
        dropoffTime: dropoffTime,
        dropoffTimeText: dropoffTimeText,
        dropoffLocation: dropoffLocation,
        dropoffLocationText: dropoffLocationText,
        dailyRate: dailyRate,
        totalPrice: totalPrice,
        status: BOOKING_STATUS.PENDING,
        createdAt: new Date().toISOString()
    };
    
    // Save booking
    if (!saveBooking(booking)) {
        alert('Error saving booking. Please try again.');
        return;
    }
    
    alert(`Booking confirmed! Your booking ID is: ${booking.id}\nTotal Price: $${totalPrice.toFixed(2)}\n\nYou can view and manage your bookings in your account dashboard.`);
    
    // Reset form
    document.getElementById('booking-form').reset();
    document.getElementById('available-vehicles').style.display = 'none';
}

// Update Customer Navigation
function updateCustomerNavigation() {
    const customerNavItem = document.getElementById('customer-nav-item');
    const customerLogoutItem = document.getElementById('customer-logout-item');
    
    if (isCustomerLoggedIn()) {
        if (customerNavItem) customerNavItem.style.display = 'list-item';
        if (customerLogoutItem) customerLogoutItem.style.display = 'list-item';
    } else {
        if (customerNavItem) customerNavItem.style.display = 'none';
        if (customerLogoutItem) customerLogoutItem.style.display = 'none';
    }
}

// Hero Car Scroll Animation
function initHeroCarAnimation() {
    const heroImage = document.querySelector('.hero-image');
    const heroSection = document.querySelector('.hero');
    
    if (!heroImage || !heroSection) return;
    
    let currentTranslateX = 0;
    let targetTranslateX = 0;
    let animationFrameId = null;
    
    // Calculate scroll range - car moves based on scroll position
    const heroSectionHeight = heroSection.offsetHeight;
    const maxScrollForHero = heroSectionHeight * 0.8; // Use 80% of hero section height
    const maxTranslate = 400; // Maximum horizontal movement in pixels
    
    function updateCarPosition() {
        const scrollY = window.scrollY;
        
        // Calculate target position based on absolute scroll position
        // Scrolling down = positive scrollY = car moves left (backward)
        // Scrolling up = negative scrollY = car moves right (forward)
        // Map scroll position to horizontal movement
        const scrollProgress = Math.min(1, Math.max(0, scrollY / maxScrollForHero));
        
        // Map scroll progress to horizontal position (reversed)
        // 0 scroll = +maxTranslate (right/forward)
        // max scroll = -maxTranslate (left/backward)
        targetTranslateX = (1 - scrollProgress * 2) * maxTranslate;
        
        // Smooth interpolation using easing for fluid motion
        const easing = 0.12; // Lower = smoother but slower response
        currentTranslateX += (targetTranslateX - currentTranslateX) * easing;
        
        // Apply transform with slight rotation to match perspective (driving angle)
        // The car is angled from back right to front left
        // As it moves right (forward), rotate slightly to the right
        // As it moves left (backward), rotate slightly to the left
        const rotationY = currentTranslateX * 0.03; // Subtle 3D rotation for perspective
        
        heroImage.style.transform = `translateX(${currentTranslateX}px) rotateY(${rotationY}deg)`;
        
        // Continue animation if there's movement
        if (Math.abs(targetTranslateX - currentTranslateX) > 0.5) {
            animationFrameId = requestAnimationFrame(updateCarPosition);
        } else {
            animationFrameId = null;
        }
    }
    
    // Scroll handler - triggers animation
    function handleScroll() {
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(updateCarPosition);
        }
    }
    
    // Listen to scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial position update
    updateCarPosition();
}

