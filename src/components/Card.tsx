import React from 'react';

interface CardProps {
  card: string;
  hidden?: boolean;
}

const Card: React.FC<CardProps> = ({ card, hidden = false }) => {
  if (hidden) {
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

  // Convert card string to filename format (e.g., "9C" -> "9C.png")
  const cardImage = `${card}.png`;

  return (
    <div className="w-40 h-56 rounded-lg shadow-md transform hover:scale-105 transition-transform">
      <img 
        src={`/cards/${cardImage}`} 
        alt={`Card ${card}`}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Card;