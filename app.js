// Main Application Controller
document.addEventListener('deviceready', onDeviceReady, false);

// Global App State
const AppState = {
    currentPage: 'home',
    isPremium: false,
    premiumExpiry: null,
    downloadCount: 0,
    downloadLimit: 25,
    downloadResetDate: null,
    darkMode: false,
    userDeviceId: null,
    adEnabled: true
};

// DOM Elements
const mainContent = document.getElementById('mainContent');
const bottomNavItems = document.querySelectorAll('.nav-item');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const filterBtn = document.getElementById('filterBtn');
const adContainer = document.getElementById('adContainer');

// Initialize the app
function onDeviceReady() {
    console.log('Cordova is ready!');
    
    // Load saved state
    loadAppState();
    
    // Initialize services
    initAdMob();
    generateDeviceId();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load the initial page
    loadPage(AppState.currentPage);
    
    // Check for premium status updates
    checkPremiumStatus();
}

function loadAppState() {
    const savedState = localStorage.getItem('advayx_app_state');
    if (savedState) {
        const state = JSON.parse(savedState);
        Object.assign(AppState, state);
    } else {
        // Initialize first-time defaults
        AppState.downloadResetDate = new Date().toISOString();
        saveAppState();
    }
    
    // Apply dark mode if enabled
    if (AppState.darkMode) {
        document.body.classList.add('dark-mode');
    }
}

function saveAppState() {
    localStorage.setItem('advayx_app_state', JSON.stringify(AppState));
}

function generateDeviceId() {
    if (!AppState.userDeviceId) {
        // Generate a simple device ID based on device info and random number
        const randomPart = Math.floor(Math.random() * 1000000);
        const timePart = new Date().getTime();
        AppState.userDeviceId = `device_${timePart}_${randomPart}`;
        saveAppState();
    }
}

function setupEventListeners() {
    // Bottom navigation
    bottomNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            loadPage(page);
        });
    });
    
    // Search functionality
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    
    // Filter button
    filterBtn.addEventListener('click', showFilterModal);
}

function loadPage(page) {
    AppState.currentPage = page;
    saveAppState();
    
    // Update active nav item
    bottomNavItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
    
    // Show loading spinner
    mainContent.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading ${page}...</p>
        </div>
    `;
    
    // Load page content
    setTimeout(() => {
        switch (page) {
            case 'home':
                loadHomePage();
                break;
            case 'downloads':
                loadDownloadsPage();
                break;
            case 'favorites':
                loadFavoritesPage();
                break;
            case 'premium':
                loadPremiumPage();
                break;
            case 'settings':
                loadSettingsPage();
                break;
            default:
                loadHomePage();
        }
    }, 300);
}

function loadHomePage() {
    checkDownloadReset();
    
    // Fetch content from sources (in a real app, this would be scraped or from a JSON)
    const trendingContent = getMockContent('trending');
    const newReleases = getMockContent('new');
    const animeContent = getMockContent('anime');
    
    mainContent.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Trending Now</h2>
            <a href="#" class="view-all">View All</a>
        </div>
        <div class="grid-container" id="trendingContent">
            ${renderContentGrid(trendingContent)}
        </div>
        
        <div class="section-header">
            <h2 class="section-title">New Releases</h2>
            <a href="#" class="view-all">View All</a>
        </div>
        <div class="grid-container" id="newReleases">
            ${renderContentGrid(newReleases)}
        </div>
        
        <div class="section-header">
            <h2 class="section-title">Anime</h2>
            <a href="#" class="view-all">View All</a>
        </div>
        <div class="grid-container" id="animeContent">
            ${renderContentGrid(animeContent)}
        </div>
    `;
    
    // Add event listeners to content items
    setupContentItemListeners();
}

