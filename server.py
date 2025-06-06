import asyncio
import websockets
import json
import motor.motor_asyncio
from datetime import datetime
import random
import asyncio
import logging
from pymongo.errors import ServerSelectionTimeoutError

# Setup logging
logging.basicConfig(level=logging.INFO)

MONGO_URI = "mongodb://localhost:27017"  # or your Atlas URI
DB_NAME = "game_db"
COLLECTION_NAME = "game_wins"

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]
wins_collection = db[COLLECTION_NAME]

connected_clients = set()


# Global game state
game_state = {
    "dealer_hand": [],
    "players": {
        "player1": {"hand": [], "active": False, "result": None},
        "player2": {"hand": [], "active": False, "result": None},
        "player3": {"hand": [], "active": False, "result": None},
        "player4": {"hand": [], "active": False, "result": None},
        "player5": {"hand": [], "active": False, "result": None},
        "player6": {"hand": [], "active": False, "result": None},
    },
    "deck": [],
    "burned_cards": [],
    "game_phase": "waiting", # waiting, dealing, revealed, finished
    "winners": [],
    "min_bet": 10,
    "max_bet": 1000,
    "table_number": 1,
    "current_dealing_player": None,
    "cards_dealt": 0
}

# Hand rankings for Mini Flush (Teen Patti)
HAND_RANKINGS = {
    "trail": 7,           # Three of a Kind
    "pure_sequence": 6,   # Straight Flush
    "sequence": 5,        # Straight
    "color": 4,           # Flush
    "pair": 3,            # Pair
    "high_card": 2        # High Card
}

def create_deck():
    """Creates and shuffles 6 standard decks for Mini Flush."""
    ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]
    suits = ["S", "D", "C", "H"]
    full_deck = [rank + suit for rank in ranks for suit in suits]
    # Use 6 decks as specified in the game rules
    
    random.shuffle(full_deck)
    return full_deck


def get_card_value(card):
    """Gets numeric value of card for comparison."""
    rank = card[:-1]
    if rank == "A":
        return 14  # Ace high
    elif rank == "K":
        return 13
    elif rank == "Q":
        return 12
    elif rank == "J":
        return 11
    elif rank == "T":
        return 10
    else:
        return int(rank)
    
def get_card_suit(card):
    """Gets suit of card."""
    return card[-1]

def evaluate_hand(hand):
   
    if len(hand) != 3:
        return ("high_card", 0)
    
    # Sort cards by value for easier evaluation
    values = sorted([get_card_value(card) for card in hand], reverse=True)
    suits = [get_card_suit(card) for card in hand]
    
    # trail
    if values[0] == values[1] == values[2]:
        return ("trail", values[0])
    
    # sequences logic
    is_sequence = (values[0] - values[1] == 1 and values[1] - values[2] == 1)
    
    # Special case for A-2-3 sequence (lowest straight)
    if sorted(values) == [2, 3, 14]:
        is_sequence = True
        sequence_high = 3  # A-2-3 is treated as 3-high sequence
    else:
        sequence_high = values[0] if is_sequence else 0
    
    # color
    is_flush = suits[0] == suits[1] == suits[2]
    
    # Pure Sequence
    if is_sequence and is_flush:
        return ("pure_sequence", sequence_high)
    
    # Sequence 
    if is_sequence:
        return ("sequence", sequence_high)
    
    # Color (Flush) - use multipliers for proper comparison within flush category
    if is_flush:
        return ("color", values[0] * 10000 + values[1] * 100 + values[2])
    
    # Pair - put pair value first, kicker second
    if values[0] == values[1]:
        return ("pair", values[0] * 100 + values[2])  # pair of values[0], kicker values[2]
    elif values[1] == values[2]:
        return ("pair", values[1] * 100 + values[0])  # pair of values[1], kicker values[0]
    
    # High Card - use multipliers to ensure proper hierarchy (highest card dominates)
    return ("high_card", values[0] * 10000 + values[1] * 100 + values[2])


