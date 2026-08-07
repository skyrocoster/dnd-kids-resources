import { createPortal } from 'react-dom'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { Dungeon, IncomingGateway } from '../../../api/types'
import {
  ChevronDownIcon, ChevronUpIcon, DoorClosedIcon, EraserIcon, EyeIcon, MapIcon, MousePointer2,
  OffMapIcon, PlusIcon, PortalIcon, PropIcon, RoomIcon, SaveIcon, StairsIcon, TrashIcon, Trees, Waves,
} from '../../../components/icons'
import { ConnectionsResolveList } from './ConnectionsResolveList'
import { ToolbarTray } from './MapLabToolbar'
import { PROP_KIND_ICONS, PROP_KIND_OPTIONS } from './fixtureTypes'
import { roomIsOffMap } from './roomContent'
import type { MapLayout, MapPortal, MapRoom } from '../../../model/maplabModel'

type ArmedTool = 'select' | 'room' | 'door' | 'stair' | 'portal' | 'prop' | 'river' | 'trees'
type ToolFlyout = 'passages' | 'terrain' | 'prop'
type LayerVisibility = { outside: boolean; props: boolean; passages: boolean; labels: boolean }

export interface MapLabEditorChromeState {
  layout: MapLayout
  activeZ: number
  selectedRoomId: number | null
}

export interface MapLabEditorChromeProps {
  state: MapLabEditorChromeState
  floors: Array<{ z: number; title?: string | null }>
  armedTool: ArmedTool
  lastPassageTool: 'door' | 'stair' | 'portal'
  lastTerrainTool: 'river' | 'trees'
  openFlyout: ToolFlyout | null
  setOpenFlyout: Dispatch<SetStateAction<ToolFlyout | null>>
  setArmedTool: Dispatch<SetStateAction<ArmedTool>>
  setPlacementError: Dispatch<SetStateAction<string | null>>
  brushArmed: boolean
  eraseArmed: boolean
  setEraseArmed: Dispatch<SetStateAction<boolean>>
  selectedPropKind: string
  flyoutFilter: string
  setFlyoutFilter: Dispatch<SetStateAction<string>>
  passagesFlyoutRef: RefObject<HTMLDivElement | null>
  terrainFlyoutRef: RefObject<HTMLDivElement | null>
  propFlyoutRef: RefObject<HTMLDivElement | null>
  passagesMenuRef: RefObject<HTMLDivElement | null>
  terrainMenuRef: RefObject<HTMLDivElement | null>
  propMenuRef: RefObject<HTMLDivElement | null>
  passageToolOptions: Array<{ key: 'door' | 'stair' | 'portal'; label: string; icon: typeof DoorClosedIcon; active: boolean }>
  propKindOptions: typeof PROP_KIND_OPTIONS
  terrainToolOptions: Array<{ key: 'river' | 'trees'; label: string; icon: typeof Waves; active: boolean }>
  activatePassageTool: (tool: 'door' | 'stair' | 'portal') => void
  activatePropKind: (kind: string) => void
  activateTerrainTool: (tool: 'river' | 'trees') => void
  activateTopFilteredTool: () => void
  layerVisible: LayerVisibility
  toggleLayer: (layer: keyof LayerVisibility) => void
  viewPopoverOpen: boolean
  setViewPopoverOpen: Dispatch<SetStateAction<boolean>>
  viewPopoverRef: RefObject<HTMLDivElement | null>
  mapPopoverOpen: boolean
  setMapPopoverOpen: Dispatch<SetStateAction<boolean>>
  mapPopoverRef: RefObject<HTMLDivElement | null>
  showGhostFloor: boolean
  setShowGhostFloor: Dispatch<SetStateAction<boolean>>
  ghostZ: number | null
  density: 'auto' | 'detailed' | 'simple'
  setDensity: (density: 'auto' | 'detailed' | 'simple') => void
  updatePadding: (padding: MapLayout['meta']['padding']) => void
  setConfirmingReset: Dispatch<SetStateAction<boolean>>
  saveStatus: { status: 'idle' | 'saving' | 'saved' | 'error' }
  statusSlot: HTMLElement | null
  setTabletNavOpen: Dispatch<SetStateAction<boolean>>
  setActiveZ: (z: number) => void
}

export interface MapLabEditorNavigationProps {
  state: MapLabEditorChromeState
  tabletNavOpen: boolean
  setTabletNavOpen: Dispatch<SetStateAction<boolean>>
  hasFloorAbove: boolean
  hasFloorBelow: boolean
  addFloorAbove: () => void
  addFloorBelow: () => void
  roomsOnActiveFloor: MapRoom[]
  selectRoom: (roomId: number | null) => void
  setArmedTool: Dispatch<SetStateAction<ArmedTool>>
  setPlacementError: Dispatch<SetStateAction<string | null>>
  setRoomToDelete: Dispatch<SetStateAction<MapRoom | null>>
  dungeons: Dungeon[]
  incomingGateways: IncomingGateway[]
  connectionsLoaded: boolean
  connectionsLoadError: boolean
  setActiveZ: (z: number) => void
  selectPortal: (id: number | null) => void
  setGatewayToRemove: Dispatch<SetStateAction<MapPortal | null>>
  handleAddReturnGateway: (gateway: IncomingGateway) => void
}

