/**
 * Authentication Module
 * Handles session management and routing
 */

// Check if user is logged in
function checkAuth() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn');
  
  if (isLoggedIn !== 'true') {
    // Redirect to login page
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

// Logout function
function logout() {
  // Clear session
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('username');
  sessionStorage.removeItem('loginTime');
  
  // Redirect to login
  window.location.href = 'index.html';
}

// Add logout button to window bindings
window.logout = logout;

// Check auth on page load (only for app.html)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAuth);
} else {
  checkAuth();
}

console.log('🔐 Auth module loaded');
