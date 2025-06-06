import React from 'react';
import Card from './Card';

interface PlayerHandProps {
  playerId: string;
  hand: string[];
  active: boolean;
  result: string | null;
  isDealer?: boolean;
  showCards?: boolean;
  onAddCard?: (playerId: string) => void;
  combination?: string;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  playerId,
  hand,
  active,
  result,
  isDealer = false,
  showCards = false,
  onAddCard,
  combination
}) => {
  const getResultColor = () => {
    switch (result) {
      case 'win': return 'text-green-600';
      case 'lose': return 'text-red-600';
      case 'draw': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`p-4 rounded-lg ${active ? 'bg-blue-50' : 'bg-gray-100'} ${isDealer ? 'border-2 border-primary' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {isDealer ? 'Dealer' : playerId}
          </h3>
          {combination && showCards && (
            <p className="text-sm text-gray-600 mt-1">
              {combination.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </p>
          )}
        </div>
        {result && (
          <span className={`font-bold ${getResultColor()}`}>
            {result.toUpperCase()}
          </span>
        )}
      </div>
      
      <div className="flex gap-2 justify-center">
        {hand.map((card, index) => (
          <Card
            key={`${card}-${index}`}
            card={card}
            hidden={!showCards && !isDealer}
          />
        ))}
        {active && hand.length < 3 && onAddCard && (
          <button
            onClick={() => onAddCard(playerId)}
            className="w-20 h-28 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
          >
            <span className="text-2xl">+</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerHand;