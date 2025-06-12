'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { NotificationType } from '@/components/Notification';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface GameState {
  dealer_hand: string[];
  dealer_combination?: string;
  players: {
    [key: string]: {
      hand: string[];
      active: boolean;
      result: string | null;
      combination?: string;
      has_acted?: boolean;
      action_type?: string;
      high_combination?: string;
      low_combination?: string;
      main_bet_result?: string;
      high_bet_result?: string;
      low_bet_result?: string;
    };
  };
  game_phase: string;
  winners: string[];
  min_bet: number;
  max_bet: number;
  table_number: number;
  dealer_qualifies?: boolean;
}

interface WebSocketContextType {
  ws: WebSocket | null;
  gameState: GameState;
  sendMessage: (message: any) => void;
  isConnected: boolean;
  notifications: Notification[];
  addNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
}

const defaultGameState: GameState = {
  dealer_hand: [],
  players: {},
  game_phase: 'waiting',
  winners: [],
  min_bet: 10,
  max_bet: 1000,
  table_number: 1
};

const WebSocketContext = createContext<WebSocketContextType>({
  ws: null,
  gameState: defaultGameState,
  sendMessage: () => {},
  isConnected: false,
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {}
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [previousGameState, setPreviousGameState] = useState<GameState | null>(null);

  const addNotification = (message: string, type: NotificationType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const determineUndoneAction = (oldState: GameState, newState: GameState): string => {
    // Check if it was a reveal hands action
    if (oldState.game_phase === 'revealed' && newState.game_phase !== 'revealed') {
      return 'Hand reveal';
    }

    // Check if it was a deal cards action
    const oldDealerCards = oldState.dealer_hand.length;
    const newDealerCards = newState.dealer_hand.length;
    if (oldDealerCards === 3 && newDealerCards === 0) {
      return 'Card deal';
    }

    // Check if it was a player action (play/surrender)
    for (const [playerId, oldPlayer] of Object.entries(oldState.players)) {
      const newPlayer = newState.players[playerId];
      if (oldPlayer.has_acted && !newPlayer.has_acted) {
        return `${playerId}'s ${oldPlayer.action_type || 'action'}`;
      }
    }

    // Check if it was a card addition
    for (const [playerId, oldPlayer] of Object.entries(oldState.players)) {
      const newPlayer = newState.players[playerId];
      if (oldPlayer.hand.length > newPlayer.hand.length) {
        return `Card addition to ${playerId}`;
      }
    }
    if (oldState.dealer_hand.length > newState.dealer_hand.length) {
      return 'Card addition to dealer';
    }

    // Check if it was a player add/remove
    for (const [playerId, oldPlayer] of Object.entries(oldState.players)) {
      const newPlayer = newState.players[playerId];
      if (oldPlayer.active && !newPlayer.active) {
        return `Player ${playerId} removal`;
      }
      if (!oldPlayer.active && newPlayer.active) {
        return `Player ${playerId} addition`;
      }
    }

    // Default case
    return 'Last action';
  };

  useEffect(() => {
    let websocket: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      websocket = new WebSocket('ws://localhost:6789');

      websocket.onopen = () => {
        console.log('Connected to WebSocket');
        setIsConnected(true);
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
      };

      websocket.onclose = () => {
        console.log('Disconnected from WebSocket');
        setIsConnected(false);
        setWs(null);
        addNotification('Disconnected from server', 'error');

        // Attempt to reconnect after 2 seconds
        reconnectTimeout = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 2000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        addNotification('Connection error occurred', 'error');
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.action) {
            case 'update_game':
            case 'cards_dealt':
            case 'hands_revealed':
            case 'player_acted':
            case 'card_added':
              setPreviousGameState(gameState);
              setGameState(data.game_state);
              break;
            case 'player_added':
            case 'player_removed':
              setPreviousGameState(gameState);
              setGameState(prev => ({
                ...prev,
                players: data.players
              }));
              break;
            case 'table_reset':
              setPreviousGameState(gameState);
              setGameState(data.game_state);
              break;
            case 'undo_completed':
              if (previousGameState) {
                const undoneAction = determineUndoneAction(previousGameState, data.game_state);
                addNotification(`Undid ${undoneAction}`, 'info');
              }
              setPreviousGameState(gameState);
              setGameState(data.game_state);
              break;
            case 'duplicate_card':
              addNotification('Duplicate card detected', 'error');
              break;
            case 'error':
              addNotification(data.message, 'error');
              break;
            case 'notification':
              addNotification(data.message, data.type || 'info');
              break;
            default:
              console.log('Unhandled message:', data);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          addNotification('Error processing server message', 'error');
        }
      };

      setWs(websocket);
    }

    connect();

    return () => {
      if (websocket) {
        websocket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const [messageQueue, setMessageQueue] = useState<any[]>([]);

  // Process queued messages when connection is established
  useEffect(() => {
    if (isConnected && messageQueue.length > 0) {
      messageQueue.forEach(message => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
      setMessageQueue([]);
    }
  }, [isConnected, messageQueue, ws]);

  const sendMessage = (message: any) => {
    try {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else {
        console.log('WebSocket not ready, queueing message');
        setMessageQueue(prev => [...prev, message]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageQueue(prev => [...prev, message]);
    }
  };

  return (
    <WebSocketContext.Provider value={{ 
      ws, 
      gameState, 
      sendMessage, 
      isConnected,
      notifications,
      addNotification,
      removeNotification
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};