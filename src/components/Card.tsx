"use client";
import React, { useState, useEffect } from 'react';

interface CardProps {
  card: string;
  hidden?: boolean;
  isDealer:boolean;
}

const Card: React.FC<CardProps> = ({ card, hidden = false, isDealer}) => {
  const [currPage, setCurrPage] = useState<'dealer' | 'player' | 'stats'>('stats');
  let cardSize = '';
  if (currPage === 'player') {
    cardSize = 'w-31 h-[10.8rem] mt-2 mb-2';
  } else if (currPage === 'dealer') {
    cardSize = 'w-20 h-28';
  } else if (currPage === 'stats') {
    cardSize = 'w-[10rem] h-[14rem]'; // Further increased size for stats page
  }
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('dealer')) {
      setCurrPage('dealer');
    } else if (path.includes('player')) {
      setCurrPage('player');
    } else {
      setCurrPage('stats');
    }
  }, []);

  const handleTouchStart = () => {
    if (currPage === 'player' && !isDealer) {
      console.log("touched");
      setIsTouched(prev => !prev);
    }
  };

  const handleTouchEnd = () => {
    if (currPage === 'player' && !isDealer) {
      console.log("untouched");
      setIsTouched(prev => !prev);
    }
  };

  // If it's an empty slot (card === 'back')
  if (card === 'back') {
    return (
      <div className={`${cardSize} rounded-lg shadow-2xl transform`}>
        <img 
          src="/cards/card_back.png" 
          alt="Card Back"
          className="w-full h-full object-fill border-2 border-[darkRed] rounded-lg"
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