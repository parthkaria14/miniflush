'use client';

import React, { useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import PlayerHand from '@/components/PlayerHand';
import CardSelector from '@/components/CardSelector';

export default function DealerView() {
  const { gameState, sendMessage, isConnected } = useWebSocket();
  const [isManualMode, setIsManualMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [lastUndoneAction, setLastUndoneAction] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleModeChange = async (mode: 'automatic' | 'manual') => {
    if (!isConnected) return;
    setIsLoading(true);
    setIsManualMode(mode === 'manual');
    sendMessage({ action: mode === 'manual' ? 'start_manual' : 'start_automatic' });
    // Give some time for the server to process the mode change
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleAddPlayer = () => {
    sendMessage({ action: 'add_player' });
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
    setTimeout(() => setLastUndoneAction(null), 3000); // Clear message after 3 seconds
  };

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
            <button
              onClick={handleAddPlayer}
              className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              Add Player
            </button>
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
              className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              Reset Table
            </button>
          </div>
          {lastUndoneAction && (
            <div className="mt-4 p-2 bg-blue-100 text-blue-800 rounded text-sm">
              {lastUndoneAction}...
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