from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from decimal import Decimal
import os
from functools import wraps
import requests

app = Flask(__name__, static_folder='static', template_folder='templates')
# Use SQLite as fallback if MySQL is not available (easier for testing)
database_url = os.getenv('DATABASE_URL')
if not database_url:
    # Default to SQLite for easy setup
    database_url = 'sqlite:///refunds.db'
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['JWT_ALGORITHM'] = 'HS256'

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(
    app,
    resources={r"/api/*": {
        "origins": ["http://localhost:5000", "http://127.0.0.1:5000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }}
)

# Request logging middleware
@app.before_request
def log_request_info():
    if request.path.startswith('/api/'):
        auth_header = request.headers.get('Authorization', 'Not provided')
        print(f"\n=== Request: {request.method} {request.path} ===")
        print(f"Authorization header: {auth_header[:50] if auth_header != 'Not provided' else 'Not provided'}...")
        print(f"Origin: {request.headers.get('Origin', 'Not provided')}")

# JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    print(f"JWT Expired: {jwt_payload}")
    return jsonify({'message': 'Token has expired', 'error': 'token_expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"JWT Invalid Token Error: {str(error)}")
    return jsonify({'message': f'Invalid token: {str(error)}', 'error': 'invalid_token'}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    print(f"JWT Unauthorized Error: {str(error)}")
    # Log the request headers for debugging
    print(f"Request headers: {dict(request.headers)}")
    return jsonify({'message': 'Authorization token is missing', 'error': 'authorization_required'}), 401

# Database Models
class Customer(db.Model):
    __tablename__ = 'customers'
    customer_id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone_number = db.Column(db.String(15))
    address = db.Column(db.Text)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Order(db.Model):
    __tablename__ = 'orders'
    order_id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    order_date = db.Column(db.Date, nullable=False)
    order_status = db.Column(db.String(50), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    shipping_address = db.Column(db.Text, nullable=False)
    customer = db.relationship('Customer', backref='orders')

class ReturnRequest(db.Model):
    __tablename__ = 'return_requests'
    return_request_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.order_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)
    return_reason = db.Column(db.String(255), nullable=False)
    request_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Pending')
    approval_date = db.Column(db.Date)
    fraud_score = db.Column(db.Float, default=0.0)
    order = db.relationship('Order', backref='return_requests')
    customer = db.relationship('Customer', backref='return_requests')

class Refund(db.Model):
    __tablename__ = 'refunds'
    refund_id = db.Column(db.Integer, primary_key=True)
    return_request_id = db.Column(db.Integer, db.ForeignKey('return_requests.return_request_id'), nullable=False)
    refund_amount = db.Column(db.Numeric(10, 2), nullable=False)
    refund_date = db.Column(db.Date, nullable=False)
    payment_status = db.Column(db.String(50), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    return_request = db.relationship('ReturnRequest', backref='refunds')

class Admin(db.Model):
    __tablename__ = 'admins'
    admin_id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    role = db.Column(db.String(50), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    notification_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    user_type = db.Column(db.String(20), nullable=False)  # 'customer' or 'admin'
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)
    sent_date = db.Column(db.Date, nullable=False)
    is_read = db.Column(db.Boolean, default=False)

class PaymentTransaction(db.Model):
    __tablename__ = 'payment_transactions'
    transaction_id = db.Column(db.Integer, primary_key=True)
    refund_id = db.Column(db.Integer, db.ForeignKey('refunds.refund_id'), nullable=False)
    transaction_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    transaction_status = db.Column(db.String(50), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    refund = db.relationship('Refund', backref='payment_transactions')

class Wallet(db.Model):
    __tablename__ = 'wallets'
    wallet_id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False, unique=True)
    balance = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    customer = db.relationship('Customer', backref='wallet', uselist=False)

# Helper Functions
def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'message': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

def get_or_create_wallet(customer_id):
    """Get or create a wallet for the given customer."""
    wallet = Wallet.query.filter_by(customer_id=customer_id).first()
    if not wallet:
        wallet = Wallet(customer_id=customer_id, balance=0)
        db.session.add(wallet)
        db.session.commit()
    return wallet

def calculate_fraud_score(customer_id, order_id):
    """Calculate fraud score based on return patterns"""
    score = 0.0
    
    # Check number of recent returns
    recent_returns = ReturnRequest.query.filter_by(customer_id=customer_id).count()
    if recent_returns > 5:
        score += 30.0
    elif recent_returns > 3:
        score += 15.0
    
    # Check if order is very recent (potential fraud)
    order = Order.query.get(order_id)
    if order:
        days_since_order = (datetime.now().date() - order.order_date).days
        if days_since_order < 1:
            score += 20.0
        elif days_since_order < 3:
            score += 10.0
    
    # Check for multiple returns on same order
    existing_returns = ReturnRequest.query.filter_by(order_id=order_id).count()
    if existing_returns > 0:
        score += 25.0
    
    return min(score, 100.0)

def create_notification(user_id, user_type, message, notification_type):
    """Create a notification"""
    notification = Notification(
        user_id=user_id,
        user_type=user_type,
        message=message,
        notification_type=notification_type,
        sent_date=datetime.now().date()
    )
    db.session.add(notification)
    db.session.commit()

# API Routes - Authentication
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if Customer.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 400
    
    customer = Customer(
        first_name=data['first_name'],
        last_name=data['last_name'],
        email=data['email'],
        phone_number=data.get('phone_number'),
        address=data.get('address'),
        password_hash=generate_password_hash(data['password'])
    )
    
    db.session.add(customer)
    db.session.commit()
    
    access_token = create_access_token(identity=str(customer.customer_id), additional_claims={'role': 'customer'})
    return jsonify({
        'message': 'Registration successful',
        'access_token': access_token,
        'user': {
            'id': customer.customer_id,
            'name': f"{customer.first_name} {customer.last_name}",
            'email': customer.email
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        if 'email' not in data or 'password' not in data:
            return jsonify({'message': 'Email and password are required'}), 400
        
        user_type = data.get('user_type', 'customer')
        
        if user_type == 'admin':
            admin = Admin.query.filter_by(email=data['email']).first()
            if admin and check_password_hash(admin.password_hash, data['password']):
                access_token = create_access_token(identity=str(admin.admin_id), additional_claims={'role': 'admin'})
                return jsonify({
                    'access_token': access_token,
                    'user': {
                        'id': admin.admin_id,
                        'name': f"{admin.first_name} {admin.last_name}",
                        'email': admin.email,
                        'role': 'admin'  # Always use 'admin' for role check, not admin.role (which is 'Manager')
                    }
                }), 200
        else:
            customer = Customer.query.filter_by(email=data['email']).first()
            if customer and check_password_hash(customer.password_hash, data['password']):
                access_token = create_access_token(identity=str(customer.customer_id), additional_claims={'role': 'customer'})
                return jsonify({
                    'access_token': access_token,
                    'user': {
                        'id': customer.customer_id,
                        'name': f"{customer.first_name} {customer.last_name}",
                        'email': customer.email
                    }
                }), 200
        
        return jsonify({'message': 'Invalid email or password'}), 401
    except Exception as e:
        return jsonify({'message': f'Login error: {str(e)}'}), 500

# API Routes - Products (E-commerce Store)
@app.route('/api/products', methods=['GET'])
def get_products():
    """Fetch products from external API (using JSONPlaceholder or similar)"""
    try:
        # Using JSONPlaceholder as a demo API - replace with actual e-commerce API
        response = requests.get('https://fakestoreapi.com/products', timeout=5)
        if response.status_code == 200:
            products = response.json()
            return jsonify(products), 200
        else:
            # Fallback to sample products
            return jsonify(get_sample_products()), 200
    except:
        # Fallback to sample products if API fails
        return jsonify(get_sample_products()), 200

def get_sample_products():
    """Sample products for testing"""
    return [
        {'id': 1, 'title': 'Sample Product 1', 'price': 29.99, 'description': 'A great product', 'image': 'https://via.placeholder.com/300'},
        {'id': 2, 'title': 'Sample Product 2', 'price': 49.99, 'description': 'Another great product', 'image': 'https://via.placeholder.com/300'},
        {'id': 3, 'title': 'Sample Product 3', 'price': 19.99, 'description': 'Yet another product', 'image': 'https://via.placeholder.com/300'},
    ]

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    try:
        response = requests.get(f'https://fakestoreapi.com/products/{product_id}', timeout=5)
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({'message': 'Product not found'}), 404
    except:
        return jsonify({'message': 'Product not found'}), 404

# API Routes - Orders
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
        
        if 'total_amount' not in data or 'shipping_address' not in data:
            return jsonify({'message': 'Missing required fields: total_amount, shipping_address'}), 400
        
        customer_id_str = get_jwt_identity()
        customer_id = int(customer_id_str) if customer_id_str else None
        
        if not customer_id:
            return jsonify({'message': 'Invalid token'}), 401
        
        order = Order(
            customer_id=customer_id,
            order_date=datetime.now().date(),
            order_status='Completed',
            total_amount=float(data['total_amount']),
            shipping_address=data['shipping_address']
        )
        
        db.session.add(order)
        db.session.commit()
        
        create_notification(
            customer_id, 'customer',
            f'Your order #{order.order_id} has been placed successfully.',
            'Order Confirmation'
        )
        
        return jsonify({
            'message': 'Order created successfully',
            'order_id': order.order_id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error creating order: {str(e)}'}), 500

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    try:
        # Debug: Check if we can get the identity
        customer_id_str = get_jwt_identity()
        print(f"get_orders - Customer ID from token (string): {customer_id_str}, type: {type(customer_id_str)}")
        
        if not customer_id_str:
            print("get_orders - No customer_id found in token")
            return jsonify({'message': 'Invalid token - no identity found'}), 401
        
        # Convert string ID to integer for database query
        customer_id = int(customer_id_str)
        orders = Order.query.filter_by(customer_id=customer_id).order_by(Order.order_date.desc()).all()
        
        if len(orders) == 0:
            # Return empty array instead of error
            return jsonify([]), 200
        
        return jsonify([{
            'order_id': o.order_id,
            'order_date': str(o.order_date),
            'order_status': o.order_status,
            'total_amount': float(o.total_amount),
            'shipping_address': o.shipping_address
        } for o in orders]), 200
    except Exception as e:
        import traceback
        print(f"Error in get_orders: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'message': f'Error fetching orders: {str(e)}'}), 500

# API Routes - Return Requests
@app.route('/api/return-requests', methods=['POST'])
@jwt_required()
def create_return_request():
    data = request.get_json()
    customer_id_str = get_jwt_identity()
    customer_id = int(customer_id_str) if customer_id_str else None
    
    if not customer_id:
        return jsonify({'message': 'Invalid token'}), 401
    
    # Verify order belongs to customer
    order = Order.query.filter_by(order_id=data['order_id'], customer_id=customer_id).first()
    if not order:
        return jsonify({'message': 'Order not found'}), 404
    
    # Check if return already exists
    existing = ReturnRequest.query.filter_by(order_id=data['order_id']).first()
    if existing:
        return jsonify({'message': 'Return request already exists for this order'}), 400
    
    # Calculate fraud score
    fraud_score = calculate_fraud_score(customer_id, data['order_id'])
    
    return_request = ReturnRequest(
        order_id=data['order_id'],
        customer_id=customer_id,
        return_reason=data['return_reason'],
        request_date=datetime.now().date(),
        status='Pending',
        fraud_score=fraud_score
    )
    
    db.session.add(return_request)
    db.session.commit()
    
    # Create notifications
    create_notification(
        customer_id, 'customer',
        f'Your return request #{return_request.return_request_id} has been submitted and is under review.',
        'Return Request Submitted'
    )
    
    # Notify all admins
    admins = Admin.query.all()
    for admin in admins:
        create_notification(
            admin.admin_id, 'admin',
            f'New return request #{return_request.return_request_id} from customer {return_request.customer.first_name} {return_request.customer.last_name}',
            'New Return Request'
        )
    
    return jsonify({
        'message': 'Return request created successfully',
        'return_request_id': return_request.return_request_id,
        'fraud_score': return_request.fraud_score
    }), 201

@app.route('/api/return-requests', methods=['GET'])
@jwt_required()
def get_return_requests():
    try:
        claims = get_jwt()
        role = claims.get('role')
        
        if role == 'admin':
            return_requests = ReturnRequest.query.order_by(ReturnRequest.request_date.desc()).all()
        else:
            customer_id_str = get_jwt_identity()
            customer_id = int(customer_id_str) if customer_id_str else None
            if not customer_id:
                return jsonify({'message': 'Invalid token'}), 401
            return_requests = ReturnRequest.query.filter_by(customer_id=customer_id).order_by(ReturnRequest.request_date.desc()).all()
        
        if len(return_requests) == 0:
            # Return empty array instead of error
            return jsonify([]), 200
        
        return jsonify([{
            'return_request_id': r.return_request_id,
            'order_id': r.order_id,
            'customer_id': r.customer_id,
            'customer_name': f"{r.customer.first_name} {r.customer.last_name}",
            'return_reason': r.return_reason,
            'request_date': str(r.request_date),
            'status': r.status,
            'approval_date': str(r.approval_date) if r.approval_date else None,
            'fraud_score': float(r.fraud_score) if r.fraud_score else 0.0,
            'order_total': float(r.order.total_amount)
        } for r in return_requests]), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching return requests: {str(e)}'}), 500

@app.route('/api/return-requests/<int:request_id>/approve', methods=['POST'])
@admin_required
def approve_return_request(request_id):
    data = request.get_json()
    return_request = ReturnRequest.query.get(request_id)
    
    if not return_request:
        return jsonify({'message': 'Return request not found'}), 404
    
    if return_request.status != 'Pending':
        return jsonify({'message': 'Return request already processed'}), 400
    
    return_request.status = 'Approved'
    return_request.approval_date = datetime.now().date()
    db.session.commit()
    
    # Create refund
    refund = Refund(
        return_request_id=return_request.return_request_id,
        refund_amount=return_request.order.total_amount,
        refund_date=datetime.now().date(),
        payment_status='Pending',
        payment_method=data.get('payment_method', 'Credit Card')
    )
    db.session.add(refund)
    db.session.commit()
    
    # Create payment transaction
    transaction = PaymentTransaction(
        refund_id=refund.refund_id,
        transaction_date=datetime.now().date(),
        amount=refund.refund_amount,
        transaction_status='Processing',
        payment_method=refund.payment_method
    )
    db.session.add(transaction)
    db.session.commit()
    
    # Update refund status
    refund.payment_status = 'Completed'
    transaction.transaction_status = 'Completed'
    db.session.commit()
    
    # Credit refund amount to customer's wallet (dummy global payment platform)
    wallet = get_or_create_wallet(return_request.customer_id)
    refund_amount_decimal = Decimal(str(refund.refund_amount)) if refund.refund_amount is not None else Decimal('0')
    wallet.balance = (wallet.balance or Decimal('0')) + refund_amount_decimal
    db.session.commit()
    
    # Create notifications
    create_notification(
        return_request.customer_id, 'customer',
        f'Your return request #{return_request.return_request_id} has been approved. '
        f'Refund of ${float(refund.refund_amount)} has been processed and credited to your wallet.',
        'Return Request Approved'
    )
    
    return jsonify({
        'message': 'Return request approved and refund processed',
        'refund_id': refund.refund_id
    }), 200

@app.route('/api/return-requests/<int:request_id>/reject', methods=['POST'])
@admin_required
def reject_return_request(request_id):
    data = request.get_json()
    return_request = ReturnRequest.query.get(request_id)
    
    if not return_request:
        return jsonify({'message': 'Return request not found'}), 404
    
    if return_request.status != 'Pending':
        return jsonify({'message': 'Return request already processed'}), 400
    
    return_request.status = 'Rejected'
    return_request.approval_date = datetime.now().date()
    db.session.commit()
    
    create_notification(
        return_request.customer_id, 'customer',
        f'Your return request #{return_request.return_request_id} has been rejected. Reason: {data.get("rejection_reason", "Not specified")}',
        'Return Request Rejected'
    )
    
    return jsonify({'message': 'Return request rejected'}), 200

# API Routes - Refunds
@app.route('/api/refunds', methods=['GET'])
@jwt_required()
def get_refunds():
    claims = get_jwt()
    role = claims.get('role')
    
    if role == 'admin':
        refunds = Refund.query.all()
    else:
        customer_id_str = get_jwt_identity()
        customer_id = int(customer_id_str) if customer_id_str else None
        if not customer_id:
            return jsonify({'message': 'Invalid token'}), 401
        return_requests = ReturnRequest.query.filter_by(customer_id=customer_id).all()
        refund_ids = [r.return_request_id for r in return_requests]
        refunds = Refund.query.filter(Refund.return_request_id.in_(refund_ids)).all()
    
    return jsonify([{
        'refund_id': r.refund_id,
        'return_request_id': r.return_request_id,
        'refund_amount': float(r.refund_amount),
        'refund_date': str(r.refund_date),
        'payment_status': r.payment_status,
        'payment_method': r.payment_method
    } for r in refunds]), 200

@app.route('/api/wallet', methods=['GET'])
@jwt_required()
def get_wallet():
    """Get the current customer's wallet balance."""
    claims = get_jwt()
    if claims.get('role') != 'customer':
        return jsonify({'message': 'Wallet is only available for customers'}), 403

    customer_id_str = get_jwt_identity()
    customer_id = int(customer_id_str) if customer_id_str else None
    if not customer_id:
        return jsonify({'message': 'Invalid token'}), 401

    wallet = Wallet.query.filter_by(customer_id=customer_id).first()
    balance = float(wallet.balance) if wallet and wallet.balance is not None else 0.0

    return jsonify({
        'customer_id': customer_id,
        'balance': balance
    }), 200

@app.route('/api/wallet/topup', methods=['POST'])
@jwt_required()
def topup_wallet():
    """Add dummy funds to the customer's wallet (simulated global payment)."""
    claims = get_jwt()
    if claims.get('role') != 'customer':
        return jsonify({'message': 'Wallet top-up is only available for customers'}), 403

    customer_id_str = get_jwt_identity()
    customer_id = int(customer_id_str) if customer_id_str else None
    if not customer_id:
        return jsonify({'message': 'Invalid token'}), 401

    data = request.get_json() or {}
    try:
        amount = Decimal(str(data.get('amount', 0)))
    except Exception:
        return jsonify({'message': 'Invalid amount value'}), 400
    if amount <= 0:
        return jsonify({'message': 'Top-up amount must be greater than zero'}), 400

    wallet = get_or_create_wallet(customer_id)
    current_balance = wallet.balance or Decimal('0')
    wallet.balance = current_balance + amount
    db.session.commit()

    create_notification(
        customer_id, 'customer',
        f'Your wallet has been topped up with ${float(amount):.2f}. New balance: ${float(wallet.balance):.2f}.',
        'Wallet Top-Up'
    )

    return jsonify({
        'message': 'Wallet topped up successfully',
        'balance': float(wallet.balance)
    }), 200

# API Routes - Notifications
@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if user_id_str else None
        if not user_id:
            return jsonify({'message': 'Invalid token'}), 401
        
        claims = get_jwt()
        user_type = 'admin' if claims.get('role') == 'admin' else 'customer'
        
        notifications = Notification.query.filter_by(
            user_id=user_id,
            user_type=user_type
        ).order_by(Notification.sent_date.desc()).limit(50).all()
        
        if len(notifications) == 0:
            # Return empty array instead of error
            return jsonify([]), 200
        
        return jsonify([{
            'notification_id': n.notification_id,
            'message': n.message,
            'notification_type': n.notification_type,
            'sent_date': str(n.sent_date),
            'is_read': n.is_read
        } for n in notifications]), 200
    except Exception as e:
        return jsonify({'message': f'Error fetching notifications: {str(e)}'}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    notification = Notification.query.get(notification_id)
    if notification:
        notification.is_read = True
        db.session.commit()
        return jsonify({'message': 'Notification marked as read'}), 200
    return jsonify({'message': 'Notification not found'}), 404

# API Routes - Analytics
@app.route('/api/analytics/returns', methods=['GET'])
@admin_required
def get_returns_analytics():
    total_returns = ReturnRequest.query.count()
    pending_returns = ReturnRequest.query.filter_by(status='Pending').count()
    approved_returns = ReturnRequest.query.filter_by(status='Approved').count()
    rejected_returns = ReturnRequest.query.filter_by(status='Rejected').count()
    
    total_refund_amount = db.session.query(db.func.sum(Refund.refund_amount)).scalar() or 0
    
    high_fraud_returns = ReturnRequest.query.filter(ReturnRequest.fraud_score > 50).count()
    
    return jsonify({
        'total_returns': total_returns,
        'pending_returns': pending_returns,
        'approved_returns': approved_returns,
        'rejected_returns': rejected_returns,
        'total_refund_amount': float(total_refund_amount),
        'high_fraud_returns': high_fraud_returns
    }), 200

@app.route('/api/analytics/customers', methods=['GET'])
@admin_required
def get_customer_analytics():
    total_customers = Customer.query.count()
    customers_with_returns = db.session.query(db.func.count(db.func.distinct(ReturnRequest.customer_id))).scalar() or 0
    
    return jsonify({
        'total_customers': total_customers,
        'customers_with_returns': customers_with_returns
    }), 200

# Initialize database
def init_db():
    db.create_all()
    
    # Create default admin if not exists
    if not Admin.query.filter_by(email='admin@example.com').first():
        admin = Admin(
            first_name='Admin',
            last_name='User',
            email='admin@example.com',
            role='Manager',
            password_hash=generate_password_hash('admin123')
        )
        db.session.add(admin)
        db.session.commit()

@app.route('/')
def index():
    from flask import render_template
    return render_template('index.html')

@app.route('/<path:filename>')
def serve_html(filename):
    from flask import render_template
    if filename.endswith('.html'):
        try:
            return render_template(filename)
        except:
            return f"Page {filename} not found", 404
    # Static files are handled by Flask automatically via static_folder
    return app.send_static_file(filename)

if __name__ == '__main__':
    with app.app_context():
        init_db()
    
    app.run(debug=True, port=5000)

