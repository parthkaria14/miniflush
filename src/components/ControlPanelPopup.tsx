import { useWebSocket } from "@/contexts/WebSocketContext";
import React, { useState } from "react";

interface ControlPanelPopupProps {
  open: boolean;
  onClose: () => void;
  onResetGame: () => void;
  onRevealHands: () => void;
  onDeleteLastGame: () => void;
  onUndolast: () => void;
  isLoading: boolean;
  onModeChange: (mode: 'automatic' | 'manual' | 'live') => void;
  children?: React.ReactNode;
}

const ControlPanelPopup: React.FC<ControlPanelPopupProps> = ({ open, onClose, onResetGame, onRevealHands, onDeleteLastGame, onUndolast, isLoading, onModeChange, children }) => {
  const [selectedMode, setSelectedMode] = useState<'automatic' | 'manual' | 'live'>('manual');
  const { gameState, sendMessage, isConnected, notifications, removeNotification, addNotification } = useWebSocket();
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [tempBet, setTempBet] = useState({ min: 10, max: 1000 });
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tempTableNumber, setTempTableNumber] = useState('');
  const [selectedRank, setSelectedRank] = useState('');
  const [selectedSuit, setSelectedSuit] = useState('');

  const handleModeChange = (mode: 'automatic' | 'manual' | 'live') => {
    setSelectedMode(mode);
    onModeChange(mode);
    onClose();
  };

  const handleResetTableAndClose = () => {
    onResetGame()
    onClose()
  };

  const handleRevealAndClose = () => {
    onRevealHands();
    onClose();
  };

  const handleUndoLastAndClose = () => {
    onUndolast();
    onClose();
  }

  const handleDeleteLastGameAndClose = () => {
    onDeleteLastGame();
    onClose();
  }

  const handleDeleteGameRecordsAndClose = () => {
    () => sendMessage({ action: 'clear_records' });
    onClose();
  }

  const handleOpenBetModal = () => {
    setTempBet({ min: gameState.min_bet, max: gameState.max_bet });
    setIsBetModalOpen(true);
  };

  const handleSaveBet = () => {
    if (tempBet.min >= tempBet.max) {
      addNotification('Minimum bet must be less than maximum bet', 'error');
      return;
    }
    if (tempBet.min < 0 || tempBet.max < 0) {
      addNotification('Bet amounts cannot be negative', 'error');
      return;
    }
    
    console.log('Saving bet amounts:', tempBet);
    console.log('Current game state:', gameState);
    
    sendMessage({
      action: 'change_game_settings',
      min_bet: tempBet.min,
      max_bet: tempBet.max
    });
    addNotification('Updating bet limits...', 'info');
    setIsBetModalOpen(false);
  };

  const handleCancelBet = () => {
    setIsBetModalOpen(false);
  };

  const handleSendCard = () => {
    if (selectedRank && selectedSuit) {
      const card = `${selectedRank}${selectedSuit}`;
      console.log('Selected card:', card);
      
      // Get the next player to deal from gameState
      const activePlayers = Object.entries(gameState.players)
        .filter(([_, player]) => player.active)
        .map(([id]) => id);
      
      const allActivePlayers = [...activePlayers, 'dealer'];
      
      // Find the first player with less than 3 cards
      const nextPlayer = allActivePlayers.find(playerId => 
        playerId === 'dealer' ? 
          gameState.dealer_hand.length < 3 : 
          gameState.players[playerId].hand.length < 3
      );

      if (nextPlayer) {
        sendMessage({
          action: 'add_card',
          card,
          target: nextPlayer
        });
        console.log('Sending card to:', nextPlayer);
      } else {
        console.log('No player available to receive card');
      }

      setSelectedRank('');
      setSelectedSuit('');
    }
  };

  const handleOpenTableModal = () => {
    setTempTableNumber(gameState.table_number?.toString() || '');
    setIsTableModalOpen(true);
  };

  const handleSaveTable = () => {
    if (!tempTableNumber || tempTableNumber.trim() === '') {
      addNotification('Table number cannot be empty', 'error');
      return;
    }
    
    const tableNumber = parseInt(tempTableNumber);
    if (isNaN(tableNumber) || tableNumber < 1) {
      addNotification('Table number must be a positive number', 'error');
      return;
    }
    
    console.log('Saving table number:', tableNumber);
    console.log('Current game state:', gameState);
    
    sendMessage({
      action: 'change_game_settings',
      table_number: tableNumber
    });
    addNotification('Updating table number...', 'info');
    setIsTableModalOpen(false);
  };

  const handleCancelTable = () => {
    setIsTableModalOpen(false);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 overflow-y-auto p-4">
        <div
          className="rounded-lg shadow-lg p-8 relative min-w-[320px] min-h-[200px] max-w-[90vw] my-8 flex flex-col items-center justify-center"
          style={{ backgroundColor: '#F0DEAD' }}
        >
          <button
            onClick={onClose}
            // onTouchEnd={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold focus:outline-none"
            aria-label="Close"
          >
            ×
          </button>
          <div className="flex flex-row items-center justify-center gap-6 w-full h-full">
            <button
              className="px-3 py-1.5 rounded-lg text-xl font-semibold shadow text-white transition-colors"
              style={{ width: 166, height: 49, backgroundColor: selectedMode === 'live' ? '#741003' : '#911606' }}
              // onClick={() => handleModeChange('live')}
            >
              Live Mode
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xl font-semibold shadow text-white transition-colors whitespace-nowrap"
              style={{ height: 49, backgroundColor: selectedMode === 'automatic' ? '#741003' : '#911606' }}
              onClick={() => handleModeChange('automatic')}
            >
              Automatic Mode
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xl font-semibold shadow text-white transition-colors"
              style={{ width: 166, height: 49, backgroundColor: selectedMode === 'manual' ? '#741003' : '#911606' }}
              onClick={() => handleModeChange('manual')}
            >
              Manual Mode
            </button>
          </div>
          {selectedMode === 'manual' ? (
            <div className="flex flex-row w-full gap-6 justify-center items-center">
              {/* First column */}
              <div className="flex-1 flex flex-col items-center gap-4 mt-20">
                <button
                  key="dealer wins"
                  className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                  style={{ width: 250, height: 60, backgroundColor: '#911606', color: '#fff' }}
                >
                  Dealer wins
                </button>
                {[2,3,4,5,6,7].map(num => (
                  <button
                    key={num}
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 60, backgroundColor: '#911606', color: '#fff' }}
                  >
                    Player {num-1} wins
                  </button>
                ))}
              </div>
              {/* Second column */}
              <div className="flex-1 flex flex-col h-full min-h-full">
                <div className="flex flex-col items-center gap-2 mb-16">
                  <button
                    key="reset-hand"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                    onClick={handleRevealAndClose}
                  >
                    Reveal hand
                  </button>
                  <button
                    key="undo-last"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                    onClick={handleUndoLastAndClose}
                  >
                    Undo last
                  </button>
                  <button
                    key="reset-game"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                    onClick={handleResetTableAndClose}
                    disabled={!isConnected || isLoading}
                  >
                    Reset game
                  </button>
                  <button
                    key="delete-last-game"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                    onClick={handleDeleteLastGameAndClose}
                    disabled={!isConnected || isLoading}
                  >
                    Delete last game
                  </button>
                  <button
                    key="clear-all-records"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                    onClick={handleDeleteGameRecordsAndClose}
                  >
                    Clear all records
                  </button>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    key="max-10000"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                  >
                    Max: {gameState.max_bet}
                  </button>
                  <button
                    key="min-10"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                    onClick={() => {console.log(gameState.min_bet)}}
                  >
                    Min: {gameState.min_bet}
                  </button>
                  <button
                    key="change-bets"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                    onClick={handleOpenBetModal}
                  >
                    Change bets
                  </button>
                  <button
                    key="enter-table-number"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center"
                    style={{ width: 250, height: 49, backgroundColor: '#fff', color: '#741003' }}
                    onClick={handleOpenTableModal}
                  >
                    Enter table number
                  </button>
                </div>
              </div>
              {/* Third column */}
              <div className="flex-1 flex flex-col h-full min-h-full">
                {/* First group: 3x4 grid for ranks */}
                <div className="grid grid-cols-3 grid-rows-4 gap-4 mb-10 place-items-center">
                  <div />
                  <button
                    key="grid-btn-A"
                    className={`rounded-lg shadow text-xl font-bold flex items-center justify-center ${selectedRank === 'A' ? 'bg-[#741003] text-white' : 'bg-white text-[#741003]'}`}
                    style={{ width: 80, height: 44 }}
                    onClick={() => setSelectedRank('A')}
                  >
                    A
                  </button>
                  <div />
                  {['2','3','4','5','6','7','8','9','T','J','Q','K'].map((rank) => (
                    <button
                      key={`grid-btn-${rank}`}
                      className={`rounded-lg shadow text-xl font-bold flex items-center justify-center ${selectedRank === rank ? 'bg-[#741003] text-white' : 'bg-white text-[#741003]'}`}
                      style={{ width: 80, height: 44 }}
                      onClick={() => setSelectedRank(rank)}
                    >
                      {rank}
                    </button>
                  ))}
                </div>
                {/* Second group: 2x2 grid for suits */}
                <div className="grid grid-cols-2 grid-rows-2 gap-4 mb-10 place-items-center">
                  {[
                    { symbol: '♠', value: 'S' },
                    { symbol: '♥', value: 'H' },
                    { symbol: '♦', value: 'D' },
                    { symbol: '♣', value: 'C' }
                  ].map((suit) => (
                    <button
                      key={`suit-btn-${suit.value}`}
                      className={`rounded-lg shadow text-xl font-bold flex items-center justify-center ${selectedSuit === suit.value ? 'bg-[#741003] text-white' : 'bg-white text-[#741003]'} ${(suit.value === 'H' || suit.value === 'D') ? 'text-red-600' : 'text-black'}`}
                      style={{ width: 110, height: 44 }}
                      onClick={() => setSelectedSuit(suit.value)}
                    >
                      {suit.symbol}
                    </button>
                  ))}
                </div>
                {/* Third group: Send and Undo buttons */}
                <div className="flex flex-row gap-4 items-center justify-center">
                  <button
                    key="send-card"
                    className={`rounded-lg shadow text-xl font-bold flex items-center justify-center ${selectedRank && selectedSuit ? 'bg-[#D6AB5D] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    style={{ width: 110, height: 44 }}
                    onClick={handleSendCard}
                    disabled={!selectedRank || !selectedSuit}
                  >
                    Send card
                  </button>
                  <button
                    key="undo-card"
                    className="rounded-lg shadow text-xl font-bold flex items-center justify-center bg-[#911606] text-white"
                    style={{ width: 110, height: 44 }}
                    onClick={onUndolast}
                  >
                    Undo Card
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <button
                className="px-5 py-3 rounded-lg text-xl font-bold shadow text-white bg-[#911606] hover:bg-[#741003] transition-colors"
              >
                Start automatic
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bet Settings Modal */}
      {isBetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
          <div className="rounded-lg shadow-lg p-8 relative min-w-[320px] max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center"
            style={{ backgroundColor: '#F0DEAD' }}>
            <h2 className="text-3xl font-bold mb-6">Change Bet Settings</h2>
            
            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="flex flex-col gap-2">
                <label className="text-3xl font-semibold">Minimum Bet</label>
                <input
                  type="number"
                  value={tempBet.min}
                  onChange={(e) => setTempBet(prev => ({ ...prev, min: Number(e.target.value) }))}
                  className="px-4 py-2 border rounded-lg text-3xl"
                  min="1"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-3xl font-semibold">Maximum Bet</label>
                <input
                  type="number"
                  value={tempBet.max}
                  onChange={(e) => setTempBet(prev => ({ ...prev, max: Number(e.target.value) }))}
                  className="px-4 py-2 border rounded-lg text-3xl"
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveBet}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xl font-bold hover:bg-green-600"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelBet}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xl font-bold hover:bg-red-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Settings Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
          <div className="rounded-lg shadow-lg p-8 relative min-w-[320px] max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center"
            style={{ backgroundColor: '#F0DEAD' }}>
            <h2 className="text-3xl font-bold mb-6">Change Table Number</h2>
            
            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="flex flex-col gap-2">
                <label className="text-3xl font-semibold">Table Number</label>
                <input
                  type="number"
                  value={tempTableNumber}
                  onChange={(e) => setTempTableNumber(e.target.value)}
                  className="px-4 py-2 border rounded-lg text-3xl"
                  min="1"
                  placeholder="Enter table number"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSaveTable}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xl font-bold hover:bg-green-600"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelTable}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xl font-bold hover:bg-red-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ControlPanelPopup; 