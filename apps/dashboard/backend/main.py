from dataclasses import dataclass
from datetime import date
from typing import Annotated, Literal
import sqlite3

from fastapi import Depends, FastAPI, HTTPException, Query

from .data import CATEGORIES, CHANNELS, REGIONS, connect

app = FastAPI(title="CM Consultoria · Dashboard comercial")

DIMENSIONS = {"region": REGIONS, "channel": CHANNELS, "category": CATEGORIES}
FIELDS = """id, ordered_on, category, product, region, channel, quantity,
            gross_cents, discount_cents, net_cents, cost_cents"""
SORT = {
    "recent": "ordered_on DESC, id DESC",
    "revenue": "net_cents DESC, id DESC",
}


@dataclass(frozen=True)
class Filters:
    year: Annotated[int | None, Query(ge=2000, le=2099)] = None
    month: Annotated[str | None, Query(pattern=r"^20[0-9]{2}-(0[1-9]|1[0-2])$")] = None
    region: str | None = None
    channel: str | None = None
    category: str | None = None

    def where(self, *, exclude="", order_id=None):
        predicates, parameters = [], []
        if self.month and exclude != "month":
            year, month = (int(part) for part in self.month.split("-"))
            end = date(year + (month == 12), month % 12 + 1, 1)
            predicates += ["ordered_on >= ?", "ordered_on < ?"]
            parameters += [self.month + "-01", end.isoformat()]
        if self.year:
            predicates += ["ordered_on >= ?", "ordered_on < ?"]
            parameters += [f"{self.year}-01-01", f"{self.year + 1}-01-01"]
        for name, options in DIMENSIONS.items():
            value = getattr(self, name)
            if value and value not in options:
                raise HTTPException(422, detail=f"Filtro inválido: {name}")
            if value and name != exclude:
                predicates.append(f"{name} = ?")
                parameters.append(value)
        if order_id is not None:
            predicates.append("id = ?")
            parameters.append(order_id)
        return (" WHERE " + " AND ".join(predicates) if predicates else ""), parameters


FiltersQuery = Annotated[Filters, Depends()]


def database():
    try:
        return connect()
    except sqlite3.OperationalError as error:
        raise HTTPException(503, detail="Base indisponível. Gere os dados com python -m backend.seed.") from error


@app.get("/api/meta")
def metadata():
    with database() as connection:
        first = connection.execute("SELECT ordered_on FROM orders ORDER BY ordered_on LIMIT 1").fetchone()[0]
        last = connection.execute("SELECT ordered_on FROM orders ORDER BY ordered_on DESC LIMIT 1").fetchone()[0]
        count = connection.execute("SELECT count(*) FROM orders").fetchone()[0]
    return {"start": first, "end": last, "count": count, "options": DIMENSIONS}


@app.get("/api/overview")
def overview(filters: FiltersQuery):
    with database() as connection:
        where, args = filters.where()
        totals = connection.execute(
            "SELECT count(*) AS orders, coalesce(sum(net_cents),0) AS net_cents, "
            "coalesce(sum(net_cents - cost_cents),0) AS margin_cents FROM orders" + where, args,
        ).fetchone()
        where, args = filters.where(exclude="month")
        series = connection.execute(
            "SELECT substr(ordered_on,1,7) AS month, sum(net_cents) AS net_cents "
            "FROM orders" + where + " GROUP BY month ORDER BY month", args,
        ).fetchall()
        where, args = filters.where(exclude="category")
        categories = connection.execute(
            "SELECT category, sum(net_cents) AS net_cents FROM orders" + where
            + " GROUP BY category ORDER BY net_cents DESC, category", args,
        ).fetchall()
    return {"totals": dict(totals), "series": [dict(row) for row in series],
            "categories": [dict(row) for row in categories]}


@app.get("/api/orders")
def orders(
    filters: FiltersQuery,
    page: Annotated[int, Query(ge=1, le=100_000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    order_id: Annotated[int | None, Query(ge=1, le=2_147_483_647)] = None,
    sort: Literal["recent", "revenue"] = "recent",
):
    where, args = filters.where(order_id=order_id)
    with database() as connection:
        total = connection.execute("SELECT count(*) FROM orders" + where, args).fetchone()[0]
        rows = connection.execute(
            "SELECT " + FIELDS + " FROM orders" + where
            + f" ORDER BY {SORT[sort]} LIMIT ? OFFSET ?", (*args, page_size, (page - 1) * page_size),
        ).fetchall()
    return {"total": total, "page": page, "page_size": page_size, "rows": [dict(row) for row in rows]}
