import os
import textwrap
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple, Optional

import psycopg2


@dataclass
class Column:
    name: str
    data_type: str
    is_nullable: bool
    column_default: Optional[str]
    is_identity: bool


@dataclass
class Table:
    schema: str
    name: str
    columns: Dict[str, Column]
    primary_key: List[str]
    uniques: Dict[str, List[str]]
    foreign_keys: Dict[str, Dict[str, str]]  # constraint_name -> {"columns", "ref_table", "ref_columns", "on_update", "on_delete"}
    checks: Dict[str, str]
    indexes: Dict[str, Dict[str, str]]  # index_name -> {"definition", "is_unique"}


def connect_from_env(env_var: str):
    dsn = os.environ.get(env_var)
    if not dsn:
        raise SystemExit(f"Environment variable {env_var} is not set")
    # Read-only, but we enforce via connection default access pattern (we'll only run SELECTs)
    return psycopg2.connect(dsn)


def canonical_type(data_type: str) -> str:
    t = data_type.lower().strip()
    replacements = {
        "character varying": "varchar",
        "character": "char",
        "double precision": "float8",
        "integer": "int4",
        "bigint": "int8",
        "smallint": "int2",
    }
    return replacements.get(t, t)


def load_schema(conn) -> Dict[Tuple[str, str], Table]:
    cur = conn.cursor()

    cur.execute(
        """
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
        """
    )
    tables: Dict[Tuple[str, str], Table] = {}
    for schema, name in cur.fetchall():
        tables[(schema, name)] = Table(
            schema=schema,
            name=name,
            columns={},
            primary_key=[],
            uniques={},
            foreign_keys={},
            checks={},
            indexes={},
        )

    if not tables:
        return tables

    cur.execute(
        """
        SELECT
            table_schema,
            table_name,
            column_name,
            data_type,
            is_nullable,
            column_default,
            is_identity
        FROM information_schema.columns
        WHERE (table_schema, table_name) IN (
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema NOT IN ('pg_catalog', 'information_schema')
        )
        ORDER BY table_schema, table_name, ordinal_position
        """
    )
    for schema, table, col, dtype, nullable, default, is_identity in cur.fetchall():
        key = (schema, table)
        if key not in tables:
            continue
        tables[key].columns[col] = Column(
            name=col,
            data_type=canonical_type(dtype),
            is_nullable=(nullable == "YES"),
            column_default=default,
            is_identity=(is_identity == "YES"),
        )

    cur.execute(
        """
        SELECT
            kcu.table_schema,
            kcu.table_name,
            tc.constraint_type,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
        LEFT JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
         AND tc.table_schema = rc.constraint_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.constraint_schema
        WHERE tc.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY kcu.table_schema, kcu.table_name, tc.constraint_name, kcu.ordinal_position
        """
    )
    for (
        schema,
        table,
        ctype,
        cname,
        col,
        f_schema,
        f_table,
        f_col,
        upd,
        dele,
    ) in cur.fetchall():
        key = (schema, table)
        if key not in tables:
            continue
        t = tables[key]
        if ctype == "PRIMARY KEY":
            if col not in t.primary_key:
                t.primary_key.append(col)
        elif ctype == "UNIQUE":
            t.uniques.setdefault(cname, []).append(col)
        elif ctype == "FOREIGN KEY":
            fk = t.foreign_keys.setdefault(
                cname,
                {
                    "columns": [],
                    "ref_table": None,
                    "ref_columns": [],
                    "on_update": upd,
                    "on_delete": dele,
                },
            )
            if col not in fk["columns"]:
                fk["columns"].append(col)
            if f_table and f_col:
                fk["ref_table"] = f"{f_schema}.{f_table}" if f_schema else f_table
                if f_col not in fk["ref_columns"]:
                    fk["ref_columns"].append(f_col)

    cur.execute(
        """
        SELECT
            n.nspname AS table_schema,
            c.relname AS table_name,
            con.conname AS constraint_name,
            pg_get_constraintdef(con.oid) AS definition
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND con.contype = 'c'
        ORDER BY n.nspname, c.relname, con.conname
        """
    )
    for schema, table, cname, definition in cur.fetchall():
        key = (schema, table)
        if key not in tables:
            continue
        tables[key].checks[cname] = definition

    cur.execute(
        """
        SELECT
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY schemaname, tablename, indexname
        """
    )
    for schema, table, iname, idef in cur.fetchall():
        key = (schema, table)
        if key not in tables:
            continue
        is_unique = " UNIQUE INDEX " in idef.upper() or idef.upper().startswith("CREATE UNIQUE INDEX")
        tables[key].indexes[iname] = {
            "definition": idef,
            "is_unique": str(is_unique),
        }

    return tables


