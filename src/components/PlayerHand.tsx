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
  highCombination?: string;
  lowCombination?: string;
  mainBetResult?: string;
  dealerQualifies?: boolean;
  selectingCardFor?: string | null;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  playerId,
  hand,
  active,
  result,
  isDealer = false,
  showCards = false,
  onAddCard,
  highCombination,
  lowCombination,
  mainBetResult,
  dealerQualifies,
  selectingCardFor
}) => {
  const getResultColor = () => {
    switch (result) {
      case 'win': return 'text-green-600';
      case 'lose': return 'text-red-600';
      case 'draw': 
      case 'push': return 'text-yellow-600';
      case 'ante': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getResultText = () => {
    switch (result) {
      case 'push': return 'ANTE';
      case 'ante': return 'ANTE';
      default: return result?.toUpperCase();
    }
  };

  const formatCombination = (combination: string) => {
    return combination.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className={`p-4 rounded-lg ${active ? 'bg-blue-50' : 'bg-gray-100'} ${isDealer ? 'border-2 border-primary' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {isDealer ? 'Dealer' : playerId}
           </h3>
        </div>
        {result && (
          <span className={`font-bold ${getResultColor()}`}>
            {getResultText()}
          </span>
        )}
      </div>
      {isDealer && dealerQualifies === false && (
        <p className="text-sm text-red-600 mb-2 font-semibold">
          Dealer Does Not Qualify
        </p>
      )}
      
      {/* For Dealer - Show hand combination */}
      {isDealer && showCards && highCombination && (
        <p className="text-sm text-gray-600 mb-2">
          Hand: {formatCombination(highCombination)}
        </p>
      )}
      
      {/* For Players - Show Main Bet and Side Bets */}
      {!isDealer && showCards && highCombination && (
        <p className="text-sm text-gray-600 mb-1">
          Main Bet: {formatCombination(highCombination)}
        </p>
      )}
      
      {/* Side Bet - Show high combination if it qualifies (not high_card) */}
      {!isDealer && showCards && highCombination && highCombination !== 'high_card' && (
        <p className="text-sm text-gray-600 mb-1">
          Side Bet (High): {formatCombination(highCombination)}
        </p>
      )}
      
      {/* Side Bet - Show low combination if it exists and qualifies (not 'no_qualify') */}
      {!isDealer && showCards && lowCombination && lowCombination !== 'no_qualify' && (
        <p className="text-sm text-gray-600 mb-2">
          Side Bet (Low): {formatCombination(lowCombination)}
        </p>
      )}
      
      <div className="flex gap-2 justify-center">
        {/* Show actual cards if revealed, otherwise show card backs for each added card */}
        {hand.map((card, index) => (
          <Card
            key={`${card}-${index}`}
            card={card}
            hidden={!showCards && !isDealer}
          />
        ))}
        {/* In manual mode, if not revealed, show card backs for each added card, and only show add button for next slot */}
        {active && hand.length < 3 && onAddCard && !showCards && selectingCardFor !== playerId && (
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