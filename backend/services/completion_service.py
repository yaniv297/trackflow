from typing import Dict, List, Iterable, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

DEFAULT_WORKFLOW_FIELDS = [
    "demucs",
    "midi",
    "tempo_map",
    "fake_ending",
    "drums",
    "bass",
    "guitar",
    "vocals",
    "harmonies",
    "pro_keys",
    "keys",
    "animations",
    "drum_fills",
    "overdrive",
    "compile",
]


def _get_value(obj: Any, attr: str):
    if isinstance(obj, dict):
        return obj.get(attr)
    return getattr(obj, attr, None)


def _format_step_name(step_name: str) -> str:
    return (
        step_name.replace("_", " ").title()
        if isinstance(step_name, str)
        else step_name
    )


def fetch_workflow_fields_map(db: Session, user_ids: Iterable[int]) -> Dict[int, List[str]]:
    user_ids = [uid for uid in user_ids if uid]
    if not user_ids:
        return {}

    placeholders = ",".join([f":uid{i}" for i in range(len(user_ids))])
    params = {f"uid{i}": user_id for i, user_id in enumerate(user_ids)}

    rows = db.execute(
        text(
            f"""
            SELECT uw.user_id, uws.step_name
            FROM user_workflows uw
            JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
            WHERE uw.user_id IN ({placeholders})
            ORDER BY uw.user_id, uws.order_index
            """
        ),
        params,
    ).fetchall()

    workflow_fields_map: Dict[int, List[str]] = {}
    for user_id, step_name in rows:
        workflow_fields_map.setdefault(user_id, []).append(step_name)
    return workflow_fields_map


def fetch_song_progress_map(db: Session, song_ids: Iterable[int]) -> Dict[int, Dict[str, bool]]:
    song_ids = [sid for sid in song_ids if sid]
    if not song_ids:
        return {}

    placeholders = ",".join([f":sid{i}" for i in range(len(song_ids))])
    params = {f"sid{i}": song_id for i, song_id in enumerate(song_ids)}
    rows = db.execute(
        text(
            f"""
            SELECT song_id, step_name, is_completed
            FROM song_progress
            WHERE song_id IN ({placeholders})
            """
        ),
        params,
    ).fetchall()

    progress_map: Dict[int, Dict[str, bool]] = {}
    for song_id, step_name, is_completed in rows:
        progress_map.setdefault(song_id, {})[step_name] = bool(is_completed)
    return progress_map


def fetch_legacy_authoring_map(db: Session, song_ids: Iterable[int]) -> Dict[int, Dict[str, bool]]:
    song_ids = [sid for sid in song_ids if sid]
    if not song_ids:
        return {}

    placeholders = ",".join([f":lsid{i}" for i in range(len(song_ids))])
    params = {f"lsid{i}": song_id for i, song_id in enumerate(song_ids)}

    legacy_map: Dict[int, Dict[str, bool]] = {}
    try:
        rows = db.execute(
            text(
                f"""
                SELECT song_id,
                       demucs, midi, tempo_map, fake_ending, drums, bass,
                       guitar, vocals, harmonies, pro_keys, keys,
                       animations, drum_fills, overdrive, compile
                FROM authoring
                WHERE song_id IN ({placeholders})
                """
            ),
            params,
        ).fetchall()

        legacy_fields = DEFAULT_WORKFLOW_FIELDS

        for row in rows:
            song_id = row[0]
            legacy_map.setdefault(song_id, {})
            for index, field in enumerate(legacy_fields, start=1):
                if index < len(row):
                    legacy_map[song_id][field] = bool(row[index])
    except Exception as err:
        print(f"⚠️ Could not read legacy authoring data: {err}")

    return legacy_map


def build_song_completion_data(
    db: Session,
    songs: Iterable[Any],
    include_remaining_steps: bool = True,
) -> Dict[int, Dict[str, Any]]:

    songs = list(songs)
    song_ids = [_get_value(song, "id") for song in songs if _get_value(song, "id")]
    owner_ids = {_get_value(song, "user_id") for song in songs if _get_value(song, "user_id")}

    workflow_fields_map = fetch_workflow_fields_map(db, owner_ids)
    progress_map = fetch_song_progress_map(db, song_ids)

    missing_progress = [
        sid for sid in song_ids if sid not in progress_map or len(progress_map.get(sid, {})) == 0
    ]
    if missing_progress:
        legacy_map = fetch_legacy_authoring_map(db, missing_progress)
        for song_id, legacy_fields in legacy_map.items():
            progress_map.setdefault(song_id, {}).update(legacy_fields)

    completion_data: Dict[int, Dict[str, Any]] = {}

    for song in songs:
        song_id = _get_value(song, "id")
        owner_id = _get_value(song, "user_id")

        if not song_id:
            continue

        workflow_fields = workflow_fields_map.get(owner_id) or DEFAULT_WORKFLOW_FIELDS
        if not workflow_fields:
            completion_data[song_id] = {
                "completion": None,
                "remaining_steps": [],
                "workflow_fields": [],
            }
            continue

        song_progress = progress_map.get(song_id, {})
        total_fields = len(workflow_fields)
        completed_count = sum(1 for field in workflow_fields if song_progress.get(field, False))

        completion = (
            round((completed_count / total_fields) * 100) if total_fields > 0 else None
        )

        remaining_steps = []
        if include_remaining_steps:
            remaining_steps = [
                _format_step_name(field)
                for field in workflow_fields
                if not song_progress.get(field, False)
            ]

        completion_data[song_id] = {
            "completion": completion,
            "remaining_steps": remaining_steps,
            "workflow_fields": workflow_fields,
        }

    return completion_data

