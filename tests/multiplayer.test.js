/**
 * Multiplayer Module Tests
 * Tests for online multiplayer synchronization
 */

// Mock socket.io
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  once: jest.fn(),
  disconnect: jest.fn()
};

const mockIo = jest.fn(() => mockSocket);
global.io = mockIo;

// Load the Multiplayer module
const Multiplayer = require('../js/multiplayer.js');

describe('Multiplayer Module', () => {
  beforeEach(() => {
    // Reset Multiplayer state
    Multiplayer.socket = null;
    Multiplayer.connected = false;
    Multiplayer.connecting = false;
    Multiplayer.roomCode = null;
    Multiplayer.playerNumber = 0;
    Multiplayer.isHost = false;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('init()', () => {
    test('should initialize with server URL', () => {
      Multiplayer.init('ws://test-server:3000');
      expect(Multiplayer.serverUrl).toBe('ws://test-server:3000');
    });

    test('should generate player ID if not stored', () => {
      Utils.storage.get.mockReturnValue(null);
      Multiplayer.init('ws://test-server:3000');
      expect(Multiplayer.playerId).toBeDefined();
      expect(Utils.storage.set).toHaveBeenCalledWith('playerId', expect.any(String));
    });

    test('should use stored player ID if available', () => {
      Utils.storage.get.mockReturnValue('existing-player-id');
      Multiplayer.init('ws://test-server:3000');
      expect(Multiplayer.playerId).toBe('existing-player-id');
    });
  });

  describe('getStatus()', () => {
    test('should return connection status', () => {
      Multiplayer.connected = true;
      Multiplayer.roomCode = 'ABC123';
      Multiplayer.playerNumber = 1;
      Multiplayer.isHost = true;
      Multiplayer.latency = 50;

      const status = Multiplayer.getStatus();

      expect(status).toEqual({
        connected: true,
        connecting: false,
        roomCode: 'ABC123',
        playerNumber: 1,
        isHost: true,
        latency: 50
      });
    });
  });

  describe('sendPaddleUpdate()', () => {
    test('should not send if not connected', () => {
      Multiplayer.socket = null;
      Multiplayer.sendPaddleUpdate(100, 5);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('should not send if not in a room', () => {
      Multiplayer.socket = mockSocket;
      Multiplayer.roomCode = null;
      Multiplayer.sendPaddleUpdate(100, 5);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('should send paddle update with correct data', () => {
      Multiplayer.socket = mockSocket;
      Multiplayer.roomCode = 'ABC123';
      Multiplayer.playerNumber = 1;

      Multiplayer.sendPaddleUpdate(100, 5);

      expect(mockSocket.emit).toHaveBeenCalledWith('paddleUpdate', {
        roomCode: 'ABC123',
        playerNumber: 1,
        y: 100,
        velocity: 5,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('sendGameState()', () => {
    test('should not send if not host', () => {
      Multiplayer.socket = mockSocket;
      Multiplayer.roomCode = 'ABC123';
      Multiplayer.isHost = false;

      Multiplayer.sendGameState({ ball: { x: 100, y: 200 } });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('should send game state when host', () => {
      Multiplayer.socket = mockSocket;
      Multiplayer.roomCode = 'ABC123';
      Multiplayer.isHost = true;

      const state = { ball: { x: 100, y: 200 } };
      Multiplayer.sendGameState(state);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameState', {
        roomCode: 'ABC123',
        state: state,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('sendGameOver()', () => {
    test('should not send if not host', () => {
      Multiplayer.socket = mockSocket;
      Multiplayer.roomCode = 'ABC123';
      Multiplayer.isHost = false;

      Multiplayer.sendGameOver({ winner: 1 });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    test('should send game over when host', () => {
      Multiplayer.socket = mockSocket;
      Multiplayer.roomCode = 'ABC123';
      Multiplayer.isHost = true;

      const data = { 
        winner: 1, 
        score: { player1: 11, player2: 5 },
        stats: { longestRally: 10, gameTime: 120 }
      };
      Multiplayer.sendGameOver(data);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameOver', {
        roomCode: 'ABC123',
        ...data
      });
    });
  });

  describe('Callback registration', () => {
    test('should register callbacks correctly', () => {
      const callback = jest.fn();
      Multiplayer.on('connect', callback);
      
      expect(Multiplayer.callbacks.onConnect).toBe(callback);
    });

    test('should register gameOver callback', () => {
      const callback = jest.fn();
      Multiplayer.on('gameOver', callback);
      
      expect(Multiplayer.callbacks.onGameOver).toBe(callback);
    });

    test('should register matchFound callback', () => {
      const callback = jest.fn();
      Multiplayer.on('matchFound', callback);
      
      expect(Multiplayer.callbacks.onMatchFound).toBe(callback);
    });
  });
});
