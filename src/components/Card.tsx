"use client";
import React, { useState, useEffect } from 'react';

interface CardProps {
  card: string;
  hidden?: boolean;
}

const Card: React.FC<CardProps> = ({ card, hidden = false }) => {
  const [isPlayerPage, setIsPlayerPage] = useState(false);
  const cardSize = isPlayerPage ? 'w-24 h-32 mt-2 mb-2' : 'w-20 h-28';
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    setIsPlayerPage(window.location.pathname.includes('/player'));
  }, []);

  const handleTouchStart = () => {
    if (isPlayerPage) {
      console.log("touched");
      setIsTouched(prev => !prev);
    }
  };

  const handleTouchEnd = () => {
    if (isPlayerPage) {
      console.log("untouched");
      setIsTouched(prev => !prev);
    }
  };

  // If it's an empty slot (card === 'back')
  if (card === 'back') {
    return (
      <div className={`${cardSize} rounded-lg shadow-md transform`}>
        <img 
          src="/cards/card_back.png" 
          alt="Card Back"
          className="w-full h-full object-fill"
        />
      </div>
    );
  }

  // If the card is hidden (dealt but not revealed)
  if (hidden && !isTouched) {
    return (
      <div 
        className={`${cardSize} rounded-lg shadow-md transform`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img 
          src="/cards/BR.png" 
          alt="Dealt Card"
          className="w-full h-full object-fill"
        />
      </div>
    );
  }

  // If the card is revealed
  return (
    <div 
      className={`${cardSize} rounded-lg shadow-md transform`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      >
      <img 
        src={`/cards/${card}.png`} 
        alt={`Card ${card}`}
        className="w-full h-full object-fill"
      />
    </div>
  );
};

export default Card;