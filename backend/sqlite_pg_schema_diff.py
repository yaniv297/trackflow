import os
from typing import Dict, List, Tuple

from dataclasses import dataclass

from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv
import psycopg2

from schema_diff import Column, Table, canonical_type, load_schema as load_pg_schema, diff_schemas


def load_sqlite_schema(sqlite_url: str) -> Dict[Tuple[str, str], Table]:
    """Load SQLite schema and map it into the same Table/Column model.

    We treat all SQLite tables as belonging to a logical 'public' schema
    so they can be compared against Postgres tables.
    """
    engine = create_engine(sqlite_url)
    insp = inspect(engine)

    tables: Dict[Tuple[str, str], Table] = {}

    for table_name in sorted(insp.get_table_names()):
        key = ("public", table_name)
        tables[key] = Table(
            schema="public",
            name=table_name,
            columns={},
            primary_key=[],
            uniques={},
            foreign_keys={},
            checks={},
            indexes={},
        )

        cols = insp.get_columns(table_name)
        for col in cols:
            name = col["name"]
            raw_type = str(col["type"]) if col.get("type") is not None else "text"
            dtype = canonical_type(raw_type)
            nullable = bool(col.get("nullable", True))
            default = col.get("default") or col.get("server_default")
            is_identity = False  # SQLite doesn't have identity columns in the same way

            tables[key].columns[name] = Column(
                name=name,
                data_type=dtype,
                is_nullable=nullable,
                column_default=str(default) if default is not None else None,
                is_identity=is_identity,
            )

        pk = insp.get_pk_constraint(table_name) or {}
        pk_cols = pk.get("constrained_columns") or []
        tables[key].primary_key = list(pk_cols)

        uniques = insp.get_unique_constraints(table_name) or []
        for uq in uniques:
            cname = uq.get("name") or f"uq_{table_name}_{'_'.join(uq.get('column_names', []))}"
            cols = uq.get("column_names") or []
            if cols:
                tables[key].uniques[cname] = list(cols)

        fks = insp.get_foreign_keys(table_name) or []
        for fk in fks:
            cname = fk.get("name") or f"fk_{table_name}_{'_'.join(fk.get('constrained_columns', []))}"
            cols = fk.get("constrained_columns") or []
            ref_table = fk.get("referred_table")
            ref_schema = fk.get("referred_schema") or "public"
            ref_cols = fk.get("referred_columns") or []

            tables[key].foreign_keys[cname] = {
                "columns": list(cols),
                "ref_table": f"{ref_schema}.{ref_table}" if ref_table else None,
                "ref_columns": list(ref_cols),
                "on_update": fk.get("options", {}).get("onupdate", "NO ACTION"),
                "on_delete": fk.get("options", {}).get("ondelete", "NO ACTION"),
            }

        checks = insp.get_check_constraints(table_name) or []
        for ch in checks:
            cname = ch.get("name") or f"ck_{table_name}_{len(tables[key].checks)+1}"
            sqltext = ch.get("sqltext") or ch.get("sql")
            if sqltext:
                tables[key].checks[cname] = sqltext

        idxs = insp.get_indexes(table_name) or []
        for idx in idxs:
            iname = idx.get("name") or f"idx_{table_name}_{len(tables[key].indexes)+1}"
            cols = idx.get("column_names") or []
            unique = bool(idx.get("unique", False))
            if not cols:
                continue
            col_list = ", ".join(cols)
            definition = f"CREATE{' UNIQUE' if unique else ''} INDEX {iname} ON {table_name} ({col_list})"
            tables[key].indexes[iname] = {
                "definition": definition,
                "is_unique": str(unique),
            }

    return tables


def main():
    # Local SQLite DB is fixed as songs.db next to backend code
    sqlite_url = "sqlite:///./songs.db"

    # Load Supabase/Postgres URL from .env.production via DATABASE_URL
    load_dotenv("../.env.production")
    prod_dsn = os.environ.get("DATABASE_URL")
    if not prod_dsn:
        raise SystemExit("DATABASE_URL not set; ensure it is defined in .env.production")

    local_schema = load_sqlite_schema(sqlite_url)

    prod_conn = psycopg2.connect(prod_dsn)
    try:
        prod_schema = load_pg_schema(prod_conn)
        diff_md = diff_schemas(local_schema, prod_schema)
        print(diff_md)
    finally:
        prod_conn.close()


if __name__ == "__main__":
    main()
