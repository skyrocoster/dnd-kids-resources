"""Typed error response bodies for the API's domain features."""

from typing import Literal

from pydantic import BaseModel


class ApiErrorResponse(BaseModel):
    code: str
    message: str


class AtTheTableError(ApiErrorResponse):
    code: Literal["dungeon_not_found", "failed_to_set_at_the_table"]


class DungeonError(ApiErrorResponse):
    code: Literal[
        "dungeon_not_found",
        "failed_to_create_dungeon",
        "failed_to_update_dungeon",
        "failed_to_delete_dungeon",
    ]


class EncounterError(ApiErrorResponse):
    code: Literal[
        "encounter_not_found",
        "failed_to_create_encounter",
        "failed_to_update_encounter",
        "failed_to_delete_encounter",
    ]


class FogError(ApiErrorResponse):
    code: Literal["dungeon_not_found", "failed_to_reveal_cells"]


class ItemError(ApiErrorResponse):
    code: Literal["item_not_found"]


class LayoutError(ApiErrorResponse):
    code: Literal["layout_not_found", "dungeon_not_found", "failed_to_save_layout"]


class LootError(ApiErrorResponse):
    code: Literal[
        "loot_bundle_not_found",
        "failed_to_create_loot_bundle",
        "failed_to_update_loot_bundle",
        "failed_to_delete_loot_bundle",
    ]


class MonsterError(ApiErrorResponse):
    code: Literal[
        "monster_not_found",
        "monster_name_already_exists",
        "failed_to_create_monster",
        "failed_to_update_monster",
        "failed_to_delete_monster",
    ]


class NpcError(ApiErrorResponse):
    code: Literal[
        "npc_not_found",
        "failed_to_create_npc",
        "failed_to_update_npc",
        "failed_to_delete_npc",
    ]


class PlayerError(ApiErrorResponse):
    code: Literal[
        "player_not_found",
        "spell_not_found",
        "weapon_not_found",
        "spell_already_assigned_to_player",
        "duplicate_spell_ids",
        "spell_assignment_not_found",
        "failed_to_create_player",
        "failed_to_update_player",
        "failed_to_delete_player",
        "failed_to_assign_spell",
        "failed_to_replace_player_spells",
        "failed_to_remove_spell_from_player",
        "duplicate_weapon_ids",
        "weapon_assignment_not_found",
        "weapon_already_assigned_to_player",
        "failed_to_replace_player_weapons",
        "failed_to_assign_weapon",
        "failed_to_remove_weapon_from_player",
    ]


class SessionStateError(ApiErrorResponse):
    code: Literal[
        "session_state_not_found",
        "dungeon_not_found",
        "failed_to_save_session_state",
    ]


class SpellError(ApiErrorResponse):
    code: Literal[
        "spell_not_found",
        "player_not_found",
        "duplicate_player_ids",
        "failed_to_replace_spell_players",
        "spell_name_already_exists",
        "failed_to_delete_spell",
    ]


class WeaponError(ApiErrorResponse):
    code: Literal[
        "weapon_not_found",
        "failed_to_create_weapon",
        "failed_to_update_weapon",
        "failed_to_delete_weapon",
    ]


class LoomError(ApiErrorResponse):
    code: Literal[
        "session_ordinal_already_exists",
        "failed_to_create_session",
        "session_not_found",
        "failed_to_update_session",
        "cannot_delete_session_with_nodes",
        "failed_to_delete_session",
        "unknown_thread",
        "no_pending_beat",
        "invalid_session_log",
        "failed_to_log_session",
        "unknown_origin_node_id",
        "origin_node_must_reference_session",
        "thread_name_already_exists",
        "failed_to_create_thread",
        "thread_not_found",
        "failed_to_update_thread",
        "failed_to_delete_thread",
        "failed_to_create_node",
        "node_not_found",
        "node_kind_is_immutable",
        "failed_to_update_node",
        "cannot_delete_start_end_node",
        "failed_to_delete_node",
        "only_beats_can_be_fulfilled",
        "beat_must_be_placed_to_be_fulfilled",
        "beat_must_have_session_to_be_fulfilled",
        "only_beats_can_be_banked",
        "beat_is_not_placed_on_a_thread",
        "failed_to_bank_beat",
        "only_beats_or_sessions_can_be_placed",
        "node_already_in_thread",
        "node_already_on_another_thread",
        "failed_to_place_node",
        "node_not_a_member_of_thread",
        "start_end_position_is_fixed",
        "failed_to_reorder_node",
        "cannot_remove_start_end_nodes",
        "failed_to_remove_node_from_thread",
        "target_thread_not_found",
        "cannot_move_within_same_thread",
        "failed_to_move_node",
    ]
