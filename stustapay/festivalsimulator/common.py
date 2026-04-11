from dataclasses import dataclass

from sftkit.database import Connection

SIMULATOR_ROOT_NODE_NAME = "SIMULATOR"
DEFAULT_SIMULATOR_EVENT_NAME = "SSC-Test"


@dataclass(frozen=True)
class SimulatorEvent:
    node_id: int
    name: str


def get_simulator_event_name(index: int, total_events: int) -> str:
    if total_events < 1:
        raise ValueError("total_events must be positive")
    if index < 0 or index >= total_events:
        raise ValueError("index out of range")

    if total_events == 1:
        return DEFAULT_SIMULATOR_EVENT_NAME

    return f"{DEFAULT_SIMULATOR_EVENT_NAME} {index + 1}"


async def fetch_simulator_events(conn: Connection) -> list[SimulatorEvent]:
    rows = await conn.fetch(
        "select n.id, n.name "
        "from node n "
        "join node parent on parent.id = n.parent "
        "where n.event_id is not null and parent.name = $1 "
        "order by n.id",
        SIMULATOR_ROOT_NODE_NAME,
    )
    return [SimulatorEvent(node_id=int(row["id"]), name=str(row["name"])) for row in rows]
