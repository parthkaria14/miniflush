import Image from "next/image";
import { useWebSocket } from '@/contexts/WebSocketContext';

interface NavbarProps {
  onOpenControlPanel: () => void;
  onActivatePlayer: (playerId: string) => void;
  activePlayers?: string[];
}

const Navbar: React.FC<NavbarProps> = ({ 
  onOpenControlPanel, 
  onActivatePlayer,
  activePlayers = [] 
}) => {
  const { gameState, sendMessage } = useWebSocket();

  return (
    <nav className="relative h-[15vh] w-full overflow-hidden">
      <Image
        src="/assets/wood.png"
        alt="Wood Background"
        fill
        className="object-cover w-full h-full"
        priority
      />
      <div className="relative h-full">
        <div className="flex items-center justify-between h-full -mt-4 px-8">
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
              Table: {gameState.table_number}
            </div>
          </div>
          

          {/* Center Hats */}
          <div className="flex items-center justify-center">
            {[1, 2, 3, 4, 5, 6].map((index) => {
              const playerId = `player${index}`;
              const isActive = activePlayers.includes(playerId);
              return (
                <div
                  key={index}
                  className="w-32 h-32 relative flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => onActivatePlayer(playerId)}
                >
                  <Image
                    src={isActive ? "/assets/whitehat.png" : "/assets/redhat.png"}
                    alt={`Hat ${index}`}
                    width={75}
                    height={75}
                    className="object-contain"
                  />
                </div>
              );
            })}
          </div>

          {/* <div className="flex flex-col">
          <button
              className=" bg-white relative flex items-center justify-center cursor-pointer"
              onClick={() => sendMessage({ action: 'reveal_hands' })}
              // onTouchEnd={() => sendMessage({ action: 'reveal_hands' })}
            >
              Reveal hands
          </button>
          <button
              className=" bg-white relative flex items-center justify-center cursor-pointer"
              onClick={onOpenControlPanel}
              // onTouchEnd={() => sendMessage({ action: 'reveal_hands' })}
            >
              menu
          </button>
          </div> */}
          

          {/* Right Logo */}
          <div
            className="w-32 h-32 relative flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            onClick={onOpenControlPanel} 
            // onTouchEnd={onOpenControlPanel}
          >
            <Image
              src="/assets/menu.png"
              alt="Right Logo"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
