// Download Manager
class DownloadManager {
    constructor() {
        this.activeDownloads = {};
        this.downloadQueue = [];
        this.maxConcurrentDownloads = 2;
    }
    
    // Add a download to the queue
    async addDownload(content) {
        if (this.activeDownloads[content.id]) {
            showToast('Download already in progress');
            return;
        }
        
        this.downloadQueue.push(content);
        this.processQueue();
    }
    
    // Process the download queue
    processQueue() {
        while (Object.keys(this.activeDownloads).length < this.maxConcurrentDownloads && this.downloadQueue.length > 0) {
            const content = this.downloadQueue.shift();
            this.startDownload(content);
        }
    }
    
    // Start a download
    async startDownload(content) {
        const downloadId = `dl_${Date.now()}`;
        this.activeDownloads[content.id] = { id: downloadId, content, progress: 0 };
        
        try {
            // In a real app, this would use the Cordova File Transfer plugin
            // For this example, we'll simulate a download
            await this.simulateDownload(content, downloadId);
            
            // Download complete
            delete this.activeDownloads[content.id];
            this.processQueue();
            
            // Add to download history
            this.addToDownloadHistory(content);
            
            showToast(`Download complete: ${content.title}`);
        } catch (error) {
            console.error('Download error:', error);
            delete this.activeDownloads[content.id];
            this.processQueue();
            
            showToast(`Download failed: ${content.title}`);
        }
    }
    
    // Simulate a download (for demo purposes)
    simulateDownload(content, downloadId) {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                this.activeDownloads[content.id].progress += Math.random() * 10;
                
                // Update UI
                const progressBar = document.querySelector(`#${downloadId} .progress-bar`);
                if (progressBar) {
                    progressBar.style.width = `${this.activeDownloads[content.id].progress}%`;
                }
                
                if (this.activeDownloads[content.id].progress >= 100) {
                    clearInterval(interval);
                    this.activeDownloads[content.id].progress = 100;
                    resolve();
                }
            }, 300);
        });
    }
    
    // Add to download history
    addToDownloadHistory(content) {
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
        
        // Update download count for free users
        if (!AppState.isPremium) {
            AppState.downloadCount++;
            saveAppState();
            updateDownloadCounter();
        }
    }
    
    // Get download status
    getDownloadStatus(contentId) {
        if (this.activeDownloads[contentId]) {
            return {
                status: 'downloading',
                progress: this.activeDownloads[contentId].progress
            };
        }
        
        const downloadHistory = JSON.parse(localStorage.getItem('advayx_download_history')) || [];
        const downloadedItem = downloadHistory.find(item => item.id === contentId);
        
        if (downloadedItem) {
            return {
                status: 'downloaded',
                filePath: downloadedItem.filePath
            };
        }
        
        return { status: 'not_downloaded' };
    }
}

// Initialize download manager
const downloadManager = new DownloadManager();

// Function to initiate download from other modules
function initiateDownload(contentId) {
    const content = findContentById(contentId);
    if (!content) {
        showToast('Content not found');
        return;
    }
    
    // Check download limits for free users
    if (!AppState.isPremium && AppState.downloadCount >= AppState.downloadLimit) {
        showToast('You have reached your download limit. Upgrade to Premium for unlimited downloads.');
        return;
    }
    
    // Check if content is locked (for free users)
    if (!AppState.isPremium && isContentNew(content.releaseDate)) {
        showToast('This content is only available to Premium users for the first 7 days.');
        return;
    }
    
    // Start download
    downloadManager.addDownload(content);
    showToast(`Starting download: ${content.title}`);
    
    // If on downloads page, refresh it
    if (AppState.currentPage === 'downloads') {
        loadDownloadsPage();
    }
}

// Update download counter in UI
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