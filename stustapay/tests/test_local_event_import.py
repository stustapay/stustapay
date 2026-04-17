import pytest
from sftkit.database import Connection

from stustapay.core.config import (
    AdministrationApiConfig,
    Config,
    CoreConfig,
    CustomerPortalApiConfig,
    HeadwindConfig,
    TerminalApiConfig,
)
from stustapay.core.local_event_import import (
    DepositRuleSpec,
    ImportedLocationSpec,
    ImportedProductSpec,
    LocalEventImportSpec,
    LocalEventSettingsSpec,
    import_local_event,
    import_local_event_from_config,
    plan_location_import,
)


def test_plan_location_import_splits_deposit_and_adjusts_prices():
    planned = plan_location_import(
        ImportedLocationSpec(
            name="Slush",
            terminal_count=1,
            products=[
                ImportedProductSpec(name="Slush Cola", price=5.4),
                ImportedProductSpec(name="Slush Erdbeer", price=5.4),
            ],
            deposit=DepositRuleSpec(
                price=2.0,
                included_in_prices=True,
                apply_to=["Slush Cola", "Slush Erdbeer"],
            ),
        )
    )

    prices = {product.name: product.price for product in planned.products}
    assert prices["Slush Cola"] == pytest.approx(3.4)
    assert prices["Slush Erdbeer"] == pytest.approx(3.4)
    assert prices["Pfand"] == pytest.approx(2.0)
    assert prices["Pfand zurueck"] == pytest.approx(2.0)

    button_map = {button.name: button.product_names for button in planned.buttons}
    assert button_map["Slush Cola"] == ["Slush Cola", "Pfand"]
    assert button_map["Slush Erdbeer"] == ["Slush Erdbeer", "Pfand"]
    assert button_map["Pfand zurueck"] == ["Pfand zurueck"]


def test_plan_location_import_rejects_cash_registers_for_non_topup_locations():
    with pytest.raises(ValueError, match="cash registers but is not a top-up location"):
        plan_location_import(
            ImportedLocationSpec(
                name="Bar",
                cash_register_count=1,
                allow_top_up=False,
            )
        )


async def test_import_local_event_creates_root_cash_registers_and_pfand_buttons(
    db_connection: Connection,
    config: Config,
):
    summary = await import_local_event(
        db_connection,
        config=config,
        spec=LocalEventImportSpec(
            event=LocalEventSettingsSpec(name="Import Test Event"),
            locations=[
                ImportedLocationSpec(
                    name="Kasse",
                    terminal_count=2,
                    terminal_description="Aufladung",
                    allow_top_up=True,
                    enable_card_payment=True,
                    cash_register_count=2,
                ),
                ImportedLocationSpec(
                    name="Getraenke",
                    terminal_count=1,
                    terminal_description="Getraenke Terminal",
                    enable_ssp_payment=True,
                    products=[
                        ImportedProductSpec(name="Bier", price=3.4),
                        ImportedProductSpec(name="Wasser", price=2.0),
                    ],
                    deposit=DepositRuleSpec(
                        price=2.0,
                        apply_to=["Bier", "Wasser"],
                    ),
                ),
            ],
        ),
    )

    event_node_id = summary.event_node_id
    kasse_node_id = next(location.node_id for location in summary.location_summaries if location.name == "Kasse")
    getraenke_node_id = next(location.node_id for location in summary.location_summaries if location.name == "Getraenke")

    assert kasse_node_id == event_node_id

    kasse_child_node_count = await db_connection.fetchval(
        "select count(*) from node where parent = $1 and name = 'Kasse'",
        event_node_id,
    )
    assert kasse_child_node_count == 0

    cash_register_count = await db_connection.fetchval(
        "select count(*) from cash_register where node_id = $1",
        event_node_id,
    )
    assert cash_register_count == 2

    root_terminal_count = await db_connection.fetchval(
        "select count(*) from terminal where node_id = $1 and name like 'Kasse Terminal %'",
        event_node_id,
    )
    assert root_terminal_count == 2

    child_cash_register_count = await db_connection.fetchval(
        "select count(*) from cash_register where node_id = $1",
        getraenke_node_id,
    )
    assert child_cash_register_count == 0

    product_rows = await db_connection.fetch(
        "select name, price, is_returnable from product where node_id = $1 order by name",
        getraenke_node_id,
    )
    products = {row["name"]: row for row in product_rows}
    assert products["Pfand"]["is_returnable"] is False
    assert products["Pfand zurueck"]["is_returnable"] is True

    button_rows = await db_connection.fetch(
        "select b.name, array_remove(array_agg(p.name order by p.name), null) as products "
        "from till_button b "
        "left join till_button_product bp on bp.button_id = b.id "
        "left join product p on p.id = bp.product_id "
        "where b.node_id = $1 "
        "group by b.id, b.name "
        "order by b.name",
        getraenke_node_id,
    )
    buttons = {row["name"]: row["products"] for row in button_rows}
    assert buttons["Bier"] == ["Bier", "Pfand"]
    assert buttons["Wasser"] == ["Pfand", "Wasser"]
    assert buttons["Pfand zurueck"] == ["Pfand zurueck"]


async def test_import_local_event_from_config_checks_revision_after_pool_creation(
    monkeypatch: pytest.MonkeyPatch,
):
    events: list[str] = []
    config = Config(
        core=CoreConfig(secret_key="test"),
        administration=AdministrationApiConfig(
            base_url="http://localhost:8081",
            host="localhost",
            port=8081,
        ),
        terminalserver=TerminalApiConfig(
            base_url="http://localhost:8080",
            host="localhost",
            port=8080,
        ),
        customerportal=CustomerPortalApiConfig(base_url="http://localhost:8082"),
        headwind=HeadwindConfig(
            base_url="http://localhost:8080",
            login="admin",
            password_md5="dummy",
            enabled=False,
        ),
        database={
            "user": "stustapay_test",
            "password": "stustapay_test",
            "host": "localhost",
            "port": 5434,
            "dbname": "stustapay_test",
        },
    )

    class FakeAcquire:
        async def __aenter__(self):
            events.append("acquire")
            return "fake-conn"

        async def __aexit__(self, exc_type, exc, tb):
            return False

    class FakePool:
        def acquire(self):
            return FakeAcquire()

        async def close(self):
            events.append("close")

    class FakeDatabase:
        pool_created = False

        async def create_pool(self, n_connections=1):
            assert n_connections == 2
            self.pool_created = True
            events.append("create_pool")
            return FakePool()

    fake_db = FakeDatabase()

    async def fake_check_revision_version(db):
        assert db is fake_db
        assert db.pool_created is True
        events.append("check_revision")

    async def fake_import_local_event(conn, *, config, spec, parent_node_id):
        assert conn == "fake-conn"
        assert spec.event.name == "Wrapper Test"
        assert parent_node_id == 0
        events.append("import")
        return "summary"

    monkeypatch.setattr("stustapay.core.local_event_import.get_database", lambda _config: fake_db)
    monkeypatch.setattr("stustapay.core.local_event_import.check_revision_version", fake_check_revision_version)
    monkeypatch.setattr("stustapay.core.local_event_import.import_local_event", fake_import_local_event)

    summary = await import_local_event_from_config(
        config=config,
        spec=LocalEventImportSpec(event=LocalEventSettingsSpec(name="Wrapper Test"), locations=[]),
    )

    assert summary == "summary"
    assert events == ["create_pool", "check_revision", "acquire", "import", "close"]
