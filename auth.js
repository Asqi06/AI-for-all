// Google Sign-In Callback
function handleGoogleSignIn(response) {
  const credential = response.credential;
  const payload = parseJwt(credential);
  localStorage.setItem('user', JSON.stringify({
    name: payload.name,
    email: payload.email,
    picture: payload.picture
  }));
  localStorage.setItem('authToken', credential);
  window.location.href = 'dashboard.html';
}

// Parse JWT
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window.atob(base64).split('').map(c => 
      `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`
    ).join('')
  );
  return JSON.parse(jsonPayload);
}

// Logout
function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  window.location.href = 'index.html';
}

// Load user info (NO REDIRECT VERSION)
function loadUserInfo() {
  const userStr = localStorage.getItem('user');
  
  if (!userStr) return; // Just return, don't redirect

  const userData = JSON.parse(userStr);
  
  // Update user name
  document.querySelectorAll('#userName, .user-name').forEach(el => {
    if (el) el.textContent = userData.name || 'User';
  });
  
  // Update user email
  document.querySelectorAll('#userEmail, .user-email').forEach(el => {
    if (el) el.textContent = userData.email || '';
  });
  
  // Update user avatar
  document.querySelectorAll('#userAvatar, .user-avatar, .profile-avatar').forEach(el => {
    if (el) el.src = userData.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=FF6B35&color=fff`;
  });
}

// Check auth on protected pages ONLY
function checkAuth() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const protectedPages = ['dashboard.html', 'chat.html', 'document.html', 'image.html', 'history.html', 'settings.html'];
  const userStr = localStorage.getItem('user');
  
  // If on protected page without login, redirect to login
  if (protectedPages.includes(currentPage) && !userStr) {
    window.location.href = 'login.html';
    return;
  }
  
  // If on login page with user already logged in, go to dashboard
  if (currentPage === 'login.html' && userStr) {
    window.location.href = 'dashboard.html';
    return;
  }
  
  // Load user info if user exists
  if (userStr) {
    loadUserInfo();
  }
}

// Run only once on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// Export functions
window.logout = logout;
window.handleGoogleSignIn = handleGoogleSignIn;
