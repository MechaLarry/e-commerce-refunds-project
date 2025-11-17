# Returns and Refunds System for E-Commerce Platforms

A comprehensive automated returns and refunds management system built with Flask (Python), JavaScript, HTML, and CSS. This system enables customers to initiate return requests, allows administrators to review and approve them, and facilitates efficient refund processing with built-in fraud detection.

## Features

### Customer Features

- **User Registration & Authentication**: Secure customer registration and login
- **E-Commerce Store**: Browse products from external APIs (FakeStore API integration)
- **Shopping Cart**: Add products to cart and checkout
- **Order Management**: View order history and details
- **Return Requests**: Submit return requests with reasons
- **Status Tracking**: Real-time tracking of return request status
- **Notifications**: Receive notifications about return request updates

### Admin Features

- **Admin Dashboard**: Comprehensive dashboard with analytics
- **Return Request Management**: Review, approve, or reject return requests
- **Fraud Detection**: Automated fraud scoring system
- **Refund Processing**: Automated refund processing upon approval
- **Analytics & Reporting**: View statistics on returns, refunds, and customers
- **Notifications**: Receive notifications for new return requests

### Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Separate access for customers and admins
- **Password Hashing**: Secure password storage using Werkzeug
- **Fraud Detection**: Automated scoring system to detect suspicious return patterns

## Technology Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Database**: MySQL (with SQLAlchemy ORM)
- **Authentication**: JWT (JSON Web Tokens)
- **API Integration**: RESTful APIs for product data

## Installation

### Prerequisites

- Python 3.8 or higher
- MySQL Server
- pip (Python package manager)

### Setup Steps

1. **Clone or download the project**

   ```bash
   cd "refunds project"
   ```

2. **Create a virtual environment (recommended)**

   ```bash
   python -m venv venv

   # On Windows
   venv\Scripts\activate

   # On Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Set up MySQL Database**

   - Create a MySQL database named `refunds_db`
   - Update the database connection string in `app.py` or set environment variable:

     ```bash
     # Windows PowerShell
     $env:DATABASE_URL="mysql+pymysql://username:password@localhost/refunds_db"

     # Linux/Mac
     export DATABASE_URL="mysql+pymysql://username:password@localhost/refunds_db"
     ```

5. **Run the application**

   ```bash
   python app.py
   ```

6. **Access the application**
   - Open your browser and navigate to: `http://localhost:5000`
   - Default admin credentials:
     - Email: `admin@example.com`
     - Password: `admin123`

## Project Structure

```
refunds project/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── static/
│   ├── css/
│   │   └── style.css     # Main stylesheet
│   └── js/
│       ├── auth.js        # Authentication functions
│       ├── store.js       # Store/product functionality
│       ├── customer-dashboard.js  # Customer dashboard logic
│       └── admin-dashboard.js     # Admin dashboard logic
└── templates/
    ├── index.html         # Home/store page
    ├── login.html         # Login page
    ├── register.html      # Registration page
    ├── customer-dashboard.html  # Customer dashboard
    └── admin-dashboard.html     # Admin dashboard
```

## Database Schema

The system uses the following main tables:

- **customers**: Customer information
- **orders**: Order details
- **return_requests**: Return request information
- **refunds**: Refund records
- **admins**: Administrator accounts
- **notifications**: System notifications
- **payment_transactions**: Payment transaction records

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - Login (customer or admin)

### Products

- `GET /api/products` - Get all products (from external API)
- `GET /api/products/<id>` - Get product by ID

### Orders

- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders

### Return Requests

- `POST /api/return-requests` - Submit return request
- `GET /api/return-requests` - Get return requests
- `POST /api/return-requests/<id>/approve` - Approve return (admin only)
- `POST /api/return-requests/<id>/reject` - Reject return (admin only)

### Refunds

- `GET /api/refunds` - Get refund records

### Notifications

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/<id>/read` - Mark notification as read

### Analytics (Admin Only)

- `GET /api/analytics/returns` - Returns statistics
- `GET /api/analytics/customers` - Customer statistics

## Fraud Detection

The system includes automated fraud detection that calculates a fraud score based on:

- Number of recent returns by the customer
- Time since order was placed
- Multiple return requests on the same order

Fraud scores are displayed to admins to help them make informed decisions.

## Usage Guide

### For Customers

1. **Register/Login**: Create an account or login
2. **Browse Products**: View products on the home page
3. **Add to Cart**: Add products to your shopping cart
4. **Checkout**: Place an order with shipping address
5. **Request Return**: Go to dashboard, find your order, and click "Request Return"
6. **Track Status**: Monitor your return request status in the dashboard

### For Administrators

1. **Login**: Use admin credentials to login
2. **View Dashboard**: See analytics and pending return requests
3. **Review Requests**: Check return requests with fraud scores
4. **Approve/Reject**: Approve legitimate returns or reject suspicious ones
5. **Monitor Analytics**: Track return statistics and trends

## Testing the System

1. **Create a Customer Account**: Register a new customer
2. **Browse and Order**: Add products to cart and place an order
3. **Request Return**: Submit a return request for the order
4. **Login as Admin**: Use admin credentials
5. **Review and Approve**: Check the return request and approve it
6. **Verify Refund**: Check that refund was processed automatically

## Configuration

You can configure the following via environment variables:

- `DATABASE_URL`: MySQL connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens (change in production!)

## Security Notes

- Change the default JWT secret key in production
- Use strong passwords for admin accounts
- Enable HTTPS in production
- Regularly update dependencies
- Review fraud detection thresholds based on your business needs

## Future Enhancements

- Integration with payment gateways (Stripe, PayPal)
- Email notifications
- Two-factor authentication for admins
- Advanced fraud detection using machine learning
- Integration with multiple e-commerce platforms
- Mobile app support

## Troubleshooting

### Database Connection Issues

- Ensure MySQL server is running
- Verify database credentials
- Check that the database exists

### Port Already in Use

- Change the port in `app.py`: `app.run(debug=True, port=5001)`

### API Errors

- Check that external product API is accessible
- System will fallback to sample products if API fails

## License

This project is created for educational and demonstration purposes.

## Support

For issues or questions, please refer to the project documentation or contact the development team.
