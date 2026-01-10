/* =============================================
   NEON PONG - Configuration
   Configure game settings including multiplayer server
   ============================================= */

const Config = {
    // Multiplayer server URL
    // Options:
    // 1. null or '' - Uses window.location.origin (for self-hosted server)
    // 2. 'https://your-server.onrender.com' - Render deployment
    // 3. 'https://your-app.up.railway.app' - Railway deployment
    // 4. Any other WebSocket-capable server URL
    MULTIPLAYER_SERVER_URL: null,

    // Get the multiplayer server URL
    // Falls back to current origin if not configured
    getMultiplayerServerUrl() {
        if (this.MULTIPLAYER_SERVER_URL) {
            return this.MULTIPLAYER_SERVER_URL;
        }
        // Default to current origin (works when server and client are same origin)
        return window.location.origin;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
