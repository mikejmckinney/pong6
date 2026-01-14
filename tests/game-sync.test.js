/**
 * Game Synchronization Tests
 * Tests for online multiplayer game state synchronization
 */

// Create mock Multiplayer before loading Game
global.Multiplayer = {
  init: jest.fn(),
  connect: jest.fn(() => Promise.resolve()),
  connected: false,
  isHost: false,
  playerNumber: 0,
  sendPaddleUpdate: jest.fn(),
  sendGameState: jest.fn(),
  sendGameOver: jest.fn(),
  sendReady: jest.fn(),
  on: jest.fn(),
  getStatus: jest.fn(() => ({ connected: false })),
  callbacks: {}
};

// Load the Game module
const Game = require('../js/game.js');

describe('Game Multiplayer Sync', () => {
  beforeEach(() => {
    // Reset Game state
    Game.state = 'menu';
    Game.mode = 'single';
    Game.score = { player1: 0, player2: 0 };
    Game.pointsToWin = 11;
    Game.ball = { x: 400, y: 300, vx: 200, vy: 100, speed: 400, radius: 10 };
    Game.paddle1 = { x: 20, y: 250, width: 15, height: 100, baseHeight: 100 };
    Game.paddle2 = { x: 765, y: 250, width: 15, height: 100, baseHeight: 100 };
    
    // Reset Multiplayer mock state
    Multiplayer.connected = false;
    Multiplayer.isHost = false;
    Multiplayer.playerNumber = 0;
    
    jest.clearAllMocks();
  });

  describe('handleGameStateUpdate()', () => {
    beforeEach(() => {
      Game.state = 'playing';
      Game.mode = 'online';
      Multiplayer.isHost = false;
      Multiplayer.playerNumber = 2;
    });

    test('should update ball position from host', () => {
      const data = {
        ball: { x: 500, y: 350, vx: -200, vy: 150, speed: 450, radius: 10 }
      };

      Game.handleGameStateUpdate(data);

      expect(Game.ball.x).toBe(500);
      expect(Game.ball.y).toBe(350);
      expect(Game.ball.vx).toBe(-200);
      expect(Game.ball.vy).toBe(150);
      expect(Game.ball.speed).toBe(450);
    });

    test('should update host paddle position for player 1 host', () => {
      const data = {
        hostPaddle: { y: 150 },
        hostPlayerNumber: 1
      };

      Game.handleGameStateUpdate(data);

      expect(Game.paddle1.y).toBe(150);
    });

    test('should update paddle2 when host is player 2', () => {
      const data = {
        hostPaddle: { y: 175 },
        hostPlayerNumber: 2
      };

      Game.handleGameStateUpdate(data);

      expect(Game.paddle2.y).toBe(175);
    });

    test('should update and display scores when changed', () => {
      Game.score = { player1: 0, player2: 0 };
      const data = {
        score: { player1: 3, player2: 2 }
      };

      Game.handleGameStateUpdate(data);

      expect(Game.score.player1).toBe(3);
      expect(Game.score.player2).toBe(2);
      expect(AudioManager.playScore).toHaveBeenCalled();
    });

    test('should not play score sound when scores unchanged', () => {
      Game.score = { player1: 3, player2: 2 };
      const data = {
        score: { player1: 3, player2: 2 }
      };

      Game.handleGameStateUpdate(data);

      expect(AudioManager.playScore).not.toHaveBeenCalled();
    });

    test('should not update if host', () => {
      Multiplayer.isHost = true;
      const originalBallX = Game.ball.x;
      
      Game.handleGameStateUpdate({
        ball: { x: 999, y: 999, vx: 999, vy: 999 }
      });

      expect(Game.ball.x).toBe(originalBallX);
    });

    test('should not update if not playing', () => {
      Game.state = 'menu';
      const originalBallX = Game.ball.x;
      
      Game.handleGameStateUpdate({
        ball: { x: 999, y: 999, vx: 999, vy: 999 }
      });

      expect(Game.ball.x).toBe(originalBallX);
    });
  });

  describe('handleOnlineGameOver()', () => {
    beforeEach(() => {
      Game.mode = 'online';
      Game.state = 'playing';
      Multiplayer.playerNumber = 2;
      Multiplayer.isHost = false; // Client receives game over from host
    });

    test('should update scores from game over data', () => {
      const data = {
        score: { player1: 11, player2: 8 },
        stats: { longestRally: 15, gameTime: 180 }
      };

      // Mock endGame to prevent full execution
      const originalEndGame = Game.endGame;
      Game.endGame = jest.fn();

      Game.handleOnlineGameOver(data);

      expect(Game.score.player1).toBe(11);
      expect(Game.score.player2).toBe(8);
      expect(Game.stats.longestRally).toBe(15);
      expect(Game.stats.gameTime).toBe(180);
      expect(Game.endGame).toHaveBeenCalled();

      Game.endGame = originalEndGame;
    });

    test('should not process if not in online mode', () => {
      Game.mode = 'single';
      const originalScore = { ...Game.score };
      
      Game.handleOnlineGameOver({
        score: { player1: 11, player2: 8 }
      });

      expect(Game.score).toEqual(originalScore);
    });

    test('should not process if host (prevents feedback loop)', () => {
      Multiplayer.isHost = true;
      const originalScore = { ...Game.score };
      
      Game.handleOnlineGameOver({
        score: { player1: 11, player2: 8 }
      });

      expect(Game.score).toEqual(originalScore);
    });

    test('should not process if not playing', () => {
      Game.state = 'menu';
      const originalScore = { ...Game.score };
      
      Game.handleOnlineGameOver({
        score: { player1: 11, player2: 8 }
      });

      expect(Game.score).toEqual(originalScore);
    });
  });

  describe('sendGameState()', () => {
    test('should include all ball properties and hostPlayerNumber', () => {
      Game.ball = { x: 400, y: 300, vx: 200, vy: 100, speed: 450, radius: 12 };
      Game.score = { player1: 5, player2: 3 };
      Game.paddle1 = { y: 200 };
      Game.paddle2 = { y: 250 };
      Multiplayer.playerNumber = 1;

      Game.sendGameState();

      expect(Multiplayer.sendGameState).toHaveBeenCalledWith({
        ball: {
          x: 400,
          y: 300,
          vx: 200,
          vy: 100,
          speed: 450,
          radius: 12
        },
        score: { player1: 5, player2: 3 },
        powerUps: [],
        hostPaddle: { y: 200 },
        hostPlayerNumber: 1
      });
    });

    test('should send paddle2 when host is player 2', () => {
      Game.ball = { x: 400, y: 300, vx: 200, vy: 100, speed: 450, radius: 12 };
      Game.score = { player1: 5, player2: 3 };
      Game.paddle1 = { y: 200 };
      Game.paddle2 = { y: 350 };
      Multiplayer.playerNumber = 2;

      Game.sendGameState();

      expect(Multiplayer.sendGameState).toHaveBeenCalledWith({
        ball: {
          x: 400,
          y: 300,
          vx: 200,
          vy: 100,
          speed: 450,
          radius: 12
        },
        score: { player1: 5, player2: 3 },
        powerUps: [],
        hostPaddle: { y: 350 },
        hostPlayerNumber: 2
      });
    });
  });

  describe('endGame() with online mode', () => {
    beforeEach(() => {
      Game.mode = 'online';
      Game.state = 'playing';
      Game.score = { player1: 11, player2: 5 };
      Game.pointsToWin = 11;
      Game.stats = { longestRally: 10, gameTime: 120 };
      Multiplayer.isHost = true;
      Multiplayer.connected = true;
    });

    test('should send game over to client when host', () => {
      Game.endGame();

      expect(Multiplayer.sendGameOver).toHaveBeenCalledWith({
        winner: 1,
        score: { player1: 11, player2: 5 },
        stats: { longestRally: 10, gameTime: 120 }
      });
    });

    test('should not send game over when not host', () => {
      Multiplayer.isHost = false;

      Game.endGame();

      expect(Multiplayer.sendGameOver).not.toHaveBeenCalled();
    });

    test('should show correct winner text for online player 1', () => {
      Multiplayer.playerNumber = 1;
      Game.endGame();

      const winnerText = document.getElementById('winner-text');
      expect(winnerText.textContent).toBe('YOU WIN!');
    });

    test('should show correct winner text for online player 2 when they lose', () => {
      Multiplayer.playerNumber = 2;
      Multiplayer.isHost = false;
      Game.endGame();

      const winnerText = document.getElementById('winner-text');
      expect(winnerText.textContent).toBe('OPPONENT WINS!');
    });
  });

  describe('handleMatchFound()', () => {
    test('should show toast and send ready signal', () => {
      const data = {
        roomCode: 'ABC123',
        playerNumber: 2,
        opponent: { name: 'TestPlayer' }
      };

      // Mock showToast
      Game.showToast = jest.fn();

      Game.handleMatchFound(data);

      expect(Game.showToast).toHaveBeenCalledWith(
        'Match found! Playing against TestPlayer',
        'success'
      );
      expect(Multiplayer.sendReady).toHaveBeenCalled();
    });

    test('should handle missing opponent name', () => {
      const data = {
        roomCode: 'ABC123',
        playerNumber: 2
      };

      Game.showToast = jest.fn();
      Game.handleMatchFound(data);

      expect(Game.showToast).toHaveBeenCalledWith(
        'Match found! Playing against opponent',
        'success'
      );
    });
  });
});
