let videoElement = null;
const sizeMap = {
    small: { width: '200px' },
    medium: { width: '380px' },
    large: { width: '560px' }
};

// Create and inject the video element
function createVideoElement(size = 'large', soundEnabled = false) {
    if (videoElement) return;
    
    // Delay the creation and injection
    setTimeout(() => {
        // Create a container div with a unique class and ID
        const container = document.createElement('div');
        container.className = 'stonk-dancer-extension-container';
        container.id = 'stonk-dancer-container-' + Date.now();
        
        // Create and style the video element
        videoElement = document.createElement('video');
        videoElement.className = 'dance-video';
        videoElement.id = 'stonk-dancer-video-' + Date.now();
        videoElement.loop = true;
        videoElement.autoplay = true;
        videoElement.muted = !soundEnabled; // Set muted based on sound preference
        videoElement.playsInline = true;
        
        // Add error handling for video loading
        videoElement.onerror = function(e) {
            console.error('Error loading video:', e);
        };
        
        // Get the video URL and ensure it's properly formatted
        const videoUrl = chrome.runtime.getURL('assets/dance.webm');
        console.log('Loading video from:', videoUrl);
        videoElement.src = videoUrl;
        
        // Try to play immediately and handle any errors
        const tryPlay = () => {
            if (videoElement && videoElement.paused) {
                videoElement.play().catch(error => {
                    console.log('Video play failed, will retry after interaction');
                    // If play fails, set up click handler
                    const playAfterClick = () => {
                        videoElement.play().catch(console.error);
                        document.removeEventListener('click', playAfterClick);
                    };
                    document.addEventListener('click', playAfterClick, { once: true });
                });
            }
        };

        videoElement.onloadeddata = tryPlay;
        videoElement.oncanplay = tryPlay;
        
        // Add inline styles to ensure they're scoped to our container
        container.style.cssText = `
            position: fixed;
            bottom: 0px;
            left: 50px;
            z-index: 99999999;
            pointer-events: none;
        `;
        
        const sizeStyle = sizeMap[size] || sizeMap.large;
        videoElement.style.cssText = `
            position: fixed;
            bottom: 0px;
            width: ${sizeStyle.width};
            height: auto;
            background-color: transparent;
        `;
        
        container.appendChild(videoElement);
        document.body.appendChild(container);

        setTimeout(tryPlay, 1);
    }, 1);
}

// Remove the video element
function removeVideoElement() {
    if (videoElement) {
        const container = document.querySelector('.stonk-dancer-extension-container');
        if (container) {
            container.remove();
        }
        videoElement = null;
    }
}

// Change video size
function changeVideoSize(size) {
    if (videoElement) {
        const sizeStyle = sizeMap[size] || sizeMap.large;
        videoElement.style.width = sizeStyle.width;
    }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleVideo') {
        if (request.enabled) {
            createVideoElement(request.size || 'large', request.sound);
            // If sound is enabled, try to play with sound
            if (request.sound && videoElement) {
                videoElement.muted = false;
                videoElement.play().catch(error => {
                    console.log('Failed to play with sound:', error);
                });
            }
        } else {
            removeVideoElement();
        }
    } else if (request.action === 'toggleSound') {
        if (videoElement) {
            videoElement.muted = !request.sound;
            // If sound is enabled, try to play with sound
            if (request.sound) {
                videoElement.play().catch(error => {
                    console.log('Failed to play with sound:', error);
                });
            }
        }
    } else if (request.action === 'changeSize') {
        changeVideoSize(request.size);
    }
});

// Load initial state for current hostname
chrome.storage.local.get([window.location.hostname], function(data) {
    const hostSettings = data[window.location.hostname];
    if (hostSettings && hostSettings.enabled) {
        createVideoElement(hostSettings.size, hostSettings.sound);
        // If sound is enabled, try to play with sound
        if (videoElement && hostSettings.sound) {
            videoElement.muted = false;
            videoElement.play().catch(error => {
                console.log('Failed to play with sound:', error);
            });
        }
    }
});
