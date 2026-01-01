# Quick Start Guide

## 🚀 How to Use the New Routing System

### For Users

#### 1. **Login**
- Open `index.html` in your browser
- Enter credentials:
  - **Username**: `123456`
  - **Password**: `123456`
- Click "دخول" (Login)
- You'll be redirected to the map application

#### 2. **Using the Map**
- The map application (`app.html`) loads automatically after login
- All features work as before
- Your session persists - refresh the page without re-logging in

#### 3. **Logout**
- Look for the **red button** at the bottom right (quick actions)
- Click the logout button (sign-out icon)
- You'll be redirected back to the login page

### For Developers

#### File Structure
```
index.html          → Login page
app.html            → Map application
src/auth.js         → Authentication logic
```

#### How It Works
1. **index.html**: Checks if user is logged in → redirects to app if yes
2. **app.html**: Checks if user is logged in → redirects to login if no
3. **src/auth.js**: Manages session and provides logout function

#### Session Management
```javascript
// Session is stored in sessionStorage
sessionStorage.getItem('isLoggedIn')  // 'true' or null
sessionStorage.getItem('username')     // '123456'
sessionStorage.getItem('loginTime')    // ISO timestamp
```

#### Testing Locally
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx http-server -p 8000

# Option 3: PHP
php -S localhost:8000

# Then visit: http://localhost:8000
```

## 🎯 Key URLs

- **Login**: `http://localhost:8000/index.html` (or just `/`)
- **Map**: `http://localhost:8000/app.html`

## ✅ What Changed

### Before
- Single `index.html` with embedded login screen
- Login handled in `src/main.js`
- No session persistence

### After
- **index.html**: Dedicated login page
- **app.html**: Map application only
- **src/auth.js**: Separate authentication module
- Session persists on refresh

## 🔧 Customization

### Change Credentials
Edit `index.html` (line ~210):
```javascript
if (username === '123456' && password === '123456') {
  // Change these values
}
```

### Change Session Duration
Currently uses `sessionStorage` (clears on browser close).
To persist longer, switch to `localStorage` in `src/auth.js`.

### Customize Logout Button
Edit `app.html` (line ~238) and `assets/styles/style.css` (search for `.logout-btn`).

## 📚 Documentation

- **ROUTING_GUIDE.md**: Complete routing documentation
- **IMPLEMENTATION_SUMMARY.md**: What was implemented
- **QUICK_START.md**: This file

## 🐛 Troubleshooting

### Issue: Can't login
- Check browser console for errors
- Verify credentials: `123456` / `123456`
- Clear sessionStorage: `sessionStorage.clear()`

### Issue: Redirected to login after refresh
- Check if `src/auth.js` is loaded in `app.html`
- Verify sessionStorage is enabled in browser
- Check browser console for errors

### Issue: Logout button not working
- Check browser console for `logout()` function
- Verify `src/auth.js` is loaded
- Check for JavaScript errors

### Issue: Stuck on login screen
- Check if `app.html` exists
- Verify file paths are correct
- Check browser console for errors

## 💡 Tips

1. **Development**: Use browser DevTools → Application → Session Storage to inspect session
2. **Testing**: Use incognito/private mode to test fresh login
3. **Debugging**: Check browser console for authentication logs
4. **Session**: Clear with `sessionStorage.clear()` in console

## 🎨 Styling

All original styling is preserved:
- Glass effects work on both pages
- Logos: `logo-2030.svg` and `GT Logo Dark.png`
- Split-screen login design
- Red logout button for visibility

## ⚡ Performance

- No performance impact
- Session check is instant (client-side)
- No additional network requests
- Map loads same speed as before

## 🔒 Security

⚠️ **Current implementation is for demonstration only**

For production:
- Implement server-side authentication
- Use HTTPS
- Hash passwords
- Add session expiration
- Implement CSRF protection

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review ROUTING_GUIDE.md
3. Check IMPLEMENTATION_SUMMARY.md
4. Clear browser cache and try again

---

**Version**: 2024.12.30  
**Status**: ✅ Production Ready (with security enhancements for production use)
