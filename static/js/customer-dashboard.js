// Load customer data
async function loadDashboard() {
    // Verify token is available before making requests
    const token = getToken();
    if (!token) {
        console.error('No token available during dashboard load');
        // Don't redirect here - let the initialization handle it
        return;
    }
    
    // Load data sequentially to avoid overwhelming the server
    try {
        await loadWallet();
        await loadOrders();
        await loadReturnRequests();
        await loadNotifications();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Don't redirect on API errors - just log them
    }
}

// Load wallet
async function loadWallet() {
    const container = document.getElementById('wallet-container');
    if (!container) return;

    try {
        const data = await apiRequest('/wallet');
        displayWallet(data);
    } catch (error) {
        console.error('Failed to load wallet:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; color: #dc3545;">
                <p>Failed to load wallet: ${error.message || 'Unknown error'}</p>
            </div>
        `;
    }
}

function displayWallet(data) {
    const container = document.getElementById('wallet-container');
    if (!container) return;

    const balance = data && typeof data.balance === 'number' ? data.balance : 0;

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
                <p style="margin: 0; color: #666;">Available Wallet Balance</p>
                <p style="margin: 0.25rem 0 0 0; font-size: 2rem; font-weight: bold; color: #667eea;">
                    $${balance.toFixed(2)}
                </p>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <input
                    type="number"
                    id="wallet-topup-amount"
                    class="form-control"
                    placeholder="Amount"
                    min="1"
                    step="1"
                    style="max-width: 150px;"
                />
                <button class="btn btn-primary btn-small" onclick="topUpWalletFromInput()">Add Funds</button>
            </div>
        </div>
        <p style="margin-top: 0.75rem; color: #666; font-size: 0.9rem;">
            This wallet simulates a global payment platform. Refunds for approved return requests are credited back here. You can add dummy funds as many times as you need.
        </p>
    `;
}

// Load orders
async function loadOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    try {
        const orders = await apiRequest('/orders');
        displayOrders(orders);
    } catch (error) {
        console.error('Failed to load orders:', error);
        // Don't show error if it's an auth error (will be handled by auth.js)
        if (error.message && !error.message.includes('Session expired') && !error.message.includes('login')) {
            container.innerHTML = `<p style="color: #dc3545;">Failed to load orders: ${error.message}</p>`;
        } else {
            container.innerHTML = '<p>Loading orders...</p>';
        }
    }
}

function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">📦 No orders yet</p>
                <p>Start shopping to see your orders here!</p>
                <a href="/" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">Browse Products</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3>Order #${order.order_id}</h3>
                    <p><strong>Date:</strong> ${order.order_date}</p>
                    <p><strong>Status:</strong> <span class="badge badge-${order.order_status.toLowerCase()}">${order.order_status}</span></p>
                    <p><strong>Total:</strong> $${order.total_amount}</p>
                    <p><strong>Shipping:</strong> ${order.shipping_address}</p>
                </div>
                ${order.order_status === 'Completed' ? `
                    <button class="btn btn-primary" onclick="openReturnModal(${order.order_id})">Request Return</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Load return requests
async function loadReturnRequests() {
    const container = document.getElementById('returns-container');
    if (!container) return;
    
    try {
        const requests = await apiRequest('/return-requests');
        displayReturnRequests(requests);
    } catch (error) {
        console.error('Failed to load return requests:', error);
        if (error.message && !error.message.includes('Session expired') && !error.message.includes('login')) {
            container.innerHTML = `<p style="color: #dc3545;">Failed to load return requests: ${error.message}</p>`;
        } else {
            container.innerHTML = '<p>Loading return requests...</p>';
        }
    }
}

function displayReturnRequests(requests) {
    const container = document.getElementById('returns-container');
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">🔄 No return requests</p>
                <p>You haven't submitted any return requests yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = requests.map(req => {
        const fraudClass = req.fraud_score < 30 ? 'low' : req.fraud_score < 70 ? 'medium' : 'high';
        return `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3>Return Request #${req.return_request_id}</h3>
                        <p><strong>Order ID:</strong> #${req.order_id}</p>
                        <p><strong>Reason:</strong> ${req.return_reason}</p>
                        <p><strong>Date:</strong> ${req.request_date}</p>
                        <p><strong>Status:</strong> <span class="badge badge-${req.status.toLowerCase()}">${req.status}</span></p>
                        ${req.approval_date ? `<p><strong>Processed:</strong> ${req.approval_date}</p>` : ''}
                        <p><strong>Fraud Score:</strong> <span class="fraud-score fraud-score-${fraudClass}">${req.fraud_score.toFixed(1)}%</span></p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Open return modal
function openReturnModal(orderId) {
    document.getElementById('return-order-id').value = orderId;
    document.getElementById('return-modal').style.display = 'block';
}

// Submit return request
async function submitReturnRequest() {
    const orderId = document.getElementById('return-order-id').value;
    const reason = document.getElementById('return-reason').value;
    
    if (!reason) {
        showAlert('Please provide a return reason', 'error');
        return;
    }
    
    try {
        const response = await apiRequest('/return-requests', {
            method: 'POST',
            body: JSON.stringify({
                order_id: parseInt(orderId),
                return_reason: reason
            })
        });
        
        document.getElementById('return-modal').style.display = 'none';
        document.getElementById('return-reason').value = '';
        showAlert(`Return request submitted! Fraud Score: ${response.fraud_score}%`, 'success');
        loadReturnRequests();
    } catch (error) {
        showAlert(error.message || 'Failed to submit return request', 'error');
    }
}

// Load notifications
async function loadNotifications() {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    try {
        const notifications = await apiRequest('/notifications');
        displayNotifications(notifications);
    } catch (error) {
        console.error('Failed to load notifications:', error);
        if (error.message && !error.message.includes('Session expired') && !error.message.includes('login')) {
            container.innerHTML = `<p style="color: #dc3545;">Failed to load notifications: ${error.message}</p>`;
        } else {
            container.innerHTML = '<p>Loading notifications...</p>';
        }
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">🔔 No notifications</p>
                <p>You're all caught up! New updates will appear here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.slice(0, 5).map(notif => `
        <div class="card" style="opacity: ${notif.is_read ? 0.7 : 1};">
            <p><strong>${notif.notification_type}</strong></p>
            <p>${notif.message}</p>
            <p style="color: #666; font-size: 0.9rem;">${notif.sent_date}</p>
        </div>
    `).join('');
}

// Show alert
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// Wallet top-up helpers
async function topUpWallet(amount) {
    try {
        const response = await apiRequest('/wallet/topup', {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
        showAlert(`Wallet topped up successfully! New balance: $${response.balance.toFixed(2)}`, 'success');
        loadWallet();
    } catch (error) {
        console.error('Wallet top-up error:', error);
        showAlert(error.message || 'Failed to top up wallet', 'error');
    }
}

function topUpWalletFromInput() {
    const input = document.getElementById('wallet-topup-amount');
    if (!input) {
        topUpWalletCustom();
        return;
    }
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) {
        showAlert('Please enter a valid amount greater than zero', 'error');
        return;
    }
    topUpWallet(amount);
    input.value = '';
}

// Fallback prompt-based top-up if needed elsewhere
function topUpWalletCustom() {
    const amountStr = prompt('Enter amount to add to your wallet:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        showAlert('Please enter a valid amount greater than zero', 'error');
        return;
    }
    topUpWallet(amount);
}

// Initialize
let redirecting = false; // Flag to prevent multiple redirects

document.addEventListener('DOMContentLoaded', () => {
    // Wait longer to ensure token is stored after redirect from login/register
    setTimeout(() => {
        if (redirecting) return; // Prevent multiple redirects
        
        const token = getToken();
        const user = getUser();
        
        console.log('Dashboard init - Token:', token ? 'Present' : 'Missing');
        console.log('Dashboard init - User:', user);
        console.log('Dashboard init - Current path:', window.location.pathname);
        
        // If we're on login/register page, don't check auth
        const currentPath = window.location.pathname;
        if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
            return;
        }
        
        // Check if we have token and user
        if (!token || !user) {
            console.error('Missing token or user data, redirecting to login');
            redirecting = true;
            window.location.href = 'login.html';
            return;
        }
        
        // Check if user is admin (should be on admin dashboard) - case-insensitive
        const userRole = (user.role || '').toLowerCase();
        if (userRole === 'admin') {
            console.log('User is admin, redirecting to admin dashboard');
            redirecting = true;
            window.location.href = 'admin-dashboard.html';
            return;
        }
        
        // All checks passed, load the dashboard
        console.log('Loading dashboard for user:', user);
        loadDashboard();
        
        // Refresh every 30 seconds
        setInterval(() => {
            if (!redirecting) {
                loadDashboard();
            }
        }, 30000);
    }, 800); // Increased delay to ensure localStorage is fully written
});

