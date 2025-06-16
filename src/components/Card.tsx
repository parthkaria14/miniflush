import React from 'react';

interface CardProps {
  card: string;
  hidden?: boolean;
}

const Card: React.FC<CardProps> = ({ card, hidden = false }) => {
  // If it's an empty slot (card === 'back')
  if (card === 'back') {
    return (
      <div className="w-40 h-56 rounded-lg shadow-md transform hover:scale-105 transition-transform">
        <img 
          src="/cards/card_back.png" 
          alt="Card Back"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // If the card is hidden (dealt but not revealed)
  if (hidden) {
    return (
      <div className="w-40 h-56 rounded-lg shadow-md transform hover:scale-105 transition-transform">
        <img 
          src="/cards/BR.png" 
          alt="Dealt Card"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // If the card is revealed
  return (
    <div className="w-40 h-56 rounded-lg shadow-md transform hover:scale-105 transition-transform">
      <img 
        src={`/cards/${card}.png`} 
        alt={`Card ${card}`}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Card;