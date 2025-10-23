window.onload = function() {
  window.google.accounts.id.initialize({
    client_id: "YOUR_CLIENT_ID.apps.googleusercontent.com",
    callback: handleGoogleSignIn
  });
  window.google.accounts.id.renderButton(
    document.getElementById("nav-login-btn"),
    { theme: "filled_blue", size: "large" }
  );
};

function handleGoogleSignIn(response) {
  // Extract JWT, decode profile info with Google's API, save to localStorage/profile-info
  // For demo, fake profile display:
  document.getElementById("profile-name").textContent = "Hello, User!";
  document.getElementById("profile-pic").src = "assets/logo.svg";
  // Full production: validate, store token securely, etc.
}