const statusLabel = (status: MapLabEditorChromeProps['saveStatus']['status']) =>
  status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Save failed' : ''

export function MapLabEditorChrome(props: MapLabEditorChromeProps) {
  const { state, floors, armedTool, setArmedTool, setPlacementError, brushArmed, eraseArmed,
    setEraseArmed, lastPassageTool, lastTerrainTool, openFlyout,
    setOpenFlyout, passagesFlyoutRef, passagesMenuRef, propFlyoutRef, propMenuRef, terrainFlyoutRef,
    terrainMenuRef, passageToolOptions, propKindOptions, terrainToolOptions, selectedPropKind, activatePassageTool,
    activatePropKind, activateTerrainTool, activateTopFilteredTool, flyoutFilter, setFlyoutFilter } = props
  const filter = (label: string) => <input type="search" className="maplab-tool-palette-filter" aria-label={label} placeholder="Filter tools" value={flyoutFilter} onChange={(e) => setFlyoutFilter(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); activateTopFilteredTool() } }} />
  const toolMenu = (kind: ToolFlyout, ref: RefObject<HTMLDivElement | null>, menuRef: RefObject<HTMLDivElement | null>, options: Array<{ key: string; label: string; icon: typeof DoorClosedIcon; active: boolean }>, choose: (key: string) => void, label: string) => openFlyout === kind && ref.current && createPortal(<div className="maplab-tool-palette-flyout" role="menu" ref={menuRef} style={{ position: 'fixed', top: ref.current.getBoundingClientRect().bottom, left: ref.current.getBoundingClientRect().left, zIndex: 'var(--z-floating)' }}>{filter(label)}{options.length === 0 ? <p className="maplab-tool-palette-empty">No tools match that.</p> : options.map((option) => { const Icon = option.icon; return <button key={option.key} type="button" role="menuitem" className="maplab-pill-button" data-active={option.active || undefined} onClick={() => choose(option.key)}><Icon width={16} height={16} aria-hidden="true" />{option.label}</button> })}</div>, document.body)
  return <>
    {props.statusSlot && createPortal(<span className="maplab-editor-save-status" data-status={props.saveStatus.status} role="status" aria-live="polite"><SaveIcon width={16} height={16} aria-hidden="true" />{statusLabel(props.saveStatus.status)}</span>, props.statusSlot)}
    <div className="maplab-toolbar"><ToolbarTray groupKey="editor-create" label="Create"><div className="maplab-tool-palette" role="group" aria-label="Drawing tools">
      <button type="button" className="maplab-pill-button maplab-tool-palette-button" aria-pressed={armedTool === 'select'} data-active={armedTool === 'select' || undefined} onClick={() => { setArmedTool('select'); setPlacementError(null) }}><MousePointer2 width={18} height={18} aria-hidden="true" />Select</button>
      <button type="button" className="maplab-pill-button maplab-tool-palette-button" aria-pressed={armedTool === 'room'} data-active={armedTool === 'room' || undefined} title={armedTool === 'room' ? 'Click again or press Escape to return to Select.' : undefined} onClick={() => { setArmedTool(armedTool === 'room' ? 'select' : 'room'); setPlacementError(null) }}><RoomIcon width={18} height={18} aria-hidden="true" />Room</button>
      <div className="maplab-tool-palette-group" ref={passagesFlyoutRef}><button type="button" className="maplab-pill-button maplab-tool-palette-button" aria-label="Passage tools" aria-pressed={['door','stair','portal'].includes(armedTool)} data-active={['door','stair','portal'].includes(armedTool) || undefined} onClick={() => { setArmedTool(['door','stair','portal'].includes(armedTool) ? 'select' : lastPassageTool); setPlacementError(null); setOpenFlyout(null) }}>{lastPassageTool === 'stair' ? <StairsIcon width={18} height={18} aria-hidden="true" /> : lastPassageTool === 'portal' ? <PortalIcon width={18} height={18} aria-hidden="true" /> : <DoorClosedIcon width={18} height={18} aria-hidden="true" />}Passages</button><button type="button" className="maplab-pill-button maplab-tool-palette-flyout-toggle" aria-label="Choose passage tool" aria-haspopup="menu" aria-expanded={openFlyout === 'passages'} onClick={() => setOpenFlyout((o) => o === 'passages' ? null : 'passages')}>{openFlyout === 'passages' ? <ChevronUpIcon width={14} height={14} aria-hidden="true" /> : <ChevronDownIcon width={14} height={14} aria-hidden="true" />}</button>{toolMenu('passages', passagesFlyoutRef, passagesMenuRef, passageToolOptions, (key) => activatePassageTool(key as 'door'|'stair'|'portal'), 'Filter passage tools')}</div>
      <div className="maplab-tool-palette-group" ref={propFlyoutRef}><button type="button" className="maplab-pill-button maplab-tool-palette-button" aria-pressed={armedTool === 'prop'} data-active={armedTool === 'prop' || undefined} onClick={() => { setArmedTool(armedTool === 'prop' ? 'select' : 'prop'); setPlacementError(null); setOpenFlyout(null) }}><PropIcon width={18} height={18} aria-hidden="true" />Prop</button><button type="button" className="maplab-pill-button maplab-tool-palette-flyout-toggle" aria-label="Choose prop kind" aria-haspopup="menu" aria-expanded={openFlyout === 'prop'} onClick={() => setOpenFlyout((o) => o === 'prop' ? null : 'prop')}>{openFlyout === 'prop' ? <ChevronUpIcon width={14} height={14} aria-hidden="true" /> : <ChevronDownIcon width={14} height={14} aria-hidden="true" />}</button>{toolMenu('prop', propFlyoutRef, propMenuRef, propKindOptions.map((o) => ({ key: o.value, label: o.label, icon: PROP_KIND_ICONS[o.value as keyof typeof PROP_KIND_ICONS], active: selectedPropKind === o.value })), activatePropKind, 'Filter prop tools')}</div>
      <div className="maplab-tool-palette-group" ref={terrainFlyoutRef}><button type="button" className="maplab-pill-button maplab-tool-palette-button" aria-pressed={armedTool === 'river' || armedTool === 'trees'} data-active={armedTool === 'river' || armedTool === 'trees' || undefined} onClick={() => { setArmedTool(armedTool === 'river' || armedTool === 'trees' ? 'select' : lastTerrainTool); setPlacementError(null); setOpenFlyout(null) }}>{lastTerrainTool === 'trees' ? <Trees width={18} height={18} aria-hidden="true" /> : <Waves width={18} height={18} aria-hidden="true" />}Terrain</button><button type="button" className="maplab-pill-button maplab-tool-palette-flyout-toggle" aria-label="Choose terrain tool" aria-haspopup="menu" aria-expanded={openFlyout === 'terrain'} onClick={() => setOpenFlyout((o) => o === 'terrain' ? null : 'terrain')}>{openFlyout === 'terrain' ? <ChevronUpIcon width={14} height={14} aria-hidden="true" /> : <ChevronDownIcon width={14} height={14} aria-hidden="true" />}</button>{toolMenu('terrain', terrainFlyoutRef, terrainMenuRef, terrainToolOptions, (key) => activateTerrainTool(key as 'river'|'trees'), 'Filter terrain tools')}</div>
    </div>{brushArmed && <div className="maplab-tool-options" role="group" aria-label="Brush options"><button type="button" className="maplab-pill-button maplab-tool-options-erase" aria-pressed={eraseArmed} data-active={eraseArmed || undefined} onClick={() => setEraseArmed((a) => !a)}><EraserIcon width={18} height={18} aria-hidden="true" />Erase</button></div>}</ToolbarTray>
    <div className="maplab-view-popover-wrap" ref={props.viewPopoverRef}><button type="button" className="maplab-pill-button maplab-editor-toolbar-button" aria-haspopup="true" aria-expanded={props.viewPopoverOpen} onClick={() => props.setViewPopoverOpen((o) => !o)}><EyeIcon width={18} height={18} aria-hidden="true" />View</button>{props.viewPopoverOpen && <div className="maplab-view-popover" role="menu">{(['outside', 'props', 'passages', 'labels'] as const).map((layer) => <button key={layer} type="button" className="maplab-pill-button maplab-layer-toggle-button" aria-pressed={props.layerVisible[layer]} onClick={() => props.toggleLayer(layer)}>{layer[0].toUpperCase() + layer.slice(1)}</button>)}<button type="button" className="maplab-pill-button" aria-pressed={props.showGhostFloor} disabled={props.ghostZ === null} onClick={() => props.setShowGhostFloor((a) => !a)}>Ghost lower floor</button><button type="button" className="maplab-pill-button" aria-pressed={props.density === 'detailed'} onClick={() => props.setDensity('detailed')}>Detailed</button><button type="button" className="maplab-pill-button" aria-pressed={props.density === 'auto'} onClick={() => props.setDensity('auto')}>Auto</button><button type="button" className="maplab-pill-button" aria-pressed={props.density === 'simple'} onClick={() => props.setDensity('simple')}>Simple</button></div>}</div>
    <div className="maplab-map-popover-wrap" ref={props.mapPopoverRef}><button type="button" className="maplab-pill-button maplab-editor-toolbar-button" aria-haspopup="true" aria-expanded={props.mapPopoverOpen} onClick={() => props.setMapPopoverOpen((o) => !o)}><MapIcon width={18} height={18} aria-hidden="true" />Map</button>{props.mapPopoverOpen && <div className="maplab-map-popover" role="menu">{(['top', 'right', 'bottom', 'left'] as const).map((side) => <label key={side} className="maplab-field-row maplab-room-content-field maplab-editor-padding-input"><span>{side[0].toUpperCase() + side.slice(1)}</span><input type="number" min={0} value={state.layout.meta.padding[side]} onChange={(e) => props.updatePadding({ ...state.layout.meta.padding, [side]: Number(e.target.value) })} /></label>)}<button type="button" className="maplab-pill-button maplab-editor-toolbar-button" onClick={() => props.setConfirmingReset(true)}>Reset unsaved changes</button></div>}</div>
    <div className="maplab-floor-tabs" role="tablist" aria-label="Dungeon floors">{floors.map((floor) => <button key={floor.z} type="button" role="tab" className="maplab-pill-button maplab-floor-tab" aria-selected={floor.z === state.activeZ} onClick={() => { props.setActiveZ(floor.z); props.setTabletNavOpen(false) }}>{floor.title ?? `Floor ${floor.z}`}</button>)}</div>
    </div>
  </>
}

