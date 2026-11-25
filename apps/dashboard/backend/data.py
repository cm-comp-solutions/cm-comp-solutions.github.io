from contextlib import closing
from pathlib import Path
import sqlite3

DATABASE = Path(__file__).resolve().parents[1] / "data" / "comercial.sqlite3"

REGIONS = ("Centro-Oeste", "Nordeste", "Norte", "Sudeste", "Sul")
CHANNELS = ("Distribuidores", "E-commerce", "Loja física", "Vendas diretas")
CATEGORIES = ("Eletrônicos", "Escritório", "Casa e utilidades", "Acessórios", "Serviços")

SCHEMA = """
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    ordered_on TEXT NOT NULL,
    region TEXT NOT NULL,
    channel TEXT NOT NULL,
    category TEXT NOT NULL,
    product TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    gross_cents INTEGER NOT NULL,
    discount_cents INTEGER NOT NULL,
    net_cents INTEGER NOT NULL,
    cost_cents INTEGER NOT NULL,
    CHECK (net_cents = gross_cents - discount_cents)
);
CREATE INDEX orders_date_id ON orders (ordered_on DESC, id DESC);
CREATE INDEX orders_category_date ON orders (category, ordered_on);
CREATE INDEX orders_region_date ON orders (region, ordered_on);
CREATE INDEX orders_channel_date ON orders (channel, ordered_on);
"""


def connect():
    connection = sqlite3.connect(DATABASE.as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    return closing(connection)
