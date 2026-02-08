/**
 * Sean's Space - Main Logic
 * Uses LocalStorage for data persistence (Demo purposes)
 */

const STORAGE_KEY = "seans-space-data";

// --- Data Management ---

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { posts: [] };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function addPost(post) {
  const data = loadData();
  data.posts.unshift(post); // Add to beginning
  saveData(data);
  return post;
}

function deletePost(id) {
  const data = loadData();
  data.posts = data.posts.filter((p) => p.id !== id);
  saveData(data);
  // Reload page to reflect changes
  window.location.reload();
}

// --- Formatting ---

function formatDate(isoString) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(isoString).toLocaleDateString("en-US", options);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function parseMicroblogContent(text) {
  // Escape HTML first to prevent XSS (basic)
  let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 1. Images: ![alt](url)
  safeText = safeText.replace(
    /!\[(.*?)\]\((.*?)\)/g,
    '<div class="weibo-media"><img src="$2" alt="$1"></div>',
  );

  // 2. Links: [text](url)
  safeText = safeText.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank">$1</a>',
  );

  // 3. Raw URLs (simple)
  // Avoid double linking existing <a> tags, simpler regex for now:
  // This is a naive implementation, good enough for demo

  // 4. Line breaks
  safeText = safeText.replace(/\n/g, "<br>");

  return safeText;
}

// --- Page Specific Logic ---

// 1. Blog Page Logic
function initBlog() {
  const feedContainer = document.getElementById("blog-feed");
  if (!feedContainer) return;

  const data = loadData();
  const blogPosts = data.posts.filter((p) => p.type === "blog");

  if (blogPosts.length === 0) {
    feedContainer.innerHTML = `
            <div class="post-card" style="text-align: center; color: var(--color-text-muted);">
                <h3>No articles yet. Start writing!</h3>
            </div>
        `;
  } else {
    feedContainer.innerHTML = blogPosts
      .map(
        (post) => `
             <article class="post-card">
                <h2 class="post-title">${post.title}</h2>
                <div class="post-date">${formatDate(post.date)} <span style="cursor:pointer; color:red; margin-left:10px;" onclick="deletePost('${post.id}')">[Delete]</span></div>
                <div class="post-excerpt">
                    ${post.content} 
                </div> 
            </article>
        `,
      )
      .join("");
  }

  // Handle Publish
  const publishBtn = document.getElementById("publish-post-btn");
  if (publishBtn) {
    publishBtn.addEventListener("click", () => {
      const title = document.getElementById("post-title-input").value;
      const content = document.getElementById("post-content-input").innerHTML;

      if (!title || !content) {
        alert("Please fill in both title and content.");
        return;
      }

      const newPost = {
        id: generateId(),
        type: "blog",
        title: title,
        content: content,
        date: new Date().toISOString(),
      };

      addPost(newPost);

      // Close modal and reload
      document.getElementById("post-modal").classList.remove("active");
      window.location.reload();
    });
  }
}

// 2. Microblog Page Logic
function initMicroblog() {
  const feedContainer = document.getElementById("weibo-feed");
  if (!feedContainer) return; // Not on microblog page

  const data = loadData();
  const microPosts = data.posts.filter((p) => p.type === "microblog");

  // Initial Default Post (Static HTML in file) is standardized here ideally,
  // but we will append new ones or replace.
  // Let's replace the static list with JS rendered list + existing static one if empty?
  // Actually, for a clean state, let's just render from JS.

  if (microPosts.length > 0) {
    feedContainer.innerHTML = microPosts
      .map(
        (post) => `
            <div class="weibo-card" id="post-${post.id}">
                <div class="weibo-header">
                    <div class="avatar" style="background: var(--color-cta);">S</div>
                    <div class="user-info">
                        <h4>Sean</h4>
                        <span class="timestamp">${formatDate(post.date)}</span>
                    </div>
                     <span style="font-size:0.8rem; cursor:pointer; color:var(--color-text-muted); margin-left:auto;" onclick="deletePost('${post.id}')">Delete</span>
                </div>
                <div class="weibo-content">${parseMicroblogContent(post.content)}</div>
                <div class="weibo-footer">
                    <span class="interaction-btn"><ion-icon name="chatbubble-outline"></ion-icon> 0</span>
                    <span class="interaction-btn"><ion-icon name="heart-outline"></ion-icon> 0</span>
                    <span class="interaction-btn"><ion-icon name="share-social-outline"></ion-icon> Share</span>
                </div>
            </div>
        `,
      )
      .join("");
  }
}

