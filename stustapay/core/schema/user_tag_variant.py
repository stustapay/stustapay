from pydantic import BaseModel


class NewUserTagVariant(BaseModel):
    variant_name: str
    description: str = ""
    priority: int = 0


class UserTagVariant(NewUserTagVariant):
    id: int
    node_id: int
