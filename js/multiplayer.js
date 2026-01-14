/* =============================================
   NEON PONG - Online Multiplayer
   WebSocket-based real-time gameplay
   ============================================= */

const Multiplayer = {
    // Connection state
    socket: null,
    connected: false,
    connecting: false,
    roomCode: null,
    playerId: null,
    playerNumber: 0, // 1 or 2
    isHost: false,

    // Server URL (will be configured)
    serverUrl: null,

    // Game state sync
    lastSentState: null,
    lastReceivedState: null,
    latency: 0,
    pingInterval: null,

    // Callbacks
    callbacks: {
        onConnect: null,
        onDisconnect: null,
        onJoinRoom: null,
        onOpponentJoin: null,
        onOpponentLeave: null,
        onGameStart: null,
        onGameState: null,
        onPaddleUpdate: null,
        onScoreUpdate: null,
        onGameOver: null,
        onError: null,
        onLatencyUpdate: null,
        onMatchFound: null
    },

    // Initialize multiplayer
    init(serverUrl = 'ws://localhost:3000') {
        this.serverUrl = serverUrl;
        this.playerId = Utils.storage.get('playerId') || Utils.generateId();
        Utils.storage.set('playerId', this.playerId);
        console.log('Multiplayer initialized');
    },

    // Wait for Socket.io to be available (handles dynamic script loading)
    waitForSocketIO(maxWaitMs = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkInterval = 100;
            
            const check = () => {
                if (typeof io !== 'undefined') {
                    resolve();
                } else if (Date.now() - startTime > maxWaitMs) {
                    reject(new Error('Unable to connect to multiplayer server. The server may be starting up or unavailable. Please try again in a moment.'));
                } else {
                    setTimeout(check, checkInterval);
                }
            };
            
            check();
        });
    },

    // Connect to server
    async connect() {
        if (this.connected || this.connecting) return Promise.resolve();

        this.connecting = true;

        try {
            // Wait for Socket.io to be available (handles dynamic script loading)
            await this.waitForSocketIO(10000);
            
            // Socket.io is now available, proceed with connection
            if (typeof io === 'undefined') {
                // This shouldn't happen after waitForSocketIO, but check anyway
                console.warn('Socket.io not available, running in offline mode');
                this.connecting = false;
                throw new Error('Socket.io library failed to load');
            }

            return new Promise((resolve, reject) => {
                this.socket = io(this.serverUrl, {
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                    timeout: 10000
                });

                this.socket.on('connect', () => {
                    this.connected = true;
                    this.connecting = false;
                    console.log('Connected to server');
                    
                    // Send player info
                    this.socket.emit('register', {
                        playerId: this.playerId,
                        playerName: Leaderboard.playerStats?.name || 'Player'
                    });

                    this.startPingInterval();
                    
                    if (this.callbacks.onConnect) {
                        this.callbacks.onConnect();
                    }
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    this.connected = false;
                    this.roomCode = null;
                    this.stopPingInterval();
                    
                    if (this.callbacks.onDisconnect) {
                        this.callbacks.onDisconnect();
                    }
                });

                this.socket.on('error', (error) => {
                    console.error('Socket error:', error);
                    if (this.callbacks.onError) {
                        this.callbacks.onError(error);
                    }
                });

                this.setupEventHandlers();

                // Timeout
                setTimeout(() => {
                    if (this.connecting) {
                        this.connecting = false;
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);
            });

        } catch (error) {
            this.connecting = false;
            throw error;
        }
    },

    // Setup socket event handlers
    setupEventHandlers() {
        if (!this.socket) return;

        // Room events
        this.socket.on('roomCreated', (data) => {
            this.roomCode = data.roomCode;
            this.isHost = true;
            this.playerNumber = 1;
            
            if (this.callbacks.onJoinRoom) {
                this.callbacks.onJoinRoom(data);
            }
        });

        this.socket.on('roomJoined', (data) => {
            this.roomCode = data.roomCode;
            this.isHost = false;
            this.playerNumber = 2;
            
            if (this.callbacks.onJoinRoom) {
                this.callbacks.onJoinRoom(data);
            }
        });

        this.socket.on('matchFound', (data) => {
            this.roomCode = data.roomCode;
            this.isHost = data.isHost;
            this.playerNumber = data.playerNumber;
            
            if (this.callbacks.onMatchFound) {
                this.callbacks.onMatchFound(data);
            }
        });

        this.socket.on('opponentJoined', (data) => {
            if (this.callbacks.onOpponentJoin) {
                this.callbacks.onOpponentJoin(data);
            }
        });

        this.socket.on('opponentLeft', () => {
            if (this.callbacks.onOpponentLeave) {
                this.callbacks.onOpponentLeave();
            }
        });

        // Game events
        this.socket.on('gameStart', (data) => {
            if (this.callbacks.onGameStart) {
                this.callbacks.onGameStart(data);
            }
        });

        this.socket.on('gameState', (data) => {
            this.lastReceivedState = data;
            if (this.callbacks.onGameState) {
                this.callbacks.onGameState(data);
            }
        });

        this.socket.on('paddleUpdate', (data) => {
            if (this.callbacks.onPaddleUpdate) {
                this.callbacks.onPaddleUpdate(data);
            }
        });

        this.socket.on('scoreUpdate', (data) => {
            if (this.callbacks.onScoreUpdate) {
                this.callbacks.onScoreUpdate(data);
            }
        });

        this.socket.on('gameOver', (data) => {
            if (this.callbacks.onGameOver) {
                this.callbacks.onGameOver(data);
            }
        });

        // Ping/pong for latency
        this.socket.on('pong', (timestamp) => {
            this.latency = Date.now() - timestamp;
            if (this.callbacks.onLatencyUpdate) {
                this.callbacks.onLatencyUpdate(this.latency);
            }
        });

        // Errors
        this.socket.on('roomError', (error) => {
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
        });
    },

    // Disconnect from server
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.roomCode = null;
        this.stopPingInterval();
    },

    // Create a new room
    createRoom(gameSettings = {}) {
        if (!this.connected) {
            return Promise.reject(new Error('Not connected'));
        }

        return new Promise((resolve, reject) => {
            this.socket.emit('createRoom', {
                playerId: this.playerId,
                settings: gameSettings
            });

            const timeout = setTimeout(() => {
                reject(new Error('Room creation timeout'));
            }, 5000);

            this.socket.once('roomCreated', (data) => {
                clearTimeout(timeout);
                resolve(data);
            });

            this.socket.once('roomError', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.message));
            });
        });
    },

    // Join an existing room
    joinRoom(roomCode) {
        if (!this.connected) {
            return Promise.reject(new Error('Not connected'));
        }

        return new Promise((resolve, reject) => {
            this.socket.emit('joinRoom', {
                playerId: this.playerId,
                roomCode: roomCode.toUpperCase()
            });

            const timeout = setTimeout(() => {
                reject(new Error('Join room timeout'));
            }, 5000);

            this.socket.once('roomJoined', (data) => {
                clearTimeout(timeout);
                resolve(data);
            });

            this.socket.once('roomError', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.message));
            });
        });
    },

    // Quick match (find random opponent)
    quickMatch() {
        if (!this.connected) {
            return Promise.reject(new Error('Not connected'));
        }

        return new Promise((resolve, reject) => {
            this.socket.emit('quickMatch', {
                playerId: this.playerId
            });

            const timeout = setTimeout(() => {
                reject(new Error('Matchmaking timeout'));
            }, 30000);

            const onMatch = (data) => {
                clearTimeout(timeout);
                resolve(data);
            };

            this.socket.once('roomJoined', onMatch);
            this.socket.once('roomCreated', onMatch);
            this.socket.once('matchFound', onMatch);

            this.socket.once('matchError', (error) => {
                clearTimeout(timeout);
                reject(new Error(error.message));
            });
        });
    },

    // Leave current room
    leaveRoom() {
        if (this.socket && this.roomCode) {
            this.socket.emit('leaveRoom', { roomCode: this.roomCode });
            this.roomCode = null;
            this.playerNumber = 0;
            this.isHost = false;
        }
    },

    // Send paddle position update
    sendPaddleUpdate(y, velocity = 0) {
        if (!this.socket || !this.roomCode) return;

        this.socket.emit('paddleUpdate', {
            roomCode: this.roomCode,
            playerNumber: this.playerNumber,
            y: y,
            velocity: velocity,
            timestamp: Date.now()
        });
    },

    // Send game state (host only)
    sendGameState(state) {
        if (!this.socket || !this.roomCode || !this.isHost) return;

        this.socket.emit('gameState', {
            roomCode: this.roomCode,
            state: state,
            timestamp: Date.now()
        });
    },

    // Send game over notification (host only)
    sendGameOver(data) {
        if (!this.socket || !this.roomCode || !this.isHost) return;

        this.socket.emit('gameOver', {
            roomCode: this.roomCode,
            ...data
        });
    },

    // Request game start
    requestStart() {
        if (!this.socket || !this.roomCode) return;

        this.socket.emit('requestStart', {
            roomCode: this.roomCode,
            playerId: this.playerId
        });
    },

    // Send ready status
    sendReady() {
        if (!this.socket || !this.roomCode) return;

        this.socket.emit('playerReady', {
            roomCode: this.roomCode,
            playerId: this.playerId
        });
    },

    // Send chat message
    sendChat(message) {
        if (!this.socket || !this.roomCode) return;

        this.socket.emit('chat', {
            roomCode: this.roomCode,
            playerId: this.playerId,
            message: message
        });
    },

    // Start ping interval for latency measurement
    startPingInterval() {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.socket && this.connected) {
                this.socket.emit('ping', Date.now());
            }
        }, 2000);
    },

    // Stop ping interval
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    },

    // Register callback
    on(event, callback) {
        if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
            this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
        }
    },

    // Get connection status
    getStatus() {
        return {
            connected: this.connected,
            connecting: this.connecting,
            roomCode: this.roomCode,
            playerNumber: this.playerNumber,
            isHost: this.isHost,
            latency: this.latency
        };
    },

    // Update connection status UI
    updateStatusUI() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot && statusText) {
            if (this.connected) {
                statusDot.classList.add('connected');
                statusText.textContent = `Connected (${this.latency}ms)`;
            } else if (this.connecting) {
                statusDot.classList.remove('connected');
                statusText.textContent = 'Connecting...';
            } else {
                statusDot.classList.remove('connected');
                statusText.textContent = 'Disconnected';
            }
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Multiplayer;
}
