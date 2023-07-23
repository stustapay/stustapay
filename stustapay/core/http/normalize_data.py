from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")
K = TypeVar("K")


class NormalizedList(BaseModel, Generic[T, K]):
    ids: list[K]
    entities: dict[K, T]


def normalize_list(elements: list[T], primary_key="id") -> NormalizedList[T, K]:
    return NormalizedList(
        ids=[getattr(x, primary_key) for x in elements], entities={getattr(x, primary_key): x for x in elements}
    )
