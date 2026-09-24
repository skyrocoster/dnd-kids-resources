import { useCallback, useEffect, useState } from "react";
import * as api from "../../api/client";
import type { Weapon } from "../../api/types";
import { Card } from "../../components/Card";
import { BrowserLayout } from "../../components/BrowserLayout";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DiceText } from "../../components/DiceText";
import { SearchList } from "../../components/SearchList";
import { StatePanel } from "../../components/StatePanel";
import {
  initialRemoteState,
  remoteError,
  remoteLoading,
  remoteSuccess,
} from "../../components/remoteState";
import type { RemoteState } from "../../components/remoteState";
import { SwordsIcon } from "../../components/icons";
import { ReferenceText, weaponValueReferenceRegistry } from "../../components/referenceText";
import { WeaponEditor } from "./WeaponEditor";
import { describeAttack } from "./weaponPresentation";
import "./WeaponBrowserPage.css";

function formatNameList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function deleteConfirmMessage(weapon: Weapon, assignedNames: string[]): string {
  const base = `Delete "${weapon.name}"? This cannot be undone.`;
  if (assignedNames.length === 0) return base;
  return `${base} ${formatNameList(assignedNames)} will lose this weapon assignment.`;
}

function entryToText(entry: unknown): string {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object" && "entries" in entry) {
    const nested = (entry as { entries?: unknown[] }).entries || [];
    return nested.map(entryToText).join(" ");
  }
  return "";
}

