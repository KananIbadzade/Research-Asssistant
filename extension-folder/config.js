// Configuration for Research Assistant Extension
const CONFIG = {
    // Production URL - Deployed backend on Render
    API_BASE_URL: 'https://research-assistant-backend.onrender.com',
    
    // Development URL
    LOCAL_API_URL: 'http://localhost:8080',
    
    // Auto-detect which URL to use
    getApiUrl: function() {
        // For production deployment, use the deployed backend
        return this.API_BASE_URL;
    }
};