// Make publishWeibo global so the onclick in HTML works
window.publishWeibo = function () {
  const input = document.getElementById("weibo-input");
  const content = input.value.trim();

  if (!content) {
    alert("Content cannot be empty!");
    return;
  }

  const newPost = {
    id: generateId(),
    type: "microblog",
    content: content,
    date: new Date().toISOString(),
  };

  addPost(newPost);
  input.value = ""; // Clear input
  window.location.reload(); // Refresh feed
};

window.deletePost = deletePost; // Make available globally

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    initBlog();
    initMicroblog();
    initAnimations();
    checkAdminStatus();
});

// --- Configuration & State ---
const STORAGE_KEY = 'seans_space_role_v2'; // Unified Key

// --- Animation System ---
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// --- Admin System (Strict Simulation) ---
// STORAGE_KEY defined globally at top

function checkAdminStatus() {
    let isAdmin = false;
    // Check if Config exists (Local) AND if Key matches
    if (window.SEAN_CONFIG && localStorage.getItem(STORAGE_KEY) === window.SEAN_CONFIG.ADMIN_KEY) {
        isAdmin = true;
    }
    
    document.body.classList.toggle('is-admin', isAdmin);
    updateStatusUI(isAdmin);
    return isAdmin;
}

function updateStatusUI(isAdmin) {
    // 1. Navbar Status Indicator
    const indicator = document.getElementById('sys-status');
    if (indicator) {
        if (isAdmin) {
            indicator.classList.add('admin');
            indicator.title = 'System Status: ADMIN ACCESS';
        } else {
            indicator.classList.remove('admin');
            indicator.title = 'System Status: GUEST';
        }
    }

    // 2. Microblog Input
    const inputArea = document.querySelector('.input-area');
    if (inputArea) {
        inputArea.style.display = isAdmin ? 'block' : 'none';
        
        // Remove old warning if exists
        const oldMsg = document.getElementById('guest-msg');
        if (oldMsg) oldMsg.remove();
        
        if (!isAdmin) {
            const msg = document.createElement('div');
            msg.id = 'guest-msg';
            msg.innerHTML = `
                <div style="border: 1px dashed var(--color-border); padding: 20px; text-align: center; border-radius: var(--radius-lg); color: var(--color-text-muted);">
                    <span style="font-family: 'JetBrains Mono'">[ READ ONLY PROTOCOL ACTIVE ]</span>
                </div>`;
            inputArea.parentNode.insertBefore(msg, inputArea);
        }
    }
}

// Modal Triggers
window.openAdminModal = function() {
    // If Admin, log out immediately
    if (checkAdminStatus()) {
        if(confirm('Terminate Admin Session?')) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    } else {
        // If Guest, check if local config allows login
        if (window.SEAN_CONFIG) {
            document.getElementById('admin-modal').classList.add('active');
        } else {
            alert('⚠️ ACCESS DENIED\n\nLogin is disabled on public satellite node.\nLocal terminal access required.');
        }
    }
};

window.attemptLogin = function() {
    const input = document.getElementById('admin-pass');
    // Verify against Config
    if (window.SEAN_CONFIG && input.value === window.SEAN_CONFIG.ACCESS_CODE) {
        localStorage.setItem(STORAGE_KEY, window.SEAN_CONFIG.ADMIN_KEY); // Store the session token
        location.reload();
    } else {
        alert('❌ ACCESS DENIED: Invalid Credentials');
        input.value = '';
    }
};

