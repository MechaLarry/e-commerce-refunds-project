# Quick Setup Guide

## Prerequisites Check

Before starting, ensure you have:

- ✅ Python 3.8+ installed
- ✅ MySQL Server installed and running
- ✅ pip (Python package manager)

## Step-by-Step Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up MySQL Database

**Option A: Using MySQL Command Line**

```sql
CREATE DATABASE refunds_db;
```

**Option B: Using MySQL Workbench or phpMyAdmin**

- Create a new database named `refunds_db`
- Character set: `utf8mb4`
- Collation: `utf8mb4_unicode_ci`

### 3. Configure Database Connection

**Windows (PowerShell):**

```powershell
$env:DATABASE_URL="mysql+pymysql://root:your_password@localhost/refunds_db"
```

**Windows (Command Prompt):**

```cmd
set DATABASE_URL=mysql+pymysql://root:your_password@localhost/refunds_db
```

**Linux/Mac:**

```bash
export DATABASE_URL="mysql+pymysql://root:your_password@localhost/refunds_db"
```

**Note:** Replace `root` and `your_password` with your MySQL username and password.

### 4. Run the Application

```bash
python app.py
```

The application will:

- Create all necessary database tables automatically
- Create a default admin account (admin@example.com / admin123)
- Start the server on http://localhost:5000

### 5. Access the Application

Open your browser and navigate to:

- **Store**: http://localhost:5000
- **Login**: http://localhost:5000/login.html
- **Admin Login**: Use `admin@example.com` / `admin123`

## Testing the System

### Test Customer Flow:

1. Register a new customer account
2. Browse products on the home page
3. Add products to cart
4. Checkout (enter shipping address)
5. Go to Customer Dashboard
6. Click "Request Return" on your order
7. Enter return reason and submit

### Test Admin Flow:

1. Login as admin (admin@example.com / admin123)
2. View the Admin Dashboard
3. See the pending return request
4. Review the fraud score
5. Approve or reject the return request
6. Check analytics and notifications

## Troubleshooting

### "Module not found" errors

- Make sure you've activated your virtual environment
- Run `pip install -r requirements.txt` again

### Database connection errors

- Verify MySQL is running: `mysql -u root -p`
- Check your DATABASE_URL environment variable
- Ensure the database `refunds_db` exists

### Port 5000 already in use

- Change the port in `app.py`: `app.run(debug=True, port=5001)`
- Or stop the process using port 5000

### Products not loading

- The app uses FakeStore API (https://fakestoreapi.com)
- If the API is down, the app will use sample products
- Check your internet connection

## Default Credentials

**Admin Account:**

- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Important:** Change the admin password in production!

## Next Steps

1. Create customer accounts
2. Place test orders
3. Submit return requests
4. Test the admin approval workflow
5. Review analytics and fraud detection

## Need Help?

Refer to the main README.md for detailed documentation.
