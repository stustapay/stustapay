# pylint: disable=unexpected-keyword-arg,missing-kwoa

import zipfile
from datetime import date
from io import BytesIO

import pytest
from sftkit.database import Connection

from stustapay.core.schema.tree import Node
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.dsfinvk import DsfinvkService

from .conftest import Cashier

BON_ADDRESS = "Test Street 1\n80333 Munich"


@pytest.fixture
async def event_with_bon_address(db_connection: Connection, event_node: Node):
    await db_connection.execute(
        "update event set bon_address = $1 where id = (select event_id from node where id = $2)",
        BON_ADDRESS,
        event_node.id,
    )
    return event_node


async def test_export_dsfinvk_zip(
    dsfinvk_service: DsfinvkService,
    event_with_bon_address: Node,
    event_admin_token: str,
):
    content = await dsfinvk_service.export_dsfinvk(token=event_admin_token, node_id=event_with_bon_address.id)
    assert isinstance(content, bytes)
    assert len(content) > 0

    with zipfile.ZipFile(BytesIO(content)) as archive:
        names = set(archive.namelist())
        assert "index.xml" in names
        assert "gdpdu-01-08-2002.dtd" in names


async def test_export_ao146a_xml(
    dsfinvk_service: DsfinvkService,
    event_with_bon_address: Node,
    event_admin_token: str,
):
    content = await dsfinvk_service.export_ao146a(token=event_admin_token, node_id=event_with_bon_address.id)
    assert isinstance(content, bytes)
    xml = content.decode("utf-8")
    assert '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' in xml
    assert "Aufzeichnung146a" in xml
    assert "AngabenAufzeichnungssystem" not in xml


async def test_export_ao146a_xml_with_shutdown_date(
    dsfinvk_service: DsfinvkService,
    event_with_bon_address: Node,
    event_admin_token: str,
):
    content = await dsfinvk_service.export_ao146a(
        token=event_admin_token, node_id=event_with_bon_address.id, shutdown_date=date(2025, 12, 31)
    )
    xml = content.decode("utf-8")
    assert "Aufzeichnung146a" in xml


async def test_export_dsfinvk_access_denied(
    dsfinvk_service: DsfinvkService,
    event_node: Node,
    cashier: Cashier,
):
    with pytest.raises(AccessDenied):
        await dsfinvk_service.export_dsfinvk(token=cashier.token, node_id=event_node.id)


async def test_export_ao146a_access_denied(
    dsfinvk_service: DsfinvkService,
    event_node: Node,
    cashier: Cashier,
):
    with pytest.raises(AccessDenied):
        await dsfinvk_service.export_ao146a(token=cashier.token, node_id=event_node.id)