// Initial Check
document.addEventListener('DOMContentLoaded', () => {
    initBlog();
    initMicroblog();
    initAnimations();
    checkAdminStatus();
    
    // Show logout if admin
    if (localStorage.getItem(ADMIN_KEY) === 'true') {
        const loginBtn = document.querySelector('button[onclick*="admin-modal"]');
        if(loginBtn) {
            loginBtn.textContent = '[ Logout ]';
            loginBtn.onclick = window.logout;
        }
    }
});

// Update Date Rendering to include Delete button ONLY if Admin
function renderDeleteButton(id) {
    if (localStorage.getItem(ADMIN_KEY) === 'true') {
        return `<span style="cursor:pointer; color:red; margin-left:10px;" onclick="deletePost('${id}')">[Delete]</span>`;
    }
    return '';
}

// Override initBlog to use renderDeleteButton
function initBlog() {
    const feedContainer = document.getElementById('blog-feed');
    if (!feedContainer) return;

    const data = loadData();
    const blogPosts = data.posts.filter(p => p.type === 'blog');

    if (blogPosts.length === 0) {
        feedContainer.innerHTML = `
            <div class="post-card" style="text-align: center; color: var(--color-text-muted);">
                <h3>No articles yet. Start writing!</h3>
            </div>
        `;
    } else {
        feedContainer.innerHTML = blogPosts.map(post => `
             <article class="post-card">
                <h2 class="post-title">${post.title}</h2>
                <div class="post-date">${formatDate(post.date)} ${renderDeleteButton(post.id)}</div>
                <div class="post-excerpt">
                    ${post.content} 
                </div> 
            </article>
        `).join('');
    }

    // Handle Publish
    const publishBtn = document.getElementById('publish-post-btn');
    if (publishBtn) {
        publishBtn.addEventListener('click', () => {
             const title = document.getElementById('post-title-input').value;
             const content = document.getElementById('post-content-input').innerHTML;

             if (!title || !content) {
                 alert('Please fill in both title and content.');
                 return;
             }

             const newPost = {
                 id: generateId(),
                 type: 'blog',
                 title: title,
                 content: content,
                 date: new Date().toISOString()
             };

             addPost(newPost);
             
             // Close modal and reload
             document.getElementById('post-modal').classList.remove('active');
             window.location.reload();
        });
    }
}

// Override initMicroblog to use renderDeleteButton
function initMicroblog() {
    const feedContainer = document.getElementById('weibo-feed');
    if (!feedContainer) return;

    const data = loadData();
    const microPosts = data.posts.filter(p => p.type === 'microblog');
    
    // Check admin for delete button
    const isAdmin = localStorage.getItem(ADMIN_KEY) === 'true';

    if (microPosts.length > 0) {
        feedContainer.innerHTML = microPosts.map(post => `
            <div class="weibo-card" id="post-${post.id}">
                <div class="weibo-header">
                    <div class="avatar" style="background: var(--color-cta);">S</div>
                    <div class="user-info">
                        <h4>Sean</h4>
                        <span class="timestamp">${formatDate(post.date)}</span>
                    </div>
                     ${isAdmin ? `<span style="font-size:0.8rem; cursor:pointer; color:var(--color-text-muted); margin-left:auto;" onclick="deletePost('${post.id}')">Delete</span>` : ''}
                </div>
                <div class="weibo-content">${parseMicroblogContent(post.content)}</div>
                <div class="weibo-footer">
                    <span class="interaction-btn"><ion-icon name="chatbubble-outline"></ion-icon> 0</span>
                    <span class="interaction-btn"><ion-icon name="heart-outline"></ion-icon> 0</span>
                    <span class="interaction-btn"><ion-icon name="share-social-outline"></ion-icon> Share</span>
                </div>
            </div>
        `).join('');
    }
}