function renderContentGrid(contentArray) {
    return contentArray.map(item => {
        const isNew = isContentNew(item.releaseDate);
        const isLocked = !AppState.isPremium && isNew;
        
        return `
            <div class="card" data-id="${item.id}">
                <img src="${item.thumbnail}" class="card-img" alt="${item.title}">
                ${isLocked ? `
                    <div class="locked-overlay">
                        <i class="fas fa-lock locked-icon"></i>
                        <p>Premium Only</p>
                        <small>Available in ${daysUntilAvailable(item.releaseDate)} days</small>
                    </div>
                ` : ''}
                <div class="card-body">
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-text">${item.description}</p>
                </div>
                <div class="card-footer">
                    <span class="badge ${isNew ? 'badge-new' : ''}">${isNew ? 'NEW' : item.category}</span>
                    <button class="btn btn-primary btn-sm download-btn">Download</button>
                </div>
            </div>
        `;
    }).join('');
}

function setupContentItemListeners() {
    // Download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.card');
            const contentId = card.getAttribute('data-id');
            initiateDownload(contentId);
        });
    });
    
    // Card clicks (for viewing details)
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            const contentId = this.getAttribute('data-id');
            showContentDetails(contentId);
        });
    });
}

function initiateDownload(contentId) {
    // Check download limits for free users
    if (!AppState.isPremium && AppState.downloadCount >= AppState.downloadLimit) {
        showToast('You have reached your download limit. Upgrade to Premium for unlimited downloads.');
        return;
    }
    
    // Find the content item
    const content = findContentById(contentId);
    if (!content) {
        showToast('Content not found.');
        return;
    }
    
    // Check if content is locked (for free users)
    if (!AppState.isPremium && isContentNew(content.releaseDate)) {
        showToast('This content is only available to Premium users for the first 7 days.');
        return;
    }
    
    // Start download process
    showToast(`Starting download: ${content.title}`);
    
    // In a real app, this would use the Cordova File Transfer plugin
    // For this example, we'll simulate a download
    simulateDownload(content);
}

function simulateDownload(content) {
    // Create a download item in the UI
    const downloadItemId = `dl_${Date.now()}`;
    const downloadsSection = document.querySelector('#downloadsList') || mainContent;
    
    if (downloadsSection.id !== 'downloadsList') {
        // If we're not on the downloads page, show a toast
        showToast(`Download started: ${content.title}`);
    }
    
    // Add to download history
    addToDownloadHistory(content);
    
    // Update download count
    if (!AppState.isPremium) {
        AppState.downloadCount++;
        saveAppState();
        updateDownloadCounter();
    }
    
    // Return a mock download object for demonstration
    return {
        id: downloadItemId,
        content: content,
        progress: 0,
        interval: setInterval(() => {
            // Simulate download progress
            this.progress += Math.random() * 10;
            if (this.progress >= 100) {
                this.progress = 100;
                clearInterval(this.interval);
                showToast(`Download complete: ${content.title}`);
                
                // Save to device storage in a real app
                // cordova.plugins.file.writeFile(cordova.file.externalDataDirectory + '/AdvayX/', ...)
            }
            
            // Update progress in UI
            const progressBar = document.querySelector(`#${downloadItemId} .progress-bar`);
            if (progressBar) {
                progressBar.style.width = `${this.progress}%`;
            }
        }, 300)
    };
}

function addToDownloadHistory(content) {
    let downloadHistory = JSON.parse(localStorage.getItem('advayx_download_history')) || [];
    
    downloadHistory.unshift({
        id: content.id,
        title: content.title,
        thumbnail: content.thumbnail,
        category: content.category,
        dateDownloaded: new Date().toISOString(),
        filePath: `/Movies/AdvayX/${content.title.replace(/\s+/g, '_')}.mp4`, // Simulated path
        status: 'completed'
    });
    
    localStorage.setItem('advayx_download_history', JSON.stringify(downloadHistory));
}

