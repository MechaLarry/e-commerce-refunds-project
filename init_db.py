"""
Database initialization script.
Run this script to set up the database tables and create default admin account.
"""

from app import app, db, Admin, Customer, Order, ReturnRequest, Refund, Notification, PaymentTransaction
from werkzeug.security import generate_password_hash

def init_database():
    """Initialize database with tables and default admin"""
    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("✓ Database tables created successfully!")
        
        # Create default admin if not exists
        admin = Admin.query.filter_by(email='admin@example.com').first()
        if not admin:
            admin = Admin(
                first_name='Admin',
                last_name='User',
                email='admin@example.com',
                role='Manager',
                password_hash=generate_password_hash('admin123')
            )
            db.session.add(admin)
            db.session.commit()
            print("✓ Default admin account created!")
            print("  Email: admin@example.com")
            print("  Password: admin123")
        else:
            print("✓ Admin account already exists")
        
        print("\nDatabase initialization complete!")
        print("You can now run the application with: python app.py")

if __name__ == '__main__':
    try:
        init_database()
    except Exception as e:
        print(f"Error initializing database: {e}")
        print("\nPlease ensure:")
        print("1. MySQL server is running")
        print("2. Database 'refunds_db' exists")
        print("3. DATABASE_URL environment variable is set correctly")
        print("4. All dependencies are installed (pip install -r requirements.txt)")

