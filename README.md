# 🚀 AIOps Freelance — Full-Stack Service Marketplace Platform

A state-of-the-art, premium full-stack marketplace designed for AI specialists and service providers. The platform delivers a sleek, glassmorphic SaaS experience, real-time communication, and intelligent geolocation mapping, paired with global authentication features.

---

## 🌟 Key Platform Features

### 1. 📊 Premium Glassmorphic Dashboards
* **Revenue Analytics**: Live dynamic statistics displaying the Provider's total earnings or the Client's total investments.
* **Status Filtering**: Clean tab systems (Active requests, Pending approval, Complete history) with reactive counters.
* **Interactive Actions**: Complete, accept, reject, message, or cancel bookings in a single click.

### 2. 💬 Real-Time Direct Messaging (DM) System
* **Instant Delivery**: Powered by Socket.io, messages sync instantly between users.
* **Live Typing Indicators**: Displays active typing statuses (`typing...`) in real-time.
* **Interactive Sidebar**: Shows unread notification badges, user roles, last message snippets, and message timestamps.
* **Deep Integration**: Direct "Message" buttons placed on booking list rows and provider profile cards.

### 3. 📄 Provider CV Upload & Display
* **Secure Storage**: Multi-format local file upload (`.pdf`, `.doc`, `.docx`) statically served by the server.
* **Client Access**: Clients can view and download the provider's CV instantly from the provider profile view cards.

### 4. 🧭 Geolocation GPS Sharing & Mapping
* **Reverse Geocoding**: Enhanced Nominatim parser extracts high-precision readable addresses (city, suburb, road) instead of raw coordinates.
* **GPS Coordinate Synchronization**: Direct user GPS coordinate mapping synced directly to Mongo's `2dsphere` index for nearby queries.

### 5. 🔑 Google OAuth Integration
* **One Tap Sign-in**: Secure, pure JWT-based sign-in using Google Identity Services (GIS).
* **Smart Signup Wizard**: When new Google users sign up, a beautiful glassmorphic modal asks them to choose their role ("Client" or "Provider") to complete their setup instantly.

### 6. 🧠 AI Coding Assistant
* **Persistent Search History**: All conversation histories rest restored in `localStorage` across page navigations.
* **Intelligent Chat Cleaners**: A single click "New Chat" clears histories to start fresh.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (v19), Vite, React Router, TailwindCSS |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | MongoDB Atlas, Mongoose (with `2dsphere` indexes) |
| **Authentication** | JSON Web Tokens (JWT), Google Identity Services |
| **APIs / Libraries** | google-auth-library, Leaflet Map, Multer |

---

## 📂 Project Architecture

```
aiops-freelance/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Booking, Auth, Message, Provider controllers
│   │   ├── models/           # User, Provider, Message, Booking schemas
│   │   ├── routes/           # REST endpoints
│   │   ├── middleware/       # JWT Auth protectors
│   │   └── socket.js         # Real-time WebSocket connection engine
│   ├── uploads/              # CV PDF/Doc file storage
│   └── server.js             # Server entry point
└── frontend/
    ├── src/
    │   ├── components/       # Glassmorphic UI cards, Modals, Navbar
    │   ├── context/          # Authentication and user state
    │   ├── pages/            # Dashboard, DM Chat, Login, Profile Setup
    │   ├── api/              # Axios configurations
    │   └── main.jsx          # React app mount
```

---

## 🚀 Installation & Set Up

### Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed on your system.

### 1. Clone the repository and install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the **backend** directory:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/aiops
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

Create a `.env` file in the **frontend** directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

### 3. Run the Servers

#### Start Backend server:
```bash
cd backend
npm run dev
```

#### Start Frontend server:
```bash
cd frontend
npm run dev
```

The frontend will run at `http://localhost:5173`.

---

## 🛰️ Real-Time WebSocket Events Reference

The application uses WebSockets to maintain instant updates. Here are the core events defined in `backend/src/socket.js`:

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join` | Frontend ➔ Backend | `userId` | Joins a unique room for receiving private notifications & DMs |
| `send_direct_message` | Frontend ➔ Backend | `{ receiverId, content }` | Dispatches a direct message |
| `direct_message` | Backend ➔ Frontend | `{ sender, content, createdAt }` | Delivers a message to the recipient in real time |
| `typing` | Frontend ➔ Backend | `{ receiverId, senderId }` | Triggers a live typing indicator on the recipient's screen |
| `booking_update` | Backend ➔ Frontend | `{ action, booking }` | Automatically reloads dashboard lists when status changes |

---

## 🔒 Google Cloud Console Credentials Configuration

To enable **Google Login / Sign-up** for your workspace:
1. Visit the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application type).
3. Under **Authorized JavaScript origins**, add your local address: `http://localhost:5173` (and your production URL later).
4. Copy the **Client ID** and update your `.env` files accordingly!