function loadDownloadsPage() {
    const downloadHistory = JSON.parse(localStorage.getItem('advayx_download_history')) || [];
    
    mainContent.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Downloads</h2>
            <span class="download-counter">${getDownloadCounterText()}</span>
        </div>
        
        <div id="downloadsList">
            ${downloadHistory.length > 0 ? 
                downloadHistory.map(item => renderDownloadItem(item)).join('') : 
                '<p class="empty-message">No downloads yet. Download some content to watch offline!</p>'
            }
        </div>
    `;
    
    // Add event listeners to download items
    document.querySelectorAll('.download-item').forEach(item => {
        item.addEventListener('click', function() {
            const contentId = this.getAttribute('data-id');
            playDownloadedContent(contentId);
        });
    });
}

function renderDownloadItem(item) {
    return `
        <div class="download-item" data-id="${item.id}">
            <img src="${item.thumbnail}" class="download-img" alt="${item.title}">
            <div class="download-info">
                <h3 class="download-title">${item.title}</h3>
                <p class="download-status">Downloaded on ${formatDate(item.dateDownloaded)}</p>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${item.status === 'completed' ? '100%' : '0%'}"></div>
                </div>
            </div>
        </div>
    `;
}

function loadFavoritesPage() {
    const favorites = JSON.parse(localStorage.getItem('advayx_favorites')) || [];
    
    mainContent.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Favorites</h2>
        </div>
        
        <div class="grid-container">
            ${favorites.length > 0 ? 
                favorites.map(item => renderFavoriteItem(item)).join('') : 
                '<p class="empty-message">No favorites yet. Add some content to your favorites!</p>'
            }
        </div>
    `;
    
    // Add event listeners to favorite items
    document.querySelectorAll('.favorite-item').forEach(item => {
        item.addEventListener('click', function() {
            const contentId = this.getAttribute('data-id');
            showContentDetails(contentId);
        });
    });
}

function renderFavoriteItem(item) {
    return `
        <div class="card favorite-item" data-id="${item.id}">
            <img src="${item.thumbnail}" class="card-img" alt="${item.title}">
            <div class="card-body">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-text">${item.description || item.category}</p>
            </div>
            <div class="card-footer">
                <button class="btn btn-outline btn-sm remove-favorite-btn">Remove</button>
            </div>
        </div>
    `;
}

function loadPremiumPage() {
    mainContent.innerHTML = `
        <div class="premium-container">
            <div class="premium-card">
                <h2 class="premium-title">AdvayX Premium</h2>
                <div class="premium-price">Ksh30/month</div>
                
                <div class="premium-features">
                    <div class="feature-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Unlimited downloads</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-check-circle"></i>
                        <span>No waiting for new releases</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Ad-free experience</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-check-circle"></i>
                        <span>Support the developers</span>
                    </div>
                </div>
                
                ${AppState.isPremium ? `
                    <div class="premium-status">
                        <p>You are currently a Premium member!</p>
                        <p>Expires on: ${formatDate(AppState.premiumExpiry)}</p>
                    </div>
                ` : `
                    <div class="payment-methods">
                        <button class="payment-btn paypal-btn" id="paypalBtn">
                            <i class="fab fa-paypal"></i> Pay with PayPal
                        </button>
                        <button class="payment-btn pesapal-btn" id="pesapalBtn">
                            <i class="fas fa-mobile-alt"></i> Pay with PesaPal
                        </button>
                    </div>
                `}
            </div>
            
            <div class="faq-section">
                <h3>Frequently Asked Questions</h3>
                <div class="faq-item">
                    <h4>How does Premium work?</h4>
                    <p>Premium unlocks all features for 30 days from payment. No automatic renewal - pay only when you want.</p>
                </div>
                <div class="faq-item">
                    <h4>Can I use Premium on multiple devices?</h4>
                    <p>Premium is tied to this device only. For multiple devices, purchase on each one.</p>
                </div>
                <div class="faq-item">
                    <h4>How do I cancel?</h4>
                    <p>Premium doesn't auto-renew, so no need to cancel. Your access will simply expire after 30 days.</p>
                </div>
            </div>
        </div>
    `;
    
    if (!AppState.isPremium) {
        document.getElementById('paypalBtn').addEventListener('click', initiatePayPalPayment);
        document.getElementById('pesapalBtn').addEventListener('click', initiatePesaPalPayment);
    }
}

