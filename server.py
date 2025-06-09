import asyncio
import websockets
import json
import motor.motor_asyncio
from datetime import datetime
import random
import asyncio
import logging
from pymongo.errors import ServerSelectionTimeoutError
import copy

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

# Add state history for undo functionality
state_history = []
MAX_HISTORY = 10  # Keep last 10 states

# Hand rankings for Mini Flush HIGH side bet
HIGH_HAND_RANKINGS = {
    "three_of_a_kind": 5,     # Three of a Kind
    "straight_flush": 4,      # Straight Flush
    "straight": 3,            # Straight
    "flush": 2,               # Flush
    "pair": 1,                # Pair
    "high_card": 0            # High Card (doesn't win HIGH side bet)
}

# LOW side bet conditions
LOW_HAND_CONDITIONS = {
    "5_top": 5,    # All cards ≤ 5
    "6_top": 6,    # All cards ≤ 6
    "7_top": 7,    # All cards ≤ 7
    "8_top": 8,    # All cards ≤ 8
    "9_top": 9,    # All cards ≤ 9
    "10_top": 10   # All cards ≤ 10
}

def save_state():
    """Saves current game state to history for undo functionality."""
    global state_history, game_state
    
    # Create a deep copy of the current state
    state_copy = copy.deepcopy(game_state)
    state_history.append(state_copy)
    
    # Keep only the last MAX_HISTORY states
    if len(state_history) > MAX_HISTORY:
        state_history.pop(0)
    
    print(f"State saved. History length: {len(state_history)}")

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

def evaluate_high_hand(hand):
    """Evaluates hand for HIGH side bet."""
    if len(hand) != 3:
        return ("high_card", 0)
    
    # Sort cards by value for easier evaluation
    values = sorted([get_card_value(card) for card in hand], reverse=True)
    suits = [get_card_suit(card) for card in hand]
    
    # Three of a Kind
    if values[0] == values[1] == values[2]:
        return ("three_of_a_kind", values[0])
    
    # Check for sequences
    is_sequence = (values[0] - values[1] == 1 and values[1] - values[2] == 1)
    
    # Special case for A-2-3 sequence (lowest straight)
    if sorted(values) == [2, 3, 14]:
        is_sequence = True
        sequence_high = 3  # A-2-3 is treated as 3-high sequence
    else:
        sequence_high = values[0] if is_sequence else 0
    
    # Check for flush
    is_flush = suits[0] == suits[1] == suits[2]
    
    # Straight Flush
    if is_sequence and is_flush:
        return ("straight_flush", sequence_high)
    
    # Straight
    if is_sequence:
        return ("straight", sequence_high)
    
    # Flush
    if is_flush:
        return ("flush", values[0] * 10000 + values[1] * 100 + values[2])
    
    # Pair
    if values[0] == values[1]:
        return ("pair", values[0] * 100 + values[2])  # pair of values[0], kicker values[2]
    elif values[1] == values[2]:
        return ("pair", values[1] * 100 + values[0])  # pair of values[1], kicker values[0]
    
    # High Card (doesn't win HIGH side bet)
    return ("high_card", values[0] * 10000 + values[1] * 100 + values[2])

def evaluate_low_hand(hand):
    """Evaluates a hand for LOW side bet conditions. Ace is always high (14)."""
    # First check if it's a high hand
    high_combo, _ = evaluate_high_hand(hand)
    if high_combo != "high_card":
        return None  # Not a low hand if it has a high combination
    
    # Convert cards to numeric values, treating Ace as 14 (high)
    values = []
    for card in hand:
        rank = card[0]
        if rank == 'A':
            values.append(14)  # Ace is always high for low hand
        elif rank == 'T':
            values.append(10)
        elif rank == 'J':
            values.append(11)
        elif rank == 'Q':
            values.append(12)
        elif rank == 'K':
            values.append(13)
        else:
            values.append(int(rank))
    
    # Check if all cards are ≤ 10 (Ace will be 14, so will not qualify)
    if all(v <= 10 for v in values):
        highest_card = max(values)
        if highest_card <= 5:
            return "5_top"
        elif highest_card <= 6:
            return "6_top"
        elif highest_card <= 7:
            return "7_top"
        elif highest_card <= 8:
            return "8_top"
        elif highest_card <= 9:
            return "9_top"
        elif highest_card == 10:
            return "10_top"  # This will be treated as a push
    
    return "no_combination"  # Return this when no low condition is met

def dealer_qualifies(dealer_hand):
    """Checks if dealer qualifies for ANTE bet."""
    if len(dealer_hand) != 3:
        return False
    
    # Get dealer's hand combination
    dealer_combo, _ = evaluate_high_hand(dealer_hand)
    
    # If dealer has any of these combinations, they automatically qualify
    if dealer_combo in ["three_of_a_kind", "straight_flush", "straight", "flush", "pair"]:
        return True
    
    # If dealer only has high_card, check if it's Queen-high or better
    if dealer_combo == "high_card":
        values = [get_card_value(card) for card in dealer_hand]
        highest_card = max(values)
        # Queen = 12, so dealer needs 12 or higher for high card
        return highest_card >= 12
    
    return False

