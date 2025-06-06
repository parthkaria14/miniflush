# 3 Patti Game Frontend

A Next.js-based frontend for the 3 Patti card game, featuring both dealer and player views with real-time WebSocket communication.

## Features

- Real-time game state updates via WebSocket
- Dealer view with game controls
  - Automatic and manual modes
  - Player management
  - Card dealing and reveal controls
- Player view for individual hands
- Responsive design with Tailwind CSS
- TypeScript support

## Prerequisites

- Node.js 18.17 or later
- Python WebSocket server running (`server.py`)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser for the dealer view

4. Click "Open Player View" or navigate to [http://localhost:3000/player](http://localhost:3000/player) for the player view

## Game Modes

### Automatic Mode
- Cards are dealt automatically
- Game flow is managed by the server

### Manual Mode
- Dealer can manually select and add cards
- Full control over game progression

## Project Structure

```
src/
  ├── app/                 # Next.js app directory
  │   ├── page.tsx         # Dealer view
  │   ├── player/          # Player view
  │   └── layout.tsx       # Root layout
  ├── components/          # React components
  │   ├── Card.tsx         # Card display
  │   ├── PlayerHand.tsx   # Player hand display
  │   └── CardSelector.tsx # Manual card selection
  └── contexts/            # React contexts
      └── WebSocketContext.tsx # WebSocket state management
```