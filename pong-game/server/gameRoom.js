/* =============================================
   NEON PONG - Game Room Class
   Manages individual game sessions
   ============================================= */

class GameRoom {
    constructor(roomCode, settings = {}) {
        this.roomCode = roomCode;
        this.settings = {
            pointsToWin: settings.pointsToWin || 11,
            gameMode: settings.gameMode || 'classic',
            ...settings
        };
        
        this.players = {
            1: null,
            2: null
        };
        
        this.state = 'waiting'; // waiting, countdown, playing, paused, finished
        this.score = { player1: 0, player2: 0 };
        this.gameStartTime = null;
        this.lastUpdateTime = null;
        this.stats = {
            longestRally: 0,
            totalRallies: 0
        };
        
        this.createdAt = Date.now();
    }

    // Add player to room
    addPlayer(player, playerNumber) {
        if (playerNumber === 1 || playerNumber === 2) {
            this.players[playerNumber] = {
                id: player.id,
                name: player.name,
                socketId: player.socketId,
                isReady: false,
                score: 0
            };
            return true;
        }
        return false;
    }

    // Remove player from room
    removePlayer(playerId) {
        if (this.players[1] && this.players[1].id === playerId) {
            this.players[1] = null;
        } else if (this.players[2] && this.players[2].id === playerId) {
            this.players[2] = null;
        }
        
        // End game if someone leaves during play
        if (this.state === 'playing') {
            this.state = 'finished';
        }
    }

    // Get opponent info
    getOpponentInfo(playerId) {
        if (this.players[1] && this.players[1].id !== playerId) {
            return { id: this.players[1].id, name: this.players[1].name };
        }
        if (this.players[2] && this.players[2].id !== playerId) {
            return { id: this.players[2].id, name: this.players[2].name };
        }
        return null;
    }

    // Set player ready status
    setPlayerReady(playerId, ready) {
        if (this.players[1] && this.players[1].id === playerId) {
            this.players[1].isReady = ready;
        } else if (this.players[2] && this.players[2].id === playerId) {
            this.players[2].isReady = ready;
        }
    }

    // Check if all players are ready
    allPlayersReady() {
        return this.players[1] && this.players[2] &&
               this.players[1].isReady && this.players[2].isReady;
    }

    // Check if room is full
    isFull() {
        return this.players[1] !== null && this.players[2] !== null;
    }

    // Check if room is empty
    isEmpty() {
        return this.players[1] === null && this.players[2] === null;
    }

    // Start the game
    startGame() {
        this.state = 'playing';
        this.gameStartTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.score = { player1: 0, player2: 0 };
    }

    // Update score
    updateScore(playerNumber, points = 1) {
        if (playerNumber === 1) {
            this.score.player1 += points;
        } else if (playerNumber === 2) {
            this.score.player2 += points;
        }
        
        // Check for winner
        if (this.score.player1 >= this.settings.pointsToWin ||
            this.score.player2 >= this.settings.pointsToWin) {
            this.state = 'finished';
        }
        
        return this.score;
    }

    // Update rally stats
    updateRally(rallyLength) {
        this.stats.totalRallies++;
        if (rallyLength > this.stats.longestRally) {
            this.stats.longestRally = rallyLength;
        }
    }

    // End the game
    endGame(result) {
        this.state = 'finished';
        this.endTime = Date.now();
        this.result = result;
    }

    // Get room status
    getStatus() {
        return {
            roomCode: this.roomCode,
            state: this.state,
            players: {
                1: this.players[1] ? {
                    id: this.players[1].id,
                    name: this.players[1].name,
                    isReady: this.players[1].isReady
                } : null,
                2: this.players[2] ? {
                    id: this.players[2].id,
                    name: this.players[2].name,
                    isReady: this.players[2].isReady
                } : null
            },
            score: this.score,
            settings: this.settings,
            stats: this.stats,
            gameTime: this.gameStartTime ? Date.now() - this.gameStartTime : 0
        };
    }

    // Serialize room for network
    serialize() {
        return {
            roomCode: this.roomCode,
            settings: this.settings,
            state: this.state,
            score: this.score,
            players: this.players,
            stats: this.stats
        };
    }
}

module.exports = GameRoom;
