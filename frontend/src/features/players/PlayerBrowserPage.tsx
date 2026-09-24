import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../../api/client";
import type { Player, PlayerDetail, Spell, Weapon } from "../../api/types";
import { Card } from "../../components/Card";
import { BrowserLayout } from "../../components/BrowserLayout";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { SearchList } from "../../components/SearchList";
import { StatePanel } from "../../components/StatePanel";
import {
  initialRemoteState,
  remoteError,
  remoteLoading,
  remoteSuccess,
} from "../../components/remoteState";
import type { RemoteState } from "../../components/remoteState";
import { UsersIcon } from "../../components/icons";
import { PlayerEditor } from "./PlayerEditor";
import { ManageAssignmentsDialog } from "./PlayerAssignments";
import { PlayerCombatSummary } from "./PlayerCombatSummary";
import { PlayerSpellSection } from "./PlayerSpellSection";
import { PlayerWeaponSection } from "./PlayerWeaponSection";
import "./PlayerBrowserPage.css";

type ManageDialogKind = "spells" | "weapons" | null;

export function PlayerBrowserPage() {
  const [playersRemote, setPlayersRemote] = useState<RemoteState<Player[]>>(initialRemoteState);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailRemote, setDetailRemote] = useState<RemoteState<PlayerDetail>>(initialRemoteState);
  const [allSpells, setAllSpells] = useState<Spell[]>([]);
  const [allWeapons, setAllWeapons] = useState<Weapon[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Player | null>(null);
  const [manageDialog, setManageDialog] = useState<ManageDialogKind>(null);
  const detailCache = useRef<Map<number, PlayerDetail>>(new Map());

  const prefetchDetails = useCallback((roster: Player[], skipId: number | null) => {
    for (const player of roster) {
      if (player.id === skipId) continue;
      if (detailCache.current.has(player.id)) continue;
      api
        .getPlayerDetail(player.id)
        .then((detail) => detailCache.current.set(player.id, detail))
        .catch(() => {});
    }
  }, []);

  const load = useCallback(
    (currentSelectedId: number | null, selectFirst = false) => {
      setPlayersRemote(remoteLoading());
      api
        .listPlayers()
        .then((data) => {
          const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
          setPlayersRemote(remoteSuccess(sorted));
          const activeId = selectFirst && sorted.length > 0 ? sorted[0].id : currentSelectedId;
          if (selectFirst && sorted.length > 0) setSelectedId(activeId);
          prefetchDetails(sorted, activeId);
        })
        .catch((error) =>
          setPlayersRemote(
            remoteError(error instanceof Error ? error.message : "Failed to load players."),
          ),
        );
    },
    [prefetchDetails],
  );

  useEffect(() => {
    load(null, true);
  }, [load]);
  useEffect(() => {
    api
      .listSpells()
      .then(setAllSpells)
      .catch(() => setAllSpells([]));
    api
      .listWeapons()
      .then(setAllWeapons)
      .catch(() => setAllWeapons([]));
  }, []);

  const loadDetail = (playerId: number, options?: { force?: boolean }) => {
    if (!options?.force) {
      const cached = detailCache.current.get(playerId);
      if (cached) {
        setDetailRemote(remoteSuccess(cached));
        return;
      }
    }
    setDetailRemote(remoteLoading());
    api
      .getPlayerDetail(playerId)
      .then((detail) => {
        detailCache.current.set(playerId, detail);
        setDetailRemote(remoteSuccess(detail));
      })
      .catch((error) =>
        setDetailRemote(
          remoteError(error instanceof Error ? error.message : "Failed to load player detail."),
        ),
      );
  };

  useEffect(() => {
    if (selectedId == null) {
      setDetailRemote(initialRemoteState);
      return;
    }
    loadDetail(selectedId);
  }, [selectedId]);

  const players = playersRemote.status === "success" ? playersRemote.data : [];
  const selected = players.find((p) => p.id === selectedId) || null;
  const detail = detailRemote.status === "success" ? detailRemote.data : null;

  const openCreate = () => {
    setEditingPlayer(undefined);
    setEditorOpen(true);
  };
  const openEdit = (player: Player) => {
    setEditingPlayer(player);
    setEditorOpen(true);
  };
  const handleSaved = (player: Player) => {
    setEditorOpen(false);
    setSelectedId(player.id);
    load(player.id);
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await api.deletePlayer(pendingDelete.id);
    setPendingDelete(null);
    setSelectedId(null);
    load(null);
  };

  return (
    <div className="player-browser-page">
      <BrowserLayout
        title="Players"
        chapterIcon={<UsersIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={
          <Button type="button" onClick={openCreate}>
            New Player
          </Button>
        }
        error={playersRemote.status === "error" ? playersRemote.error : null}
        listLabel="player list"
        listCollapsible
        list={
          <SearchList
            items={players}
            getId={(p) => p.id}
            getLabel={(p) => p.name}
            getMeta={(p) => p.class || undefined}
            selectedId={selectedId}
            onSelect={(p) => setSelectedId(p.id)}
            variant="neutral"
            searchPlaceholder="Search players…"
            emptyMessage="No players found."
            status={
              playersRemote.status === "loading" || playersRemote.status === "idle"
                ? "loading"
                : playersRemote.status === "error"
                  ? "error"
                  : "ready"
            }
          />
        }
        detail={
          selected ? (
            <div className="player-browser-detail">
              <Button className="browser-layout-back" variant="ghost">
                Back to players
              </Button>
              <Card
                title={selected.name}
                subtitle={selected.class || undefined}
                tag={selected.level != null ? `Level ${selected.level}` : undefined}
                variant="neutral"
                footer={
                  <div className="player-browser-actions">
                    <Button variant="secondary" onClick={() => openEdit(selected)}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => setPendingDelete(selected)}>
                      Delete
                    </Button>
                  </div>
                }
              >
                {detailRemote.status === "error" ? (
                  <StatePanel status="error" message={detailRemote.error} />
                ) : detailRemote.status === "loading" || detailRemote.status === "idle" ? (
                  <StatePanel status="loading" />
                ) : detail ? (
                  <div className="player-assignments-summary">
                    <PlayerCombatSummary player={selected} />
                    <section className="player-assignment-group">
                      <div className="player-assignment-group-header">
                        <h4>Spells</h4>
                        <Button variant="secondary" onClick={() => setManageDialog("spells")}>
                          Manage Spells
                        </Button>
                      </div>
                      <PlayerSpellSection player={selected} spells={detail.spells ?? []} />
                    </section>
                    <section className="player-assignment-group">
                      <div className="player-assignment-group-header">
                        <h4>Weapons</h4>
                        <Button variant="secondary" onClick={() => setManageDialog("weapons")}>
                          Manage Weapons
                        </Button>
                      </div>
                      <PlayerWeaponSection weapons={detail.weapons ?? []} />
                    </section>
                  </div>
                ) : null}
              </Card>
            </div>
          ) : (
            <StatePanel
              status="noSelection"
              message="Choose a player from the list to view their details."
            />
          )
        }
        editor={
          editorOpen && (
            <PlayerEditor
              player={editingPlayer}
              onClose={() => setEditorOpen(false)}
              onSaved={handleSaved}
            />
          )
        }

        dialog={
          pendingDelete ? (
            <ConfirmDialog
              message={`Delete "${pendingDelete.name}"? Spell and weapon assignments will be removed. Catalog records will remain. This cannot be undone.`}
              onConfirm={confirmDelete}
              onCancel={() => setPendingDelete(null)}
            />
          ) : manageDialog === "spells" && selected && detail ? (
            <ManageAssignmentsDialog<Spell>
              title="Manage Spells"
              items={allSpells}
              assignedIds={(detail.spells ?? []).map((s) => s.id)}
              getId={(s) => s.id}
              getLabel={(s) => s.name}
              onSave={async (ids) => {
                await api.replacePlayerSpells(selected.id, ids);
                loadDetail(selected.id, { force: true });
              }}
              onClose={() => setManageDialog(null)}
              searchPlaceholder="Search spells…"
            />
          ) : manageDialog === "weapons" && selected && detail ? (
            <ManageAssignmentsDialog<Weapon>
              title="Manage Weapons"
              items={allWeapons}
              assignedIds={(detail.weapons ?? []).map((w) => w.id)}
              getId={(w) => w.id}
              getLabel={(w) => w.name}
              onSave={async (ids) => {
                await api.replacePlayerWeapons(selected.id, ids);
                loadDetail(selected.id, { force: true });
              }}
              onClose={() => setManageDialog(null)}
              searchPlaceholder="Search weapons…"
            />
          ) : null
        }
      />
    </div>
  );
}