def compare_hands(player_hand, dealer_hand):
    """Compares player hand vs dealer hand. Returns 1 if player wins, -1 if dealer wins, 0 if tie."""
    player_rank, player_value = evaluate_hand(player_hand)
    dealer_rank, dealer_value = evaluate_hand(dealer_hand)
    
    player_score = HAND_RANKINGS[player_rank]
    dealer_score = HAND_RANKINGS[dealer_rank]
    
    if player_score > dealer_score:
        return 1
    elif player_score < dealer_score:
        return -1
    else:
        # Same rank, compare values
        if player_value > dealer_value:
            return 1
        elif player_value < dealer_value:
            return -1
        else:
            return 0

async def handle_connection(websocket):
    """Handles new player connections."""
    connected_clients.add(websocket)
    print(f"Client connected: {websocket.remote_address}")

    # Send current game state to new client
    await websocket.send(json.dumps({
        "action": "update_game",
        "game_state": {
            "dealer_hand": game_state["dealer_hand"],
            "players": game_state["players"],
            "game_phase": game_state["game_phase"],
            "winners": game_state["winners"],
            "min_bet": game_state["min_bet"],
            "max_bet": game_state["max_bet"],
            "table_number": game_state["table_number"]
        }
    }))

    try:
        async for message in websocket:
            data = json.loads(message)
            print(f"Received: {data}")

            if data["action"] == "shuffle_deck":
                await handle_shuffle_deck()
            elif data["action"] == "burn_card":
                await handle_burn_card()
            elif data["action"] == "deal_cards":
                await handle_deal_cards()
            elif data["action"] == "add_player":
                await handle_add_player(data.get("player"))
            elif data["action"] == "remove_player":
                await handle_remove_player(data.get("player"))
            elif data["action"] == "reset_table":
                await handle_reset_table()
            elif data["action"] == "undo_last":
                await handle_undo_last()
            elif data["action"] == "reveal_hands":
                await handle_reveal_hands()
            elif data["action"] == "add_card":
                await handle_add_card(data["card"], data.get("target", "dealer"))
            elif data["action"] == "bet_changed":
                await handle_change_bet(data["minBet"], data["maxBet"])
            elif data["action"] == "table_number_set":
                await handle_table_number(data["tableNumber"])
            elif data["action"] == "delete_win":
                await delete_win()
            elif data["action"] == "delete_all_wins":
                await delete_all_wins()
            elif data["action"] == "clear_records":
                await handle_clear_records()
            elif data["action"] == "start_automatic":
                await start_automatic()
            elif data["action"] == "start_manual":
                await start_manual()

    except websockets.ConnectionClosed:
        print(f"Client disconnected: {websocket.remote_address}")
    finally:
        connected_clients.remove(websocket)


async def handle_shuffle_deck():
    """Shuffles the deck and optionally burns a card."""
    global game_state
    game_state["deck"] = create_deck()
    game_state["burned_cards"] = []
    
    # #burn the top card
    # if game_state["deck"]:
    #     burned_card = game_state["deck"].pop(0)
    #     game_state["burned_cards"].append(burned_card)
    #     print(f"Deck shuffled, burned card: {burned_card}")
    
    await broadcast({
        "action": "deck_shuffled",
        "deck_size": len(game_state["deck"]),
        "burned_cards": len(game_state["burned_cards"])
    })

# async def handle_burn_card():
#     """Burns the top card from deck."""
#     global game_state
#     if game_state["deck"]:
#         burned_card = game_state["deck"].pop(0)
#         game_state["burned_cards"].append(burned_card)
        
#         await broadcast({
#             "action": "card_burned",
#             "deck_size": len(game_state["deck"]),
#             "burned_cards": len(game_state["burned_cards"])
#         })

async def handle_deal_cards():
    """Deals 3 cards to each active player and dealer."""
    global game_state
    
    if len(game_state["deck"]) < 52:
        await broadcast({"action": "error", "message": "Not enough cards in deck"})
        return
    
    # Reset hands
    game_state["dealer_hand"] = []
    for player in game_state["players"].values():
        player["hand"] = []
        player["result"] = None
    
    # Deal 3 cards to dealer
    for _ in range(3):
        if game_state["deck"]:
            game_state["dealer_hand"].append(game_state["deck"].pop(0))
    
    # Deal 3 cards to each active player
    for player_id, player in game_state["players"].items():
        if player["active"]:
            for _ in range(3):
                if game_state["deck"]:
                    player["hand"].append(game_state["deck"].pop(0))
    
    game_state["game_phase"] = "dealing"
    game_state["winners"] = []
    
    await broadcast({
        "action": "cards_dealt",
        "game_state": {
            "dealer_hand": game_state["dealer_hand"],
            "players": game_state["players"],
            "game_phase": game_state["game_phase"],
            "deck_size": len(game_state["deck"])
        }
    })

