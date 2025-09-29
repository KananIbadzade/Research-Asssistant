// Configuration for Research Assistant Extension
const CONFIG = {
    // Production URL - Update this after deploying to Render
    API_BASE_URL: 'https://research-assistant-backend.onrender.com',
    
    // Development URL
    LOCAL_API_URL: 'http://localhost:8080',
    
    // Auto-detect which URL to use
    getApiUrl: function() {
        // For development, use localhost
        return this.LOCAL_API_URL;
    }
};