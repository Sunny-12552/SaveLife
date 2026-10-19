# Blood Donation Camp Management System - Frontend

## Overview

This is the React frontend for the Blood Donation Camp Management System (BDCMS). Built with React and custom CSS featuring a clean red and white theme.

---

## 🎨 Design Features

- **Clean Red & White Theme** - Professional color scheme matching blood donation concept
- **No gradients** - Simple, minimal design
- **Responsive** - Works on all devices
- **Custom CSS** - No UI libraries, fully custom components

---

## 📦 Technologies Used

- **React** 18.x
- **React Router DOM** - Client-side routing
- **Axios** - HTTP requests
- **Custom CSS** - No Tailwind, Bootstrap, or Material-UI

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend server running on `http://localhost:5000`

### Installation

1. **Navigate to client directory**:
   ```bash
   cd "C:\Users\Gautam\Desktop\blood donation\client"
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   - The app will automatically open at `http://localhost:3000`
   - If not, manually navigate to http://localhost:3000

---

## 📁 Project Structure

```
client/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Navbar.js
│   │   └── Navbar.css
│   ├── pages/
│   │   ├── Home.js & Home.css
│   │   ├── Login.js & Register.js
│   │   ├── Auth.css
│   │   ├── Dashboard.js & Dashboard.css
│   │   ├── DonorRegister.js & DonorProfile.js
│   │   ├── Donor.css
│   │   ├── CampList.js & RequestList.js
│   │   └── List.css
│   ├── context/
│   │   └── AuthContext.js
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   └── global.css
│   ├── App.js
│   ├── index.js
│   └── index.css
└── package.json
```

---

## 🔑 Key Features

### 1. **Authentication System**
- Login and Registration pages
- JWT token management with localStorage
- Auto-redirect based on authentication status
- Protected routes

### 2. **Dashboard**
- Role-based content (Donor, Organizer, Admin)
- Statistics cards
- Quick action buttons
- Upcoming camps and urgent requests

### 3. **Donor Management**
- Complete donor profile registration form
- View donor profile with all details
- Eligibility status display
- Donation history tracking

### 4. **Camp Management**
- Browse all blood donation camps
- Filter by status, location, date
- Register for camps (donors)
- View camp details

### 5. **Blood Request System**
- View all blood requests
- Urgency levels displayed
- Hospital information
- Progress tracking (units fulfilled)

---

## 🎨 Color Scheme

```css
--primary-red: #dc2626
--dark-red: #991b1b
--light-red: #fecaca
--white: #ffffff
--light-gray: #f5f5f5
--gray: #6b7280
--dark-gray: #374151
```

---

## 🔐 User Roles

### Donor
- Create donor profile
- Register for camps
- View blood requests
- Track donation history

### Patient
- Create a blood request for themselves or someone in their care
- Track and cancel their own requests
- View request fulfilment progress

### Camp Creator / Organizer
- Create and manage camps
- View donors
- Manage blood requests
- Mark attendance

### Admin
- Full system access
- Can also create and manage camps
- Manage user roles and activate/deactivate accounts
- Review account registration date and login history
- Review password-help requests and issue expiring, one-time password reset links
- View all data
- System administration

---

## 📄 Pages Overview

### Public Pages
- **Home** (`/`) - Landing page with features
- **Login** (`/login`) - User login
- **Register** (`/register`) - User registration
  - Registration supports donor, patient, camp creator/organizer, and administrator roles.

### Protected Pages
- **Dashboard** (`/dashboard`) - Main dashboard
- **Donor Registration** (`/donor/register`) - Create donor profile
- **Donor Profile** (`/donor/profile`) - View donor details
- **Camps List** (`/camps`) - Browse camps, view camp images, and scan location QR codes
- **Requests List** (`/requests`) - View blood requests
- **User Management** (`/admin/users`) - Admin-only account and login-history management

Users who forget their password can submit their registered email and international phone number from the login page. An administrator can issue a one-time reset link only when both match an account; the link expires after one hour, and account passwords are never visible to administrators.

---

## 🔧 Configuration

### API Base URL

Update in `src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

---

## 🧪 Testing

### Test User Credentials

After registering through the app, you can use:

**Donor:**
- Email: donor@example.com
- Password: password123

**Organizer:**
- Email: organizer@example.com
- Password: password123

---

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

---

## 🔄 Available Scripts

### `npm start`
Runs the app in development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run build`
Builds the app for production to the `build` folder.
Optimizes the build for best performance.

### `npm test`
Launches the test runner in interactive watch mode.

---

## ⚠️ Important Notes

1. **Backend Must Be Running**: Ensure the backend server is running on `http://localhost:5000` before starting the frontend.

2. **CORS**: The backend has CORS enabled to allow requests from `http://localhost:3000`.

3. **JWT Tokens**: Stored in localStorage. Clear browser cache if you face authentication issues.

4. **Forms**: All forms have validation. Check console for errors.

---

## 🐛 Common Issues

### Issue: "Network Error" or "Cannot connect"
**Solution**: Make sure the backend server is running on port 5000.

### Issue: "401 Unauthorized"
**Solution**: Your token expired. Logout and login again.

### Issue: "Page not found"
**Solution**: Check if you're using the correct route paths.

### Issue: Blank page
**Solution**: Check browser console for errors. Might be a missing import.

---

## 🚀 Deployment

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

### Deployment Options

- **Vercel**: Connect GitHub repo and auto-deploy
- **Netlify**: Drag and drop the build folder
- **GitHub Pages**: Use gh-pages package

---

## 🔮 Future Enhancements (Not Implemented Yet)

- Blood request creation form
- Camp creation form
- Donor search with filters
- Admin dashboard with analytics
- Email notifications
- Profile editing
- Password reset
- Camp registration confirmation

---

## 📞 Support

For issues or questions:
1. Check backend server logs
2. Check browser console
3. Verify API endpoints in Postman
4. Check network tab in browser dev tools

---

**Built with ❤️ using React and custom CSS**
