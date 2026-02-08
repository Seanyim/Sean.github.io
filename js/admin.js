/**
 * ADMIN SYSTEM ("Developer Mode")
 * Handles Auth, Editing, and Persistence
 */

const ADMIN_TOKEN_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"; // SHA-256 of 'admin' (demo)
const DEV_MODE_KEY = "sean_dev_mode";

// 1. Auth Logic
async function attemptLogin(password) {
    // Simple client-side hash check (Demo security only)
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === ADMIN_TOKEN_HASH) {
        enableDevMode();
        return true;
    } else {
        alert("ACCESS DENIED");
        return false;
    }
}

function enableDevMode() {
    localStorage.setItem(DEV_MODE_KEY, "true");
    document.body.classList.add("dev-mode");
    initAdminUI();
    alert("WELCOME BACK, DEVELOPER.");
    closeModal('admin-modal');
}

function checkDevMode() {
    if (localStorage.getItem(DEV_MODE_KEY) === "true") {
        document.body.classList.add("dev-mode");
        initAdminUI();
    }
}

// 2. Admin UI Injection
function initAdminUI() {
    // Create Admin Toolbar if not exists
    if (!document.getElementById('admin-toolbar')) {
        const toolbar = document.createElement('div');
        toolbar.id = 'admin-toolbar';
        toolbar.innerHTML = `
            <div class="mono" style="color:var(--accent-purple); font-size: 0.8rem;">DEV_MODE</div>
            <button class="btn-ghost" onclick="exportData()">💾 Save JSON</button>
            <button class="btn-ghost" onclick="logout()">🔒 Logout</button>
        `;
        document.body.appendChild(toolbar);
    }

    // Make elements editable
    makeContentEditable();
}

function makeContentEditable() {
    // About Me
    document.querySelectorAll('.editable-text').forEach(el => {
        el.setAttribute('contenteditable', 'true');
        el.addEventListener('blur', (e) => saveEdit(e.target));
    });
}

// 3. Persistence (Simulation)
function saveEdit(element) {
    const fieldId = element.dataset.field;
    if (!fieldId) return;
    
    console.log(`Saved ${fieldId}:`, element.innerHTML);
    // In a real app, send to API.
    // Here, save to LocalStorage to persist across reloads
    localStorage.setItem(`content_${fieldId}`, element.innerHTML);
}

function loadEdits() {
    document.querySelectorAll('[data-field]').forEach(el => {
        const saved = localStorage.getItem(`content_${el.dataset.field}`);
        if (saved) el.innerHTML = saved;
    });
}

function logout() {
    localStorage.removeItem(DEV_MODE_KEY);
    window.location.reload();
}

// Export for Git
function exportData() {
    const data = {
        posts: JSON.parse(localStorage.getItem('seans_space_data_v3') || '{"posts":[]}').posts,
        custom_edits: localStorage
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "site_data_backup.json";
    a.click();
}

// Hook into Main
document.addEventListener('DOMContentLoaded', () => {
    checkDevMode();
    loadEdits();
});
