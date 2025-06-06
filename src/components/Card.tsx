import React from 'react';

interface CardProps {
  card: string;
  hidden?: boolean;
}

const Card: React.FC<CardProps> = ({ card, hidden = false }) => {
  const getSuitColor = (suit: string) => {
    return suit === 'H' || suit === 'D' ? 'text-red-600' : 'text-gray-900';
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'H': return '♥';
      case 'D': return '♦';
      case 'C': return '♣';
      case 'S': return '♠';
      default: return suit;
    }
  };

  if (hidden) {
    return (
      <div className="w-20 h-28 bg-blue-800 rounded-lg shadow-md flex items-center justify-center border-2 border-white cursor-pointer transform hover:scale-105 transition-transform">
        <div className="text-white text-2xl font-bold">?</div>
      </div>
    );
  }

  const rank = card[0];
  const suit = card[1];
  const suitColor = getSuitColor(suit);
  const suitSymbol = getSuitSymbol(suit);

  return (
    <div className="w-20 h-28 bg-white rounded-lg shadow-md flex flex-col items-center justify-between p-2 border border-gray-300 cursor-pointer transform hover:scale-105 transition-transform">
      <div className={`text-lg font-bold ${suitColor} self-start`}>
        {rank}
      </div>
      <div className={`text-3xl ${suitColor}`}>
        {suitSymbol}
      </div>
      <div className={`text-lg font-bold ${suitColor} self-end transform rotate-180`}>
        {rank}
      </div>
    </div>
  );
};

export default Card;