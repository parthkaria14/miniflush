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
  isNextToDeal?: boolean;
  has_acted?: boolean;
  action_type?: string;
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
  selectingCardFor,
  isNextToDeal = false,
  has_acted,
  action_type
}) => {
  const getResultColor = () => {
    console.log(result);
    if (!result) return 'text-gray-400';
    if (result === 'win') return 'text-green-500';
    if (result === 'lose') return 'text-red-500';
    return 'text-yellow-500';
  };

  const getResultText = () => {
    if (!result) return '';
    if (result === 'win') return 'Won';
    if (result === 'lose') return 'Lost';
    return 'ANTE';
  };

  const formatCombination = (combination: string) => {
    return combination.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className={`p-4 rounded-lg bg-[#A42210] min-h-[24vh] border-4 border-[#D6AB5D] border-dashed ${isDealer ? 'w-[61.5vw]' : 'min-w-[30vw] max-w-[61.5vw]'} ${isNextToDeal ? 'ring-4 ring-yellow-500 ring-opacity-100 shadow-[0_0_20px_#D6AB5D]' : ''}`} >
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-5xl font-semibold text-white m-5">
            {isDealer ? 'Dealer' : playerId.replace(/(\d+)/, ' $1')}
            {/* {isNextToDeal && (
              <span className="ml-2 text-2xl text-yellow-400 font-normal">
                (Next to deal)
              </span>
            )}   */}
          </h3>
        </div>
        {result && (
          <span className={`font-bold ${getResultColor()}`}>
            {getResultText()}
          </span>
        )}
      </div>
      {isDealer && dealerQualifies === false && (
        <p className="text-2xl text-white mb-2 font-semibold ml-6">
          Dealer Does Not Qualify
        </p>
      )}
      
      {/* For Dealer - Show hand combination */}
      {isDealer && showCards && highCombination && (
        <p className="text-2xl text-gray-200 mb-2 ml-6">
          Hand: {formatCombination(highCombination)}
        </p>
      )}
      
      {/* For Players - Show Main Bet and Side Bets */}
      {!isDealer && showCards && highCombination && (
        <p className="text-2xl text-gray-200 mb-1 ml-6">
          Main Bet: {formatCombination(highCombination)}
        </p>
      )}
      
      {/* Side Bet - Show high combination if it qualifies (not high_card) */}
      {!isDealer && showCards && highCombination && highCombination !== 'high_card' && (
        <p className="text-2xl text-gray-200 mb-1 ml-6">
          Side Bet (High): {formatCombination(highCombination)}
        </p>
      )}
      
      {/* Side Bet - Show low combination if it exists and qualifies (not 'no_qualify') */}
      {!isDealer && showCards && lowCombination && lowCombination !== 'no_qualify' && (
        <p className="text-2xl text-gray-200 mb-1 ml-6">
          Side Bet (Low): {formatCombination(lowCombination)}
        </p>
      )}
      {!isDealer && active && (
        <p className="text-2xl text-gray-200 mb-1 ml-6">
          Status: {has_acted ? (action_type === 'surrender' ? 'acted' : 'acted') : 'Waiting to act'}
        </p>
      )}
      
      <div className="flex gap-2 justify-center">
        {/* Show actual cards if revealed, otherwise show card backs for each added card */}
        {hand.map((card, index) => (
          <Card
            key={`${card}-${index}`}
            card={card}
            hidden={!showCards}
          />
        ))}
        {/* Show card backs for empty slots using Card component */}
        {Array.from({ length: 3 - hand.length }).map((_, index) => (
          <Card
            key={`empty-${index}`}
            card="back"
            hidden={true}
          />
        ))}
        {/* Show add button only for active players in manual mode */}
        {/* {active && hand.length < 3 && onAddCard && !showCards && selectingCardFor !== playerId && (
          <button
            onClick={() => onAddCard(playerId)}
            className="w-20 h-28 border-2 border-dashed border-[#D6AB5D] rounded-lg flex items-center justify-center text-[#D6AB5D] hover:text-white hover:border-white transition-colors"
          >
            <span className="text-2xl">+</span>
          </button>
        )} */}
      </div>
    </div>
  );
};

export default PlayerHand;