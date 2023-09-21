import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import requires_user, with_db_transaction
from stustapay.framework.database import Connection

dummy_tree = Node(
    id=1,
    parent=None,
    path="/1",
    parent_ids=[],
    name="root",
    description="",
    allowed_objects_at_node=[],
    children=[
        Node(
            id=2,
            parent=1,
            path="/1/2",
            parent_ids=[1],
            name="VKL",
            description="",
            allowed_objects_at_node=[ObjectType.user, ObjectType.user_role],
            children=[
                Node(
                    id=3,
                    parent=2,
                    parent_ids=[1, 2],
                    path="/1/2/3",
                    name="SSC",
                    description="",
                    allowed_objects_at_node=[],
                    children=[
                        Node(
                            id=4,
                            parent=3,
                            parent_ids=[1, 2, 3],
                            path="/1/2/3/4",
                            type="event",
                            name="SSC 2023",
                            description="",
                            allowed_objects_at_node=[
                                ObjectType.user,
                                ObjectType.account,
                                ObjectType.product,
                                ObjectType.ticket,
                                ObjectType.user_role,
                                ObjectType.user_tags,
                                ObjectType.tse,
                            ],
                            children=[
                                Node(
                                    id=5,
                                    parent=4,
                                    parent_ids=[1, 2, 3, 4],
                                    path="/1/2/3/4/5",
                                    name="Intern",
                                    description="",
                                    allowed_objects_at_node=[ObjectType.user, ObjectType.product, ObjectType.user_role],
                                    children=[
                                        Node(
                                            id=6,
                                            parent=5,
                                            parent_ids=[1, 2, 3, 4, 5],
                                            path="/1/2/3/4/5/6",
                                            name="Bierteam",
                                            description="",
                                            allowed_objects_at_node=[ObjectType.user, ObjectType.user_role],
                                            children=[
                                                Node(
                                                    id=7,
                                                    parent=6,
                                                    parent_ids=[1, 2, 3, 4, 5],
                                                    path="/1/2/3/4/5/7",
                                                    name="Weißbierinsel",
                                                    description="",
                                                    children=[],
                                                    allowed_objects_at_node=[
                                                        ObjectType.user,
                                                        ObjectType.till,
                                                        ObjectType.user_role,
                                                        ObjectType.order,
                                                    ],
                                                ),
                                                Node(
                                                    id=8,
                                                    parent=6,
                                                    parent_ids=[1, 2, 3, 4, 5],
                                                    path="/1/2/3/4/5/8",
                                                    name="Weißbierkarussell",
                                                    description="",
                                                    children=[],
                                                    allowed_objects_at_node=[
                                                        ObjectType.user,
                                                        ObjectType.till,
                                                        ObjectType.user_role,
                                                        ObjectType.order,
                                                    ],
                                                ),
                                                Node(
                                                    id=9,
                                                    parent=6,
                                                    parent_ids=[1, 2, 3, 4, 5],
                                                    path="/1/2/3/4/5/9",
                                                    name="Potzelt",
                                                    description="",
                                                    children=[],
                                                    allowed_objects_at_node=[
                                                        ObjectType.user,
                                                        ObjectType.till,
                                                        ObjectType.user_role,
                                                        ObjectType.order,
                                                    ],
                                                ),
                                            ],
                                        ),
                                    ],
                                ),
                                Node(
                                    id=10,
                                    parent=4,
                                    parent_ids=[1, 2, 3, 4],
                                    path="/1/2/3/4/10",
                                    name="Extern",
                                    description="",
                                    allowed_objects_at_node=[],
                                    children=[
                                        Node(
                                            id=11,
                                            parent=10,
                                            parent_ids=[1, 2, 3, 4, 10],
                                            path="/1/2/3/4/10/11",
                                            name="Falafel",
                                            description="",
                                            allowed_objects_at_node=[
                                                ObjectType.user,
                                                ObjectType.till,
                                                ObjectType.product,
                                                ObjectType.account,
                                                ObjectType.user_role,
                                                ObjectType.order,
                                            ],
                                            children=[],
                                        ),
                                        Node(
                                            id=12,
                                            parent=10,
                                            parent_ids=[1, 2, 3, 4, 10],
                                            path="/1/2/3/4/10/12",
                                            name="Tolle Knolle",
                                            description="",
                                            allowed_objects_at_node=[
                                                ObjectType.user,
                                                ObjectType.till,
                                                ObjectType.product,
                                                ObjectType.account,
                                                ObjectType.user_role,
                                                ObjectType.order,
                                            ],
                                            children=[],
                                        ),
                                    ],
                                ),
                            ],
                        ),
                        Node(
                            id=13,
                            parent=3,
                            parent_ids=[1, 2, 3],
                            path="/1/2/3/13",
                            type="event",
                            name="SSC 2024",
                            allowed_objects_at_node=[
                                ObjectType.user,
                                ObjectType.account,
                                ObjectType.product,
                                ObjectType.ticket,
                                ObjectType.user_role,
                                ObjectType.user_tags,
                                ObjectType.tse,
                            ],
                            description="",
                            children=[],
                        ),
                    ],
                ),
                Node(
                    id=14,
                    parent=2,
                    parent_ids=[1, 2],
                    path="/1/2/14",
                    name="Glühfix",
                    allowed_objects_at_node=[],
                    description="",
                    children=[
                        Node(
                            id=15,
                            parent=14,
                            parent_ids=[1, 2, 14],
                            path="/1/2/14/15",
                            type="event",
                            name="Glühfix 2023",
                            allowed_objects_at_node=[
                                ObjectType.user,
                                ObjectType.account,
                                ObjectType.product,
                                ObjectType.ticket,
                                ObjectType.user_role,
                                ObjectType.user_tags,
                                ObjectType.tse,
                            ],
                            description="",
                            children=[],
                        ),
                        Node(
                            id=16,
                            parent=14,
                            parent_ids=[1, 2, 14],
                            path="/1/2/14/15",
                            type="event",
                            name="Glühfix 2024",
                            allowed_objects_at_node=[
                                ObjectType.user,
                                ObjectType.account,
                                ObjectType.product,
                                ObjectType.ticket,
                                ObjectType.user_role,
                                ObjectType.user_tags,
                                ObjectType.tse,
                            ],
                            description="",
                            children=[],
                        ),
                    ],
                ),
            ],
        ),
    ],
)


async def fetch_node(conn: Connection, node_id: int) -> Node | None:
    return await conn.fetch_one(Node, "select * from node where id = $1", node_id)


class TreeService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_user()
    async def get_tree_for_current_user(self) -> Node:
        return dummy_tree