def compare_hands_ante(player_hand, dealer_hand):
    """Compares player hand vs dealer hand for ANTE bet."""
    # First check if dealer qualifies
    if not dealer_qualifies(dealer_hand):
        return "dealer_no_qualify"
    
    player_rank, player_value = evaluate_high_hand(player_hand)
    dealer_rank, dealer_value = evaluate_high_hand(dealer_hand)
    
    player_score = HIGH_HAND_RANKINGS[player_rank]
    dealer_score = HIGH_HAND_RANKINGS[dealer_rank]
    
    if player_score > dealer_score:
        return "player_wins"
    elif player_score < dealer_score:
        return "dealer_wins"
    else:
        # Same rank, compare values
        if player_value > dealer_value:
            return "player_wins"
        elif player_value < dealer_value:
            return "dealer_wins"
        else:
            return "tie"

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
            elif data["action"] == "player_played":
                await handle_player_played(data.get("player"))
            elif data["action"] == "player_surrendered":
                await handle_player_surrendered(data.get("player"))

    except websockets.ConnectionClosed:
        print(f"Client disconnected: {websocket.remote_address}")
    finally:
        connected_clients.remove(websocket)

async def handle_shuffle_deck():
    """Shuffles the deck and optionally burns a card."""
    global game_state
    
    # Save state before making changes
    save_state()
    
    game_state["deck"] = create_deck()
    game_state["burned_cards"] = []
    
    await broadcast({
        "action": "deck_shuffled",
        "deck_size": len(game_state["deck"]),
        "burned_cards": len(game_state["burned_cards"])
    })

async def handle_deal_cards():
    """Deals 3 cards to each active player and dealer."""
    global game_state
    
    if len(game_state["deck"]) < 52:
        await broadcast({"action": "error", "message": "Not enough cards in deck"})
        return
    
    # Save state before making changes
    save_state()
    
    # Reset hands
    game_state["dealer_hand"] = []
    for player in game_state["players"].values():
        player["hand"] = []
        player["result"] = None
        player["has_acted"] = False # Initialize has_acted for each player
        # Clear all combination types if they exist
        for key in ["high_combination", "low_combination", "ante_result"]:
            if key in player:
                del player[key]
    
    # Clear dealer combinations if they exist
    for key in ["dealer_combination", "dealer_qualifies"]:
        if key in game_state:
            del game_state[key]

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
    """Activates a player in the game."""
    global game_state
    
    # Check if we already have 6 active players
    active_players = sum(1 for player in game_state["players"].values() if player["active"])
    if active_players >= 6:
        await broadcast({
            "action": "error",
            "message": "Maximum of 6 players allowed"
        })
        return
    
    # Save state before making changes
    save_state()
    
    if player_id is None:
        # Find first inactive player
        for pid, player in game_state["players"].items():
            if not player["active"]:
                player_id = pid
                break
    
    # Validate player number is between 1-6
    if player_id:
        try:
            player_num = int(player_id.replace("player", ""))
            if player_num < 1 or player_num > 6:
                await broadcast({
                    "action": "error",
                    "message": "Player number must be between 1 and 6"
                })
                return
        except ValueError:
            await broadcast({
                "action": "error",
                "message": "Invalid player number"
            })
            return
    
    if player_id and player_id in game_state["players"]:
        if game_state["players"][player_id]["active"]:
            await broadcast({
                "action": "error",
                "message": f"{player_id} is already active"
            })
            return
            
        game_state["players"][player_id]["active"] = True
        
        await broadcast({
            "action": "player_added",
            "player_id": player_id,
            "players": game_state["players"]
        })

async def handle_remove_player(player_id):
    """Removes a player from the game."""
    global game_state
    
    # Save state before making changes
    save_state()
    
    if player_id in game_state["players"]:
        game_state["players"][player_id]["active"] = False
        game_state["players"][player_id]["hand"] = []
        game_state["players"][player_id]["result"] = None
        # Clear all combination types
        for key in ["high_combination", "low_combination", "ante_result"]:
            if key in game_state["players"][player_id]:
                del game_state["players"][player_id][key]
        
        await broadcast({
            "action": "player_removed",
            "player_id": player_id,
            "players": game_state["players"]
        })

