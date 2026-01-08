/* =============================================
   NEON PONG - Game Server
   Socket.io based multiplayer server
   ============================================= */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameRoom = require('./gameRoom');

// Configuration
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Game state
const rooms = new Map();
const players = new Map();
const matchmakingQueue = [];

// Generate room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Register player
    socket.on('register', (data) => {
        const player = {
            id: data.playerId || socket.id,
            socketId: socket.id,
            name: data.playerName || 'Player',
            currentRoom: null,
            isReady: false
        };
        players.set(socket.id, player);
        console.log(`Player registered: ${player.name} (${player.id})`);
    });

    // Create room
    socket.on('createRoom', (data) => {
        const player = players.get(socket.id);
        if (!player) {
            socket.emit('roomError', { message: 'Player not registered' });
            return;
        }

        // Generate unique room code
        let roomCode;
        do {
            roomCode = generateRoomCode();
        } while (rooms.has(roomCode));

        // Create room
        const room = new GameRoom(roomCode, data.settings);
        room.addPlayer(player, 1);
        rooms.set(roomCode, room);

        // Join socket room
        socket.join(roomCode);
        player.currentRoom = roomCode;

        console.log(`Room created: ${roomCode} by ${player.name}`);

        socket.emit('roomCreated', {
            roomCode: roomCode,
            playerNumber: 1,
            isHost: true
        });
    });

    // Join room
    socket.on('joinRoom', (data) => {
        const player = players.get(socket.id);
        if (!player) {
            socket.emit('roomError', { message: 'Player not registered' });
            return;
        }

        const roomCode = data.roomCode.toUpperCase();
        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit('roomError', { message: 'Room not found' });
            return;
        }

        if (room.isFull()) {
            socket.emit('roomError', { message: 'Room is full' });
            return;
        }

        // Add player to room
        room.addPlayer(player, 2);
        socket.join(roomCode);
        player.currentRoom = roomCode;

        console.log(`${player.name} joined room ${roomCode}`);

        // Notify joining player
        socket.emit('roomJoined', {
            roomCode: roomCode,
            playerNumber: 2,
            isHost: false,
            opponent: room.getOpponentInfo(player.id)
        });

        // Notify other player
        socket.to(roomCode).emit('opponentJoined', {
            opponent: {
                id: player.id,
                name: player.name
            }
        });
    });

    // Quick match
    socket.on('quickMatch', (data) => {
        const player = players.get(socket.id);
        if (!player) {
            socket.emit('roomError', { message: 'Player not registered' });
            return;
        }

        // Check if there's someone waiting
        if (matchmakingQueue.length > 0) {
            const opponent = matchmakingQueue.shift();
            
            // Create room for matched players
            let roomCode;
            do {
                roomCode = generateRoomCode();
            } while (rooms.has(roomCode));

            const room = new GameRoom(roomCode);
            room.addPlayer(opponent, 1);
            room.addPlayer(player, 2);
            rooms.set(roomCode, room);

            // Join socket room
            const opponentSocket = io.sockets.sockets.get(opponent.socketId);
            if (opponentSocket) {
                opponentSocket.join(roomCode);
                opponent.currentRoom = roomCode;
                opponentSocket.emit('matchFound', {
                    roomCode: roomCode,
                    playerNumber: 1,
                    isHost: true,
                    opponent: { id: player.id, name: player.name }
                });
            }

            socket.join(roomCode);
            player.currentRoom = roomCode;
            socket.emit('matchFound', {
                roomCode: roomCode,
                playerNumber: 2,
                isHost: false,
                opponent: { id: opponent.id, name: opponent.name }
            });

            console.log(`Match found: ${opponent.name} vs ${player.name} in ${roomCode}`);
        } else {
            // Add to queue
            matchmakingQueue.push(player);
            socket.emit('matchmaking', { status: 'waiting', position: matchmakingQueue.length });
            console.log(`${player.name} added to matchmaking queue`);
        }
    });

    // Leave room
    socket.on('leaveRoom', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.currentRoom) return;

        const room = rooms.get(player.currentRoom);
        if (room) {
            room.removePlayer(player.id);
            socket.leave(player.currentRoom);
            
            // Notify opponent
            socket.to(player.currentRoom).emit('opponentLeft');
            
            // Clean up empty room
            if (room.isEmpty()) {
                rooms.delete(player.currentRoom);
                console.log(`Room ${player.currentRoom} deleted (empty)`);
            }
        }

        player.currentRoom = null;
    });

    // Player ready
    socket.on('playerReady', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.currentRoom) return;

        const room = rooms.get(player.currentRoom);
        if (!room) return;

        room.setPlayerReady(player.id, true);

        if (room.allPlayersReady()) {
            io.to(player.currentRoom).emit('gameStart', {
                countdown: 3
            });
            room.startGame();
        }
    });

    // Request game start
    socket.on('requestStart', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.currentRoom) return;

        const room = rooms.get(player.currentRoom);
        if (!room || !room.isFull()) {
            socket.emit('roomError', { message: 'Need 2 players to start' });
            return;
        }

        io.to(player.currentRoom).emit('gameStart', {
            countdown: 3
        });
    });

    // Paddle update
    socket.on('paddleUpdate', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.currentRoom) return;

        // Broadcast to opponent
        socket.to(player.currentRoom).emit('paddleUpdate', {
            playerNumber: data.playerNumber,
            y: data.y,
            velocity: data.velocity,
            timestamp: data.timestamp
        });
    });

    // Game state (from host)
    socket.on('gameState', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.currentRoom) return;

        // Broadcast to opponent
        socket.to(player.currentRoom).emit('gameState', data.state);
    });

    // Score update
    socket.on('scoreUpdate', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.currentRoom) return;

        io.to(player.currentRoom).emit('scoreUpdate', data);
    });

    // Game over
    socket.on('gameOver', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.currentRoom) return;

        io.to(player.currentRoom).emit('gameOver', data);
        
        const room = rooms.get(player.currentRoom);
        if (room) {
            room.endGame(data);
        }
    });

    // Chat message
    socket.on('chat', (data) => {
        const player = players.get(socket.id);
        if (!player || !player.currentRoom) return;

        io.to(player.currentRoom).emit('chat', {
            playerId: player.id,
            playerName: player.name,
            message: data.message.substring(0, 200) // Limit message length
        });
    });

    // Ping/pong for latency
    socket.on('ping', (timestamp) => {
        socket.emit('pong', timestamp);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        const player = players.get(socket.id);
        if (player) {
            // Remove from matchmaking queue
            const queueIndex = matchmakingQueue.findIndex(p => p.socketId === socket.id);
            if (queueIndex !== -1) {
                matchmakingQueue.splice(queueIndex, 1);
            }

            // Leave room
            if (player.currentRoom) {
                const room = rooms.get(player.currentRoom);
                if (room) {
                    room.removePlayer(player.id);
                    socket.to(player.currentRoom).emit('opponentLeft');
                    
                    if (room.isEmpty()) {
                        rooms.delete(player.currentRoom);
                    }
                }
            }

            players.delete(socket.id);
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        rooms: rooms.size,
        players: players.size,
        matchmakingQueue: matchmakingQueue.length
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║         NEON PONG Game Server            ║
║                                          ║
║  🎮 Server running on port ${PORT}          ║
║  🌐 http://localhost:${PORT}                ║
╚══════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    io.close(() => {
        console.log('All connections closed');
        process.exit(0);
    });
});
