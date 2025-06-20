"use client";

import React from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';

const StatsPage = () => {
  const { gameState, sendMessage, isConnected } = useWebSocket();
  return (
    <div className="min-h-screen bg-[#D6AB5D] flex flex-col items-center justify-center">
      <div className="h-[94vh] w-[96vw] m-3 bg-[#971909] flex flex-col">
        <nav className="w-full h-[15vh] relative flex items-center justify-center">
          <img
            src="/assets/wood.png"
            alt="Wood Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <img
            src="/assets/royal_flush.png"
            alt="Royal Flush"
            className="relative z-10 h-[22.5vh] object-contain"
          />
        </nav>
        <div className='poko flex-1 grid grid-cols-9 grid-rows-9 w-[96vw] h-[79vh]'>
          <div className="col-start-1 col-end-2 row-start-2 row-end-8 flex items-center justify-center z-10">
            <img src="/assets/side_design.png" alt="Side Design" className="w-full h-full object-contain" />
          </div>
          <div className="col-start-9 col-end-10 row-start-2 row-end-8 flex items-center justify-center z-10">
            <img src="/assets/side_design.png" alt="Side Design" className="w-full h-full object-contain" />
          </div>
          <div className="col-start-3 col-end-8 row-start-1 row-end-6 flex items-center justify-center z-10">
            <img src="/assets/center_piece.png" alt="Side Design" className="w-full h-full object-contain" />
          </div>
          <div className="col-start-2 col-end-4 row-start-2 row-end-4 flex items-center justify-center z-10">
            <img src="/assets/btn1.png" alt="Side Design" className="w-[17vw] h-[17vh] object-contain" />
          </div>
          <div className="col-start-3 col-end-4 row-start-4 row-end-7 flex items-center justify-center z-10">
            <img src="/assets/btn2.png" alt="Side Design" className="w-[17vw] h-[17vh] object-contain" />
          </div>
          <div className="col-start-4 col-end-5 row-start-6 row-end-8 flex items-center justify-center z-10">
            <img src="/assets/btn3.png" alt="Side Design" className="w-[17vw] h-[17vh] object-contain" />
          </div>


          <div className="col-start-7 col-end-9 row-start-2 row-end-4 flex items-center justify-center z-10">
            <img src="/assets/btn4.png" alt="Side Design" className="w-[17vw] h-[17vh] object-contain" />
          </div>
          <div className="col-start-7 col-end-8 row-start-4 row-end-7 flex items-center justify-center z-10">
            <img src="/assets/btn5.png" alt="Side Design" className="w-[17vw] h-[17vh] object-contain" />
          </div>
          <div className="col-start-6 col-end-7 row-start-6 row-end-8 flex items-center justify-center z-10">
            <img src="/assets/btn6.png" alt="Side Design" className="w-[17vw] h-[17vh] object-contain" />
          </div>
          <div className="col-start-5 col-end-6 row-start-2 row-end-3 flex flex-col items-center justify-center z-10">
            {/* <img src="/assets/btn6.png" alt="Side Design" className="w-[17vw] h-[17vh] object-contain" /> */}
            <div className='text-4xl text-yellow-500' >Dealer</div>
            <div className='text-2xl text-yellow-500' >Table : {gameState.table_number}</div>
          </div>
          <footer className="col-start-1 col-end-10 row-start-8 row-end-10 flex justify-center items-center relative">
            <img
              src="/assets/wood.png"
              alt="Wood Background"
              className="absolute inset-0 w-full h-full object-cover rotate-180 z-0"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="text-4xl text-yellow-500">Bets</div>
              <div className="text-2xl text-yellow-500">Max : {gameState.max_bet}</div>
              <div className="text-2xl text-yellow-500">Min : {gameState.min_bet}</div>
            </div>
          </footer>
        </div>
      </div>
      <div className='absolute bottom-0 text-center'>This is the result display screen. All table results and managements decision will be final.</div>
    </div>
  );
};

export default StatsPage;
