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
    };
  };
  game_phase: string;
  winners: string[];
  min_bet: number;
  max_bet: number;
  table_number: number;
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

  const addNotification = (message: string, type: NotificationType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
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
              setGameState(data.game_state);
              break;
            case 'player_added':
            case 'player_removed':
              setGameState(prev => ({
                ...prev,
                players: data.players
              }));
              break;
            case 'table_reset':
              setGameState(data.game_state);
              break;
            case 'duplicate_card':
              addNotification(`Duplicate card detected: ${data.card}`, 'error');
              break;
            case 'error':
              addNotification(data.message, 'error');
              break;
            case 'card_added':
              addNotification(`Card ${data.card} added to ${data.target}`, 'success');
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