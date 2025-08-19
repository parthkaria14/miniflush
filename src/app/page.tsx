"use client";

import React from 'react';
import { useWebSocket, safeTableNumber, safeMinBet, safeMaxBet } from '@/contexts/WebSocketContext';
import StatsHand from '@/components/StatsHand';

const playerGrid = [
  // [playerId, gridClass]
  ['player1', 'col-start-1 col-end-4 row-start-2 row-end-4 flex items-center justify-end z-10 mr-28'],
  ['player2', 'col-start-1 col-end-4 row-start-4 row-end-7 flex items-center justify-end z-10 mb-[10.5rem]'],
  ['player3', 'col-start-2 col-end-5 row-start-6 row-end-8 flex items-center justify-end z-10'],
  ['player4', 'col-start-6 col-end-9 row-start-6 row-end-8 flex items-center justify-center z-10'],
  ['player5', 'col-start-7 col-end-10 row-start-4 row-end-7 flex items-center justify-center z-10 mb-[10.5rem]'],
  ['player6', 'col-start-7 col-end-10 row-start-2 row-end-4 flex items-center justify-center z-10 ml-28'],
];

// Add a type for player (partial, as only relevant fields are used)
type Player = {
  active?: boolean;
  result?: string | null;
  action_type?: string;
  hand?: string[];
  has_acted?: boolean;
};

function getPlayerState(player: Player): 'inactive' | 'won' | 'lost' | 'ante' | 'dealt' | 'played'| 'fold' | 'tie' {
  if (!player.active) return 'inactive';
  if (player.result === 'win') return 'won';
  if (player.result === 'lose') return 'lost';
  if (player.result === 'tie') return 'tie';
  if (player.result === 'ante' || player.action_type === 'ante') return 'ante';
  if (player.action_type === 'surrender') return 'fold';
  if (player.hand && player.hand.length === 3 && !player.has_acted) return 'dealt';
  if (player.hand && player.hand.length === 3 && player.has_acted) return 'played';
  return 'inactive'; // fallback, but should not be reached
}

const stateToImg: Record<string, string> = {
  inactive: '/assets/black.png',
  won: '/assets/green.png',
  lost: '/assets/red.png',
  fold: '/assets/red.png',
  ante: '/assets/purple.png',
  tie: '/assets/purple.png',
  dealt: '/assets/brown.png',
  played: '/assets/brown.png',
};

const stateToOverlay: Partial<Record<'won' | 'lost' | 'ante' | 'fold' | 'tie', string>> = {
  won: 'WON',
  lost: 'LOST',
  ante: 'ANTE',
  fold: 'FOLD',
  tie: 'TIE',
};

