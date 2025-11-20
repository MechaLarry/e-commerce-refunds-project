const API_BASE_URL = 'http://localhost:5000/api';

// Token management
function getToken() {
    return localStorage.getItem('access_token');
}

function setToken(token) {
    localStorage.setItem('access_token', token);
}

function removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function isAuthenticated() {
    return !!getToken();
}

function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        // Debug: log token presence (but not the token itself)
        console.log(`Making request to ${endpoint} with token`);
    } else {
        console.warn('No token available for request to:', endpoint);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        // Debug: log response status
        if (!response.ok) {
            console.log(`Request to ${endpoint} failed with status ${response.status}`);
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (!response.ok) {
            // Handle authentication errors - but don't redirect if we're already on login/register
            if (response.status === 401 || response.status === 422) {
                const errorType = data.error || '';
                if (errorType === 'token_expired' || errorType === 'invalid_token' || errorType === 'authorization_required') {
                    // Only redirect if we're not already on login/register pages
                    const currentPath = window.location.pathname;
                    const isAuthPage = currentPath.includes('login.html') || currentPath.includes('register.html');
                    
                    if (!isAuthPage) {
                        // Clear invalid token
                        removeToken();
                        // Only redirect if we had a token (meaning it was invalid)
                        if (token) {
                            console.warn('Token invalid or expired, redirecting to login');
                            // Use a small delay to prevent race conditions
                            setTimeout(() => {
                                if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
                                    window.location.href = 'login.html';
                                }
                            }, 100);
                        }
                    }
                    throw new Error(data.message || 'Session expired. Please login again.');
                }
            }
            throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        // If it's already an Error object, throw it; otherwise create one
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(error.message || 'Request failed');
        }
    }
}

// Auth functions
async function register(userData) {
    const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
    
    setToken(response.access_token);
    setUser(response.user);
    return response;
}

async function login(email, password, userType = 'customer') {
    const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, user_type: userType })
    });
    
    // Ensure token and user are stored before proceeding
    if (response.access_token) {
        setToken(response.access_token);
        setUser(response.user);
        
        // Verify token was stored
        const storedToken = getToken();
        if (!storedToken) {
            throw new Error('Failed to store authentication token');
        }
        
        return response;
    } else {
        throw new Error('No access token received from server');
    }
}

function logout() {
    removeToken();
    window.location.href = '/';
}

// Check auth on page load
function checkAuth() {
    if (!isAuthenticated() && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
        window.location.href = 'login.html';
    }
}

// Redirect based on user role
function redirectByRole() {
    // Wait longer to ensure localStorage is fully written
    setTimeout(() => {
        const user = getUser();
        const token = getToken();
        
        console.log('Redirecting - Token:', token ? 'Present' : 'Missing');
        console.log('Redirecting - User:', user);
        console.log('Redirecting - Current path:', window.location.pathname);
        
        // Double-check token and user are stored
        if (!token) {
            console.error('No token found after login, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        if (!user) {
            console.error('No user data found after login, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        // Redirect based on role (check both 'admin' and case variations)
        const userRole = (user.role || '').toLowerCase();
        console.log('User role for redirect:', userRole);
        
        if (userRole === 'admin') {
            console.log('Redirecting to admin dashboard');
            window.location.href = 'admin-dashboard.html';
        } else {
            console.log('Redirecting to customer dashboard (role:', userRole, ')');
            window.location.href = 'customer-dashboard.html';
        }
    }, 500); // Increased delay to ensure localStorage persistence
}

