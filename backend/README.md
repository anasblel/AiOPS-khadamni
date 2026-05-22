# AIOps Freelance - Backend Documentation

## 📋 Overview

The backend is a **Node.js/Express server** that powers the AIOps Freelance platform. It handles user authentication, provider management, real-time communication via Socket.io, and integrates with MongoDB for data persistence. The architecture follows a modular MVC pattern with routes, controllers, models, and middleware for clean separation of concerns.

---

## 🛠️ Technology Stack

- **Framework**: Express.js (v4.18.0)
- **Database**: MongoDB (v7.0.0) with Mongoose
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs for password hashing
- **Real-time Communication**: Socket.io (v4.0.0)
- **Development**: Node.js, Nodemon for auto-restart
- **Environment**: dotenv for configuration management
- **Security**: CORS for cross-origin requests

---

## 📁 Folder Structure

```
backend/
├── server.js              # Main application entry point
├── package.json           # Project dependencies and scripts
├── .env                   # Environment variables (credentials, secrets)
└── src/
    ├── controllers/       # Business logic for handling requests
    ├── middleware/        # Request processing functions (auth, validation)
    ├── models/            # Database schemas (User, Provider, Booking)
    └── routes/            # API endpoint definitions
```

---

## 📄 File-by-File Breakdown

### **server.js** (Root Level)
**Purpose**: Main entry point of the application

**What it does**:
- Initializes the Express application
- Sets up MongoDB connection using Mongoose
- Configures CORS (Cross-Origin Resource Sharing) to allow requests from the frontend (localhost:5173)
- Sets up Socket.io for real-time communication
- Registers all API routes
- Implements Socket.io event listeners for user connections and chat
- Starts the HTTP server on the configured port (default: 5000)

**Key Features**:
- Drops the Provider collection on startup to clean up old database indexes
- Handles MongoDB connection errors gracefully
- Socket.io is configured to accept events like `join` and `disconnect`

---

### **package.json**
**Purpose**: Declares project metadata, dependencies, and npm scripts

**Key Dependencies**:
- `express`: Web framework for building REST APIs
- `mongoose`: ODM (Object Data Modeling) for MongoDB
- `jsonwebtoken`: For JWT-based authentication
- `bcryptjs`: For password hashing and comparison
- `cors`: Middleware for handling cross-origin requests
- `socket.io`: Real-time bidirectional communication
- `dotenv`: Loads environment variables from .env file

**Available Scripts**:
- `npm start`: Start the production server
- `npm run dev`: Start the development server with Nodemon (auto-restart on file changes)

---

## 📂 src/ Directory Details

### **src/controllers/**

#### **authController.js**
**Purpose**: Handles user authentication logic (register and login)

**Exports**:
- **`register(req, res)`**: 
  - Validates user input (name, email, password, role)
  - Checks if email already exists
  - Hashes password using bcryptjs with 10 salt rounds
  - Creates a new User document
  - If role is "provider", creates a corresponding Provider profile
  - Generates JWT access token (15m expiry) and refresh token (7d expiry)
  - Returns user data and tokens

- **`login(req, res)`**:
  - Validates email and password
  - Finds user by email
  - Compares provided password with hashed password in database
  - Generates new JWT tokens on successful authentication
  - Returns user data and tokens

**Helper Function**:
- **`generateTokens(id)`**: Creates access and refresh tokens with user ID as payload

---

### **src/middleware/**

#### **protect.js**
**Purpose**: Middleware for protecting routes that require authentication

**Exports**:
- **`protect(req, res, next)`**:
  - Extracts JWT token from `Authorization` header (Bearer token format)
  - Verifies token using JWT_SECRET
  - Decodes token to get user ID
  - Fetches user data from database (excluding password)
  - Attaches user object to `req.user` for use in protected route handlers
  - Calls `next()` to proceed to the route handler
  - Returns 401 error if token is missing or invalid

---

### **src/models/**

#### **User.js**
**Purpose**: Defines the User database schema

**Schema Fields**:
- `name` (String, Required): User's full name
- `email` (String, Required, Unique): User's email (no duplicates allowed)
- `password` (String, Required): Hashed password
- `role` (String, Enum: ['client', 'provider'], Required): User's role in the platform
- `timestamps`: Auto-generated `createdAt` and `updatedAt` fields

**Indexed Fields**: Email (unique index)

---

#### **Provider.js**
**Purpose**: Defines the Provider profile schema (extends User with service details)

**Schema Fields**:
- `user` (ObjectId, Reference to User, Required): Links to the User document
- `skills` (Array of Strings): List of services/skills offered (e.g., ["plumbing", "electrical"])
- `location` (Object): Geospatial data for location-based search
  - `type`: GeoJSON type (always 'Point' for a single location)
  - `coordinates`: [longitude, latitude] format