const StatsPage = () => {
  const { gameState } = useWebSocket();
  console.log(gameState)
  function sortHand(hand: string[]): string[] {
    const rankOrder: { [key: string]: number } = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "T": 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };

    // Extract rank + suit info
    const cards = hand.map((card) => {
      const rank = card.slice(0, -1);
      const suit = card.slice(-1);
      return { card, rank, suit, value: rankOrder[rank] };
    });

    // Count ranks
    const rankCount: Record<string, number> = {};
    cards.forEach((c) => {
      rankCount[c.rank] = (rankCount[c.rank] || 0) + 1;
    });

    // Detect trail (3 of same rank)
    if (Object.values(rankCount).includes(3)) {
      return cards.sort((a, b) => b.value - a.value).map((c) => c.card);
    }

    // Detect pair (2 of same rank)
    if (Object.values(rankCount).includes(2)) {
      cards.sort((a, b) => {
        const countDiff = rankCount[b.rank] - rankCount[a.rank];
        if (countDiff !== 0) return countDiff; // group the pair
        return b.value - a.value;
      });
      return cards.map((c) => c.card);
    }

    // Detect flush (all suits same)
    const isFlush = cards.every((c) => c.suit === cards[0].suit);

    // Detect straight (Ace high or Ace low)
    const values = cards.map((c) => c.value).sort((a, b) => a - b);
    const uniqueValues = Array.from(new Set(values));
    let isStraight = false;

    if (uniqueValues.length === 3) {
      // Normal straight check
      if (uniqueValues[2] - uniqueValues[0] === 2) {
        isStraight = true;
      }
      // Ace-low straight (A=14, treat as 1)
      if (
        uniqueValues.includes(14) &&
        uniqueValues.includes(2) &&
        uniqueValues.includes(3)
      ) {
        isStraight = true;
      }
    }

    if (isStraight && isFlush) {
      return cards.sort((a, b) => b.value - a.value).map((c) => c.card); // Pure Sequence
    }
    if (isStraight) {
      // Special case: A-2-3 → sort as 3-2-A (Ace shown last)
      if (
        uniqueValues.includes(14) &&
        uniqueValues.includes(2) &&
        uniqueValues.includes(3)
      ) {
        return cards
          .sort((a, b) => {
            if (a.value === 14) return 1; // Ace goes last
            if (b.value === 14) return -1;
            return b.value - a.value;
          })
          .map((c) => c.card);
      }
      return cards.sort((a, b) => b.value - a.value).map((c) => c.card); // Normal straight
    }
    if (isFlush) {
      return cards.sort((a, b) => b.value - a.value).map((c) => c.card); // Flush
    }

    // Default: just sort high card
    return cards.sort((a, b) => b.value - a.value).map((c) => c.card);
  }
  return (
    <div className="min-h-screen bg-[#D6AB5D] flex flex-col items-center justify-center">
      <div className="h-[94vh] w-[96vw] m-3 bg-[#971909] flex flex-col">
        <nav className="w-full h-[15vh] relative flex items-center justify-between px-8">
          {/* Left: Table Number */}
          <div className="relative z-20 flex flex-col items-center justify-center">
            <div className="text-6xl text-yellow-500">Table</div>
            <div className="text-6xl text-yellow-500">{(() => { const t = String(safeTableNumber(gameState.table_number)); return t.match(/^\d+FT$/) ? `FT-${t.replace('FT', '')}` : `FT-${t}`; })()}</div>
          </div>
          {/* Center: Wood background and Royal Flush */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center pointer-events-none">
            <img
              src="/assets/wood.png"
              alt="Wood Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <img
              src="/assets/royal_flush.png"
              alt="Royal Flush"
              className="relative z-10 h-[22.5vh] object-contain mx-auto"
            />
          </div>
          {/* Right: Bets */}
          <div className="relative z-20 flex flex-col items-center justify-center">
            <div className="text-6xl text-yellow-500">Bets</div>
            <div className="text-6xl text-yellow-500">Max : {safeMaxBet(gameState.max_bet)}</div>
            <div className="text-6xl text-yellow-500">Min : {safeMinBet(gameState.min_bet)}</div>
          </div>
        </nav>
        <div className='poko flex-1 grid grid-cols-9 grid-rows-9 w-[96vw] h-[79vh]'>
          <div className="col-start-1 col-end-2 row-start-2 row-end-8 flex items-center justify-center z-10">
            <img src="/assets/side_design.png" alt="Side Design" className="w-full h-full object-contain transform scale-x-[-1]" />
          </div>
          <div className="col-start-9 col-end-10 row-start-2 row-end-8 flex items-center justify-center z-10">
            <img src="/assets/side_design.png" alt="Side Design" className="w-full h-full object-contain" />
          </div>
          <div className="col-start-3 col-end-8 row-start-1 row-end-6 flex items-center justify-center z-10">
            <img src="/assets/new_piece.png" alt="Side Design" className="w-full h-full object-contain mt-4" />
          </div>
          <div className='col-start-4 col-end-7 row-start-3 row-end-6 flex justify-center items-center realtive z-10'>
            <StatsHand
              playerId="dealer"
              hand={sortHand(gameState.dealer_hand || [])}
              active={true}
              result={null}
              isDealer={true}
              showCards={gameState.game_phase === 'revealed'}
              highCombination={gameState.dealer_combination}
              dealerQualifies={gameState.dealer_qualifies}
            />
          </div>

          {playerGrid.slice(0, 3).map(([playerId, gridClass], idx) => {
            const player = gameState.players?.[playerId] || {};
            const state = getPlayerState(player);
            const imgSrc = stateToImg[state];
            const overlay = stateToOverlay[state as keyof typeof stateToOverlay];
            return (
              <div key={playerId} className={gridClass}>
                <div className="w-full h-[17vh]] flex flex-row items-top justify-end">
                  <div>
                    <StatsHand
                      playerId={playerId}
                      hand={sortHand(player.hand || [])}
                      active={!!player.active}
                      result={player.result || null}
                      has_acted={player.has_acted}
                      action_type={player.action_type}
                      showCards={gameState.game_phase === 'revealed'}
                    />
                  </div>
                  <div className="relative w-[8vw] h-[14vh] flex items-center justify-center">
                    <img src={imgSrc} alt="Player State" className="w-[12rem] h-[12rem] object-contain" />
                    <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 text-white px-4 py-2 text-xl flex flex-col items-center">
                      <div className='font-bold text-5xl'>{idx + 1}</div>
                      <div>{overlay}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {playerGrid.slice(3).map(([playerId, gridClass], idx) => {
            const player = gameState.players?.[playerId] || {};
            const state = getPlayerState(player);
            const imgSrc = stateToImg[state];
            const overlay = stateToOverlay[state as keyof typeof stateToOverlay];
            return (
              <div key={playerId} className={gridClass}>
                <div className="w-full h-[17vh] flex flex-row items-top justify-start">
                  <div className="relative w-[8vw] h-[14vh] flex items-center justify-center mr-2">
                    <img src={imgSrc} alt="Player State" className="w-[12rem] h-[12rem] object-contain" />
                    <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 text-white px-4 py-2 text-2xl flex flex-col items-center">
                      <div className='font-bold text-5xl'>{idx + 4}</div>
                      <div>{overlay}</div>
                    </div>
                  </div>
                  <div>
                    <StatsHand
                      playerId={playerId}
                      hand={sortHand(player.hand || [])}
                      active={!!player.active}
                      result={player.result || null}
                      has_acted={player.has_acted}
                      action_type={player.action_type}
                      showCards={gameState.game_phase === 'revealed'}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="col-start-5 col-end-6 row-start-1 row-end-3 flex flex-col items-center justify-center z-10">
            {/* <div className='text-4xl text-yellow-500'>Dealer</div>
            <div className='flex items-center justify-center text-2xl text-yellow-500 whitespace-nowrap'>
              Table : {gameState.table_number}
            </div> */}
            <img src="/assets/ocean7.png" alt="Side Design" className="w-full h-full object-contain" />
          </div>
          <footer className="col-start-1 col-end-10 row-start-8 row-end-10 flex justify-start items-center relative">
            <img
              src="/assets/wood.png"
              alt="Wood Background"
              className="absolute inset-0 w-full h-full object-cover rotate-180 z-0"
            />
            <div className="relative top-4 flex flex-col items-center justify-center z-10 ml-12">
              <div className="text-6xl text-yellow-500">Games</div>
              <div className="text-6xl text-yellow-500">{gameState.games_played ?? 0}</div>
            </div>
          </footer>
        </div>
      </div>
      <div className='absolute text-4xl bottom-0 text-center'>THIS IS AN ELECTRONIC GAME INCASE OF ANY GRIEVANCES THE MANAGEMENT DECISION WILL BE FINAL.</div>
    </div>
  );
};

export default StatsPage;
