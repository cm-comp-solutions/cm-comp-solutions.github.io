"""Gera pedidos fictícios reproduzíveis em um arquivo SQLite local."""

from argparse import ArgumentParser
from contextlib import closing
from datetime import date, timedelta
from pathlib import Path
from random import Random
import sqlite3
from tempfile import NamedTemporaryFile

from .data import CATEGORIES, CHANNELS, DATABASE, REGIONS, SCHEMA

FIRST_DAY = date(2024, 1, 1)
LAST_DAY = date(2026, 11, 24)
PRODUCTS = (
    (("Monitor", 73500), ("Teclado", 9900), ("Caixa de som", 24900), ("Fone sem fio", 29900)),
    (("Cadeira de escritório", 56500), ("Kit de papelaria", 6900), ("Luminária", 12900)),
    (("Organizador", 9700), ("Garrafa térmica", 15900), ("Jogo de panelas", 37900)),
    (("Capa protetora", 4900), ("Suporte ajustável", 8900), ("Hub USB", 17900)),
    (("Instalação", 12900), ("Configuração", 9900), ("Manutenção", 19900)),
)


def transactions(count, seed):
    rng = Random(seed)
    days = [FIRST_DAY + timedelta(days=offset) for offset in range((LAST_DAY - FIRST_DAY).days + 1)]
    weights = [
        (1 + offset / 1250) * (0.91 if day.weekday() >= 5 else 1)
        * (1.28 if day.month in (5, 8, 11, 12) else 1)
        for offset, day in enumerate(days)
    ]
    dates = sorted(rng.choices(days, weights, k=count))
    for number, ordered_on in enumerate(dates, start=1):
        category = rng.choices(range(len(CATEGORIES)), (30, 23, 21, 17, 9))[0]
        region = rng.choices(REGIONS, (9, 18, 7, 44, 22))[0]
        channel = rng.choices(CHANNELS, (17, 35, 28, 20))[0]
        product, reference_price = rng.choice(PRODUCTS[category])
        quantity = rng.choices((1, 2, 3, 4, 5, 8), (49, 26, 13, 7, 4, 1))[0]
        gross = (reference_price * rng.randint(90, 114) // 100) * quantity
        discount = gross * rng.choice((0, 0, 3, 5, 7, 10, 12)) // 100
        cost = gross * rng.randint(46, 72) // 100
        yield (number, ordered_on.isoformat(), region, channel, CATEGORIES[category], product,
               quantity, gross, discount, gross - discount, cost)


def generate(count, seed, replace):
    if DATABASE.exists() and not replace:
        raise SystemExit("A base já existe. Use --replace para regenerar os dados fictícios.")
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=DATABASE.parent, suffix=".sqlite3", delete=False) as handle:
        temporary = Path(handle.name)
    try:
        tables, indexes = SCHEMA.split("CREATE INDEX", maxsplit=1)
        with closing(sqlite3.connect(temporary)) as connection:
            connection.executescript(tables)
            with connection:
                connection.executemany(
                    "INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    transactions(count, seed),
                )
            connection.executescript("CREATE INDEX" + indexes)
            connection.execute("ANALYZE")
        if replace:
            temporary.replace(DATABASE)
        else:
            temporary.rename(DATABASE)
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--orders", type=int, default=300_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()
    if args.orders < 1:
        parser.error("--orders deve ser maior que zero")
    generate(args.orders, args.seed, args.replace)
    print(f"{args.orders:,} pedidos fictícios em {DATABASE}")