- `isRemote` (Boolean, Default: false): Whether provider offers remote services
- `hourlyRate` (Number, Default: 0): Price per hour in local currency
- `currency` (String, Default: 'TND'): Local currency code (e.g., TND for Tunisian Dinar)
- `availability` (Array): List of availability slots with dates and time ranges
  - `day` (String): Date in YYYY-MM-DD format
  - `slots` (Array): Time slots with start and end times
- `rating` (Number, Default: 0): Average rating from bookings
- `totalBookings` (Number, Default: 0): Count of completed bookings
- `timestamps`: Auto-generated `createdAt` and `updatedAt` fields

**Indexes**: 
- 2dsphere index on `location` for geospatial queries (finding providers near a location)

---

#### **Booking.js** (Referenced but not yet implemented)
**Planned Purpose**: Will store booking/service request records

**Expected Fields**: 
- Reference to client User
- Reference to provider Provider
- Booking status (pending, confirmed, completed)
- Service details and pricing

---

### **src/routes/**

#### **auth.js**
**Purpose**: Defines authentication endpoints

**Endpoints**:
- `POST /api/auth/register`: Create a new user account (client or provider)
- `POST /api/auth/login`: Authenticate user and receive JWT tokens

**Handler**: Uses `authController` functions

---

#### **providers.js**
**Purpose**: Defines provider-related endpoints

**Endpoints**:
- `GET /api/providers/test`: Simple test endpoint returning `{ ok: true }`

**Future Endpoints** (to be implemented):
- GET /api/providers: Search providers by skills, location, availability
- GET /api/providers/:id: Get provider profile details
- PUT /api/providers/:id: Update provider profile
- POST /api/providers/:id/availability: Add availability slots

---

#### **bookings.js** (Referenced but not yet created)
**Planned Endpoints**:
- POST /api/bookings: Create a new booking request
- GET /api/bookings/:id: Get booking details
- PUT /api/bookings/:id: Update booking status

---

#### **chat.js** (Referenced but not yet created)
**Planned Purpose**: Will handle chat/messaging between clients and providers

---

## 🔄 Application Flow

### **User Registration Flow**
1. Frontend sends POST request to `/api/auth/register` with name, email, password, role
2. Backend (authController) validates input
3. Checks if email already exists
4. Hashes password using bcryptjs
5. Creates User document in MongoDB
6. If role is 'provider', creates corresponding Provider document
7. Generates JWT tokens
8. Returns user data and tokens to frontend
9. Frontend stores tokens in localStorage and updates AuthContext

### **User Login Flow**
1. Frontend sends POST request to `/api/auth/login` with email and password
2. Backend finds user by email
3. Compares provided password with hashed password
4. If match, generates new JWT tokens
5. Returns user data and tokens
6. Frontend updates stored tokens and user state

### **Protected Route Access Flow**
1. Frontend includes JWT token in Authorization header (Bearer token)
2. Backend middleware (`protect.js`) extracts and verifies token
3. Fetches user data from database
4. Attaches user to request object
5. Route handler executes with access to user data
6. If token is invalid/expired, returns 401 Unauthorized

### **Real-time Communication (Socket.io)**
1. When client connects to Socket.io server
2. Server emits `Client connected` message
3. Client sends `join` event with userId
4. Server joins socket to a room identified by userId
5. Messages sent to that room reach only that user
6. On disconnect, socket leaves room and disconnects

---

## 🔐 Security Features

1. **Password Hashing**: Bcryptjs with 10 salt rounds (bcrypt.hash)
2. **JWT Authentication**: Access tokens (15min) and refresh tokens (7 days)
3. **CORS Protection**: Restricted to frontend origin (localhost:5173)
4. **Middleware Protection**: `protect.js` secures sensitive routes
5. **Token Validation**: Every protected request verifies JWT signature

---

## 🚀 Environment Variables (.env)

Required variables (set in .env file):
- `PORT`: Server port (default: 5000)
- `MONGO_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for signing access tokens
- `JWT_REFRESH_SECRET`: Secret key for signing refresh tokens
- `GEMINI_API_KEY`: Google Gemini API for AI-powered matching (future use)

---

## 📊 Database Schema Relationships

```
User (1) ──── (1) Provider
  │
  └──── (Many) Booking (future)
  
Provider (1) ──── (Many) Booking (future)
  └──── (Many) Review/Rating (future)
```

---

## 🔧 Future Enhancements

1. **Booking Routes**: Create, update, and track service bookings
2. **Chat Routes**: Real-time messaging between clients and providers
3. **AI Integration**: Use Gemini API to match clients with providers based on natural language
4. **Search Filters**: Query providers by skills, location, price, availability
5. **Rating System**: Allow clients to rate providers after service completion
6. **Notification System**: Alert users of booking updates via Socket.io

---

## 📝 Running the Backend

```bash
# Install dependencies
npm install

# Start development server (with auto-restart)
npm run dev

# Start production server
npm start
```

Server will run on `http://localhost:5000` and connect to MongoDB Atlas using credentials from .env file.
