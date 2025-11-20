let checkoutCart = JSON.parse(localStorage.getItem('cart')) || [];

function renderCheckoutSummary() {
    const container = document.getElementById('checkout-summary');
    if (!container) return;

    if (!checkoutCart || checkoutCart.length === 0) {
        container.innerHTML = `
            <p>Your cart is empty. <a href="/">Go back to the store</a> to add items.</p>
        `;
        return;
    }

    const total = checkoutCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${checkoutCart.map(item => `
                    <tr>
                        <td>${item.title}</td>
                        <td>$${parseFloat(item.price).toFixed(2)}</td>
                        <td>${item.quantity}</td>
                        <td>$${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div style="text-align: right; margin-top: 1rem;">
            <p style="font-size: 1.25rem; font-weight: bold;">Order Total: $${total.toFixed(2)}</p>
        </div>
    `;
}

async function handleCheckoutSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated()) {
        alert('Please login to complete checkout.');
        window.location.href = 'login.html';
        return;
    }

    if (!checkoutCart || checkoutCart.length === 0) {
        alert('Your cart is empty.');
        window.location.href = '/';
        return;
    }

    const fullName = document.getElementById('full-name').value.trim();
    const addressLine = document.getElementById('address-line').value.trim();
    const city = document.getElementById('city').value.trim();
    const country = document.getElementById('country').value.trim();

    if (!fullName || !addressLine || !city || !country) {
        alert('Please fill in all shipping details.');
        return;
    }

    const total = checkoutCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingAddress = `${fullName}\n${addressLine}\n${city}\n${country}`;

    const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing Order...';

    try {
        const response = await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify({
                total_amount: total,
                shipping_address: shippingAddress
            })
        });

        // Clear cart
        checkoutCart = [];
        localStorage.setItem('cart', JSON.stringify(checkoutCart));

        alert(`Order placed successfully! Order ID: ${response.order_id}`);
        window.location.href = 'customer-dashboard.html';
    } catch (error) {
        console.error('Checkout error:', error);
        alert(error.message || 'Failed to place order. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    renderCheckoutSummary();

    const form = document.getElementById('checkout-form');
    if (form) {
        form.addEventListener('submit', handleCheckoutSubmit);
    }
});


