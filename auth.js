// ======= Google Sign-In Callback (if used) =======
function handleGoogleSignIn(response) {
  const credential = response.credential;
  const payload = parseJwt(credential);

  // Save user data
  localStorage.setItem('user', JSON.stringify({
    name: payload.name,
    email: payload.email,
    picture: payload.picture
  }));
  localStorage.setItem('authToken', credential);

  // Redirect to dashboard
  window.location.href = 'dashboard.html';
}

// ======= JWT Parsing (for Google signin) =======
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window.atob(base64)
      .split('')
      .map(function(c) {
        return `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`;
      })
      .join('')
  );
  return JSON.parse(jsonPayload);
}

// ======= Logout functionality =======
function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  window.location.href = 'index.html';
}

// ======= Load user info (Name, Email, Avatar) =======
function loadUserInfo() {
  const userStr = localStorage.getItem('user');
  
  // Get current page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Pages that DON'T require login
  const publicPages = ['index.html', 'login.html', ''];
  
  if (!userStr) {
    // If no user and NOT on a public page, redirect to login
    if (!publicPages.includes(currentPage)) {
      window.location.href = 'login.html';
    }
    return; // Stop here if no user
  }

  // User exists, load their info
  const userData = JSON.parse(userStr);
  const userNameElements = document.querySelectorAll('#userName, .user-name');
  const userEmailElements = document.querySelectorAll('#userEmail, .user-email');
  const userAvatarElements = document.querySelectorAll('#userAvatar, .user-avatar, .profile-avatar');

  userNameElements.forEach(el => {
    if (el) el.textContent = userData.name || 'User';
  });
  userEmailElements.forEach(el => {
    if (el) el.textContent = userData.email || 'user@email.com';
  });
  userAvatarElements.forEach(el => {
    if (el)
      el.src = userData.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=FF6B35&color=fff`;
  });
}


// ======= Default (manual) Login support (for dev/local use) =======
document.addEventListener('DOMContentLoaded', () => {
  // Manual login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();

      const name = document.getElementById('userName').value || 'User';
      const email = document.getElementById('userEmail').value || 'user@email.com';

      localStorage.setItem(
        'user',
        JSON.stringify({
          name: name,
          email: email,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name
          )}&background=FF6B35&color=fff`
        })
      );
      localStorage.setItem('authToken', 'demo-auth-token');

      window.location.href = 'dashboard.html';
    });
  }

  // Auto-fill user info everywhere
  loadUserInfo();
});