function loadSettingsPage() {
    mainContent.innerHTML = `
        <div class="settings-container">
            <div class="settings-item">
                <span>Dark Mode</span>
                <label class="switch">
                    <input type="checkbox" id="darkModeToggle" ${AppState.darkMode ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
            
            <div class="settings-item">
                <span>Clear Cache</span>
                <button class="btn btn-outline btn-sm" id="clearCacheBtn">Clear</button>
            </div>
            
            <div class="settings-item">
                <span>Reset Free Tier</span>
                <button class="btn btn-outline btn-sm" id="resetTierBtn">Reset</button>
            </div>
            
            <div class="settings-item">
                <span>Language</span>
                <select class="btn btn-outline btn-sm" id="languageSelect">
                    <option value="en">English</option>
                    <option value="sw">Swahili</option>
                </select>
            </div>
            
            <div class="settings-item">
                <span>App Version</span>
                <span class="text-muted">1.0.0</span>
            </div>
            
            <div class="settings-footer">
                <p class="text-center">AdvayX - Watch More. Wait Less.</p>
                <p class="text-center">Contact: <a href="https://t.me/AdvayFlix">@AdvayFlix</a></p>
            </div>
        </div>
    `;
    
    // Set up settings event listeners
    document.getElementById('darkModeToggle').addEventListener('change', toggleDarkMode);
    document.getElementById('clearCacheBtn').addEventListener('click', clearCache);
    document.getElementById('resetTierBtn').addEventListener('click', resetFreeTier);
}

function toggleDarkMode() {
    AppState.darkMode = this.checked;
    saveAppState();
    document.body.classList.toggle('dark-mode', AppState.darkMode);
    
    // Toggle AdMob background if needed
    if (window.admob) {
        adContainer.style.backgroundColor = AppState.darkMode ? '#2a2a2a' : '#f0f0f0';
    }
}

function clearCache() {
    localStorage.removeItem('advayx_content_cache');
    showToast('Cache cleared successfully');
}

function resetFreeTier() {
    AppState.downloadCount = 0;
    AppState.downloadResetDate = new Date().toISOString();
    saveAppState();
    updateDownloadCounter();
    showToast('Free tier reset successfully');
}

function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    showToast(`Searching for "${query}"...`);
    // In a real app, this would search your content database
    // For now, we'll just filter our mock data
    const results = searchMockContent(query);
    
    mainContent.innerHTML = `
        <div class="section-header">
            <h2 class="section-title">Search Results for "${query}"</h2>
            <button class="btn btn-outline btn-sm" id="backBtn">Back</button>
        </div>
        
        <div class="grid-container">
            ${results.length > 0 ? 
                renderContentGrid(results) : 
                '<p class="empty-message">No results found. Try a different search term.</p>'
            }
        </div>
    `;
    
    document.getElementById('backBtn').addEventListener('click', () => loadPage('home'));
    setupContentItemListeners();
}

function showFilterModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Filter Content</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="filter-options">
                    <h4 class="filter-title">Categories</h4>
                    <div class="filter-category" id="categoryFilters">
                        <div class="filter-tag active" data-category="all">All</div>
                        <div class="filter-tag" data-category="anime">Anime</div>
                        <div class="filter-tag" data-category="action">Action</div>
                        <div class="filter-tag" data-category="comedy">Comedy</div>
                        <div class="filter-tag" data-category="horror">Horror</div>
                        <div class="filter-tag" data-category="sci-fi">Sci-Fi</div>
                    </div>
                </div>
                
                <div class="filter-options">
                    <h4 class="filter-title">Sort By</h4>
                    <div class="filter-category" id="sortFilters">
                        <div class="filter-tag active" data-sort="popular">Most Popular</div>
                        <div class="filter-tag" data-sort="newest">Newest First</div>
                        <div class="filter-tag" data-sort="rating">Highest Rated</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" id="cancelFilter">Cancel</button>
                <button class="btn btn-primary" id="applyFilter">Apply</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => modal.style.display = 'flex', 10);
    
    // Category filter tags
    modal.querySelectorAll('#categoryFilters .filter-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            modal.querySelectorAll('#categoryFilters .filter-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Sort filter tags
    modal.querySelectorAll('#sortFilters .filter-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            modal.querySelectorAll('#sortFilters .filter-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Close buttons
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancelFilter').addEventListener('click', () => modal.remove());
    modal.querySelector('#applyFilter').addEventListener('click', () => {
        const category = modal.querySelector('#categoryFilters .filter-tag.active').getAttribute('data-category');
        const sort = modal.querySelector('#sortFilters .filter-tag.active').getAttribute('data-sort');
        
        // In a real app, this would filter your content
        showToast(`Filter applied: ${category}, sorted by ${sort}`);
        modal.remove();
    });
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function showContentDetails(contentId) {
    const content = findContentById(contentId);
    if (!content) {
        showToast('Content details not available');
        return;
    }
    
    const isFavorite = checkIfFavorite(contentId);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${content.title}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <img src="${content.thumbnail}" style="width:100%; border-radius:8px; margin-bottom:15px;">
                
                <p><strong>Category:</strong> ${content.category}</p>
                <p><strong>Released:</strong> ${formatDate(content.releaseDate)}</p>
                <p>${content.description || 'No description available.'}</p>
                
                <div style="margin-top:20px; display:flex; gap:10px;">
                    <button class="btn btn-primary" id="downloadNowBtn">
                        <i class="fas fa-download"></i> Download Now
                    </button>
                    <button class="btn ${isFavorite ? 'btn-outline' : 'btn-secondary'}" id="favoriteBtn">
                        <i class="fas fa-heart"></i> ${isFavorite ? 'Remove Favorite' : 'Add Favorite'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.style.display = 'flex', 10);
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('#downloadNowBtn').addEventListener('click', () => {
        initiateDownload(contentId);
        modal.remove();
    });
    
    modal.querySelector('#favoriteBtn').addEventListener('click', () => {
        toggleFavorite(contentId);
        modal.remove();
        showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function checkIfFavorite(contentId) {
    const favorites = JSON.parse(localStorage.getItem('advayx_favorites')) || [];
    return favorites.some(item => item.id === contentId);
}

function toggleFavorite(contentId) {
    const content = findContentById(contentId);
    if (!content) return;
    
    let favorites = JSON.parse(localStorage.getItem('advayx_favorites')) || [];
    const existingIndex = favorites.findIndex(item => item.id === contentId);
    
    if (existingIndex >= 0) {
        // Remove from favorites
        favorites.splice(existingIndex, 1);
    } else {
        // Add to favorites
        favorites.unshift({
            id: content.id,
            title: content.title,
            thumbnail: content.thumbnail,
            category: content.category,
            dateAdded: new Date().toISOString()
        });
    }
    
    localStorage.setItem('advayx_favorites', JSON.stringify(favorites));
    
    // Update favorites page if it's currently open
    if (AppState.currentPage === 'favorites') {
        loadFavoritesPage();
    }
}

function playDownloadedContent(contentId) {
    const downloadHistory = JSON.parse(localStorage.getItem('advayx_download_history')) || [];
    const item = downloadHistory.find(item => item.id === contentId);
    
    if (!item) {
        showToast('Content not found in downloads');
        return;
    }
    
    // In a real app, this would use the Cordova media plugin to play the file
    showToast(`Playing: ${item.title}`);
}

function checkDownloadReset() {
    if (AppState.isPremium) return;
    
    const resetDate = new Date(AppState.downloadResetDate);
    const now = new Date();
    const diffDays = Math.floor((now - resetDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 30) {
        AppState.downloadCount = 0;
        AppState.downloadResetDate = now.toISOString();
        saveAppState();
        updateDownloadCounter();
    }
}

function updateDownloadCounter() {
    const counter = document.querySelector('.download-counter');
    if (counter) {
        counter.textContent = getDownloadCounterText();
    }
}

function getDownloadCounterText() {
    if (AppState.isPremium) {
        return 'Premium: Unlimited downloads';
    } else {
        return `Downloads: ${AppState.downloadCount}/${AppState.downloadLimit}`;
    }
}

function checkPremiumStatus() {
    if (!AppState.isPremium) return;
    
    const expiryDate = new Date(AppState.premiumExpiry);
    const now = new Date();
    
    if (now > expiryDate) {
        AppState.isPremium = false;
        AppState.premiumExpiry = null;
        saveAppState();
        showToast('Your Premium subscription has expired');
        
        // Reload current page to reflect changes
        loadPage(AppState.currentPage);
    }
}

function isContentNew(releaseDate) {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffDays = Math.floor((now - release) / (1000 * 60 * 60 * 24));
    return diffDays < 7;
}

function daysUntilAvailable(releaseDate) {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffDays = Math.floor((now - release) / (1000 * 60 * 60 * 24));
    return 7 - diffDays;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Mock data functions (in a real app, this would be scraped or from an API)
function getMockContent(type) {
    const mockData = {
        trending: [
            {
                id: 'm1',
                title: 'Avengers: Endgame',
                description: 'The Avengers assemble once more to undo Thanos\'s actions.',
                thumbnail: 'https://via.placeholder.com/300x450?text=Avengers',
                category: 'Action',
                releaseDate: '2023-01-15',
                source: 'FZMovies'
            },
            {
                id: 'm2',
                title: 'Spider-Man: No Way Home',
                description: 'Peter Parker seeks help from Doctor Strange to fix his identity reveal.',
                thumbnail: 'https://via.placeholder.com/300x450?text=Spider-Man',
                category: 'Action',
                releaseDate: '2023-02-20',
                source: 'FZMovies'
            },
            {
                id: 'a1',
                title: 'Attack on Titan Final Season',
                description: 'The war for Paradis reaches its climax as Eren activates the Rumbling.',
                thumbnail: 'https://via.placeholder.com/300x450?text=AOT',
                category: 'Anime',
                releaseDate: '2023-03-10',
                source: 'GogoAnime'
            }
        ],
        new: [
            {
                id: 'm3',
                title: 'The Batman',
                description: 'Batman uncovers corruption in Gotham City while pursuing the Riddler.',
                thumbnail: 'https://via.placeholder.com/300x450?text=Batman',
                category: 'Action',
                releaseDate: new Date().toISOString().split('T')[0], // Today's date
                source: 'FZMovies'
            },
            {
                id: 'a2',
                title: 'Demon Slayer: Entertainment District Arc',
                description: 'Tanjirou and friends investigate disappearances in the Entertainment District.',
                thumbnail: 'https://via.placeholder.com/300x450?text=DemonSlayer',
                category: 'Anime',
                releaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
                source: '9anime'
            }
        ],
        anime: [
            {
                id: 'a1',
                title: 'Attack on Titan Final Season',
                description: 'The war for Paradis reaches its climax as Eren activates the Rumbling.',
                thumbnail: 'https://via.placeholder.com/300x450?text=AOT',
                category: 'Anime',
                releaseDate: '2023-03-10',
                source: 'GogoAnime'
            },
            {
                id: 'a3',
                title: 'Jujutsu Kaisen',
                description: 'Yuji Itadori becomes host to a powerful curse and joins a secret organization.',
                thumbnail: 'https://via.placeholder.com/300x450?text=Jujutsu',
                category: 'Anime',
                releaseDate: '2023-01-05',
                source: '9anime'
            }
        ]
    };
    
    return mockData[type] || [];
}

function searchMockContent(query) {
    const allContent = [
        ...getMockContent('trending'),
        ...getMockContent('new'),
        ...getMockContent('anime')
    ];
    
    return allContent.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    );
}

function findContentById(contentId) {
    const allContent = [
        ...getMockContent('trending'),
        ...getMockContent('new'),
        ...getMockContent('anime')
    ];
    
    return allContent.find(item => item.id === contentId);
}

// AdMob Initialization
function initAdMob() {
    if (!window.admob) {
        console.log('AdMob plugin not available');
        return;
    }
    
    // Only show ads for free users
    if (AppState.isPremium) {
        adContainer.style.display = 'none';
        return;
    }
    
    // Set AdMob options
    const adOptions = {
        adId: 'ca-app-pub-6946238559666901/7587127150',
        isTesting: false, // Set to true for testing
        autoShow: true,
        overlap: false,
        position: admob.AD_POSITION.BOTTOM_CENTER,
        offsetTopBar: false
    };
    
    // Initialize
    admob.setOptions(adOptions);
    
    // Create banner
    admob.createBannerView(() => {
        console.log('AdMob banner created');
    }, (error) => {
        console.log('AdMob error:', error);
    });
}