'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import PlayerHand from '@/components/PlayerHand';

export default function PlayerView() {
  const { gameState, isConnected, sendMessage } = useWebSocket();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [hasSurrendered, setHasSurrendered] = useState(false);
  const [showDealerCards, setShowDealerCards] = useState(false);

  const activePlayers = Object.entries(gameState.players)
    .filter(([_, player]) => player.active)
    .map(([playerId]) => playerId);

  const currentPlayer = selectedPlayer && gameState.players[selectedPlayer];
  
  // Reset states when game phase changes or cards are dealt
  useEffect(() => {
    if (gameState.game_phase === 'waiting') {
      setShowCards(false);
      setHasPlayed(false);
      setHasSurrendered(false);
      setShowDealerCards(false);
    }
  }, [gameState.game_phase]);
  
  // Handle play action
  const handlePlay = () => {
    setHasPlayed(true);
    setShowDealerCards(true); // Show dealer cards only when playing
    // You could send a message to the server here if needed
    // sendMessage({ action: "player_played", player: selectedPlayer });
  };
  
  // Handle surrender action
  const handleSurrender = () => {
    setHasSurrendered(true);
    // Keep dealer cards hidden when surrendering
    // You could send a message to the server here if needed
    // sendMessage({ action: "player_surrendered", player: selectedPlayer });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">3 Patti Player View</h1>
          
          <div className="space-y-4">
            <div className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '🟢 Connected to server' : '🔴 Disconnected from server'}
            </div>

            <select
              value={selectedPlayer || ''}
              onChange={(e) => setSelectedPlayer(e.target.value || null)}
              className={`w-full p-2 border border-gray-300 rounded ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              <option value="">Select Player</option>
              {activePlayers.map((playerId) => (
                <option key={playerId} value={playerId}>
                  {playerId}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main>
          {selectedPlayer && currentPlayer ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-end space-x-2">
                  {!hasPlayed && !hasSurrendered && (
                    <button
                      onClick={() => setShowCards(!showCards)}
                      className={`px-4 py-2 rounded transition-colors duration-200 
                        ${showCards ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} 
                        text-white ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
                      disabled={!isConnected || isLoading || gameState.game_phase === 'waiting'}
                    >
                      {showCards ? 'Hide Cards' : 'Show Cards'}
                    </button>
                  )}
                  
                  {showCards && !hasPlayed && !hasSurrendered && (
                    <>
                      <button
                        onClick={handlePlay}
                        className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200"
                        disabled={!isConnected || isLoading}
                      >
                        Play
                      </button>
                      <button
                        onClick={handleSurrender}
                        className="px-4 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white transition-colors duration-200"
                        disabled={!isConnected || isLoading}
                      >
                        Surrender
                      </button>
                    </>
                  )}
                </div>

                {/* Dealer Hand - conditionally rendered */}
                {showDealerCards ? (
                  <PlayerHand
                    playerId="dealer"
                    hand={gameState.dealer_hand}
                    active={true}
                    result={null}
                    isDealer={true}
                    showCards={true}
                    combination={gameState.dealer_combination}
                    dealerQualifies={gameState.dealer_qualifies}
                  />
                ) : (
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-700">Dealer</h3>
                    </div>
                    <div className="flex justify-center space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-16 h-24 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                        >
                          ?
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <PlayerHand
                  playerId={selectedPlayer}
                  hand={currentPlayer.hand}
                  active={currentPlayer.active}
                  result={currentPlayer.result}
                  showCards={showCards}
                  combination={currentPlayer.combination}
                />
              </div>

              {hasPlayed && currentPlayer.result && (
                <div className={`p-4 rounded-lg text-center text-xl font-bold
                  ${currentPlayer.result === 'win' ? 'bg-green-100 text-green-800' :
                    currentPlayer.result === 'lose' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'}`}
                >
                  {currentPlayer.result === 'win' ? 'You Won!' :
                   currentPlayer.result === 'lose' ? 'You Lost' :
                   'Draw'}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              Please select a player to view their hand
            </div>
          )}
        </main>
      </div>
    </div>
  );
}