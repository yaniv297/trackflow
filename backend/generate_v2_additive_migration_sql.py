#!/usr/bin/env python3
"""
Generate TrackFlow v2 additive migration SQL for prod Postgres.

Scope (per requirements):
- PUBLIC schema only.
- **ONLY** add new tables and new columns.
- DO NOT touch auth/storage/realtime/vault schemas.
- DO NOT include users.cloudinary_public_id.
- No execution of DDL/DML – this script just prints SQL.

Usage (example):
    python generate_v2_additive_migration_sql.py > v2_additive_migration.sql
Then review and run v2_additive_migration.sql manually against prod.
"""

from textwrap import dedent


def main() -> None:
    sql = dedent(
        """
        -- TrackFlow v2 additive migration (public schema only)
        -- NOTE: This script is ADD-ONLY. It creates new tables and adds new
        --       columns to existing tables. It does NOT drop or alter existing
        --       columns, constraints, or indexes.
        --
        -- IMPORTANT:
        -- - Run against the production Postgres database used by TrackFlow v1.
        -- - Review carefully before applying.
        -- - This file intentionally ignores Supabase internal schemas
        --   (auth, storage, realtime, vault, etc.).

        ----------------------------------------------------------------------
        -- 1. New tables in public schema
        ----------------------------------------------------------------------

        -- 1.1 achievements
        CREATE TABLE IF NOT EXISTS public.achievements (
            id              SERIAL PRIMARY KEY,
            code            varchar NOT NULL,
            name            varchar NOT NULL,
            description     text    NOT NULL,
            icon            varchar NOT NULL,
            category        varchar NOT NULL,
            points          integer NOT NULL,
            rarity          varchar NOT NULL,
            created_at      timestamp without time zone NULL,
            target_value    integer NULL,
            metric_type     varchar NULL,
            CONSTRAINT uq_achievements_code UNIQUE (code)
        );

        ----------------------------------------------------------------------

        -- 1.2 collaboration_requests
        CREATE TABLE IF NOT EXISTS public.collaboration_requests (
            id                  SERIAL PRIMARY KEY,
            song_id             integer NOT NULL,
            requester_id        integer NOT NULL,
            owner_id            integer NOT NULL,
            message             text    NOT NULL,
            requested_parts     text    NULL,
            status              varchar NULL,
            owner_response      text    NULL,
            assigned_parts      text    NULL,
            created_at          timestamp without time zone NULL,
            responded_at        timestamp without time zone NULL,

            CONSTRAINT unique_song_requester
                UNIQUE (song_id, requester_id),

            CONSTRAINT fk_collaboration_requests_song_id
                FOREIGN KEY (song_id) REFERENCES public.songs(id),

            CONSTRAINT fk_collaboration_requests_requester_id
                FOREIGN KEY (requester_id) REFERENCES public.users(id),

            CONSTRAINT fk_collaboration_requests_owner_id
                FOREIGN KEY (owner_id) REFERENCES public.users(id)
        );

        ----------------------------------------------------------------------

        -- 1.3 notifications
        CREATE TABLE IF NOT EXISTS public.notifications (
            id                          SERIAL PRIMARY KEY,
            user_id                     integer NOT NULL,
            type                        varchar NOT NULL,
            title                       varchar NOT NULL,
            message                     text    NOT NULL,
            is_read                     boolean DEFAULT FALSE,
            related_achievement_id      integer NULL,
            related_feature_request_id  integer NULL,
            related_comment_id          integer NULL,
            created_at                  timestamp without time zone DEFAULT now(),
            read_at                     timestamp without time zone NULL,
            related_song_id             integer NULL,

            CONSTRAINT fk_notifications_user_id
                FOREIGN KEY (user_id) REFERENCES public.users(id),

            CONSTRAINT fk_notifications_related_achievement_id
                FOREIGN KEY (related_achievement_id) REFERENCES public.achievements(id),

            CONSTRAINT fk_notifications_related_feature_request_id
                FOREIGN KEY (related_feature_request_id) REFERENCES public.feature_requests(id),

            CONSTRAINT fk_notifications_related_comment_id
                FOREIGN KEY (related_comment_id) REFERENCES public.feature_request_comments(id)
        );

        ----------------------------------------------------------------------

        -- 1.4 release_posts
        CREATE TABLE IF NOT EXISTS public.release_posts (
            id              SERIAL PRIMARY KEY,
            post_type       varchar NOT NULL,
            title           varchar NOT NULL,
            subtitle        varchar NULL,
            description     text    NULL,
            cover_image_url varchar NULL,
            banner_image_url varchar NULL,
            author_id       integer NOT NULL,
            is_published    boolean NULL,
            is_featured     boolean NULL,
            published_at    timestamp without time zone NULL,
            pack_id         integer NULL,
            linked_song_ids text NULL,
            slug            varchar NULL,
            tags            text NULL,
            created_at      timestamp without time zone NULL,
            updated_at      timestamp without time zone NULL,

            CONSTRAINT fk_release_posts_author_id
                FOREIGN KEY (author_id) REFERENCES public.users(id),

            CONSTRAINT fk_release_posts_pack_id
                FOREIGN KEY (pack_id) REFERENCES public.packs(id)
        );

        ----------------------------------------------------------------------

        -- 1.5 user_achievements
        CREATE TABLE IF NOT EXISTS public.user_achievements (
            id              SERIAL PRIMARY KEY,
            user_id         integer NOT NULL,
            achievement_id  integer NOT NULL,
            earned_at       timestamp without time zone NULL,
            notified        boolean NULL,
            is_public       boolean NULL,

            CONSTRAINT unique_user_achievement
                UNIQUE (user_id, achievement_id),

            CONSTRAINT fk_user_achievements_user_id
                FOREIGN KEY (user_id) REFERENCES public.users(id),

            CONSTRAINT fk_user_achievements_achievement_id
                FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
        );

        ----------------------------------------------------------------------

        -- 1.6 user_stats
        CREATE TABLE IF NOT EXISTS public.user_stats (
            user_id             integer PRIMARY KEY,
            total_songs         integer NULL,
            total_released      integer NULL,
            total_packs         integer NULL,
            total_collaborations integer NULL,
            total_spotify_imports integer NULL,
            total_feature_requests integer NULL,
            login_streak        integer NULL,
            last_login_date     timestamp without time zone NULL,
            updated_at          timestamp without time zone NULL,
            total_future        integer DEFAULT 0,
            total_wip           integer DEFAULT 0,
            total_points        integer DEFAULT 0,
            total_wip_created   integer DEFAULT 0,
            total_future_created integer DEFAULT 0,

            CONSTRAINT fk_user_stats_user_id
                FOREIGN KEY (user_id) REFERENCES public.users(id)
        );

        ----------------------------------------------------------------------
        -- 2. New columns on existing public tables
        ----------------------------------------------------------------------

        -- 2.1 packs: release metadata and homepage flag
        ALTER TABLE public.packs
            ADD COLUMN IF NOT EXISTS release_description   text NULL,
            ADD COLUMN IF NOT EXISTS release_download_link text NULL,
            ADD COLUMN IF NOT EXISTS release_title         text NULL,
            ADD COLUMN IF NOT EXISTS release_youtube_url   text NULL,
            ADD COLUMN IF NOT EXISTS released_at           timestamp without time zone NULL,
            ADD COLUMN IF NOT EXISTS show_on_homepage      boolean NOT NULL DEFAULT TRUE;

        ----------------------------------------------------------------------

        -- 2.2 songs: release / public metadata
        ALTER TABLE public.songs
            ADD COLUMN IF NOT EXISTS is_public             boolean DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS release_description   text NULL,
            ADD COLUMN IF NOT EXISTS release_download_link text NULL,
            ADD COLUMN IF NOT EXISTS release_youtube_url   text NULL,
            ADD COLUMN IF NOT EXISTS released_at           timestamp without time zone NULL,
            ADD COLUMN IF NOT EXISTS updated_at            timestamp without time zone NULL;

        ----------------------------------------------------------------------

        -- 2.3 users: profile & sharing fields (cloudinary_public_id intentionally excluded)
        ALTER TABLE public.users
            ADD COLUMN IF NOT EXISTS default_public_sharing boolean DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS profile_image_url      text NULL,
            ADD COLUMN IF NOT EXISTS profile_picture_url    varchar NULL,
            ADD COLUMN IF NOT EXISTS website_url            text NULL;

        ----------------------------------------------------------------------
        -- End of additive migration
        ----------------------------------------------------------------------
        """
    ).strip()

    print(sql)


if __name__ == "__main__":
    main()



