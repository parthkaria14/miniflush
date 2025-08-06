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
    if (result === 'tie') return 'text-yellow-500';
    return 'text-yellow-500';
  };

  const getResultText = () => {
    if (!result) return '';
    if (result === 'win') return 'Won';
    if (result === 'lose') return 'Lost';
    if (result === 'tie') return 'Tie';
    if (result === 'surrender') return 'Fold'
    return 'ANTE';
  };

  const formatCombination = (combination: string) => {
    return combination.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className={`rounded-lg bg-[#A42210] min-h-[14vh] border-4 border-[#D6AB5D] border-dashed ${isDealer ? 'w-[61.5vw]' : 'min-w-[30vw] max-w-[61.5vw]'} ${isNextToDeal ? 'ring-4 ring-yellow-500 ring-opacity-100 shadow-[0_0_20px_#D6AB5D]' : ''}`} >
      <div className="flex justify-between items-center">
        <div className={`w-full h-fit flex ${isDealer ? "justify-center items-center" : '' }`}>
          <h3 className="text-2xl font-semibold text-white ml-2 mt-2">
            {isDealer ? 'Dealer' : playerId.replace(/player(\d+)/i, 'Player $1')}
            {/* {isNextToDeal && (
              <span className="ml-2 text-sm text-yellow-400 font-normal">
                (Next to deal)
              </span>
            )}   */}
          </h3>
        </div>
        {result && (
          <span className={`font-bold texl-xl text-white mx-8`}>
            {getResultText()}
          </span>
        )}
      </div>
      {isDealer && dealerQualifies === false && (
        <p className="text-sm text-white font-semibold ml-2">
          Dealer Does Not Qualify
        </p>
      )}
      
      {/* For Dealer - Show hand combination */}
      {isDealer && showCards && highCombination && (
        <p className="text-sm text-gray-200 ml-2 mb-1">
          Hand: {formatCombination(highCombination)}
        </p>
      )}
      
      {/* For Players - Show Main Bet and Side Bets in a single line */}
      {!isDealer && showCards && (
        <p className="text-sm text-gray-200 ml-2 mb-1">
          {/* {highCombination && (
            <>
              Main Bet: {formatCombination(highCombination)}
              {highCombination !== 'high_card' && ` | Side Bet (High): ${formatCombination(highCombination)}`}
            </>
          )} */}
          {lowCombination && lowCombination !== 'no_qualify' && (
            <>
              {/* {(highCombination) ? ' | ' : ''} */}
              {/* Side Bet (Low): {formatCombination(lowCombination)} */}
              Bet : {formatCombination(lowCombination)}
            </>
          )}
        </p>
      )}
      {!isDealer && active && !showCards && (
        <p className="text-sm text-gray-200 ml-2 mb-1">
          Status: {has_acted ? (action_type === 'surrender' ? 'acted' : 'acted') : 'Waiting to act'}
        </p>
      )}
      
      <div className="flex gap-2 justify-center mb-2">
        {/* Show actual cards if revealed, otherwise show card backs for each added card */}
        {hand.map((card, index) => (
          <Card
            key={`${card}-${index}`}
            card={card}
            hidden={!showCards}
            isDealer={isDealer}
          />
        ))}
        {/* Show card backs for empty slots using Card component */}
        {Array.from({ length: 3 - hand.length }).map((_, index) => (
          <Card
            key={`empty-${index}`}
            card="back"
            hidden={true}
            isDealer={isDealer}
          />
        ))}
        {/* Show add button only for active players in manual mode */}
        {/* {active && hand.length < 3 && onAddCard && !showCards && selectingCardFor !== playerId && (
          <button
            onClick={() => onAddCard(playerId)}
            className="w-20 h-28 border-2 border-dashed border-[#D6AB5D] rounded-lg flex items-center justify-center text-[#D6AB5D] hover:text-white hover:border-white transition-colors"
          >
            <span className="text-sm">+</span>
          </button>
        )} */}
      </div>
    </div>
  );
};

export default PlayerHand;