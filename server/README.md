# Blood Donation Camp Management System - Backend (Phase 1)

## Phase 1 - Core Setup & Authentication ✅

This phase includes the complete authentication infrastructure with JWT, MongoDB connection, and user management.

## Features Implemented

- ✅ Express server setup with middleware
- ✅ MongoDB connection with Mongoose
- ✅ User model with password hashing (bcrypt)
- ✅ JWT authentication (2-hour expiration)
- ✅ Registration, login, and profile endpoints
- ✅ Protected routes middleware
- ✅ Role-based authorization (admin, organizer, donor)
- ✅ Error handling middleware
- ✅ Request logging with Morgan

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the server directory:
```bash
cp .env.example .env
```

Then update the `.env` file with your credentials:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 3. Start the Server
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/profile` | Get user profile | Yes |

### Example Requests

#### Register
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "donor",
  "phone": "+1234567890"
}
```

#### Login
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile (Protected)
```
GET /api/auth/profile
Headers: {
  "Authorization": "Bearer <your_jwt_token>"
}
```

## Project Structure

```
server/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   └── authController.js     # Auth logic
├── middleware/
│   ├── authMiddleware.js     # JWT verification
│   └── errorMiddleware.js    # Error handling
├── models/
│   └── User.js               # User schema
├── routes/
│   └── authRoutes.js         # Auth endpoints
├── utils/
│   ├── generateToken.js      # JWT token generation
│   └── responseHandler.js    # Unified API responses
├── .env.example
├── .gitignore
├── package.json
└── server.js                 # Entry point
```

## Testing with Postman

1. Import the API endpoints into Postman
2. Register a new user
3. Login to get JWT token
4. Use the token in Authorization header (Bearer Token) for protected routes

## Next Steps - Phase 2

- Donor management module (CRUD operations)
- Donor eligibility checking
- Blood group and health information tracking

## Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Morgan** - Request logging
- **CORS** - Cross-origin resource sharing
