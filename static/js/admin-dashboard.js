// Load admin dashboard data
async function loadDashboard() {
    await Promise.all([
        loadReturnRequests(),
        loadAnalytics(),
        loadNotifications()
    ]);
}

// Load return requests
async function loadReturnRequests() {
    const container = document.getElementById('returns-container');
    if (!container) return;
    
    try {
        const requests = await apiRequest('/return-requests');
        console.log('Loaded return requests:', requests);
        console.log('Number of requests:', requests.length);
        if (requests.length > 0) {
            console.log('First request status:', requests[0].status);
        }
        displayReturnRequests(requests);
    } catch (error) {
        console.error('Failed to load return requests:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">❌ Failed to load return requests</p>
                <p>${error.message || 'Unknown error occurred'}</p>
                <button class="btn btn-primary" onclick="loadReturnRequests()" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
}

function displayReturnRequests(requests) {
    const container = document.getElementById('returns-container');
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">📋 No return requests</p>
                <p>All return requests have been processed.</p>
            </div>
        `;
        return;
    }
    
    // Sort requests: Pending first, then by date
    const sortedRequests = [...requests].sort((a, b) => {
        const aPending = a.status && a.status.toLowerCase() === 'pending';
        const bPending = b.status && b.status.toLowerCase() === 'pending';
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;
        return new Date(b.request_date) - new Date(a.request_date);
    });
    
    container.innerHTML = sortedRequests.map(req => {
        // Debug: Log the request data
        console.log('Return Request:', req);
        console.log('Status:', req.status, 'Type:', typeof req.status, 'Is Pending:', req.status === 'Pending');
        
        const fraudClass = req.fraud_score < 30 ? 'low' : req.fraud_score < 70 ? 'medium' : 'high';
        const fraudIcon = req.fraud_score < 30 ? '✅' : req.fraud_score < 70 ? '⚠️' : '🚨';
        // Check if status is pending (case-insensitive) or if status is missing/null (default to pending)
        const statusStr = (req.status || 'Pending').toString().trim();
        const isPending = statusStr.toLowerCase() === 'pending';
        console.log('Return Request Debug:', {
            id: req.return_request_id,
            status: req.status,
            statusStr: statusStr,
            isPending: isPending,
            hasApprovalDate: !!req.approval_date
        });
        
        return `
            <div class="card" style="border-left: 4px solid ${isPending ? '#ffc107' : (req.status && req.status.toLowerCase() === 'approved') ? '#28a745' : '#dc3545'};">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <h3 style="margin: 0;">Return Request #${req.return_request_id}</h3>
                            <span class="badge badge-${req.status ? req.status.toLowerCase() : 'pending'}">${req.status || 'Pending'}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                            <div>
                                <strong>Customer:</strong><br>
                                <span style="color: #666;">${req.customer_name}</span><br>
                                <small style="color: #999;">ID: ${req.customer_id}</small>
                            </div>
                            <div>
                                <strong>Order Details:</strong><br>
                                <span style="color: #666;">Order #${req.order_id}</span><br>
                                <span style="color: #667eea; font-weight: 600;">$${parseFloat(req.order_total).toFixed(2)}</span>
                            </div>
                            <div>
                                <strong>Request Date:</strong><br>
                                <span style="color: #666;">${req.request_date}</span>
                            </div>
                            ${req.approval_date ? `
                            <div>
                                <strong>Processed Date:</strong><br>
                                <span style="color: #666;">${req.approval_date}</span>
                            </div>
                            ` : ''}
                        </div>
                        <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 5px;">
                            <strong>Return Reason:</strong>
                            <p style="margin: 0.5rem 0 0 0; color: #333;">${req.return_reason}</p>
                        </div>
                        <div style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <strong>Fraud Score:</strong>
                            <span class="fraud-score fraud-score-${fraudClass}">
                                ${fraudIcon} ${req.fraud_score.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    ${isPending ? `
                        <div style="display: flex; gap: 0.5rem; flex-direction: column; min-width: 150px; background: #fff3cd; padding: 1rem; border-radius: 5px; border: 2px solid #ffc107;">
                            <div style="font-weight: 600; margin-bottom: 0.5rem; color: #856404; font-size: 0.9rem;">Action Required</div>
                            <button class="btn btn-success" onclick="approveReturn(${req.return_request_id})" style="width: 100%; padding: 0.75rem; font-weight: 600; cursor: pointer;">
                                ✅ Approve & Refund
                            </button>
                            <button class="btn btn-danger" onclick="rejectReturn(${req.return_request_id})" style="width: 100%; padding: 0.75rem; font-weight: 600; cursor: pointer;">
                                ❌ Reject
                            </button>
                        </div>
                    ` : `
                        <div style="min-width: 150px; text-align: center;">
                            <span class="badge badge-${req.status ? req.status.toLowerCase() : 'completed'}" style="font-size: 1rem; padding: 0.5rem 1rem;">
                                ${req.status && req.status.toLowerCase() === 'approved' ? '✅ Processed' : '❌ Rejected'}
                            </span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// Approve return
async function approveReturn(requestId) {
    if (!confirm(`Are you sure you want to approve Return Request #${requestId}?`)) {
        return;
    }
    
    const paymentMethod = prompt('Enter payment method for refund (e.g., Credit Card, PayPal, Bank Transfer):', 'Credit Card');
    if (!paymentMethod || paymentMethod.trim() === '') {
        showAlert('Payment method is required', 'error');
        return;
    }
    
    try {
        const response = await apiRequest(`/return-requests/${requestId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ payment_method: paymentMethod.trim() })
        });
        
        showAlert(`✅ Return request #${requestId} approved! Refund ID: ${response.refund_id}`, 'success');
        loadDashboard();
    } catch (error) {
        console.error('Approve error:', error);
        showAlert(error.message || 'Failed to approve return request', 'error');
    }
}

// Reject return
async function rejectReturn(requestId) {
    if (!confirm(`Are you sure you want to reject Return Request #${requestId}?`)) {
        return;
    }
    
    const reason = prompt('Enter rejection reason (required):');
    if (!reason || reason.trim() === '') {
        showAlert('Rejection reason is required', 'error');
        return;
    }
    
    try {
        await apiRequest(`/return-requests/${requestId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ rejection_reason: reason.trim() })
        });
        
        showAlert(`❌ Return request #${requestId} has been rejected.`, 'success');
        loadDashboard();
    } catch (error) {
        console.error('Reject error:', error);
        showAlert(error.message || 'Failed to reject return request', 'error');
    }
}

// Load analytics
async function loadAnalytics() {
    const container = document.getElementById('analytics-container');
    if (!container) return;
    
    try {
        const [returnsData, customersData] = await Promise.all([
            apiRequest('/analytics/returns'),
            apiRequest('/analytics/customers')
        ]);
        
        displayAnalytics(returnsData, customersData);
    } catch (error) {
        console.error('Failed to load analytics:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                <p>Failed to load analytics: ${error.message || 'Unknown error'}</p>
            </div>
        `;
    }
}

function displayAnalytics(returnsData, customersData) {
    const container = document.getElementById('analytics-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${returnsData.total_returns}</div>
                <div class="stat-label">Total Returns</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${returnsData.pending_returns}</div>
                <div class="stat-label">Pending Returns</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${returnsData.approved_returns}</div>
                <div class="stat-label">Approved Returns</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${returnsData.total_refund_amount.toFixed(2)}</div>
                <div class="stat-label">Total Refunds</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${returnsData.high_fraud_returns}</div>
                <div class="stat-label">High Fraud Risk</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${customersData.total_customers}</div>
                <div class="stat-label">Total Customers</div>
            </div>
        </div>
    `;
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
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>Failed to load notifications: ${error.message || 'Unknown error'}</p>
            </div>
        `;
    }
}

function displayNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<p>No notifications.</p>';
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

// Initialize
let redirecting = false; // Flag to prevent multiple redirects

document.addEventListener('DOMContentLoaded', () => {
    // Wait longer to ensure token is stored after redirect
    setTimeout(() => {
        if (redirecting) return; // Prevent multiple redirects
        
        const token = getToken();
        const user = getUser();
        
        console.log('Admin Dashboard init - Token:', token ? 'Present' : 'Missing');
        console.log('Admin Dashboard init - User:', user);
        
        // Check if we have token and user
        if (!token || !user) {
            console.error('Missing token or user data, redirecting to login');
            redirecting = true;
            window.location.href = 'login.html';
            return;
        }
        
        // Check if user is admin
        if (user.role !== 'admin') {
            console.log('User is not admin, redirecting to customer dashboard');
            redirecting = true;
            window.location.href = 'customer-dashboard.html';
            return;
        }
        
        // All checks passed, load the dashboard
        console.log('Loading admin dashboard for user:', user);
        loadDashboard();
        
        // Refresh every 30 seconds
        setInterval(() => {
            if (!redirecting) {
                loadDashboard();
            }
        }, 30000);
    }, 800); // Increased delay to ensure localStorage is fully written
});

