# 🚀 AIOps Khadamni — Full-Stack Service Marketplace Platform

A state-of-the-art, premium full-stack marketplace designed for AI specialists and service providers. The platform delivers a sleek, glassmorphic SaaS experience, real-time communication, intelligent geolocation mapping, AI-powered provider matching, and a fully themeable dark/light UI, paired with global authentication features.

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

### 6. 🧠 AI Service Matching Assistant
* **Family-Prioritized NLU**: The local fallback matcher checks user queries against job-family label → family-id → specialty → skill (in that order), so general queries ("I need a plumber") surface the right professionals first.
* **Multi-provider AI Routing**: Hugging Face → Gemini → OpenAI → smart local NLU fallback, so the assistant keeps working even when API keys are missing or quotas hit.
* **Persistent Search History**: All conversation histories rest restored in `localStorage` across page navigations.
* **Intelligent Chat Cleaners**: A single click "New Chat" clears histories to start fresh.

### 7. 🏷️ Multi-Family Provider Profiles
* **Multiple Active Job Families**: A single provider can register under several families at once (e.g. *Software & Tech* + *Education & Tutoring*), each with its own specialty list.
* **Per-Family Specialties**: The profile setup wizard renders a specialty picker per selected family, plus a free-form "custom specialty" input. Saved as a `professions: [{ family, specialties }]` array on the provider document.
* **Family + Specialty Display in Search Results**: Result cards in the AI Assistant render explicit *"Family · Specialty"* pill pairs. When the user's query matches a specialty, the matched (family, specialty) pair is highlighted so the relationship is obvious at a glance.
* **AI-Generated Custom Families**: Providers can request a brand-new family via the "Add Other Job" button — the platform calls an LLM to slug it, assign an emoji, infer whether it allows remote work, and seed a starting specialty list.

### 8. 📅 Booking Date Guard
* **Past-Date Blocking**: The booking date picker disables past days via `min={today}` and shows a clear inline error ("You cannot book on a past date — please pick today or a future date") if the user types one manually.
* **Confirm Button Disabled**: The Confirm action stays disabled while a past date is selected, and the same check is enforced server-side (`POST /api/bookings` returns 400 with a human message), so the rule cannot be bypassed.

### 9. ⛔ Reject Confirmation Modal
* **Optional Reason**: When a provider taps "Reject" on a pending booking, a confirmation modal opens with an optional reason textarea. The reason is *not* required — leave it blank to reject silently, or type a note that's surfaced to the client in their booking notification and detail view.
* **Accessible Dialog**: ESC-to-close, backdrop-click-to-close, focus ring, `role="dialog"` and `aria-modal="true"` for screen readers.

### 10. 🌗 Dark / Light Mode Toggle
* **Persistent Theme**: A `ThemeContext` writes `data-theme` and `color-scheme` on `<html>`, persisting the user's choice in `localStorage` (`aiops_theme`) across sessions. Defaults to dark.
* **Two Toggle Surfaces**: A prominent sun/moon button in the navbar (next to the notification bell) for one-click switching, plus an "Appearance" switch row inside the user menu.
* **Available Pre-Login**: The theme toggle also lives on the Landing, Sign-in, and Sign-up pages so visitors can flip themes before logging in.
* **Polished Light Theme**: Comprehensive CSS overrides cover hard-coded dark backgrounds, decorative radial overlays, gradient-text utilities, stat-card colored gradients, borders, and accent text colours — so the whole app stays cohesive in either mode without rewriting every component.

### 11. 👁️ Show / Hide Password
* The Sign-in and Sign-up password fields use a shared `<PasswordInput>` component with an eye / eye-off icon to reveal or mask the value. Toggle is a `role="switch"` button with `aria-label`/`aria-pressed`, and proper `autoComplete` (`current-password` vs `new-password`) hints are forwarded to the browser.

### 12. 🎛️ Accessible Dropdowns & Selects
* **Cross-browser Option Contrast**: Native `<option>` elements get explicit `background-color` + `color` per theme, so dropdown lists stay readable on Windows (where dark `<select>` backgrounds previously bled into option items).
* **Custom Chevron**: `select.appearance-none` paints a small CSS chevron and reserves trailing padding, keeping a consistent look across pages.
* **High-Contrast Focus Ring**: `select:focus-visible` exposes a 2px indigo ring for keyboard navigation.

