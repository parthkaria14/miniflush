import Image from "next/image";
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useEffect, useState } from 'react';

interface Client_NavbarProps {

}

const Client_Navbar: React.FC<Client_NavbarProps> = ({ 
}) => {
  const { gameState } = useWebSocket();
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    const formattedId = id.charAt(0).toUpperCase() + id.slice(1).replace(/(\d+)/, ' $1');
    setPlayerId(formattedId);
  }, []);

  return (
    <nav className="relative h-[15vh] w-full overflow-hidden">
      <Image
        src="/assets/wood.png"
        alt="Wood Background"
        fill
        className="object-cover w-full h-full"
        priority
      />
      <div className="relative h-full px-4">
        <div className="flex items-center justify-between h-full mt-0.25 px-8">
          {/* Left Logo */}
          <div className="w-32 h-32 relative flex flex-col items-center justify-center">
            <Image
              src="/assets/mini_flush.png"
              alt="Left Logo"
              width={120}
              height={120}  
              className="object-contain"
            />
            <div className="text-white text-xl mt-2">
              Table: {typeof gameState.table_number === 'string' && gameState.table_number.match(/^(\d+)FT$/) ? `FT-${gameState.table_number.replace('FT', '')}` : `FT-${gameState.table_number}`}
            </div>
          </div>
          

          {/* Center Hats */}
          <div className="w-32 h-32 relative flex flex-col items-center justify-center">
            <Image
              src="/assets/ocean7.png"
              alt="Left Logo"
              width={75}
              height={75}  
              className="object-contain"
            />
            {/* <div className="text-white text-xl mt-2">
              {playerId}
            </div> */}
          </div>

          {/* Right Logo */}
          <div
            className="w-32 h-32 relative flex flex-col items-center justify-center"
          >
            {/* <Image
              src="/assets/menu.png"
              alt="Right Logo"
              width={240}
              height={240}
              className="object-contain"
            /> */}
            <div className="text-2xl text-yellow-500">
                Bets    
            </div>
            <div className="text-xl text-yellow-500">
                Max : {gameState.max_bet}
            </div>
            <div className="text-xl text-yellow-500">
                Min : {gameState.min_bet}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Client_Navbar;