def diff_schemas(local: Dict[Tuple[str, str], Table], prod: Dict[Tuple[str, str], Table]) -> str:
    lines: List[str] = []

    local_tables = set(local.keys())
    prod_tables = set(prod.keys())

    to_create = sorted(local_tables - prod_tables)
    extra = sorted(prod_tables - local_tables)
    common = sorted(local_tables & prod_tables)

    breaking_changes = 0
    columns_to_add_total = 0

    for schema, table in to_create:
        t = local[(schema, table)]
        lines.append(f"Table: {schema}.{table}")
        lines.append("Create table in prod: YES")
        lines.append("Columns to add:")
        for col_name, col in t.columns.items():
            nullability = "NULL" if col.is_nullable else "NOT NULL"
            default = f" DEFAULT {col.column_default}" if col.column_default else ""
            identity = " IDENTITY" if col.is_identity else ""
            lines.append(f"- {col_name} {col.data_type} {nullability}{default}{identity}")
            columns_to_add_total += 1
        if t.primary_key:
            lines.append("Constraints to add/modify:")
            lines.append(f"- PK: ({', '.join(t.primary_key)})")
        if t.uniques:
            for cname, cols in t.uniques.items():
                lines.append(f"- UNIQUE {cname}: ({', '.join(cols)})")
        if t.foreign_keys:
            for cname, fk in t.foreign_keys.items():
                lines.append(
                    f"- FK {cname}: ({', '.join(fk['columns'])}) -> {fk['ref_table']}({', '.join(fk['ref_columns'])}) ON UPDATE {fk['on_update']} ON DELETE {fk['on_delete']}"
                )
        if t.checks:
            for cname, definition in t.checks.items():
                lines.append(f"- CHECK {cname}: {definition}")
        if t.indexes:
            lines.append("Indexes to add/modify:")
            for iname, idx in t.indexes.items():
                uniq = "UNIQUE " if idx["is_unique"] == "True" else ""
                lines.append(f"- {uniq}INDEX {iname}: {idx['definition']}")
        lines.append("")

    for schema, table in extra:
        breaking_changes += 1
        lines.append(f"Table: {schema}.{table}")
        lines.append("Create table in prod: NO")
        lines.append("Columns to add:")
        lines.append("(none)")
        lines.append(f"Columns to drop (if any): ALL (dropping table would be breaking)")
        lines.append("")

    for schema, table in common:
        lt = local[(schema, table)]
        pt = prod[(schema, table)]
        lines.append(f"Table: {schema}.{table}")
        lines.append("Create table in prod: NO")

        lcols = set(lt.columns.keys())
        pcols = set(pt.columns.keys())
        add_cols = sorted(lcols - pcols)
        drop_cols = sorted(pcols - lcols)
        common_cols = sorted(lcols & pcols)

        if add_cols:
            lines.append("Columns to add:")
            for col_name in add_cols:
                col = lt.columns[col_name]
                nullability = "NULL" if col.is_nullable else "NOT NULL"
                default = f" DEFAULT {col.column_default}" if col.column_default else ""
                identity = " IDENTITY" if col.is_identity else ""
                lines.append(f"- {col_name} {col.data_type} {nullability}{default}{identity}")
                columns_to_add_total += 1
        else:
            lines.append("Columns to add:")
            lines.append("(none)")

        col_mods: List[str] = []
        for col_name in common_cols:
            lc = lt.columns[col_name]
            pc = pt.columns[col_name]
            diffs = []
            if lc.data_type != pc.data_type:
                diffs.append(f"type {pc.data_type} -> {lc.data_type}")
                breaking_changes += 1
            if lc.is_nullable != pc.is_nullable:
                diffs.append(
                    f"nullability {'NULL' if pc.is_nullable else 'NOT NULL'} -> {'NULL' if lc.is_nullable else 'NOT NULL'}"
                )
                if not lc.is_nullable and pc.is_nullable:
                    breaking_changes += 1
            if (lc.column_default or "") != (pc.column_default or ""):
                diffs.append(f"default {pc.column_default} -> {lc.column_default}")
            if lc.is_identity != pc.is_identity:
                diffs.append(f"identity {pc.is_identity} -> {lc.is_identity}")
                breaking_changes += 1
            if diffs:
                col_mods.append(f"- {col_name}: "+ "; ".join(diffs))

        if col_mods:
            lines.append("Columns to modify:")
            lines.extend(col_mods)
        else:
            lines.append("Columns to modify:")
            lines.append("(none)")

        if drop_cols:
            lines.append("Columns to drop (if any):")
            for col_name in drop_cols:
                lines.append(f"- {col_name} (potentially breaking)")
                breaking_changes += 1
        else:
            lines.append("Columns to drop (if any): (none)")

        def normalize_pk(pk: List[str]) -> str:
            return ",".join(pk)

        lpk = normalize_pk(lt.primary_key)
        ppk = normalize_pk(pt.primary_key)

        lines.append("Constraints to add/modify:")
        if lpk != ppk:
            lines.append(f"- PK: prod=({ppk}) -> local=({lpk}) (breaking if changed)")
            breaking_changes += 1

        def normalize_uniques(u: Dict[str, List[str]]) -> Dict[str, str]:
            return {name: ",".join(sorted(cols)) for name, cols in u.items()}

        lu = normalize_uniques(lt.uniques)
        pu = normalize_uniques(pt.uniques)
        for name, cols in lu.items():
            if name not in pu:
                lines.append(f"- UNIQUE {name} to add: ({cols})")
            elif pu[name] != cols:
                lines.append(f"- UNIQUE {name} to modify: prod=({pu[name]}) -> local=({cols}) (breaking)")
                breaking_changes += 1
        for name, cols in pu.items():
            if name not in lu:
                lines.append(f"- UNIQUE {name} to drop (breaking): ({cols})")
                breaking_changes += 1

        def normalize_fk(fks: Dict[str, Dict[str, str]]) -> Dict[str, str]:
            norm = {}
            for name, fk in fks.items():
                cols = ",".join(sorted(fk["columns"]))
                rcols = ",".join(sorted(fk["ref_columns"]))
                norm[name] = f"({cols})->{fk['ref_table']}({rcols}) ON UPDATE {fk['on_update']} ON DELETE {fk['on_delete']}"
            return norm

        lfk = normalize_fk(lt.foreign_keys)
        pfk = normalize_fk(pt.foreign_keys)
        for name, desc in lfk.items():
            if name not in pfk:
                lines.append(f"- FK {name} to add: {desc}")
            elif pfk[name] != desc:
                lines.append(f"- FK {name} to modify: prod={pfk[name]} -> local={desc} (breaking)")
                breaking_changes += 1
        for name, desc in pfk.items():
            if name not in lfk:
                lines.append(f"- FK {name} to drop (breaking): {desc}")
                breaking_changes += 1

        def normalize_checks(ch: Dict[str, str]) -> Dict[str, str]:
            return {name: " ".join(defn.split()) for name, defn in ch.items()}

        lch = normalize_checks(lt.checks)
        pch = normalize_checks(pt.checks)
        for name, defn in lch.items():
            if name not in pch:
                lines.append(f"- CHECK {name} to add: {defn}")
            elif pch[name] != defn:
                lines.append(f"- CHECK {name} to modify: prod={pch[name]} -> local={defn} (may be breaking)")
                breaking_changes += 1
        for name, defn in pch.items():
            if name not in lch:
                lines.append(f"- CHECK {name} to drop (breaking): {defn}")
                breaking_changes += 1

        lines.append("Indexes to add/modify:")
        def normalize_idx(idx: Dict[str, Dict[str, str]]) -> Dict[str, Tuple[str, str]]:
            norm = {}
            for name, val in idx.items():
                definition = " ".join(val["definition"].split())
                norm[name] = (definition, val["is_unique"])
            return norm

        li = normalize_idx(lt.indexes)
        pi = normalize_idx(pt.indexes)
        for name, (defn, uniq) in li.items():
            if name not in pi:
                lines.append(f"- INDEX {name} to add: {defn}")
            elif pi[name] != (defn, uniq):
                lines.append(f"- INDEX {name} to modify: prod={pi[name][0]} -> local={defn}")
        for name, (defn, uniq) in pi.items():
            if name not in li:
                lines.append(f"- INDEX {name} to drop: {defn}")

        lines.append("")

    summary = [
        f"Tables to create in prod: {len(to_create)}",
        f"Columns to add in prod: {columns_to_add_total}",
        f"Risky/breaking changes (approx): {breaking_changes}",
    ]

    return "\n".join(summary) + "\n\n" + "\n".join(lines)


def main():
    local_conn = connect_from_env("LOCAL_DATABASE_URL")
    prod_conn = connect_from_env("PROD_DATABASE_URL")
    try:
        local_schema = load_schema(local_conn)
        prod_schema = load_schema(prod_conn)
        diff_md = diff_schemas(local_schema, prod_schema)
        print(diff_md)
    finally:
        local_conn.close()
        prod_conn.close()


if __name__ == "__main__":
    main()
