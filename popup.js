document.addEventListener('DOMContentLoaded', function() {
    const enableSwitch = document.getElementById('enableSwitch');
    const soundSwitch = document.getElementById('soundSwitch');
    const hostnameBadge = document.getElementById('hostnameBadge');
    const sizeRadios = document.querySelectorAll('input[name="size"]');

    // Get current hostname
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            const url = new URL(tabs[0].url);
            const hostname = url.hostname;
            hostnameBadge.textContent = hostname;

            // Load saved states for this hostname
            chrome.storage.local.get([hostname], function(data) {
                const hostSettings = data[hostname] || {
                    enabled: false,
                    sound: false,
                    size: 'large'
                };

                enableSwitch.checked = hostSettings.enabled;
                soundSwitch.checked = hostSettings.sound;
                document.querySelector(`input[name="size"][value="${hostSettings.size}"]`).checked = true;
            });
        }
    });

    // Function to send message to content script with error handling
    function sendMessageToContentScript(message) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                const url = new URL(tabs[0].url);
                const hostname = url.hostname;
                
                // Get current size selection
                const currentSize = document.querySelector('input[name="size"]:checked').value;
                
                // Update hostname-specific settings
                const hostSettings = {
                    enabled: enableSwitch.checked,
                    sound: soundSwitch.checked,
                    size: currentSize
                };
                
                chrome.storage.local.set({ [hostname]: hostSettings });

                // Add size to all messages
                message.size = currentSize;

                chrome.tabs.sendMessage(tabs[0].id, message)
                    .catch(error => {
                        if (error.message.includes("Receiving end does not exist")) {
                            chrome.scripting.executeScript({
                                target: { tabId: tabs[0].id },
                                files: ['content.js']
                            }).then(() => {
                                chrome.tabs.sendMessage(tabs[0].id, message);
                            });
                        }
                    });
            }
        });
    }

    // Handle enable switch
    enableSwitch.addEventListener('change', function() {
        const soundEnabled = this.checked; // Enable sound by default when dance is enabled
        soundSwitch.checked = soundEnabled;
        
        sendMessageToContentScript({
            action: 'toggleVideo',
            enabled: this.checked,
            sound: soundEnabled
        });
    });

    // Handle sound switch
    soundSwitch.addEventListener('change', function() {
        sendMessageToContentScript({
            action: 'toggleSound',
            enabled: enableSwitch.checked,
            sound: this.checked
        });
    });

    // Handle size changes
    sizeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            sendMessageToContentScript({
                action: 'changeSize',
                size: this.value
            });
        });
    });
}); 