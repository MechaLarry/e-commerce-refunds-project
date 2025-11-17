let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Load products from API
async function loadProducts() {
    try {
        const data = await apiRequest('/products');
        products = data;
        displayProducts(products);
    } catch (error) {
        showAlert('Failed to load products. Using sample products.', 'error');
        displayProducts([]);
    }
}

// Display products
function displayProducts(productsList) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    if (productsList.length === 0) {
        container.innerHTML = '<p>No products available. Please check back later.</p>';
        return;
    }
    
    container.innerHTML = productsList.map(product => `
        <div class="product-card">
            <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.title}" class="product-image">
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-price">$${product.price}</p>
                <p class="product-description">${product.description || ''}</p>
                <button class="btn btn-primary" onclick="addToCart(${product.id})">Add to Cart</button>
            </div>
        </div>
    `).join('');
}

// Add to cart
function addToCart(productId) {
    if (!isAuthenticated()) {
        showAlert('Please login to add items to cart', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showAlert('Product added to cart!', 'success');
}

// Update cart count
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = count;
        cartCountEl.style.display = count > 0 ? 'inline' : 'none';
    }
}

// View cart
function viewCart() {
    if (cart.length === 0) {
        showAlert('Your cart is empty', 'info');
        return;
    }
    
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    
    const cartItems = document.getElementById('cart-items');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cartItems.innerHTML = cart.map(item => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;">
                    <div>
                        <div style="font-weight: 600; margin-bottom: 0.25rem;">${item.title}</div>
                        <div style="font-size: 0.85rem; color: #666;">${item.description ? item.description.substring(0, 50) + '...' : ''}</div>
                    </div>
                </div>
            </td>
            <td style="text-align: center; padding: 1rem; font-weight: 600; color: #667eea;">$${parseFloat(item.price).toFixed(2)}</td>
            <td style="text-align: center; padding: 1rem;">
                <div style="display: inline-flex; align-items: center; gap: 0.5rem; border: 1px solid #e0e0e0; border-radius: 5px; padding: 0.25rem 0.5rem;">
                    <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #667eea;">−</button>
                    <span style="min-width: 30px; text-align: center; font-weight: 600;">${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #667eea;">+</button>
                </div>
            </td>
            <td style="text-align: right; padding: 1rem; font-weight: 600;">$${(item.price * item.quantity).toFixed(2)}</td>
            <td style="text-align: center; padding: 1rem;">
                <button class="btn btn-danger btn-small" onclick="removeFromCart(${item.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Remove</button>
            </td>
        </tr>
    `).join('');
    
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
    modal.style.display = 'block';
}

// Update quantity
function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        viewCart(); // Refresh cart view
    }
}

// Remove from cart
function removeFromCart(productId) {
    if (confirm('Remove this item from cart?')) {
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        
        if (cart.length === 0) {
            document.getElementById('cart-modal').style.display = 'none';
            showAlert('Cart is now empty', 'info');
        } else {
            viewCart();
        }
    }
}

// Checkout
async function checkout() {
    if (!isAuthenticated()) {
        showAlert('Please login to checkout', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }
    
    if (cart.length === 0) {
        showAlert('Your cart is empty', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create a better checkout form
    const shippingAddress = prompt('Enter your shipping address:', '');
    if (!shippingAddress || shippingAddress.trim() === '') {
        showAlert('Shipping address is required', 'error');
        return;
    }
    
    // Show loading state
    const checkoutBtn = document.querySelector('#cart-modal .btn-primary');
    const originalText = checkoutBtn ? checkoutBtn.textContent : 'Checkout';
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing...';
    }
    
    try {
        const response = await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify({
                total_amount: total,
                shipping_address: shippingAddress.trim()
            })
        });
        
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        document.getElementById('cart-modal').style.display = 'none';
        showAlert(`✅ Order placed successfully! Order ID: ${response.order_id}`, 'success');
        
        setTimeout(() => {
            window.location.href = 'customer-dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('Checkout error:', error);
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = originalText;
        }
        showAlert(error.message || 'Failed to place order. Please try again.', 'error');
    }
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    loadProducts();
});