### 13. 🏠 Auth Page Navigation
* **Back to Home**: The Sign-in and Sign-up pages display a fixed top-left "Back to home" link with arrow icon, returning the user to the public Landing page at `/`. The theme toggle sits at the top-right of the same utility bar.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (v19), Vite, React Router, TailwindCSS |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | MongoDB Atlas, Mongoose (with `2dsphere` indexes) |
| **Authentication** | JSON Web Tokens (JWT), Google Identity Services |
| **AI Providers** | Hugging Face Router · Gemini · OpenAI (with local NLU fallback) |
| **APIs / Libraries** | google-auth-library, Leaflet Map, Multer, Nominatim (reverse geocoding) |

---

## 📂 Project Architecture

```
aiops-freelance/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Auth, Booking, Chat, Message, Provider, Notification, Admin
│   │   ├── models/           # User, Provider (with professions[]), Booking, Message,
│   │   │                     # JobFamily, Notification
│   │   ├── routes/           # REST endpoints
│   │   ├── middleware/       # JWT Auth protectors
│   │   ├── utils/            # AI provider chain (HF/Gemini/OpenAI)
│   │   └── socket.js         # Real-time WebSocket connection engine
│   ├── uploads/              # CV PDF/Doc file storage
│   └── server.js             # Server entry point
└── frontend/
    ├── src/
    │   ├── components/       # Navbar, UserMenu, ThemeToggle, PasswordInput,
    │   │                     # ProfileViewModal, NotificationBell, ProtectedRoute
    │   ├── context/          # AuthContext, ThemeContext
    │   ├── pages/            # Landing, Login, Register, Dashboard, Chat,
    │   │                     # ProfileSetup, DirectMessages, AdminDashboard
    │   ├── api/              # Axios configurations
    │   ├── index.css         # Tailwind base + theme overrides + select styling
    │   └── main.jsx          # React app mount
```

---

## 🗄️ Provider Data Model (Multi-Family)

```js
// backend/src/models/Provider.js
{
  user: ObjectId,                            // ref User
  professions: [{                            // ← multi-family payload
    family: 'software',
    specialties: ['React Developer', 'Node.js Developer'],
  }, {
    family: 'education',
    specialties: ['Math Tutor'],
  }],
  jobFamilies: ['software', 'education'],    // flat list (derived)
  jobFamily:   'software',                   // first family (back-compat)
  specialties: ['React Developer', 'Node.js Developer', 'Math Tutor'],
  specialty:   'React Developer',            // first specialty (back-compat)
  skills:      ['React Developer', ...],
  city, location { type:'Point', coordinates:[lng,lat] },
  workMode: 'in-person' | 'remote' | 'both',
  hourlyRate, currency, rating, totalBookings, cvPath,
  availability: [{ day, slots:[{start,end}] }],
}
```

The `getProviders` endpoint searches `jobFamily`, `jobFamilies`, and `professions.family` so legacy and multi-family providers both match the same query. Results matching the family filter are sorted ahead of specialty/skill-only hits.

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

# AI provider keys (any one is enough — the chain falls back to local NLU)
HF_TOKEN=hf_xxx
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-...
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
| `booking_update` | Backend ➔ Frontend | `{ action, bookingId, status? }` | Automatically reloads dashboard lists when status changes |
| `notification` | Backend ➔ Frontend | Notification document | Pushes a new notification to the bell |

---

## 🔒 Google Cloud Console Credentials Configuration

To enable **Google Login / Sign-up** for your workspace:
1. Visit the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application type).
3. Under **Authorized JavaScript origins**, add your local address: `http://localhost:5173` (and your production URL later).
4. Copy the **Client ID** and update your `.env` files accordingly!

---

## 🎨 Theming Notes

* The app is dark-first. Light mode is applied via a `data-theme="light"` attribute on `<html>`, set by `ThemeContext` based on the user's `localStorage` preference.
* If you add new components, prefer Tailwind utility classes that already have light-mode overrides in `frontend/src/index.css` (`bg-[#0a0a0f]`, `bg-white/5`, `text-white/60`, `border-white/10`, etc.).
* For decorative dark gradients (`via-[#0a0a0f]`, `from-indigo-950/40`), light-mode overrides are already in place in `index.css` — extend them if you introduce a new dark colour stop.
