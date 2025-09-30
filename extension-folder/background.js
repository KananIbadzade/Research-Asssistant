// Import config for API URL
importScripts('config.js');

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Test backend connection on startup
async function testBackendConnection() {
    // Ensure CONFIG is loaded
    if (typeof CONFIG === 'undefined') {
        console.error('CONFIG not loaded, using fallback URL');
        const apiUrl = 'http://localhost:8080';
        console.log('Testing backend connection to:', apiUrl);
        return await testConnection(apiUrl);
    }
    
    const apiUrl = CONFIG.getApiUrl();
    console.log('Testing backend connection to:', apiUrl);
    return await testConnection(apiUrl);
}

async function testConnection(apiUrl) {
    try {
        console.log('Attempting to connect to:', apiUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('Connection timeout after 30 seconds');
            controller.abort();
        }, 30000);
        
        const response = await fetch(`${apiUrl}/api/research/health`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('Response received:', response.status);
        
        if (response.ok) {
            const data = await response.text();
            console.log('Backend connection successful:', data);
            return true;
        } else {
            console.error('Backend health check failed:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Backend connection test failed:', error);
        console.error('Error details:', error.message);
        return false;
    }
}

// Test connection when background script loads
testBackendConnection();

// Handle API requests from sidepanel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('Background script received message:', msg);
    
    if (msg.type === 'SUMMARIZE') {
        handleApiRequest('summarize', msg.text, sendResponse);
        return true; // keep channel open
    } else if (msg.type === 'PARAPHRASE') {
        handleApiRequest('paraphrase', msg.text, sendResponse);
        return true; // keep channel open
    }
});

// Improved API request handler with timeout and better error handling
async function handleApiRequest(operation, text, sendResponse) {
    // Ensure CONFIG is loaded, use fallback if not
    let apiUrl;
    if (typeof CONFIG !== 'undefined') {
        apiUrl = CONFIG.getApiUrl();
    } else {
        console.error('CONFIG not loaded, using fallback URL');
        apiUrl = 'http://localhost:8080';
    }
    
    console.log(`Making ${operation} request to:`, apiUrl);
    
    try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for Render free plan
        
        const response = await fetch(`${apiUrl}/api/research/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operation, content: text }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`${operation} response status:`, response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`${operation} API error:`, response.status, errorText);
            sendResponse({ 
                ok: false, 
                error: `API Error ${response.status}: ${errorText}` 
            });
            return;
        }
        
        const data = await response.json().catch(() => ({}));
        console.log(`${operation} success:`, data);
        sendResponse({ ok: true, data });
        
    } catch (error) {
        console.error(`${operation} request failed:`, error);
        
                if (error.name === 'AbortError') {
                    sendResponse({ 
                        ok: false, 
                        error: 'Request timeout - Render free plan takes 1-2 minutes to wake up from sleep. Please wait and try again.' 
                    });
        } else if (error.message.includes('fetch')) {
            sendResponse({ 
                ok: false, 
                error: 'Cannot connect to server - make sure backend is running on localhost:8080' 
            });
        } else {
            sendResponse({ 
                ok: false, 
                error: `Request failed: ${error.message}` 
            });
        }
    }
}