async def handle_add_player(player_id=None):
    """Adds a player to the game."""
    global game_state
    
    if player_id is None:
        # Find first inactive player
        for pid, player in game_state["players"].items():
            if not player["active"]:
                player_id = pid
                break
    
    if player_id and player_id in game_state["players"]:
        game_state["players"][player_id]["active"] = True
        
        await broadcast({
            "action": "player_added",
            "player_id": player_id,
            "players": game_state["players"]
        })

async def handle_remove_player(player_id):
    """Removes a player from the game."""
    global game_state
    
    if player_id in game_state["players"]:
        game_state["players"][player_id]["active"] = False
        game_state["players"][player_id]["hand"] = []
        game_state["players"][player_id]["result"] = None
        
        await broadcast({
            "action": "player_removed",
            "player_id": player_id,
            "players": game_state["players"]
        })

async def handle_reset_table():
    """Resets the entire game state."""
    global game_state
    
    game_state["dealer_hand"] = []
    for player in game_state["players"].values():
        player["hand"] = []
        player["result"] = None
    game_state["game_phase"] = "waiting"
    game_state["winners"] = []
    game_state["current_dealing_player"] = None
    game_state["cards_dealt"] = 0
    
    await broadcast({
        "action": "table_reset",
        "game_state": {
            "dealer_hand": game_state["dealer_hand"],
            "players": game_state["players"],
            "game_phase": game_state["game_phase"],
            "winners": game_state["winners"]
        }
    })


async def handle_undo_last():
    """Undoes the last action (simplified version)."""
    global game_state
    
    if game_state["game_phase"] == "revealed":
        # Undo reveal
        game_state["game_phase"] = "dealing"
        game_state["winners"] = []
        for player in game_state["players"].values():
            player["result"] = None
    elif game_state["game_phase"] == "dealing":
        # Undo deal
        game_state["dealer_hand"] = []
        for player in game_state["players"].values():
            player["hand"] = []
        game_state["game_phase"] = "waiting"
    
    await broadcast({
        "action": "undo_completed",
        "game_state": {
            "dealer_hand": game_state["dealer_hand"],
            "players": game_state["players"],
            "game_phase": game_state["game_phase"],
            "winners": game_state["winners"]
        }
    })

async def handle_reveal_hands():
    """Reveals all hands and calculates winners."""
    global game_state
    
    game_state["game_phase"] = "revealed"
    game_state["winners"] = []
    
    # Get dealer's hand combination
    dealer_combination, _ = evaluate_hand(game_state["dealer_hand"])
    game_state["dealer_combination"] = dealer_combination
    
    # Compare each active player against dealer
    for player_id, player in game_state["players"].items():
        if player["active"] and len(player["hand"]) == 3:
            player_combination, _ = evaluate_hand(player["hand"])
            player["combination"] = player_combination
            result = compare_hands(player["hand"], game_state["dealer_hand"])
            
            if result == 1:
                player["result"] = "win"
                game_state["winners"].append(player_id)
            elif result == -1:
                player["result"] = "lose"
            else:
                player["result"] = "draw"
    
    # Record wins in database
    if game_state["winners"]:
        await record_wins(game_state["winners"])
    
    await broadcast({
        "action": "hands_revealed",
        "game_state": {
            "dealer_hand": game_state["dealer_hand"],
            "players": game_state["players"],
            "game_phase": game_state["game_phase"],
            "winners": game_state["winners"]
        }
    })   

