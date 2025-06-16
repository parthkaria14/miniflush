'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import PlayerHand from '@/components/PlayerHand';
import CardSelector from '@/components/CardSelector';
import Notification from '@/components/Notification';
import ControlPanelPopup from '@/components/ControlPanelPopup';
import Navbar from '@/components/Header';

export default function DealerView() {
  const { gameState, sendMessage, isConnected, notifications, removeNotification } = useWebSocket();
  const [isManualMode, setIsManualMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [lastUndoneAction, setLastUndoneAction] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDealerCards, setShowDealerCards] = useState(false);
  const [nextPlayerToDeal, setNextPlayerToDeal] = useState<string | null>(null);
  const [showCardDealingBox, setShowCardDealingBox] = useState(true);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

  // Count active players and check if all have acted
  const activePlayers = Object.entries(gameState.players)
    .filter(([_, player]) => player.active)
    .map(([id]) => id);
  const allPlayersActed = activePlayers.length > 0 && activePlayers.every(player => gameState.players[player].has_acted);
  const canAddPlayer = activePlayers.length < 6;

  // Get list of inactive players
  const inactivePlayers = Object.entries(gameState.players)
    .filter(([_, player]) => !player.active)
    .map(([id]) => id);

  // Update next player to deal when game state changes
  useEffect(() => {
    if (!isManualMode) return;

    // Get all active players including dealer
    const allActivePlayers = [...activePlayers, 'dealer'];
    
    // Find the current player's index
    const currentIndex = nextPlayerToDeal ? allActivePlayers.indexOf(nextPlayerToDeal) : -1;
    
    // If no current player or current player has 3 cards, move to next
    if (currentIndex === -1 || 
        (nextPlayerToDeal === 'dealer' ? 
          gameState.dealer_hand.length >= 3 : 
          gameState.players[nextPlayerToDeal].hand.length >= 3)) {
      // Find the first player with less than 3 cards
      const nextPlayer = allActivePlayers.find(playerId => 
        playerId === 'dealer' ? 
          gameState.dealer_hand.length === 0 : // Only move to dealer when all players have 3 cards
          gameState.players[playerId].hand.length === 0 // Only move to next player when current has 3 cards
      );
      setNextPlayerToDeal(nextPlayer || null);
    }
  }, [gameState, isManualMode, activePlayers, nextPlayerToDeal]);

  const handleGeneralAddCard = (card: string) => {
    if (!nextPlayerToDeal) return;
    
    sendMessage({
      action: 'add_card',
      card,
      target: nextPlayerToDeal
    });

    // After adding card, check if current player has 3 cards
    const currentPlayerCards = nextPlayerToDeal === 'dealer' ? 
      gameState.dealer_hand.length + 1 : // +1 because we just added a card
      gameState.players[nextPlayerToDeal].hand.length + 1;

    // If current player has 3 cards, find next player
    if (currentPlayerCards >= 3) {
      const allActivePlayers = [...activePlayers, 'dealer'];
      const currentIndex = allActivePlayers.indexOf(nextPlayerToDeal);
      
      // Find next player who has no cards
      const nextPlayer = allActivePlayers.find((playerId, index) => 
        index > currentIndex && 
        (playerId === 'dealer' ? 
          gameState.dealer_hand.length === 0 : 
          gameState.players[playerId].hand.length === 0)
      );
      setNextPlayerToDeal(nextPlayer || null);
    }
  };

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

  const handleActivatePlayer = (playerId: string) => {
    if (activePlayers.includes(playerId)) {
      // If player is active, deactivate them
      handleRemovePlayer(playerId);
    } else {
      // If player is inactive, activate them
      sendMessage({ action: 'add_player', player: playerId });
    }
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

  useEffect(() => {
    // Only show dealer cards when the game phase is 'revealed'
    if (gameState.game_phase === 'revealed') {
      setShowDealerCards(true);
    } else {
      setShowDealerCards(false);
    }
  }, [gameState.game_phase]);

  // Clear error message after 3 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#450A03' }}>
      <Navbar 
        onOpenControlPanel={() => setIsControlPanelOpen(true)} 
        onActivatePlayer={handleActivatePlayer}
        activePlayers={activePlayers}
      />
      {/* Display notifications */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      <div className="m-12 poko p-8 bg-[#911606]" style={{ border: '10px solid #D6AB5D' }}>
        {/* <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Mini Flush Dealer View</h1>
            <div className="flex items-center gap-4">
              <div className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}> 
                {isConnected ? '🟢 Connected to server' : '🔴 Disconnected from server'}
              </div>
              <button
                onClick={() => setIsControlPanelOpen(true)}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors duration-200"
              >
                Open Control Panel
              </button>
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
              className={`px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors duration-200 
                ${(!isConnected || isLoading || !allPlayersActed) && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading || !allPlayersActed}
            >
              Reveal Hands {!allPlayersActed && activePlayers.length > 0 && `(${activePlayers.filter(p => !p.has_acted).length} players remaining)`}
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
              onClick={() => sendMessage({ action: 'delete_win' })}
              className={`px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors duration-200 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
              disabled={!isConnected || isLoading}
            >
              Delete Last Win
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
        </header> */}

        <main>
          <div className="mb-8">
            {/* Dealer's Hand */}
            <PlayerHand
              key="dealer"
              playerId="dealer"
              hand={gameState.dealer_hand}
              active={true}
              result={null}
              isDealer={true}
              showCards={showDealerCards}
              onAddCard={isManualMode ? handleAddCard : undefined}
              highCombination={gameState.dealer_combination}
              dealerQualifies={gameState.dealer_qualifies}
              selectingCardFor={selectedPlayer}
              isNextToDeal={nextPlayerToDeal === 'dealer'}
              has_acted={false}
              action_type={null}
            />
          </div>

          {/* Player Hands */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(gameState.players).map(([playerId, player]) => (
              <div key={playerId} className="relative">
                <PlayerHand
                  playerId={playerId}
                  hand={player.hand}
                  active={player.active}
                  result={player.result}
                  showCards={gameState.game_phase === 'revealed'}
                  onAddCard={isManualMode ? handleAddCard : undefined}
                  highCombination={player.high_combination}
                  lowCombination={player.low_combination}
                  mainBetResult={player.main_bet_result}
                  selectingCardFor={selectedPlayer}
                  isNextToDeal={nextPlayerToDeal === playerId}
                  has_acted={player.has_acted}
                  action_type={player.action_type}
                />
              </div>
            ))}
          </div>

          {/* {isManualMode && showCardDealingBox && (
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
              <div className="max-w-7xl mx-auto relative">
                <button
                  onClick={() => setShowCardDealingBox(false)}
                  className="absolute top-0 right-0 text-gray-500 hover:text-gray-700 p-2"
                  title="Close card dealing box"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-600">
                    {nextPlayerToDeal ? 
                      `Dealing to ${nextPlayerToDeal === 'dealer' ? 'Dealer' : nextPlayerToDeal} (${nextPlayerToDeal === 'dealer' ? gameState.dealer_hand.length : gameState.players[nextPlayerToDeal].hand.length}/3 cards)` : 
                      'All players have 3 cards'}
                  </div>
                  {selectedPlayer && (
                    <button
                      onClick={() => setSelectedPlayer(null)}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Cancel Player Selection
                    </button>
                  )}
                </div>
                <CardSelector 
                  onCardSelect={selectedPlayer ? handleCardSelect : handleGeneralAddCard} 
                />
              </div>
            </div>
          )} */}

          {isManualMode && !showCardDealingBox && (
            <div className="fixed bottom-4 right-4">
              <button
                onClick={() => setShowCardDealingBox(true)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center gap-2"
                title="Open card dealing box"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Deal Cards
              </button>
            </div>
          )}
        </main>

        {/* <div className="fixed bottom-4 right-4">
          <a
            href="/player"
            target="_blank"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Open Player View
          </a>
        </div> */}

        {isControlPanelOpen && (
          <ControlPanelPopup
            open={isControlPanelOpen}
            onClose={() => setIsControlPanelOpen(false)}
            onResetGame={handleResetTable}
            onRevealHands={handleRevealHands}
            onDeleteLastGame={() => sendMessage({ action: 'delete_win' })}
            onUndolast={handleUndo}
            isLoading={isLoading}
            onModeChange={handleModeChange}
          >
            <h2 className="text-xl font-bold mb-4">Control Panel</h2>
            <p>This is a placeholder for your control panel content.</p>
          </ControlPanelPopup>
        )}
      </div>
    </div>
  );
}