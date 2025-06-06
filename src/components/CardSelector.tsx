import React, { useState } from 'react';

interface CardSelectorProps {
  onCardSelect: (card: string) => void;
}

const CardSelector: React.FC<CardSelectorProps> = ({ onCardSelect }) => {
  const [selectedRank, setSelectedRank] = useState('');
  const [selectedSuit, setSelectedSuit] = useState('');

  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
  const suits = [
    { symbol: '♠', value: 'S' },
    { symbol: '♥', value: 'H' },
    { symbol: '♦', value: 'D' },
    { symbol: '♣', value: 'C' }
  ];

  const handleSelection = (rank: string, suit: string) => {
    const card = `${rank}${suit}`;
    onCardSelect(card);
    setSelectedRank('');
    setSelectedSuit('');
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Select Card</h3>
      
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Rank</h4>
        <div className="grid grid-cols-7 gap-2">
          {ranks.map((rank) => (
            <button
              key={rank}
              onClick={() => setSelectedRank(rank)}
              className={`p-2 rounded ${selectedRank === rank ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {rank}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2">Suit</h4>
        <div className="grid grid-cols-4 gap-2">
          {suits.map((suit) => (
            <button
              key={suit.value}
              onClick={() => setSelectedSuit(suit.value)}
              className={`p-2 rounded ${selectedSuit === suit.value ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'} ${(suit.value === 'H' || suit.value === 'D') ? 'text-red-600' : 'text-black'}`}
            >
              {suit.symbol}
            </button>
          ))}
        </div>
      </div>

      {selectedRank && selectedSuit && (
        <button
          onClick={() => handleSelection(selectedRank, selectedSuit)}
          className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Add {selectedRank}{suits.find(s => s.value === selectedSuit)?.symbol}
        </button>
      )}
    </div>
  );
};

export default CardSelector;