async def handle_add_card(card, target="dealer"):
    """Adds a specific card to dealer or player hand for manual corrections."""
    global game_state
    
    # Check for duplicate cards across all hands and burned cards
    all_cards = game_state["dealer_hand"] + game_state["burned_cards"]
    for player in game_state["players"].values():
        all_cards.extend(player["hand"])
    
    if card in all_cards:
        await broadcast({"action": "duplicate_card", "card": card})
        print(f"Duplicate card detected: {card}")
        return
    
    # Add card to specified target
    if target == "dealer":
        if len(game_state["dealer_hand"]) < 3:
            game_state["dealer_hand"].append(card)
        else:
            await broadcast({"action": "error", "message": "Dealer already has 3 cards"})
            return
    else:
        # target should be player1, player2, etc.
        if target in game_state["players"]:
            if game_state["players"][target]["active"]:
                if len(game_state["players"][target]["hand"]) < 3:
                    game_state["players"][target]["hand"].append(card)
                else:
                    await broadcast({"action": "error", "message": f"{target} already has 3 cards"})
                    return
            else:
                await broadcast({"action": "error", "message": f"{target} is not active"})
                return
        else:
            await broadcast({"action": "error", "message": f"Invalid target: {target}"})
            return
    
    await broadcast({
        "action": "card_added",
        "card": card,
        "target": target,
        "game_state": {
            "dealer_hand": game_state["dealer_hand"],
            "players": game_state["players"]
        }
    })

async def start_automatic():
    """Automatically plays a complete round."""
    global game_state
    
    # Step 1: Shuffle and burn
    await handle_shuffle_deck()
    await asyncio.sleep(1)
    
    # Step 2: Deal all cards
    await handle_deal_cards()
    await asyncio.sleep(2)
    
    # Step 3: Reveal hands
    # await handle_reveal_hands()

async def start_manual():
    """Starts manual mode - just shuffle the deck."""
    await handle_shuffle_deck()

async def handle_change_bet(min_bet, max_bet):
    """Changes the minimum and maximum bet values."""
    global game_state
    game_state["min_bet"] = min_bet
    game_state["max_bet"] = max_bet
    
    await broadcast({
        "action": "bet_changed",
        "min_bet": min_bet,
        "max_bet": max_bet
    })

async def handle_clear_records():
    """Clears all game records from the database."""
    try:
        await wins_collection.delete_many({})
        await broadcast({"action": "records_cleared", "message": "All game records have been cleared."})
    except Exception as e:
        logging.error(f"Error clearing records: {e}")
        await broadcast({"action": "error", "message": "Failed to clear game records."})

async def handle_table_number(table_number):
    """Sets the table number."""
    global game_state
    game_state["table_number"] = table_number
    
    await broadcast({
        "action": "table_number_set",
        "tableNumber": table_number
    })

async def record_wins(winners):
    """Records game wins in MongoDB."""
    win_record = {
        "winners": winners,
        "dealer_hand": game_state["dealer_hand"],
        "dealer_combination": game_state.get("dealer_combination", "unknown"),  # Add dealer combination
        "players": {pid: player for pid, player in game_state["players"].items() if player["active"]},
        "timestamp": datetime.utcnow(),
    }
    await wins_collection.insert_one(win_record)
    print(f"Recorded wins: {win_record}")

async def delete_win():
    """Deletes the most recent game win from MongoDB."""
    last_win = await wins_collection.find_one(sort=[("timestamp", -1)])
    if last_win:
        result = await wins_collection.delete_one({"_id": last_win["_id"]})
        if result.deleted_count > 0:
            print(f"Deleted last win: {last_win}")
            await broadcast({"action": "delete_win"})
        else:
            print("Failed to delete the last win.")
    else:
        print("No win records found to delete.")

async def delete_all_wins():
    """Deletes all game wins from MongoDB."""
    result = await wins_collection.delete_many({})
    if result.deleted_count > 0:
        print(f"Deleted all wins: {result.deleted_count} records")
        await broadcast({"action": "delete_all_wins"})
    else:
        print("No win records found to delete.")

async def broadcast(message):
    """Sends a message to all connected clients."""
    if connected_clients:
        await asyncio.gather(
            *[client.send(json.dumps(message)) for client in connected_clients],
            return_exceptions=True
        )

async def main():
    """Starts the WebSocket server."""
    async with websockets.serve(handle_connection, "localhost", 6789):
        print("Mini Flush WebSocket server running on ws://localhost:6789")
        await asyncio.Future()


async def check_connection():
    try:
        await client.admin.command('ping')
        logging.info("✅ Connected to MongoDB successfully.")
        logging.info(f"Using database: {DB_NAME}, collection: {COLLECTION_NAME}")
    except ServerSelectionTimeoutError as e:
        logging.error("❌ Could not connect to MongoDB: %s", e)
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())



