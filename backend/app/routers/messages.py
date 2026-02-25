from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.database import get_db
# Import your CRUD and Schema logic here

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # active_connections stores {pairing_id: [list_of_websockets]}
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, pairing_id: int):
        await websocket.accept()
        if pairing_id not in self.active_connections:
            self.active_connections[pairing_id] = []
        self.active_connections[pairing_id].append(websocket)

    def disconnect(self, websocket: WebSocket, pairing_id: int):
        self.active_connections[pairing_id].remove(websocket)

    async def broadcast(self, message: dict, pairing_id: int):
        if pairing_id in self.active_connections:
            for connection in self.active_connections[pairing_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/chat/{pairing_id}")
async def websocket_endpoint(websocket: WebSocket, pairing_id: int, db: Session = Depends(get_db)):
    await manager.connect(websocket, pairing_id)
    try:
        while True:
            # Receive data from the client
            data = await websocket.receive_json()
            
            # 1. Save to Postgres via your CRUD logic
            # new_msg = crud.messages.create_message(db, content=data['text'], sender_id=data['sender_id'])
            
            # 2. Broadcast to the "Room"
            await manager.broadcast(data, pairing_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, pairing_id)