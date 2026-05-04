# AIOps Freelance - Frontend Documentation

## 📋 Overview

The frontend is a **React + Vite** single-page application (SPA) that provides users with an interface to:
- Register as a client (seeking services) or provider (offering services)
- Log in and manage authentication
- Search and book service providers
- Chat with providers in real-time
- Set up and manage provider profiles
- View dashboards and bookings

The app uses modern React patterns with Context API for state management, React Router for navigation, and Tailwind CSS for styling.

---

## 🛠️ Technology Stack

- **Framework**: React 19.2.5 with Vite (fast build tool)
- **Styling**: Tailwind CSS (utility-first CSS framework) + PostCSS
- **Routing**: React Router v7 for page navigation
- **State Management**: React Context API (custom AuthContext)
- **HTTP Client**: Axios with interceptors for JWT handling
- **Real-time**: Socket.io-client for live chat
- **Data Fetching**: TanStack React Query (v5) for server state
- **Maps**: Leaflet + React-Leaflet for location display
- **Calendar**: React Big Calendar for availability scheduling
- **Date Handling**: dayjs for date manipulation
- **Development**: ESLint for code quality, Nodemon for dev server

---

## 📁 Folder Structure

```
frontend/
├── index.html             # HTML entry point
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite build configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
├── eslint.config.js       # ESLint rules
├── src/
│   ├── App.jsx            # Main app component with routes
│   ├── main.jsx           # React root render
│   ├── index.css          # Global styles
│   ├── api/               # API communication layer
│   ├── assets/            # Images, fonts, static files
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context for global state
│   └── pages/             # Full page components
└── public/                # Static files served as-is
```

---

## 📄 File-by-File Breakdown

### **index.html**
**Purpose**: Root HTML file that serves the React app

**What it does**:
- Defines basic HTML structure with a `<div id="root">` mount point
- Links favicon
- Loads the React app via main.jsx script tag

---

### **main.jsx**
**Purpose**: React entry point that renders the App component

**What it does**:
- Imports React and ReactDOM
- Imports the main App component
- Imports global CSS from index.css
- Uses `ReactDOM.createRoot()` to render App into the root element

---

### **App.jsx**
**Purpose**: Main application component that sets up routing and global providers

**Structure**:
```jsx
AuthProvider (wraps entire app)
  └─ BrowserRouter (enables routing)
      └─ Routes (defines all pages)
          ├─ / (Landing page) - Public
          ├─ /login (Login page) - Public
          ├─ /register (Register page) - Public
          ├─ /chat (Chat page) - Protected
          ├─ /dashboard (Dashboard) - Protected
          ├─ /profile (Profile Setup) - Protected
          └─ /* (Catch-all, redirects to /)
```

**Key Features**:
- `AuthProvider` wraps all routes to provide authentication context globally
- `ProtectedRoute` component checks if user is authenticated before allowing access
- Public routes accessible to anyone
- Protected routes require login

---

### **index.css**
**Purpose**: Global CSS styles

**What it does**:
- Imports Tailwind CSS directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
- Defines global font styling using 'DM Sans' font family
- Sets up any global color variables or utility classes

---

## 📂 src/ Directory Details

### **src/api/**

#### **axios.js**
**Purpose**: Centralized HTTP client with JWT authentication handling

**Configuration**:
- Creates Axios instance with `baseURL` pointing to `http://localhost:5000/api`
- All API requests use this configured instance

**Request Interceptor**:
- Automatically attaches `Authorization: Bearer <accessToken>` header to every request
- Token is retrieved from localStorage

**Response Interceptor** (Error Handling):
- If response is 401 (Unauthorized/token expired):
  - Attempts to refresh the access token using the refresh token
  - Retries the original request with new token
  - If refresh fails or no refresh token exists, clears localStorage and redirects to login
- Otherwise passes through successful responses

**Usage**: Imported and used in all API calls throughout the app

---

### **src/context/**

#### **AuthContext.jsx**
**Purpose**: Global authentication state management using React Context

**State**:
- `user`: Current authenticated user object (or null if not logged in)
  - Contains: `id`, `name`, `email`, `role` (client/provider)

**Methods**:
- **`login(userData, accessToken, refreshToken)`**:
  - Stores tokens and user data in localStorage
  - Updates `user` state in React
  - Called after successful login/registration
  
- **`logout()`**:
  - Clears all localStorage data
  - Sets `user` to null
  - Called when user clicks logout

**Hook**:
- **`useAuth()`**: Custom hook to access auth context anywhere in the app
  - Example: `const { user, login, logout } = useAuth();`

