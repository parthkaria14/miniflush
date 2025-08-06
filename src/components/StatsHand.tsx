import React from 'react';
import Card from './Card';

interface StatsHandProps {
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

const StatsHand: React.FC<StatsHandProps> = ({
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
    <div className={`min-h-[14vh] w-fit flex justify-center items-center`} >
      <div className="flex gap-2 justify-center mb-2">
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
      </div>
    </div>
  );
};

export default StatsHand;