export function WeaponBrowserPage() {
  const [weaponsRemote, setWeaponsRemote] = useState<RemoteState<Weapon[]>>(initialRemoteState);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState<Weapon | undefined>(undefined);
  const [draftWeapon, setDraftWeapon] = useState<Weapon | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<Weapon | null>(null);
  const [pendingDeleteNames, setPendingDeleteNames] = useState<string[]>([]);
  const [deleteChecking, setDeleteChecking] = useState(false);

  const load = useCallback((selectFirst = false) => {
    setWeaponsRemote(remoteLoading());
    api
      .listWeapons()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setWeaponsRemote(remoteSuccess(sorted));
        if (selectFirst && sorted.length > 0) setSelectedId(sorted[0].id);
      })
      .catch((error) =>
        setWeaponsRemote(
          remoteError(error instanceof Error ? error.message : "Failed to load weapons."),
        ),
      );
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const weapons = weaponsRemote.status === "success" ? weaponsRemote.data : [];
  const selected = weapons.find((w) => w.id === selectedId) || null;

  const openCreate = () => {
    setEditingWeapon(undefined);
    setDraftWeapon(undefined);
    setEditorOpen(true);
  };
  const openEdit = (weapon: Weapon) => {
    setEditingWeapon(weapon);
    setDraftWeapon(undefined);
    setEditorOpen(true);
  };
  const openCopy = (weapon: Weapon) => {
    setEditingWeapon(undefined);
    setDraftWeapon(weapon);
    setEditorOpen(true);
  };
  const handleSaved = (weapon: Weapon) => {
    setEditorOpen(false);
    setSelectedId(weapon.id);
    load();
  };
  const requestDelete = async (weapon: Weapon) => {
    setPendingDelete(weapon);
    setDeleteChecking(true);
    try {
      const players = await api.getWeaponPlayers(weapon.id);
      setPendingDeleteNames(players.map((p) => p.name));
    } catch {
      setPendingDeleteNames([]);
    } finally {
      setDeleteChecking(false);
    }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await api.deleteWeapon(pendingDelete.id);
    setPendingDelete(null);
    setPendingDeleteNames([]);
    setSelectedId(null);
    load();
  };

  return (
    <div className="weapon-browser-page">
      <BrowserLayout
        title="Weapons"
        chapterIcon={<SwordsIcon size={18} aria-hidden="true" />}
        detailOpen={selected !== null}
        actions={
          <Button type="button" onClick={openCreate}>
            New Weapon
          </Button>
        }
        error={weaponsRemote.status === "error" ? weaponsRemote.error : null}
        listLabel="weapon list"
        listCollapsible
        list={
          <SearchList
            items={weapons}
            getId={(w) => w.id}
            getLabel={(w) => w.name}
            getMeta={(w) => w.rarity || undefined}
            selectedId={selectedId}
            onSelect={(w) => setSelectedId(w.id)}
            variant="weapon"
            searchPlaceholder="Search weapons…"
            emptyMessage="No weapons found."
            status={
              weaponsRemote.status === "loading" || weaponsRemote.status === "idle"
                ? "loading"
                : weaponsRemote.status === "error"
                  ? "error"
                  : "ready"
            }
          />
        }
        detail={
          selected ? (
            <div className="weapon-browser-detail">
              <Button className="browser-layout-back" variant="ghost">
                Back to weapons
              </Button>
              <Card
                title={selected.name}
                subtitle={selected.base_weapon || selected.weapon_category || undefined}
                tag={selected.rarity || undefined}
                variant="weapon"
                footer={
                  <div className="weapon-browser-actions">
                    <Button variant="secondary" onClick={() => openEdit(selected)}>
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={() => openCopy(selected)}>
                      Copy as New
                    </Button>
                    <Button variant="danger" onClick={() => requestDelete(selected)}>
                      Delete
                    </Button>
                  </div>
                }
              >
                <dl className="weapon-browser-meta">
                  {selected.weapon_category && (
                    <>
                      <dt>Category</dt>
                      <dd>{selected.weapon_category}</dd>
                    </>
                  )}
                  {selected.weight != null && (
                    <>
                      <dt>Weight</dt>
                      <dd>{selected.weight} lb.</dd>
                    </>
                  )}
                  {selected.req_attune && (
                    <>
                      <dt>Attunement</dt>
                      <dd>{selected.req_attune}</dd>
                    </>
                  )}
                  {selected.property && selected.property.length > 0 && (
                    <>
                      <dt>Properties</dt>
                      <dd>{selected.property.join(", ")}</dd>
                    </>
                  )}
                  {selected.focus && selected.focus.length > 0 && (
                    <>
                      <dt>Spellcasting Focus</dt>
                      <dd>{selected.focus.join(", ")}</dd>
                    </>
                  )}
                </dl>

                {selected.quick_rules && (
                  <p className="weapon-browser-quick-rules">
                    <ReferenceText
                      text={selected.quick_rules}
                      registry={weaponValueReferenceRegistry}
                      context={{
                        weapon_attack_bonus: selected.weapon_attack_bonus,
                        weapon_damage_bonus: selected.weapon_damage_bonus,
                      }}
                    />
                  </p>
                )}

                {selected.attack && selected.attack.length > 0 && (
                  <div className="weapon-browser-attacks">
                    {selected.attack.map((attack, i) => (
                      <p key={i}>
                        <DiceText text={describeAttack(attack)} />
                      </p>
                    ))}
                  </div>
                )}

                {selected.entries &&
                  selected.entries.map((entry, i) => {
                    const text = entryToText(entry);
                    return text ? (
                      <p key={i}>
                        <DiceText text={text} />
                      </p>
                    ) : null;
                  })}
              </Card>
            </div>
          ) : (
            <StatePanel
              status="noSelection"
              message="Choose a weapon from the list to view its details."
            />
          )
        }
        editor={
          editorOpen && (
            <WeaponEditor
              weapon={editingWeapon}
              draftWeapon={draftWeapon}
              onClose={() => setEditorOpen(false)}
              onSaved={handleSaved}
            />
          )
        }

        dialog={
          pendingDelete && (
            <ConfirmDialog
              message={deleteConfirmMessage(pendingDelete, pendingDeleteNames)}
              onConfirm={confirmDelete}
              onCancel={() => {
                setPendingDelete(null);
                setPendingDeleteNames([]);
              }}
              pending={deleteChecking}
            />
          )
        }
      />
    </div>
  );
}
