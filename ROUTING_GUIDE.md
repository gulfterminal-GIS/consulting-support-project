# GIS Application Routing & Authentication Guide

## Overview
The application uses a simple session-based authentication system with URL routing to separate login and map functionality.

## File Structure

### 1. `index.html` - Login Page
- **Purpose**: User authentication
- **URL**: `http://localhost/index.html` (or just `/`)
- **Features**:
  - Split-screen design with login form and info panel
  - Custom validation alerts
  - Password show/hide toggle
  - Session creation on successful login
  - Auto-redirect to app if already logged in

### 2. `app.html` - Map Application
- **Purpose**: Main GIS application
- **URL**: `http://localhost/app.html`
- **Features**:
  - Full map interface with all tools
  - Protected by authentication check
  - Logout button in quick actions
  - Session persistence on refresh

### 3. `src/auth.js` - Authentication Module
- **Purpose**: Session management and routing
- **Functions**:
  - `checkAuth()`: Verifies session and redirects if not authenticated
  - `logout()`: Clears session and redirects to login

## Authentication Flow

### Login Process
1. User visits `index.html`
2. If already logged in → auto-redirect to `app.html`
3. User enters credentials (username: `123456`, password: `123456`)
4. On success:
   - Session created in `sessionStorage`
   - Redirect to `app.html`
5. On failure:
   - Error message displayed

### Session Management
```javascript
// Session Storage Keys
sessionStorage.setItem('isLoggedIn', 'true');
sessionStorage.setItem('username', username);
sessionStorage.setItem('loginTime', new Date().toISOString());
```

### Protected Access
1. User visits `app.html`
2. `src/auth.js` checks session
3. If not authenticated → redirect to `index.html`
4. If authenticated → load map application

### Logout Process
1. User clicks logout button (red button in quick actions)
2. `logout()` function called
3. Session cleared from `sessionStorage`
4. Redirect to `index.html`

## Key Features

### Session Persistence
- Session persists on page refresh
- No re-login required when refreshing `app.html`
- Session cleared only on logout or browser close

### URL Protection
- Direct access to `app.html` without login → redirected to `index.html`
- Logged-in users accessing `index.html` → redirected to `app.html`

### Logout Button
- Located in quick actions (bottom right)
- Red gradient styling for visibility
- Icon: `fa-sign-out-alt`
- Title: "تسجيل الخروج"

## Styling

### Login Screen
- Split-screen design (50/50)
- Left: Login form with glass effect
- Right: Info panel with features and system links
- Background: Drone surveying image
- Logos: 
  - Login form: `logo-2030.svg`
  - Info panel: `GT Logo Dark.png`

### Logout Button
```css
.logout-btn {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%) !important;
  /* Red gradient for distinction */
}
```

## Testing

### Test Credentials
- **Username**: `123456`
- **Password**: `123456`

### Test Scenarios
1. **Fresh Login**: Visit `index.html` → login → redirected to `app.html`
2. **Refresh Map**: On `app.html` → refresh → stays on `app.html` (no re-login)
3. **Direct Access**: Visit `app.html` without login → redirected to `index.html`
4. **Logout**: Click logout → redirected to `index.html`
5. **Re-login**: After logout → can login again

## Browser Compatibility
- Uses `sessionStorage` (supported in all modern browsers)
- Session cleared when browser/tab closed
- No cookies or localStorage used

## Security Notes
- This is a basic session system for demonstration
- Credentials are hardcoded (not for production)
- Session stored client-side only
- No server-side validation
- For production, implement:
  - Server-side authentication
  - Secure token management
  - HTTPS
  - Password hashing
  - Session expiration

## Troubleshooting

### Issue: Stuck on login screen after successful login
- **Solution**: Check browser console for errors
- **Check**: Verify `app.html` exists in root directory

### Issue: Redirected to login after refresh
- **Solution**: Check if `src/auth.js` is loaded correctly in `app.html`
- **Check**: Verify sessionStorage is not disabled in browser

### Issue: Logout button not working
- **Solution**: Check browser console for `logout()` function
- **Check**: Verify `src/auth.js` is loaded and `window.logout` is defined

## File Dependencies

### index.html (Login)
- `assets/styles/style.css`
- `assets/styles/liquid.css`
- `assets/images/logo-2030.svg`
- `assets/images/GT Logo Dark.png`

### app.html (Map)
- All CSS and JS from original application
- `src/auth.js` (authentication check)
- `src/main.js` (application entry point)

## Version History
- **v2024.12.30**: Initial routing implementation
  - Split index.html into login and app pages
  - Added session-based authentication
  - Added logout functionality
  - Maintained all original styling and logos
