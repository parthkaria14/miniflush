'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import PlayerHand from '@/components/PlayerHand';
import Notification from '@/components/Notification';
import Client_Navbar from '@/components/Client_NavBar';

interface Player {
  hand: string[];
  active: boolean;
  result: string | null;
  has_acted: boolean;
  action_type: 'play' | 'surrender' | null;
  high_combination?: string;
  low_combination?: string;
  main_bet_result?: string;
  high_bet_result?: string;
  low_bet_result?: string;
  high_payout?: number;
  low_payout?: number;
  main_payout?: number;
}

export default function PlayerView() {
  const { gameState, sendMessage, isConnected } = useWebSocket();
  const [hasSurrendered, setHasSurrendered] = useState(false);
  const [showDealerCards, setShowDealerCards] = useState(false);
  const [showPlayerCards, setShowPlayerCards] = useState(false);
  const [playerActions, setPlayerActions] = useState<Set<string>>(new Set());
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Get current player ID from URL
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const playerId = pathParts[pathParts.length - 1];
    setCurrentPlayerId(playerId);
    console.log(`PlayerView: Current Player ID from URL: ${playerId}`); // Debug log
  }, []);

  // Reset states when game phase changes or cards are dealt
  useEffect(() => {
    if (gameState.game_phase === 'waiting' || gameState.game_phase === 'dealing') {
      setHasSurrendered(false);
      setShowDealerCards(false);
      setShowPlayerCards(false);
      setPlayerActions(new Set());
      console.log(`PlayerView: Resetting states for game phase: ${gameState.game_phase}`); // Debug log
    }
  }, [gameState.game_phase]);

  // Update player actions and dealer cards visibility based on game state
  useEffect(() => {
    if (!gameState.players || !currentPlayerId) {
      console.log('PlayerView: gameState.players or currentPlayerId is missing.', { gameState, currentPlayerId }); // Debug log
      return;
    }

    console.log('PlayerView: gameState updated.', gameState); // Debug log for gameState updates

    // Track which players have acted
    const newPlayerActions = new Set<string>();
    Object.entries(gameState.players).forEach(([playerId, player]) => {
      if (player.has_acted) {
        newPlayerActions.add(playerId);
      }
    });
    setPlayerActions(newPlayerActions);

    // Only show dealer cards when the game phase is 'revealed'
    setShowDealerCards(gameState.game_phase === 'revealed');

    // If cards are added manually and we're in dealing phase, keep player cards hidden
    // unless the player has explicitly chosen to show them
    if (gameState.game_phase === 'dealing' && currentPlayer && currentPlayer.hand && currentPlayer.hand.length > 0) {
      // Don't reset showPlayerCards here, let the player control visibility
      console.log('PlayerView: Cards present in dealing phase, showPlayerCards:', showPlayerCards);
    }

    console.log(`PlayerView: showDealerCards set to: ${gameState.game_phase === 'revealed'}`); // Debug log
    console.log(`PlayerView: Current Player State:`, currentPlayer); // Debug log
    console.log(`PlayerView: Current Player Hand:`, currentPlayer?.hand); // Debug log

  }, [gameState, currentPlayerId, showPlayerCards]);

  // Reset states when game phase changes
  useEffect(() => {
    if (gameState.game_phase === 'waiting') {
      setHasSurrendered(false);
      setShowDealerCards(false);
      setShowPlayerCards(false);
      setPlayerActions(new Set());
      console.log(`PlayerView: Resetting states for game phase: ${gameState.game_phase}`); // Debug log
    } else if (gameState.game_phase === 'dealing') {
      // In dealing phase, only reset dealer cards visibility
      setShowDealerCards(false);
      setPlayerActions(new Set());
      console.log(`PlayerView: Resetting dealer cards for dealing phase`); // Debug log
    }
  }, [gameState.game_phase]);

  // Handle play action
  const handlePlay = () => {
    if (!currentPlayerId) return;
    sendMessage({
      action: 'player_played',
      player: currentPlayerId
    });
  };

  // Handle surrender action
  const handleSurrender = () => {
    if (!currentPlayerId) return;
    sendMessage({
      action: 'player_surrendered',
      player: currentPlayerId
    });
    setHasSurrendered(true);
  };

  // Get current player's state
  const currentPlayer = currentPlayerId ? gameState.players[currentPlayerId] as Player : null;
  const isCurrentPlayerActive = currentPlayer?.active ?? false;
  const hasCurrentPlayerActed = currentPlayer?.has_acted ?? false;
  const hasCurrentPlayerSurrendered = currentPlayer?.action_type === 'surrender';

  // Debug logging for player states
  useEffect(() => {
    if (currentPlayerId) {
      console.log('Player Debug Info:', {
        playerId: currentPlayerId,
        isConnected,
        isCurrentPlayerActive,
        hasCurrentPlayerActed,
        hasCurrentPlayerSurrendered,
        gamePhase: gameState?.game_phase,
        playerState: currentPlayer,
        allPlayers: gameState?.players
      });
    }
  }, [currentPlayerId, isConnected, isCurrentPlayerActive, hasCurrentPlayerActed, hasCurrentPlayerSurrendered, gameState]);

  // Get active players who haven't acted yet
  const waitingPlayers = Object.entries(gameState.players)
    .filter(([_, player]) => (player as Player).active && !(player as Player).has_acted && (player as Player).action_type !== 'surrender')
    .map(([id]) => id);

  return (
    <div className="min-h-screen bg-[#450A03] }">
      <Client_Navbar/>
      <div className="m-12 poko p-8 bg-[#911606] flex justify-center" style={{ border: '10px solid #D6AB5D' }}>
        <div className="mx-auto">
          {/* Connection Status */}
          <div className="mb-4">
            {/* <div className={`inline-block px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div> */}
          </div>

          {/* Game Phase */}
          <div className="mb-4 text-center">
            <span className="inline-block px-4 py-2 bg-[#741003] text-white text-2xl rounded-lg">
              {gameState?.game_phase ? 
                gameState.game_phase.charAt(0).toUpperCase() + gameState.game_phase.slice(1) : 
                'Waiting for game state...'}
            </span>
          </div>

          {/* Dealer's Hand */}
          <div className="mb-8">
            {/* <h2 className="text-xl font-bold mb-2">Dealer's Hand</h2> */}
            <PlayerHand
              playerId="dealer"
              hand={gameState.dealer_hand}
              active={true}
              result={null}
              isDealer={true}
              showCards={showDealerCards}
              highCombination={showDealerCards ? gameState.dealer_combination : undefined}
              dealerQualifies={gameState.dealer_qualifies}
            />
          </div>

          {/* Current Player's Hand or Debug Message */}
          {currentPlayer ? (
            <div className="mb-8">
              <div className="flex justify-end items-center mb-2">
                {/* <h2 className="text-xl font-bold">Your Hand</h2> */}
                <div className="flex flex-row items-end gap-2">
                  {/* <div className="text-sm text-gray-600">
                    Status: {isCurrentPlayerActive ? 'Active' : 'Inactive'} | 
                    {hasCurrentPlayerActed ? ' Acted' : ' Not Acted'} | 
                    {hasCurrentPlayerSurrendered ? ' Surrendered' : ' Not Surrendered'}
                  </div> */}
                  <div>&nbsp;</div>
                  <button
                    onClick={() => setShowPlayerCards(!showPlayerCards)}
                    className={`px-4 py-2 mb-4 rounded transition-colors duration-200 
                      ${showPlayerCards ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} 
                      text-white ${(!isConnected || !isCurrentPlayerActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!isConnected || !isCurrentPlayerActive}
                  >
                    {showPlayerCards ? 'Hide Cards' : 'Show Cards'}
                  </button>
                </div>
              </div>
              <PlayerHand
                playerId={currentPlayerId || ''}
                hand={currentPlayer.hand}
                active={isCurrentPlayerActive}
                result={currentPlayer.result}
                showCards={showPlayerCards || gameState.game_phase === 'revealed'}
                highCombination={currentPlayer.high_combination}
                lowCombination={currentPlayer.low_combination}
                mainBetResult={currentPlayer.main_bet_result}
                has_acted={currentPlayer.has_acted}
                action_type={currentPlayer.action_type || undefined}
              />
              {!isCurrentPlayerActive && (
                <div className="text-center text-red-600 mt-2">
                  You are not active in this game. (Player ID: {currentPlayerId})
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 text-center text-red-600">
              Player not found. (Player ID: {currentPlayerId})<br />
              Please check the URL or ask the dealer to activate your player.
            </div>
          )}

          {/* Player Actions */}
          {currentPlayer && (
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={handlePlay}
                className={`px-6 py-2 bg-green-500 text-white rounded-lg transition-colors
                  ${isCurrentPlayerActive && !hasCurrentPlayerActed && currentPlayer.hand.length > 0 ? 'hover:bg-green-600' : 'opacity-50 cursor-not-allowed'}`}
                disabled={!isCurrentPlayerActive || hasCurrentPlayerActed || currentPlayer.hand.length === 0}
              >
                Play
              </button>
              <button
                onClick={handleSurrender}
                className={`px-6 py-2 bg-red-500 text-white rounded-lg transition-colors
                  ${isCurrentPlayerActive && !hasCurrentPlayerActed && currentPlayer.hand.length > 0 ? 'hover:bg-red-600' : 'opacity-50 cursor-not-allowed'}`}
                disabled={!isCurrentPlayerActive || hasCurrentPlayerActed || currentPlayer.hand.length === 0}
              >
                Surrender
              </button>
            </div>
          )}

          {/* Waiting Message */}
          {waitingPlayers.length > 0 && (
            <div className="text-center text-black mb-4">
              Waiting for {waitingPlayers.length} player{waitingPlayers.length > 1 ? 's' : ''} to act...
            </div>
          )}

          {/* Game Results */}
          {gameState.game_phase === 'complete' && currentPlayer && (
            <div className="mt-8 p-4 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Game Results</h3>
              {currentPlayer.main_payout !== undefined && (
                <div className="mb-2">
                  Main Bet: {currentPlayer.main_payout > 0 ? 'Won' : 'Lost'} ${Math.abs(currentPlayer.main_payout)}
                </div>
              )}
              {(currentPlayer.high_payout !== undefined || currentPlayer.low_payout !== undefined) && (
                <div>
                  Side Bets:
                  {currentPlayer.high_payout !== undefined && (
                    <div>High: {currentPlayer.high_payout > 0 ? 'Won' : 'Lost'} ${Math.abs(currentPlayer.high_payout)}</div>
                  )}
                  {currentPlayer.low_payout !== undefined && (
                    <div>Low: {currentPlayer.low_payout > 0 ? 'Won' : 'Lost'} ${Math.abs(currentPlayer.low_payout)}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}