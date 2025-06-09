'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import PlayerHand from '@/components/PlayerHand';
import CardSelector from '@/components/CardSelector';

export default function DealerView() {
  const { gameState, sendMessage, isConnected } = useWebSocket();
  const [isManualMode, setIsManualMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [lastUndoneAction, setLastUndoneAction] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Count active players
  const activePlayers = Object.values(gameState.players).filter(player => player.active).length;
  const canAddPlayer = activePlayers < 6;

  // Get list of inactive players
  const inactivePlayers = Object.entries(gameState.players)
    .filter(([_, player]) => !player.active)
    .map(([id]) => id);

  const handleModeChange = async (mode: 'automatic' | 'manual') => {
    if (!isConnected) return;
    setIsLoading(true);
    setIsManualMode(mode === 'manual');
    sendMessage({ action: mode === 'manual' ? 'start_manual' : 'start_automatic' });
    // Give some time for the server to process the mode change
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleAddPlayer = () => {
    if (!canAddPlayer) {
      setErrorMessage("Maximum of 6 players allowed");
      return;
    }

    if (playerNumber.trim()) {
      const num = parseInt(playerNumber.trim());
      if (num < 1 || num > 6) {
        setErrorMessage("Player number must be between 1 and 6");
        return;
      }
      const playerId = `player${num}`;
      if (!gameState.players[playerId].active) {
        sendMessage({ action: 'add_player', player: playerId });
        setPlayerNumber(''); // Clear input after adding
      } else {
        setErrorMessage(`${playerId} is already active`);
      }
    } else {
      // Add first inactive player
      if (inactivePlayers.length > 0) {
        sendMessage({ action: 'add_player', player: inactivePlayers[0] });
      }
    }
    setErrorMessage(null);
  };

  const handleRemovePlayer = (playerId: string) => {
    sendMessage({ action: 'remove_player', player: playerId });
  };

  const handleAddCard = (target: string) => {
    setSelectedPlayer(target);
  };

  const handleCardSelect = (card: string) => {
    if (selectedPlayer) {
      sendMessage({
        action: 'add_card',
        card,
        target: selectedPlayer
      });
      setSelectedPlayer(null);
    }
  };

  const handleRevealHands = () => {
    sendMessage({ action: 'reveal_hands' });
  };

  const handleResetTable = () => {
    sendMessage({ action: 'reset_table' });
  };

  const handleUndo = () => {
    let action = '';
    if (gameState.game_phase === 'revealed') {
      action = 'Undoing hand reveal';
    } else if (gameState.game_phase === 'dealing') {
      action = 'Undoing card deal';
    } else {
      action = 'Undoing last action';
    }
    setLastUndoneAction(action);
    sendMessage({ action: 'undo_last' });
    setTimeout(() => setLastUndoneAction(null), 2000); // Clear message after 3 seconds
  };

  // Handle WebSocket messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === 'error') {
          setErrorMessage(data.message);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    const ws = new WebSocket('ws://localhost:6789');
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, []);

  // Clear error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">3 Patti Dealer View</h1>
            <div className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '🟢 Connected to server' : '🔴 Disconnected from server'}
            </div>
          </div>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => handleModeChange('automatic')}
              className={`px-4 py-2 rounded transition-colors duration-200 ${!isManualMode ? 'bg-blue-600 text-white' : 'bg-gray-200'} ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              {isLoading && !isManualMode ? 'Switching...' : 'Automatic Mode'}
            </button>
            <button
              onClick={() => handleModeChange('manual')}
              className={`px-4 py-2 rounded transition-colors duration-200 ${isManualMode ? 'bg-blue-600 text-white' : 'bg-gray-200'} ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              {isLoading && isManualMode ? 'Switching...' : 'Manual Mode'}
            </button>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <select
                value={playerNumber}
                onChange={(e) => {
                  setPlayerNumber(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!canAddPlayer}
              >
                <option value="">Select Player</option>
                {inactivePlayers.map(playerId => (
                  <option key={playerId} value={playerId.replace('player', '')}>
                    {playerId}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddPlayer}
                className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 
                  ${(!isConnected || isLoading || !canAddPlayer) && 'opacity-50 cursor-not-allowed'}`}
                disabled={!isConnected || isLoading || !canAddPlayer}
              >
                Activate Player {playerNumber ? playerNumber : ''}
              </button>
              {!canAddPlayer && (
                <span className="text-sm text-red-500">(Max 6 players)</span>
              )}
            </div>
            <button
              onClick={handleRevealHands}
              className={`px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors duration-200 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              Reveal Hands
            </button>
            <button
              onClick={handleUndo}
              className={`px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors duration-200 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              Undo Last
            </button>
            <button
              onClick={handleResetTable}
              className={`px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors duration-200 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              Reset Game
            </button>
            <button
              onClick={() => sendMessage({ action: 'clear_records' })}
              className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              Clear All Records
            </button>
          </div>
          {lastUndoneAction && (
            <div className="mt-4 p-2 bg-blue-100 text-blue-800 rounded text-sm">
              {lastUndoneAction}...
            </div>
          )}
          {errorMessage && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">
              {errorMessage}
            </div>
          )}
        </header>

        <main>
          <div className="mb-8">
            <PlayerHand
              playerId="dealer"
              hand={gameState.dealer_hand}
              active={true}
              result={null}
              isDealer={true}
              showCards={true}
              onAddCard={isManualMode ? handleAddCard : undefined}
              combination={gameState.dealer_combination}
              dealerQualifies={gameState.dealer_qualifies}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(gameState.players).map(([playerId, player]) => (
              <div key={playerId} className="relative">
                <PlayerHand
                  playerId={playerId}
                  hand={player.hand}
                  active={player.active}
                  result={player.result}
                  showCards={gameState.game_phase === 'revealed'}
                  onAddCard={isManualMode ? handleAddCard : undefined}
                  combination={player.combination}
                />
                {player.active && (
                  <button
                    onClick={() => handleRemovePlayer(playerId)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {isManualMode && selectedPlayer && (
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
              <CardSelector onCardSelect={handleCardSelect} />
            </div>
          )}
        </main>

        <div className="fixed bottom-4 right-4">
          <a
            href="/player"
            target="_blank"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Open Player View
          </a>
        </div>
      </div>
    </div>
  );
}