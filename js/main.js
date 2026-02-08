/**
 * Sean's Space - Main Logic (Apple Refined)
 * Hybrid Data: data/posts.json (Static) + LocalStorage (Drafts)
 */

// --- Page Transitions ---
document.addEventListener('DOMContentLoaded', () => {
    // Fade In
    document.body.classList.add('loaded');

    // Handle Link Clicks for Fade Out
    document.querySelectorAll('a').forEach(anchor => {
        if (anchor.href && anchor.href.startsWith(window.location.origin) && !anchor.hash) {
            anchor.addEventListener('click', e => {
                e.preventDefault();
                document.body.classList.add('fade-out');
                setTimeout(() => {
                    window.location = anchor.href;
                }, 400); // Match CSS transition time
            });
        }
    });
});

const STORAGE_KEY = 'seans_space_data_v3'; // Data Key
const AUTH_KEY = 'seans_space_role_v2';    // Auth Key

// --- Data Management ---

async function loadData() {
    // 1. Load LocalStorage (Drafts/New)
    const localData = localStorage.getItem(STORAGE_KEY);
    let posts = localData ? JSON.parse(localData).posts : [];

    // 2. Load Static JSON (Published)
    try {
        const response = await fetch('data/posts.json');
        if (response.ok) {
            const staticData = await response.json();
            // Merge: Static first, then Local (Local might have newer stuff, but let's keep simple)
            // Actually, we usually want to show mixed. 
            // Let's concat.
            posts = posts.concat(staticData.posts);
        }
    } catch (e) {
        console.warn('Could not load static posts:', e);
    }

    // Deduplicate by ID just in case
    const uniquePosts = Array.from(new Map(posts.map(item => [item.id, item])).values());
    
    // Sort by Date Descending
    uniquePosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    return { posts: uniquePosts };
}

// Save ONLY to LocalStorage (We strictly don't modify JSON file from browser)
function saveLocalPost(post) {
    const localDataStr = localStorage.getItem(STORAGE_KEY);
    let localData = localDataStr ? JSON.parse(localDataStr) : { posts: [] };
    
    localData.posts.unshift(post);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
}

function deleteLocalPost(id) {
    // Can only delete Local items. Static items are read-only in this demo logic 
    // (unless we advanced match IDs, but let's assume Admin deletes from local)
    const localDataStr = localStorage.getItem(STORAGE_KEY);
    if (!localDataStr) return;

    let localData = JSON.parse(localDataStr);
    const initialLength = localData.posts.length;
    localData.posts = localData.posts.filter(p => p.id !== id);
    
    if (localData.posts.length < initialLength) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));
        window.location.reload();
    } else {
        alert("Cannot delete static content from browser. Edit data/posts.json.");
    }
}


// --- Page Specific Logic ---

// 1. Blog Page Logic
// --- End of Page Logic ---

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