async def handle_reset_table():
    """Resets the entire game state."""
    global game_state, state_history
    
    # Save state before making changes
    save_state()
    
    game_state["dealer_hand"] = []
    for player in game_state["players"].values():
        player["hand"] = []
        player["result"] = None
        player["has_acted"] = False # Initialize has_acted for each player
        # Clear all combination types
        for key in ["high_combination", "low_combination", "ante_result"]:
            if key in player:
                del player[key]
    
    # Clear dealer combinations
    for key in ["dealer_combination", "dealer_qualifies"]:
        if key in game_state:
            del game_state[key]
        
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
    """Undoes the last action by restoring previous state."""
    global game_state, state_history
    
    if not state_history:
        await broadcast({
            "action": "error", 
            "message": "No previous state to undo to"
        })
        print("No previous state available for undo")
        return
    
    # Restore the last saved state
    previous_state = state_history.pop()
    game_state = copy.deepcopy(previous_state)
    
    print(f"Undid last action. History length: {len(state_history)}")
    
    await broadcast({
        "action": "undo_completed",
        "game_state": {
            "dealer_hand": game_state["dealer_hand"],
            "players": game_state["players"],
            "game_phase": game_state["game_phase"],
            "winners": game_state["winners"],
            "deck_size": len(game_state["deck"]),
            "burned_cards": len(game_state["burned_cards"])
        }
    })

async def handle_reveal_hands():
    """Reveals all hands and calculates winners for all bet types."""
    global game_state
    
    # Save state before making changes
    save_state()
    
    game_state["game_phase"] = "revealed"
    game_state["winners"] = []
    
    # Evaluate dealer's hand
    dealer_high_combo, _ = evaluate_high_hand(game_state["dealer_hand"])
    game_state["dealer_combination"] = dealer_high_combo
    game_state["dealer_qualifies"] = dealer_qualifies(game_state["dealer_hand"])
    
    # Evaluate each active player
    for player_id, player in game_state["players"].items():
        if player["active"] and len(player["hand"]) == 3:
            # HIGH side bet evaluation
            player_high_combo, _ = evaluate_high_hand(player["hand"])
            player["combination"] = player_high_combo
            
            # LOW side bet evaluation
            low_combo = evaluate_low_hand(player["hand"])
            if low_combo and low_combo != "no_combination":
                if low_combo == "10_top":
                    player["result"] = "push"  # Special case for 10 top
                else:
                    # If it's a low hand, show the low combination instead of high card
                    player["combination"] = low_combo
            elif low_combo == "no_combination":
                # If no low combination and no high combination, player loses
                player["result"] = "lose"
                player["combination"] = "high_card"  # Show as high card but it's a losing hand
            
            # ANTE bet evaluation
            ante_result = compare_hands_ante(player["hand"], game_state["dealer_hand"])
            player["ante_result"] = ante_result
            
            # Determine overall result
            if player["result"] == "push":  # Keep push result for 10 top
                pass
            elif player["result"] == "lose":  # Keep lose result for no combinations
                pass
            elif ante_result == "player_wins":
                player["result"] = "win"
                game_state["winners"].append(player_id)
            elif ante_result == "dealer_no_qualify":
                player["result"] = "ante"
            elif ante_result == "tie":
                player["result"] = "tie"
            else:
                player["result"] = "lose"
    
    # Record wins in database
    if game_state["winners"]:
        await record_wins(game_state["winners"])
    
    await broadcast({
        "action": "hands_revealed",
        "game_state": {
            "dealer_hand": game_state["dealer_hand"],
            "players": game_state["players"],
            "game_phase": game_state["game_phase"],
            "winners": game_state["winners"],
            "dealer_qualifies": game_state["dealer_qualifies"],
            "dealer_combination": game_state["dealer_combination"]
        }
    })

async def handle_add_card(card, target="dealer"):
    """Adds a specific card to dealer or player hand for manual corrections."""
    global game_state
    
    # Save state before making changes
    save_state()
    
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
    
    # Save state before making changes
    save_state()
    
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
    
    # Save state before making changes
    save_state()
    
    game_state["table_number"] = table_number
    
    await broadcast({
        "action": "table_number_set",
        "table_number": game_state["table_number"]
    })

async def handle_player_played(player_id):
    global game_state
    if player_id and player_id in game_state["players"]:
        game_state["players"][player_id]["has_acted"] = True
        await broadcast({
            "action": "player_acted",
            "player_id": player_id,
            "action_type": "play",
            "game_state": game_state
        })

async def handle_player_surrendered(player_id):
    global game_state
    if player_id and player_id in game_state["players"]:
        game_state["players"][player_id]["has_acted"] = True
        await broadcast({
            "action": "player_acted",
            "player_id": player_id,
            "action_type": "surrender",
            "game_state": game_state
        })

async def record_wins(winners):
    """Records game wins in MongoDB."""
    win_record = {
        "winners": winners,
        "dealer_hand": game_state["dealer_hand"],
        "dealer_combination": game_state.get("dealer_combination", "unknown"),
        "dealer_qualifies": game_state.get("dealer_qualifies", False),
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