**Data Persistence**:
- On app load, checks localStorage for existing user data
- If found, initializes `user` state (keeps user logged in across page refreshes)

---

### **src/components/**

#### **Navbar.jsx**
**Purpose**: Navigation header component

**Features**:
- Display app logo and branding
- Navigation links (Home, Services, etc.)
- User menu with logout option (visible when logged in)
- Login/Register buttons (visible when logged out)

---

#### **ProtectedRoute.jsx**
**Purpose**: Wrapper component for protecting routes that require authentication

**Logic**:
- Checks if user is authenticated via `useAuth()` hook
- If authenticated: Renders the wrapped component
- If not authenticated: Redirects to login page
- Used to wrap protected routes in App.jsx

---

#### **BookingCard.jsx**
**Purpose**: Reusable card component for displaying booking information

**Displays**:
- Provider name and avatar
- Service description
- Price and rating
- Action buttons (View Details, Book Now)
- Used on Dashboard and search results

---

### **src/pages/**

#### **Landing.jsx**
**Purpose**: Home page that welcomes new visitors

**Features**:
- Animated hero section with gradient text
- Call-to-action buttons (Get Started, Sign In)
- Value proposition: "Find the right pro in one sentence"
- Explains AI-powered service matching concept
- Example chat interface showcase
- Fully responsive design with Tailwind CSS

**Access**: Public (no authentication required)

---

#### **Register.jsx**
**Purpose**: Sign-up form for creating new user accounts

**Form Fields**:
- Full Name
- Email
- Password
- Role selection (radio buttons or dropdown):
  - "I Need Help" (client seeking services)
  - "I Offer Services" (provider offering services)
- Submit button: "Create provider account" or "Create client account"

**Functionality**:
- Validates form inputs (required fields, email format, password strength)
- Sends POST request to `/api/auth/register`
- On success: Stores tokens and user data, redirects to dashboard or profile setup
- On error: Displays error message
- Link to login page for existing users

---

#### **Login.jsx**
**Purpose**: Authentication form for existing users

**Form Fields**:
- Email
- Password
- "Keep me logged in" checkbox (optional)
- Submit button: "Sign In"

**Functionality**:
- Validates email and password
- Sends POST request to `/api/auth/login`
- On success: Stores tokens and user data, redirects to dashboard
- On error: Shows error message
- Link to registration page for new users
- Password reset link (for future implementation)

---

#### **Dashboard.jsx**
**Purpose**: Main application hub after login

**Content** (varies by user role):

**For Clients**:
- Search bar for finding providers
- List of available providers (BookingCard components)
- Filters: skill, location, price range, availability
- My Bookings section: Shows current and past bookings
- Quick links: Profile, Chat, Settings

**For Providers**:
- Overview statistics: Total earnings, active bookings, rating
- Availability calendar: View and manage time slots
- Recent bookings: Pending and upcoming services
- Profile completeness indicator
- Quick actions: Edit profile, Add availability

**Access**: Protected (authentication required)

---

#### **ProfileSetup.jsx**
**Purpose**: Provider profile configuration page

**For Providers**:
- Skills selection: Add/remove skills from predefined list or custom input
- Location: Map interface (React-Leaflet) to pin location or toggle "Remote"
- Hourly rate: Set pricing
- Availability: Calendar interface (React Big Calendar) to add availability slots
- Bio/About section: Professional description

**For Clients**:
- Name and contact information
- Service preferences: Preferred skills/categories to follow
- Location settings

**Access**: Protected (authentication required)

---

#### **Chat.jsx**
**Purpose**: Real-time messaging interface between clients and providers

**Features**:
- Conversation list: Shows all active chats
- Message display: Shows message history with timestamps
- Message input: Text field to type and send messages
- User avatars and status indicators
- Auto-scroll to latest message
- Notification badges for unread messages

**Technology**:
- Uses Socket.io-client to establish real-time connection
- Listens for 'message' events from server
- Emits messages to specific user room

**Access**: Protected (authentication required)

---

## 🔄 Application Flow

### **User Journey - Client Seeking Service**

1. **Landing Page**: User sees hero section with value proposition
2. **Register**: User clicks "Get Started"
   - Fills form with name, email, password
   - Selects "I Need Help" as role
   - POST to `/api/auth/register` with role='client'
3. **Dashboard**: Redirected to client dashboard
   - Sees available providers
   - Can filter by skill, location, price
4. **Profile Setup** (Optional): Complete profile with preferences
5. **Booking Flow** (Future):
   - Clicks "Book Now" on provider card
   - Fills booking details and confirms
