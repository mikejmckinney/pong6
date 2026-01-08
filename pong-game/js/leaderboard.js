/* =============================================
   NEON PONG - Leaderboard System
   ============================================= */

const Leaderboard = {
    // Storage keys
    STORAGE_KEY: 'neonPongLeaderboard',
    STATS_KEY: 'neonPongStats',

    // Data
    entries: [],
    playerStats: null,

    // Initialize
    init() {
        this.loadData();
        this.initPlayerStats();
        console.log('Leaderboard initialized');
    },

    // Initialize player stats
    initPlayerStats() {
        const defaultStats = {
            id: Utils.generateId(),
            name: this.generatePlayerName(),
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            totalPointsScored: 0,
            totalPointsConceded: 0,
            longestRally: 0,
            winStreak: 0,
            currentStreak: 0,
            bestWinStreak: 0,
            totalPlayTime: 0,
            lastPlayed: null,
            elo: 1000,
            achievements: []
        };

        const saved = Utils.storage.get(this.STATS_KEY);
        this.playerStats = saved ? { ...defaultStats, ...saved } : defaultStats;
    },

    // Generate random player name
    generatePlayerName() {
        const adjectives = ['Neon', 'Cyber', 'Retro', 'Pixel', 'Turbo', 'Hyper', 'Ultra', 'Mega', 'Super', 'Astro'];
        const nouns = ['Paddle', 'Player', 'Master', 'Champion', 'Warrior', 'Ninja', 'Legend', 'Ace', 'Pro', 'Star'];
        const adj = adjectives[Utils.random(0, adjectives.length - 1)];
        const noun = nouns[Utils.random(0, nouns.length - 1)];
        const num = Utils.random(1, 999);
        return `${adj}${noun}${num}`;
    },

    // Load data from storage
    loadData() {
        this.entries = Utils.storage.get(this.STORAGE_KEY, []);
    },

    // Save data to storage
    saveData() {
        Utils.storage.set(this.STORAGE_KEY, this.entries);
        Utils.storage.set(this.STATS_KEY, this.playerStats);
    },

    // Record game result
    recordGame(result) {
        const {
            isWin,
            playerScore,
            opponentScore,
            gameMode,
            difficulty,
            longestRally,
            gameTime,
            isOnline = false
        } = result;

        // Update stats
        this.playerStats.gamesPlayed++;
        this.playerStats.totalPointsScored += playerScore;
        this.playerStats.totalPointsConceded += opponentScore;
        this.playerStats.totalPlayTime += gameTime;
        this.playerStats.lastPlayed = Date.now();

        if (longestRally > this.playerStats.longestRally) {
            this.playerStats.longestRally = longestRally;
        }

        if (isWin) {
            this.playerStats.wins++;
            this.playerStats.currentStreak++;
            if (this.playerStats.currentStreak > this.playerStats.bestWinStreak) {
                this.playerStats.bestWinStreak = this.playerStats.currentStreak;
            }
        } else {
            this.playerStats.losses++;
            this.playerStats.currentStreak = 0;
        }

        // Update ELO (simplified)
        if (isOnline) {
            const expectedScore = 1 / (1 + Math.pow(10, (1000 - this.playerStats.elo) / 400));
            const actualScore = isWin ? 1 : 0;
            const kFactor = 32;
            this.playerStats.elo += Math.round(kFactor * (actualScore - expectedScore));
        }

        // Create leaderboard entry
        const entry = {
            id: Utils.generateId(),
            playerId: this.playerStats.id,
            playerName: this.playerStats.name,
            score: playerScore,
            opponentScore: opponentScore,
            gameMode: gameMode,
            difficulty: difficulty,
            longestRally: longestRally,
            gameTime: gameTime,
            isWin: isWin,
            timestamp: Date.now()
        };

        this.entries.push(entry);

        // Check for achievements
        this.checkAchievements(result);

        // Save
        this.saveData();

        return entry;
    },

    // Check and award achievements
    checkAchievements(result) {
        const achievements = [];

        // First win
        if (this.playerStats.wins === 1) {
            achievements.push({ id: 'first_win', name: 'First Victory', icon: '🏆' });
        }

        // Win streak achievements
        if (this.playerStats.currentStreak === 5) {
            achievements.push({ id: 'streak_5', name: 'Hot Streak', icon: '🔥' });
        }
        if (this.playerStats.currentStreak === 10) {
            achievements.push({ id: 'streak_10', name: 'Unstoppable', icon: '⚡' });
        }

        // Perfect game (11-0)
        if (result.isWin && result.opponentScore === 0) {
            achievements.push({ id: 'perfect', name: 'Perfect Game', icon: '✨' });
        }

        // Long rally
        if (result.longestRally >= 50) {
            achievements.push({ id: 'rally_50', name: 'Rally Master', icon: '🏸' });
        }

        // Games played milestones
        if (this.playerStats.gamesPlayed === 10) {
            achievements.push({ id: 'games_10', name: 'Getting Started', icon: '🎮' });
        }
        if (this.playerStats.gamesPlayed === 100) {
            achievements.push({ id: 'games_100', name: 'Veteran', icon: '🎖️' });
        }

        // Add new achievements
        achievements.forEach(achievement => {
            if (!this.playerStats.achievements.find(a => a.id === achievement.id)) {
                this.playerStats.achievements.push({
                    ...achievement,
                    unlockedAt: Date.now()
                });
            }
        });

        return achievements;
    },

    // Get leaderboard entries with filters
    getLeaderboard(options = {}) {
        const {
            gameMode = null,
            timeFilter = 'alltime', // 'alltime', 'monthly', 'weekly', 'daily'
            limit = 10,
            sortBy = 'wins' // 'wins', 'score', 'elo', 'rally'
        } = options;

        let filtered = [...this.entries];

        // Filter by game mode
        if (gameMode) {
            filtered = filtered.filter(e => e.gameMode === gameMode);
        }

        // Filter by time
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;
        switch (timeFilter) {
            case 'daily':
                filtered = filtered.filter(e => now - e.timestamp < day);
                break;
            case 'weekly':
                filtered = filtered.filter(e => now - e.timestamp < 7 * day);
                break;
            case 'monthly':
                filtered = filtered.filter(e => now - e.timestamp < 30 * day);
                break;
        }

        // Aggregate by player
        const playerMap = new Map();
        filtered.forEach(entry => {
            if (!playerMap.has(entry.playerId)) {
                playerMap.set(entry.playerId, {
                    playerId: entry.playerId,
                    playerName: entry.playerName,
                    wins: 0,
                    losses: 0,
                    totalScore: 0,
                    longestRally: 0,
                    gamesPlayed: 0
                });
            }
            const player = playerMap.get(entry.playerId);
            player.gamesPlayed++;
            player.totalScore += entry.score;
            if (entry.isWin) player.wins++;
            else player.losses++;
            if (entry.longestRally > player.longestRally) {
                player.longestRally = entry.longestRally;
            }
        });

        // Convert to array and sort
        let leaderboard = Array.from(playerMap.values());
        
        switch (sortBy) {
            case 'wins':
                leaderboard.sort((a, b) => b.wins - a.wins);
                break;
            case 'score':
                leaderboard.sort((a, b) => b.totalScore - a.totalScore);
                break;
            case 'rally':
                leaderboard.sort((a, b) => b.longestRally - a.longestRally);
                break;
        }

        // Add rank and limit
        return leaderboard.slice(0, limit).map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));
    },

    // Get player stats
    getPlayerStats() {
        const stats = this.playerStats;
        return {
            ...stats,
            winRate: stats.gamesPlayed > 0 
                ? Math.round((stats.wins / stats.gamesPlayed) * 100) 
                : 0,
            avgPointsPerGame: stats.gamesPlayed > 0
                ? Math.round(stats.totalPointsScored / stats.gamesPlayed * 10) / 10
                : 0
        };
    },

    // Get player rank
    getPlayerRank() {
        const leaderboard = this.getLeaderboard({ limit: 1000 });
        const playerEntry = leaderboard.find(e => e.playerId === this.playerStats.id);
        return playerEntry ? playerEntry.rank : null;
    },

    // Set player name
    setPlayerName(name) {
        const cleanName = name.trim().substring(0, 20);
        if (cleanName.length >= 3) {
            this.playerStats.name = cleanName;
            this.saveData();
            return true;
        }
        return false;
    },

    // Clear all data
    clearData() {
        this.entries = [];
        this.initPlayerStats();
        Utils.storage.remove(this.STORAGE_KEY);
        Utils.storage.remove(this.STATS_KEY);
    },

    // Export data
    exportData() {
        return JSON.stringify({
            entries: this.entries,
            playerStats: this.playerStats
        });
    },

    // Import data
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.entries) this.entries = data.entries;
            if (data.playerStats) this.playerStats = { ...this.playerStats, ...data.playerStats };
            this.saveData();
            return true;
        } catch (e) {
            console.error('Failed to import data:', e);
            return false;
        }
    },

    // Render leaderboard to DOM
    renderLeaderboard(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const leaderboard = this.getLeaderboard(options);
        
        if (leaderboard.length === 0) {
            container.innerHTML = '<p class="empty-message">No entries yet. Play some games!</p>';
            return;
        }

        container.innerHTML = leaderboard.map((entry, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            const isCurrentPlayer = entry.playerId === this.playerStats.id;
            
            return `
                <div class="leaderboard-item ${isCurrentPlayer ? 'current-player' : ''}">
                    <span class="leaderboard-rank ${rankClass}">#${entry.rank}</span>
                    <span class="leaderboard-name">${entry.playerName}</span>
                    <span class="leaderboard-score">${entry.wins}W</span>
                </div>
            `;
        }).join('');
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Leaderboard;
}
