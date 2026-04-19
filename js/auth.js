/* 
   AUTH.JS – Global Authentication Helper 
   Checks for session and redirects if unauthorized
*/

function checkAuth(requiredRole = null) {
    const authData = localStorage.getItem('pf_auth');
    if (!authData) {
        window.location.href = 'login.html';
        return null;
    }

    const user = JSON.parse(authData);
    if (requiredRole && user.role !== requiredRole) {
        alert('Unauthorized access. Redirecting...');
        window.location.href = 'index.html';
        return null;
    }

    return user;
}

function logout() {
    localStorage.removeItem('pf_auth');
    window.location.href = 'login.html';
}

// Global user update for sidebars/navbars
document.addEventListener('DOMContentLoaded', () => {
    const authData = localStorage.getItem('pf_auth');
    if (authData) {
        const user = JSON.parse(authData);
        const nameEls = document.querySelectorAll('.sidebar-user strong, .nav-user-name');
        nameEls.forEach(el => el.textContent = user.full_name || user.username);
        
        const avatarEls = document.querySelectorAll('.user-avatar');
        avatarEls.forEach(el => {
            if (user.role === 'admin') el.textContent = '👑';
            else el.textContent = '👤';
        });
    }
});