6. **Chat**: Messages provider about service details
7. **Dashboard**: Tracks booking status and provider feedback

---

### **User Journey - Provider Offering Service**

1. **Landing Page**: Provider sees same hero section
2. **Register**: Clicks "Get Started"
   - Fills form with name, email, password
   - Selects "I Offer Services" as role
   - POST to `/api/auth/register` with role='provider'
3. **Profile Setup** (Redirected):
   - Adds skills (plumbing, electrical, etc.)
   - Sets hourly rate and currency
   - Pins location on map or toggles "Remote"
   - Adds availability slots using calendar
4. **Dashboard**: Sees incoming booking requests
   - Accepts or declines bookings
   - Checks upcoming appointments
   - Views earnings and ratings
5. **Chat**: Communicates with clients about bookings
6. **Availability**: Updates schedule in profile setup

---

### **Authentication Flow**

1. **Initial Load**: App checks localStorage for existing tokens
   - If found: User is "logged in" (AuthContext initialized with user data)
   - If not found: User is "logged out" (AuthContext user is null)

2. **Login/Register**: 
   - User submits credentials
   - Backend validates and returns tokens + user data
   - Frontend stores in localStorage
   - AuthContext updated
   - User redirected to appropriate page

3. **Token Refresh**:
   - Axios interceptor checks for 401 responses
   - Automatically calls `/api/auth/refresh` with refresh token
   - Gets new access token
   - Retries original request
   - If refresh fails: Clears storage, redirects to login

4. **Logout**:
   - User clicks logout
   - `logout()` function called from AuthContext
   - localStorage cleared
   - User state reset to null
   - Redirected to landing page

---

## 🎨 Styling Approach

**Tailwind CSS**:
- Utility-first CSS framework
- Classes like `bg-indigo-600`, `text-white`, `rounded-xl`, `shadow-lg`
- Responsive design with `md:`, `lg:`, `xl:` breakpoints
- Dark theme as default (dark background with white text)
- Gradient effects for modern UI

**Custom CSS** (index.css):
- Global fonts and colors
- Animation definitions for hero section
- Responsive typography

---

## 🔐 Security Implementation

1. **Token Storage**: JWT tokens stored in localStorage
   - Access token (15min expiry) for API requests
   - Refresh token (7days expiry) for getting new access tokens

2. **Protected Routes**: ProtectedRoute component checks authentication before rendering

3. **Automatic Token Refresh**: Axios interceptor handles token expiration transparently

4. **CORS**: Frontend makes requests to same-origin backend (both on localhost)

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.5 | UI framework |
| react-router-dom | ^7.14.2 | Page routing |
| axios | ^1.15.2 | HTTP requests |
| socket.io-client | ^4.8.3 | Real-time messaging |
| tailwindcss | ^3.4.19 | CSS styling |
| react-big-calendar | ^1.19.4 | Availability calendar |
| react-leaflet | ^5.0.0 | Map for location |
| @tanstack/react-query | ^5.100.6 | Server state management |
| dayjs | ^1.11.20 | Date manipulation |

---

## 🚀 Running the Frontend

```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Build for production
npm build

# Preview production build locally
npm run preview

# Lint code
npm run lint
```

Frontend runs on `http://localhost:5173` and makes API requests to `http://localhost:5000/api`

---

## 🔄 Component Hierarchy

```
App
├─ AuthProvider
│  └─ BrowserRouter
│     ├─ Navbar (in page components)
│     └─ Routes
│        ├─ Landing
│        ├─ Login
│        ├─ Register
│        ├─ ProtectedRoute
│        │  ├─ Chat
│        │  ├─ Dashboard
│        │  │  └─ BookingCard (multiple)
│        │  └─ ProfileSetup
│        └─ Catch-all redirect
```

---

## 📝 Environment Variables

**VITE_API_URL**: Backend API base URL (defaults to `http://localhost:5000/api`)

---

## 🔮 Future Enhancements

1. **Search & Filtering**: Advanced filters for providers (skill, location, price, rating)
2. **Booking System**: Complete booking flow with confirmation and tracking
3. **AI Chat**: Natural language search powered by Gemini API
4. **Payment Integration**: Stripe or PayPal for in-app payments
5. **Reviews & Ratings**: Post-service feedback system
6. **Push Notifications**: Alert users of new bookings, messages, updates
7. **Mobile Responsive**: Better mobile experience optimization
8. **Dark/Light Mode**: Theme toggle for user preference
9. **Analytics**: Track user behavior and app performance
10. **Multi-language**: Internationalization (i18n) support

