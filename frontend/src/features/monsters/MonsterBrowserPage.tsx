import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as api from "../../api/client";
import type { Monster } from "../../api/types";
import { BrowserLayout } from "../../components/BrowserLayout";
import { Button } from "../../components/Button";
import { SearchList } from "../../components/SearchList";
import { StatePanel } from "../../components/StatePanel";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  initialRemoteState,
  remoteError,
  remoteLoading,
  remoteSuccess,
} from "../../components/remoteState";
import type { RemoteState } from "../../components/remoteState";
import { SkullIcon } from "../../components/icons";
import { MonsterStatBlock } from "./MonsterStatBlock";
import "./MonsterBrowserPage.css";

export function MonsterBrowserPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [monstersRemote, setMonstersRemote] = useState<RemoteState<Monster[]>>(initialRemoteState);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Monster | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMonstersRemote(remoteLoading());
    api
      .listMonsters()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setMonstersRemote(remoteSuccess(sorted));
        const pendingId = (location.state as { selectedId?: number } | null)?.selectedId;
        if (pendingId && sorted.find((m) => m.id === pendingId)) {
          setSelectedId(pendingId);
        } else if (sorted.length > 0) {
          setSelectedId(sorted[0].id);
        }
      })
      .catch((error) =>
        setMonstersRemote(
          remoteError(error instanceof Error ? error.message : "Failed to load monsters."),
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const monsters = monstersRemote.status === "success" ? monstersRemote.data : [];
  const selected = monsters.find((m) => m.id === selectedId) || null;
  const deleteSelected = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteMonster(pendingDelete.id);
      setPendingDelete(null);
      setSelectedId(null);
      setMonstersRemote(remoteLoading());
      const data = await api.listMonsters();
      setMonstersRemote(remoteSuccess([...data].sort((a, b) => a.name.localeCompare(b.name))));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="monster-browser-page">
      <BrowserLayout
        title="Monsters"
        chapterIcon={<SkullIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={
          <Button type="button" onClick={() => navigate("/monsters/new")}>
            Add Monster
          </Button>
        }
        error={monstersRemote.status === "error" ? monstersRemote.error : null}
        listLabel="monster list"
        listCollapsible
        list={
          <SearchList
            items={monsters}
            getId={(m) => m.id}
            getLabel={(m) => m.name}
            getMeta={(m) => (m.cr ? `CR ${m.cr}` : undefined)}
            selectedId={selectedId}
            onSelect={(m) => setSelectedId(m.id)}
            variant="monster"
            searchPlaceholder="Search monsters…"
            emptyMessage="No monsters found."
            status={
              monstersRemote.status === "loading" || monstersRemote.status === "idle"
                ? "loading"
                : monstersRemote.status === "error"
                  ? "error"
                  : "ready"
            }
          />
        }
        detail={
          selected ? (
            <div className="monster-browser-detail" data-variant="monster">
              <Button className="browser-layout-back" variant="ghost">
                Back to monsters
              </Button>
              <div className="monster-browser-detail-header">
                <div className="monster-browser-detail-kicker">Bestiary Field Card</div>
                <div className="monster-browser-detail-actions">
                  <Button variant="secondary" onClick={() => window.print()}>
                    Print Monster
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/monsters/${selected.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => setPendingDelete(selected)}>
                    Delete
                  </Button>
                </div>
              </div>
              <MonsterStatBlock monster={selected} />
            </div>
          ) : (
            <StatePanel
              status="noSelection"
              message="Choose a monster from the list to see its stat block."
            />
          )
        }
        dialog={
          pendingDelete ? (
            <ConfirmDialog
              message={`Delete ${pendingDelete.name}?`}
              confirmLabel="Delete"
              onConfirm={deleteSelected}
              onCancel={() => setPendingDelete(null)}
              pending={deleting}
            />
          ) : null
        }
      />
    </div>
  );
}