export function MapLabEditorNavigation(props: MapLabEditorNavigationProps) {
  const { state, tabletNavOpen, setTabletNavOpen, hasFloorAbove, hasFloorBelow, addFloorAbove, addFloorBelow, roomsOnActiveFloor, selectRoom, setArmedTool, setPlacementError, setRoomToDelete, dungeons, incomingGateways, connectionsLoaded, connectionsLoadError, setActiveZ, selectPortal, setGatewayToRemove, handleAddReturnGateway } = props
  return <><button type="button" className="maplab-pill-button maplab-editor-nav-toggle" aria-label="Open map editor navigation" aria-expanded={tabletNavOpen} aria-controls="maplab-editor-navigation" onClick={() => setTabletNavOpen((o) => !o)}>Floors, rooms, and connections</button><div id="maplab-editor-navigation" className="maplab-editor-nav-rail" data-open={tabletNavOpen || undefined}><div className="maplab-floor-tabs maplab-editor-nav-floor-tabs" aria-hidden="true" /><div className="maplab-editor-floor-actions" aria-label="Floor actions"><button type="button" className="maplab-pill-button maplab-editor-floor-action" disabled={hasFloorAbove} onClick={addFloorAbove}><PlusIcon width={16} height={16} aria-hidden="true" />Add floor above</button><button type="button" className="maplab-pill-button maplab-editor-floor-action" disabled={hasFloorBelow} onClick={addFloorBelow}><PlusIcon width={16} height={16} aria-hidden="true" />Add floor below</button></div><button type="button" className="maplab-pill-button maplab-editor-room-list-new" onClick={() => { selectRoom(null); setArmedTool('room'); setPlacementError(null) }}><PlusIcon width={16} height={16} aria-hidden="true" />New room</button><ul className="maplab-editor-room-list" aria-label="Rooms on this floor">{roomsOnActiveFloor.map((room) => <li key={room.room_id} className="maplab-editor-room-item" data-selected={room.room_id === state.selectedRoomId || undefined} data-off-map={roomIsOffMap(room) || undefined}><button type="button" className="maplab-editor-room-item-select" aria-pressed={room.room_id === state.selectedRoomId} onClick={() => { const next = room.room_id === state.selectedRoomId ? null : room.room_id; selectRoom(next); if (next !== null) setArmedTool('room') }}>{room.title ?? `Room ${room.room_id}`}{roomIsOffMap(room) && <span className="maplab-editor-room-offmap"><OffMapIcon width={14} height={14} aria-hidden="true" />not on the map</span>}</button><button type="button" className="maplab-editor-room-item-delete" aria-label={`Delete ${room.title ?? `Room ${room.room_id}`}`} onClick={() => setRoomToDelete(room)}><TrashIcon width={16} height={16} aria-hidden="true" /></button></li>)}{roomsOnActiveFloor.length === 0 && <li className="maplab-editor-room-list-empty">No rooms on this floor yet.</li>}</ul><ConnectionsResolveList layout={state.layout} dungeons={dungeons} incomingGateways={incomingGateways} connectionsLoaded={connectionsLoaded} connectionsLoadError={connectionsLoadError} onResolve={(portal) => { setActiveZ(portal.z); selectPortal(portal.portal_id) }} onRemoveGateway={setGatewayToRemove} onAddReturnGateway={handleAddReturnGateway} /></div></>
}
