from typing import TypeVar

T = TypeVar("T")


def list_equals(l1: list[T], l2: list[T]) -> bool:
    return all(e1 in l2 for e1 in l1) and all(e2 in l1 for e2 in l2)
