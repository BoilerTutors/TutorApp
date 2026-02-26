from fastapi import WebSocket


class NotificationConnectionManager:
    """
    Dedicated WebSocket manager for notifications.
    Kept separate from chat sockets so notification realtime logic remains isolated.
    """

    def __init__(self) -> None:
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        await websocket.accept()
        self.active_connections.setdefault(user_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int) -> None:
        if user_id not in self.active_connections:
            return
        if websocket in self.active_connections[user_id]:
            self.active_connections[user_id].remove(websocket)
        if not self.active_connections[user_id]:
            del self.active_connections[user_id]

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        connections = list(self.active_connections.get(user_id, []))
        if not connections:
            return

        stale: list[WebSocket] = []
        for connection in connections:
            try:
                await connection.send_json(payload)
            except Exception:
                stale.append(connection)

        for connection in stale:
            self.disconnect(connection, user_id)


notification_ws_manager = NotificationConnectionManager()
