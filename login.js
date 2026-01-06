// Unified Login Functionality - Handles both Admin and Customer login

document.addEventListener('DOMContentLoaded', function() {
    // Clear any leftover form values
    const loginForm = document.getElementById('unified-login-form');
    if (loginForm) {
        loginForm.reset();
    }
    
    // Initialize default customer account if needed
    if (typeof getCustomerAccounts === 'function') {
        getCustomerAccounts(); // This will create the default account if it doesn't exist
    }
    
    // Check if already logged in (with a small delay to ensure localStorage is synced after logout)
    setTimeout(function() {
        if (typeof isAdminLoggedIn === 'function' && isAdminLoggedIn()) {
            window.location.href = 'admin.html';
            return;
        }
        if (typeof isCustomerLoggedIn === 'function' && isCustomerLoggedIn()) {
            window.location.href = 'customer.html';
            return;
        }
    }, 100);
    
    // Continue with rest of initialization (don't wait for setTimeout)
    
    // Tab switching
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    
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
    
    // Unified Login - tries admin first, then customer
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!email || !password) {
                showLoginMessage('Please fill in all fields', 'error');
                return;
            }
            
            // Try admin login first
            if (typeof adminLogin === 'function') {
                if (adminLogin(email, password)) {
                    showLoginMessage('Login successful! Redirecting to admin dashboard...', 'success');
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 500);
                    return;
                }
            } else {
                console.error('adminLogin function is not defined');
            }
            
            // Try customer login
            try {
                if (typeof customerLogin === 'function') {
                    console.log('Attempting customer login with:', email);
                    const customerResult = customerLogin(email, password);
                    console.log('Customer login result:', customerResult);
                    if (customerResult && customerResult.success) {
                        showLoginMessage('Login successful! Redirecting to your dashboard...', 'success');
                        setTimeout(() => {
                            window.location.href = 'customer.html';
                        }, 500);
                        return;
                    } else {
                        console.log('Customer login failed:', customerResult ? customerResult.message : 'No result');
                    }
                } else {
                    console.error('customerLogin function is not defined. Available functions:', Object.keys(window).filter(k => typeof window[k] === 'function'));
                    showLoginMessage('Login system error. Please refresh the page.', 'error');
                    return;
                }
            } catch (error) {
                console.error('Error during customer login:', error);
                showLoginMessage('An error occurred during login. Please try again.', 'error');
                return;
            }
            
            // Neither worked
            showLoginMessage('Invalid email or password', 'error');
        });
    }
    
    // Signup - creates customer account
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value.trim();
            const confirmPassword = document.getElementById('signup-confirm-password').value.trim();
            const phone = document.getElementById('signup-phone').value.trim();
            
            if (!name || !email || !password || !confirmPassword) {
                showLoginMessage('Please fill in all required fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showLoginMessage('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showLoginMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            const result = createCustomerAccount(name, email, password, phone);
            if (result.success) {
                showLoginMessage('Account created successfully! Logging in...', 'success');
                setTimeout(() => {
                    customerLogin(email, password);
                    window.location.href = 'customer.html';
                }, 500);
            } else {
                showLoginMessage(result.message || 'Error creating account', 'error');
            }
        });
    }
});

function showLoginMessage(message, type) {
    const messageEl = document.getElementById('login-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
}

