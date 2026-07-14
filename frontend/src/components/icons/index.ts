// Line-icon set using Lucide (ISC license)
// Icons inherit currentColor for easy theming in light/dark mode
//
// Every Lucide icon is available via its native PascalCase name:
//   import { DoorOpen, AlertTriangle } from '../components/icons'
// Use native names directly via `export * from 'lucide-react'`
//
// TTRPG-specific aliases below are grouped by domain with usage comments.
// Use aliases for domain-specific meaning; use native names for generic icons.

export * from 'lucide-react'

// ─── Navigation / Shell UI ───────────────────────────────────────────────
export { PanelLeftClose as NavCollapseIcon } from 'lucide-react'
export { PanelLeftOpen as NavExpandIcon } from 'lucide-react'
export { ChevronUp as ChevronUpIcon } from 'lucide-react'
export { ChevronDown as ChevronDownIcon } from 'lucide-react'
export { ChevronLeft as ChevronLeftIcon } from 'lucide-react'       // Back / previous
export { ChevronRight as ChevronRightIcon } from 'lucide-react'     // Forward / next
export { X as CloseIcon } from 'lucide-react'
export { Copy as CopyIcon } from 'lucide-react'
export { Trash2 as TrashIcon } from 'lucide-react'
export { Plus as PlusIcon } from 'lucide-react'
export { Minus as MinusIcon } from 'lucide-react'
export { Save as SaveIcon } from 'lucide-react'
export { Menu as MenuIcon } from 'lucide-react'                     // Hamburger menu
export { MoreHorizontal as MoreIcon } from 'lucide-react'           // Overflow menu
export { MoreVertical as MoreVerticalIcon } from 'lucide-react'     // Vertical overflow
export { Settings as SettingsIcon } from 'lucide-react'             // Config / options
export { Cog as CogIcon } from 'lucide-react'                       // Mechanical / gear
export { SlidersHorizontal as SlidersIcon } from 'lucide-react'     // Sliders / adjustments
export { GripVertical as GripIcon } from 'lucide-react'
export { Undo2 as UndoIcon } from 'lucide-react'                    // Undo
export { Redo2 as RedoIcon } from 'lucide-react'                    // Redo
export { RefreshCw as RefreshIcon } from 'lucide-react'             // Reload
export { Expand as ExpandIcon } from 'lucide-react'                 // Expand view
export { Shrink as ShrinkIcon } from 'lucide-react'                 // Shrink view
export { Move as MoveIcon } from 'lucide-react'                     // Move / drag
export { Focus as FocusIcon } from 'lucide-react'                   // Center / focus

// ─── Zoom / View ─────────────────────────────────────────────────────────
export { ZoomIn as ZoomInIcon } from 'lucide-react'
export { ZoomOut as ZoomOutIcon } from 'lucide-react'
export { Maximize2 as FitIcon } from 'lucide-react'
export { Maximize2 as FullscreenEnterIcon } from 'lucide-react'
export { Minimize2 as FullscreenExitIcon } from 'lucide-react'
export { Maximize as MaximizeIcon } from 'lucide-react'
export { Minimize as MinimizeIcon } from 'lucide-react'

// ─── Dungeon / Map Features ──────────────────────────────────────────────
export { DoorOpen as DoorIcon } from 'lucide-react'                 // Open door / entrance
export { DoorOpen as DoorOpenIcon } from 'lucide-react'
export { DoorClosed as DoorClosedIcon } from 'lucide-react'
export { DoorClosed as DoorClosedLockedIcon } from 'lucide-react'   // Sealed / barred
export { KeyRound as KeyIcon } from 'lucide-react'
export { Footprints as StairsIcon } from 'lucide-react'
export { ArrowUpToLine as StairsUpIcon } from 'lucide-react'        // Ascent
export { ArrowDownToLine as StairsDownIcon } from 'lucide-react'    // Descent
export { AlertTriangle as TrapIcon } from 'lucide-react'
export { CheckCircle2 as TrapDisarmedIcon } from 'lucide-react'     // Disarmed trap
export { LayoutGrid as RoomIcon } from 'lucide-react'               // Room / cell
export { Lock as LockIcon } from 'lucide-react'                     // Locked / sealed
export { LockOpen as UnlockIcon } from 'lucide-react'               // Unlocked / picked
export { EyeOff as HiddenIcon } from 'lucide-react'                 // Secret / hidden
export { Sparkles as PortalIcon } from 'lucide-react'               // Portal / teleporter
export { Sparkles as MagicPortalIcon } from 'lucide-react'          // Magical portal
export { Crosshair as CrosshairIcon } from 'lucide-react'           // Target marker
export { Crosshair as MarkerIcon } from 'lucide-react'              // Generic marker
export { Map as MapIcon } from 'lucide-react'                       // Dungeon map
export { MapPin as MapPinIcon } from 'lucide-react'                 // Pin / location
export { MapPinned as MapPinnedIcon } from 'lucide-react'           // Pinned location
export { Navigation2 as CompassArrowIcon } from 'lucide-react'      // Direction arrow
export { Waypoints as WaypointsIcon } from 'lucide-react'           // Travel path
export { Route as RouteIcon } from 'lucide-react'                   // Route / trail
export { Signpost as SignpostIcon } from 'lucide-react'             // Crossroads
export { Target as TargetIcon } from 'lucide-react'                 // Destination
export { Locate as LocateIcon } from 'lucide-react'                 // Find / locate
export { LocateFixed as LocateFixedIcon } from 'lucide-react'       // Fixed location

// ─── Room / Furnishing Props ─────────────────────────────────────────────
export { Package as ItemIcon } from 'lucide-react'
export { Package as PackageIcon } from 'lucide-react'
export { Package as PropIcon } from 'lucide-react'
export { Box as PropChestIcon } from 'lucide-react'
export { Table2 as PropTableIcon } from 'lucide-react'
export { Frame as PropMirrorIcon } from 'lucide-react'
export { Barrel as PropBarrelIcon } from 'lucide-react'
export { Landmark as PropStatueIcon } from 'lucide-react'
export { Layers as PropWindowIcon } from 'lucide-react'
export { Bed as PropBedIcon } from 'lucide-react'
export { Anvil as PropAnvilIcon } from 'lucide-react'
export { Armchair as ChairIcon } from 'lucide-react'                // Chair / seat
export { Table as TableIcon } from 'lucide-react'                   // Alternative table
export { Sofa as SofaIcon } from 'lucide-react'                     // Bench / sofa
export { ShelvingUnit as ShelfIcon } from 'lucide-react'            // Bookshelf
export { Lamp as LampIcon } from 'lucide-react'                     // Light source
export { LampCeiling as ChandelierIcon } from 'lucide-react'        // Ceiling light
export { LampDesk as DeskLampIcon } from 'lucide-react'             // Desk lamp
export { LampFloor as FloorLampIcon } from 'lucide-react'           // Floor lamp
export { LampWallDown as WallSconceIcon } from 'lucide-react'       // Wall sconce
export { BookOpen as TomeIcon } from 'lucide-react'
export { BookOpen as BookOpenIcon } from 'lucide-react'             // Open tome
export { Book as BookIcon } from 'lucide-react'                     // Spellbook
export { BookMarked as BookMarkedIcon } from 'lucide-react'         // Quest log
export { BookText as BookTextIcon } from 'lucide-react'             // Filled book
export { ScrollText as ScrollIcon } from 'lucide-react'
export { Scroll as ScrollBlankIcon } from 'lucide-react'            // Blank scroll

// ─── Combat / Weapons ────────────────────────────────────────────────────
export { Swords as SwordsIcon } from 'lucide-react'                 // Crossed swords
export { Sword as SwordIcon } from 'lucide-react'                   // Single blade
export { Shield as ShieldIcon } from 'lucide-react'
export { ShieldCheck as ShieldCheckIcon } from 'lucide-react'       // Protected
export { ShieldAlert as ShieldAlertIcon } from 'lucide-react'       // Damaged shield
export { ShieldBan as ShieldBrokenIcon } from 'lucide-react'        // Broken / sundered
export { ShieldX as ShieldShatteredIcon } from 'lucide-react'       // Shattered
export { ShieldHalf as ShieldHalfIcon } from 'lucide-react'         // Partial cover
export { ShieldPlus as ShieldUpIcon } from 'lucide-react'           // Shield buff
export { ShieldMinus as ShieldDownIcon } from 'lucide-react'        // Shield debuff
export { ShieldQuestion as ShieldQuestionIcon } from 'lucide-react' // Unknown defense
export { Axe as AxeIcon } from 'lucide-react'                       // Greataxe / axe
export { Pickaxe as PickaxeIcon } from 'lucide-react'               // Mining pick
export { Hammer as HammerIcon } from 'lucide-react'                 // Maul / warhammer
export { Gavel as GavelIcon } from 'lucide-react'                   // Judgement / law
export { Bomb as BombIcon } from 'lucide-react'                     // Explosive
export { Cross as CrossIcon } from 'lucide-react'                   // Holy symbol
export { Swords as FightIcon } from 'lucide-react'                  // Encounter / battle
export { SkipForward as NextTurnIcon } from 'lucide-react'
export { ArrowUp as ArrowUpIcon } from 'lucide-react'               // Directional
export { ArrowDown as ArrowDownIcon } from 'lucide-react'
export { ArrowLeft as ArrowLeftIcon } from 'lucide-react'
export { ArrowRight as ArrowRightIcon } from 'lucide-react'
export { Zap as LightningBoltIcon } from 'lucide-react'             // Lightning dmg
export { ZapOff as LightningResistIcon } from 'lucide-react'        // Resistance

// ─── HP / Health ─────────────────────────────────────────────────────────
export { Heart as HeartIcon } from 'lucide-react'                   // HP / health
export { HeartPulse as HeartPulseIcon } from 'lucide-react'         // Heartbeat / alive
export { HeartCrack as HeartBrokenIcon } from 'lucide-react'        // Necrotic / broken
export { HeartOff as HeartUndeadIcon } from 'lucide-react'          // Undead
export { HeartPlus as HealIcon } from 'lucide-react'                // Healing
export { HeartMinus as DamageIcon } from 'lucide-react'             // Damage taken
export { HeartX as FatalDamageIcon } from 'lucide-react'            // Fatal / dead
export { Skull as SkullIcon } from 'lucide-react'                   // Death / undead

// ─── Equipment Slots ────────────────────────────────────────────────────
export { HardHat as HelmetIcon } from 'lucide-react'                // Helm / head slot
export { Shirt as ShirtIcon } from 'lucide-react'                   // Chest armor slot
export { Backpack as BackpackIcon } from 'lucide-react'             // Pack / inventory
export { Glasses as GogglesIcon } from 'lucide-react'               // Eyewear / goggles
export { PawPrint as BootIcon } from 'lucide-react'                 // Footwear (placeholder)

// ─── Magic / Spellcasting ────────────────────────────────────────────────
export { Wand2 as WandIcon } from 'lucide-react'                    // Magic wand
export { Sparkles as SparklesIcon } from 'lucide-react'             // Magic effect
export { Star as StarIcon } from 'lucide-react'                     // Divine / celestial
export { Stars as StarsIcon } from 'lucide-react'                   // Constellation
export { Moon as MoonIcon } from 'lucide-react'                     // Night / druidic
export { MoonStar as CrescentMoonIcon } from 'lucide-react'         // Crescent
export { Sun as SunIcon } from 'lucide-react'                       // Daylight / paladin
export { SunMedium as SunMediumIcon } from 'lucide-react'           // Partial sun
export { Eclipse as EclipseIcon } from 'lucide-react'               // Darkness / eclipse
export { Rainbow as RainbowIcon } from 'lucide-react'               // Prismatic
export { Ghost as GhostIcon } from 'lucide-react'                   // Incorporeal
export { Eye as EyeIcon } from 'lucide-react'                       // Vision / sight
export { Eye as PerceptionIcon } from 'lucide-react'                // Perception check
export { EyeClosed as EyeClosedIcon } from 'lucide-react'           // Blindness
export { Binoculars as BinocularsIcon } from 'lucide-react'         // Far sight
export { Clover as CloverIcon } from 'lucide-react'                 // Luck
export { Infinity as InfinityIcon } from 'lucide-react'             // Planar / infinite
export { Atom as AtomIcon } from 'lucide-react'                     // Arcane
export { Orbit as OrbitIcon } from 'lucide-react'                   // Celestial sphere
export { Beaker as BeakerIcon } from 'lucide-react'                 // Potion
export { FlaskConical as FlaskIcon } from 'lucide-react'            // Alchemy flask
export { FlaskRound as FlaskRoundIcon } from 'lucide-react'         // Round elixir
export { TestTube as TestTubeIcon } from 'lucide-react'             // Alchemy tube
export { TestTubes as TestTubesIcon } from 'lucide-react'           // Experiments
export { Syringe as SyringeIcon } from 'lucide-react'               // Poison / potion
export { Pill as PillIcon } from 'lucide-react'                     // Medicine
export { Brain as BrainIcon } from 'lucide-react'                   // Intelligence / mind
export { BrainCircuit as BrainMagicIcon } from 'lucide-react'       // Psionic
export { BrainCog as BrainCogIcon } from 'lucide-react'             // Concentration
export { GraduationCap as KnowledgeIcon } from 'lucide-react'       // Lore / learning
export { Library as LibraryIcon } from 'lucide-react'               // Archives
export { Languages as LanguagesIcon } from 'lucide-react'           // Tongues
export { Theater as MasksIcon } from 'lucide-react'                 // Performance
export { Drama as DramaIcon } from 'lucide-react'                   // Dramatic scene
export { VenetianMask as MasqueradeIcon } from 'lucide-react'       // Disguise
export { Bell as BellIcon } from 'lucide-react'                     // Ritual bell
export { BellRing as BellRingIcon } from 'lucide-react'             // Ringing bell
export { Music as MusicIcon } from 'lucide-react'                   // Bardic music
export { Music2 as SingingIcon } from 'lucide-react'                // Song / chant
export { Music3 as MusicNoteIcon } from 'lucide-react'              // Single note
export { Music4 as MusicNotesIcon } from 'lucide-react'             // Multiple notes
export { Piano as PianoIcon } from 'lucide-react'                   // Instrument
export { Drum as DrumIcon } from 'lucide-react'                     // Percussion
export { Guitar as GuitarIcon } from 'lucide-react'                 // String instrument
export { Mic as MicIcon } from 'lucide-react'                       // Performance
export { MicVocal as SingingVoiceIcon } from 'lucide-react'         // Vocal performance

// ─── Elements / Damage Types ────────────────────────────────────────────
export { Flame as FlameIcon } from 'lucide-react'                   // Fire damage
export { Flame as TorchIcon } from 'lucide-react'                   // Torch / light
export { FlameKindling as SmallFlameIcon } from 'lucide-react'      // Candle / spark
export { FireExtinguisher as ExtinguishIcon } from 'lucide-react'   // Douse fire
export { Tornado as TornadoIcon } from 'lucide-react'               // Wind damage
export { Wind as WindIcon } from 'lucide-react'                     // Gust / breeze
export { Snowflake as SnowflakeIcon } from 'lucide-react'           // Cold / frost
export { Droplet as WaterDropIcon } from 'lucide-react'             // Water / acid
export { Droplets as WaterDropsIcon } from 'lucide-react'           // Rain / spray
export { Biohazard as BiohazardIcon } from 'lucide-react'           // Poison / necrotic
export { Radiation as RadiationIcon } from 'lucide-react'           // Contaminated
export { Gem as GemIcon } from 'lucide-react'                       // Gem / radiant
export { Diamond as DiamondIcon } from 'lucide-react'               // Diamond / jewel

// ─── Characters / NPCs ──────────────────────────────────────────────────
export { User as UserIcon } from 'lucide-react'
export { Users as UsersIcon } from 'lucide-react'
export { UserRound as UserRoundIcon } from 'lucide-react'
export { UsersRound as UsersRoundIcon } from 'lucide-react'
export { UserCircle as UserCircleIcon } from 'lucide-react'
export { UserPlus as UserPlusIcon } from 'lucide-react'
export { UserMinus as UserMinusIcon } from 'lucide-react'
export { UserX as UserRemoveIcon } from 'lucide-react'
export { UserCheck as UserVerifiedIcon } from 'lucide-react'
export { UserCog as UserEditIcon } from 'lucide-react'
export { UserPen as UserNotesIcon } from 'lucide-react'
export { Contact as ContactIcon } from 'lucide-react'               // Contact card
export { ContactRound as ContactRoundIcon } from 'lucide-react'
export { Baby as BabyIcon } from 'lucide-react'                     // Child NPC
export { PersonStanding as PersonStandingIcon } from 'lucide-react' // Standing figure
export { Crown as CrownIcon } from 'lucide-react'                   // Royalty / noble
export { Trophy as TrophyIcon } from 'lucide-react'                 // Achievement
export { Medal as MedalIcon } from 'lucide-react'                   // Badge / medal
export { Award as AwardIcon } from 'lucide-react'                   // Honor
export { Ribbon as RibbonIcon } from 'lucide-react'                 // Decoration
export { Hand as HandIcon } from 'lucide-react'                     // Gesture
export { HandHelping as HelpingHandIcon } from 'lucide-react'       // Aid / help
export { HandHeart as HandHeartIcon } from 'lucide-react'           // Compassion
export { HandFist as FistIcon } from 'lucide-react'                 // Unarmed strike
export { HandMetal as MetalHandIcon } from 'lucide-react'           // Gauntlet
export { Handshake as HandshakeIcon } from 'lucide-react'           // Pact / deal
export { ThumbsUp as ThumbsUpIcon } from 'lucide-react'             // Approval
export { ThumbsDown as ThumbsDownIcon } from 'lucide-react'         // Disapproval
export { Smile as SmileIcon } from 'lucide-react'                   // Happy NPC
export { Frown as FrownIcon } from 'lucide-react'                   // Sad NPC
export { Meh as MehIcon } from 'lucide-react'                       // Indifferent
export { Angry as AngryIcon } from 'lucide-react'                   // Angry NPC
export { Laugh as LaughIcon } from 'lucide-react'                   // Laughing
export { Annoyed as AnnoyedIcon } from 'lucide-react'               // Annoyed

// ─── Bestiary / Creatures ───────────────────────────────────────────────
export { Bug as BugIcon } from 'lucide-react'                       // Insect / swarm
export { BugOff as BugDeadIcon } from 'lucide-react'                // Swarm cleared
export { BugPlay as BugSwarmIcon } from 'lucide-react'              // Active swarm
export { Fish as FishIcon } from 'lucide-react'                     // Aquatic
export { FishSymbol as FishSilhouetteIcon } from 'lucide-react'     // Fish icon
export { Bird as BirdIcon } from 'lucide-react'                     // Familiar / avian
export { Cat as CatIcon } from 'lucide-react'                       // Feline / familiar
export { Dog as DogIcon } from 'lucide-react'                       // Hound / companion
export { Rabbit as RabbitIcon } from 'lucide-react'                 // Small creature
export { Rat as RatIcon } from 'lucide-react'                       // Vermin
export { Turtle as TurtleIcon } from 'lucide-react'                 // Natural armor
export { Snail as SnailIcon } from 'lucide-react'                   // Slow creature
export { Worm as WormIcon } from 'lucide-react'                     // Burrower
export { Squirrel as SquirrelIcon } from 'lucide-react'             // Woodland
export { PawPrint as PawPrintIcon } from 'lucide-react'             // Animal tracks
export { Bone as BoneIcon } from 'lucide-react'                     // Skeletal
export { Shell as ShellIcon } from 'lucide-react'                   // Aquatic shell
export { Egg as EggIcon } from 'lucide-react'                       // Hatchling
export { Antenna as AntennaIcon } from 'lucide-react'               // Insectoid

// ─── Loot / Treasure / Economy ──────────────────────────────────────────
export { Coins as CoinsIcon } from 'lucide-react'                   // Currency
export { Banknote as BanknoteIcon } from 'lucide-react'             // Paper currency
export { Banknote as GoldPiecesIcon } from 'lucide-react'           // GP
export { Wallet as WalletIcon } from 'lucide-react'                 // Coin purse
export { WalletMinimal as CoinPurseIcon } from 'lucide-react'       // Small purse
export { WalletCards as WalletCardsIcon } from 'lucide-react'       // Card deck
export { ShoppingBag as ShoppingBagIcon } from 'lucide-react'       // Loot bag
export { ShoppingBasket as BasketIcon } from 'lucide-react'         // Carry basket
export { ShoppingCart as CartIcon } from 'lucide-react'             // Trade cart
export { Luggage as LuggageIcon } from 'lucide-react'               // Travel chest

// ─── Tools / Crafting ───────────────────────────────────────────────────
export { Shovel as ShovelIcon } from 'lucide-react'                 // Digging
export { Wrench as WrenchIcon } from 'lucide-react'                 // Repair
export { WrenchOff as WrenchOffIcon } from 'lucide-react'           // Broken
export { Drill as DrillIcon } from 'lucide-react'                   // Excavation
export { Scissors as ScissorsIcon } from 'lucide-react'             // Cutting
export { Toolbox as ToolboxIcon } from 'lucide-react'               // Tool storage
export { ToolCase as ToolKitIcon } from 'lucide-react'              // Toolkit

// ─── Dice / Chance ──────────────────────────────────────────────────────
export { Dice1 as Dice1Icon } from 'lucide-react'
export { Dice2 as Dice2Icon } from 'lucide-react'
export { Dice3 as Dice3Icon } from 'lucide-react'
export { Dice4 as Dice4Icon } from 'lucide-react'
export { Dice5 as Dice5Icon } from 'lucide-react'
export { Dice6 as Dice6Icon } from 'lucide-react'
export { Dices as DicesIcon } from 'lucide-react'                   // Multiple dice
export { Dices as RollDiceIcon } from 'lucide-react'                // Rolling action

// ─── Chess (tactical board) ─────────────────────────────────────────────
export { ChessKnight as ChessKnightIcon } from 'lucide-react'       // Mounted unit
export { ChessKing as ChessKingIcon } from 'lucide-react'           // Leader
export { ChessQueen as ChessQueenIcon } from 'lucide-react'         // Commander
export { ChessBishop as ChessBishopIcon } from 'lucide-react'       // Cleric
export { ChessPawn as ChessPawnIcon } from 'lucide-react'           // Minion
export { ChessRook as ChessRookIcon } from 'lucide-react'           // Fortress

// ─── Terrain / Environment ──────────────────────────────────────────────
export { Mountain as MountainIcon } from 'lucide-react'             // Hills
export { MountainSnow as SnowMountainIcon } from 'lucide-react'     // Peaks
export { TreePine as PineTreeIcon } from 'lucide-react'             // Evergreen
export { TreeDeciduous as TreeIcon } from 'lucide-react'            // Broadleaf
export { TreePalm as PalmTreeIcon } from 'lucide-react'             // Tropical
export { Trees as ForestIcon } from 'lucide-react'                  // Grove
export { Leaf as LeafIcon } from 'lucide-react'                     // Nature
export { Sprout as SproutIcon } from 'lucide-react'                 // New growth
export { Flower as FlowerIcon } from 'lucide-react'                 // Beauty
export { Flower2 as FlowerDoubleIcon } from 'lucide-react'          // Double bloom
export { Shrub as ShrubIcon } from 'lucide-react'                   // Bush
export { Wheat as WheatIcon } from 'lucide-react'                   // Farmland
export { Cannabis as CannabisIcon } from 'lucide-react'             // Herbs
export { Fence as FenceIcon } from 'lucide-react'                   // Barrier
export { Castle as CastleIcon } from 'lucide-react'                 // Keep / fortress
export { Church as ChurchIcon } from 'lucide-react'                 // Temple
export { Landmark as LandmarkIcon } from 'lucide-react'             // Monument
export { Building as BuildingIcon } from 'lucide-react'             // House
export { Building2 as BuildingDoubleIcon } from 'lucide-react'      // Tower / multi-story
export { Tent as TentIcon } from 'lucide-react'                     // Camp
export { TentTree as CampIcon } from 'lucide-react'                 // Campsite
export { Warehouse as WarehouseIcon } from 'lucide-react'           // Storehouse
export { Dam as DamIcon } from 'lucide-react'                       // Water barrier
export { TowerControl as TowerIcon } from 'lucide-react'            // Watchtower
export { Sailboat as SailboatIcon } from 'lucide-react'             // Sailing ship
export { Ship as ShipIcon } from 'lucide-react'                     // Vessel
export { Anchor as AnchorIcon } from 'lucide-react'                 // Harbor
export { ShipWheel as ShipWheelIcon } from 'lucide-react'           // Navigation wheel
export { Road as RoadIcon } from 'lucide-react'                     // Path / way
export { UtilityPole as UtilityPoleIcon } from 'lucide-react'       // Pylon
export { Container as CrateIcon } from 'lucide-react'               // Storage crate

// ─── Weather ────────────────────────────────────────────────────────────
export { SunDim as CloudySunIcon } from 'lucide-react'              // Overcast
export { SunSnow as ColdSunIcon } from 'lucide-react'               // Winter sun
export { MoonStar as MoonStarIcon } from 'lucide-react'             // Moonlit
export { Cloud as CloudIcon } from 'lucide-react'                   // Overcast
export { CloudSun as CloudSunIcon } from 'lucide-react'             // Partial clouds
export { CloudMoon as CloudMoonIcon } from 'lucide-react'           // Night clouds
export { CloudRain as RainIcon } from 'lucide-react'                // Rain
export { CloudRainWind as RainWindIcon } from 'lucide-react'        // Storm rain
export { CloudDrizzle as DrizzleIcon } from 'lucide-react'          // Light rain
export { CloudSnow as SnowIcon } from 'lucide-react'                // Snowfall
export { CloudLightning as StormIcon } from 'lucide-react'          // Thunderstorm
export { CloudHail as HailIcon } from 'lucide-react'                // Hail
export { CloudFog as FogIcon } from 'lucide-react'                  // Fog / mist
export { Haze as HazeIcon } from 'lucide-react'                     // Haze / smoke
export { Thermometer as ThermometerIcon } from 'lucide-react'       // Temperature
export { ThermometerSnowflake as ColdIcon } from 'lucide-react'     // Cold
export { ThermometerSun as HeatIcon } from 'lucide-react'           // Heat

// ─── Food / Drink / Tavern ──────────────────────────────────────────────
export { GlassWater as GlassIcon } from 'lucide-react'              // Water glass
export { Martini as MartiniIcon } from 'lucide-react'               // Cocktail
export { Beer as BeerIcon } from 'lucide-react'                     // Ale / beer
export { BeerOff as BeerEmptyIcon } from 'lucide-react'             // Empty mug
export { Wine as WineIcon } from 'lucide-react'                     // Fine wine
export { WineOff as WineEmptyIcon } from 'lucide-react'             // Empty bottle
export { BottleWine as BottleIcon } from 'lucide-react'             // Bottle
export { Coffee as CoffeeIcon } from 'lucide-react'                 // Warm drink
export { CupSoda as SodaCupIcon } from 'lucide-react'               // Mug
export { Soup as SoupIcon } from 'lucide-react'                     // Stew / soup
export { CookingPot as CauldronIcon } from 'lucide-react'           // Cooking pot
export { ChefHat as ChefHatIcon } from 'lucide-react'               // Chef / cook
export { UtensilsCrossed as DiningIcon } from 'lucide-react'        // Feast
export { Apple as AppleIcon } from 'lucide-react'                   // Fruit
export { Banana as BananaIcon } from 'lucide-react'                 // Tropical
export { Grape as GrapeIcon } from 'lucide-react'                   // Vine fruit
export { Citrus as CitrusIcon } from 'lucide-react'                 // Citrus
export { Cherry as CherryIcon } from 'lucide-react'                 // Berry
export { Carrot as CarrotIcon } from 'lucide-react'                 // Vegetable
export { Broccoli as BroccoliIcon } from 'lucide-react'             // Greens
export { LeafyGreen as LeafyGreenIcon } from 'lucide-react'         // Herb
export { EggFried as FriedEggIcon } from 'lucide-react'             // Cooked egg
export { Drumstick as DrumstickIcon } from 'lucide-react'           // Meat
export { Beef as BeefIcon } from 'lucide-react'                     // Meat portion
export { BeefOff as MeatOffIcon } from 'lucide-react'               // Spoiled
export { Shrimp as ShrimpIcon } from 'lucide-react'                 // Seafood
export { Cake as CakeIcon } from 'lucide-react'                     // Celebration
export { CakeSlice as CakeSliceIcon } from 'lucide-react'           // Slice
export { Candy as CandyIcon } from 'lucide-react'                   // Sweets
export { CandyCane as CandyCaneIcon } from 'lucide-react'           // Treat
export { Cookie as CookieIcon } from 'lucide-react'                 // Biscuit
export { Donut as DonutIcon } from 'lucide-react'                   // Pastry
export { IceCreamBowl as IceCreamBowlIcon } from 'lucide-react'     // Bowl
export { IceCreamCone as IceCreamIcon } from 'lucide-react'         // Cone
export { Pizza as PizzaIcon } from 'lucide-react'                   // Flatbread
export { Popcorn as PopcornIcon } from 'lucide-react'               // Snack
export { Hamburger as HamburgerIcon } from 'lucide-react'           // Sandwich
export { Sandwich as SandwichIcon } from 'lucide-react'             // Bread meal
export { Salad as SaladIcon } from 'lucide-react'                   // Fresh meal
export { Croissant as CroissantIcon } from 'lucide-react'           // Pastry
export { Dessert as DessertIcon } from 'lucide-react'               // Sweet

// ─── Travel / Geography ─────────────────────────────────────────────────
export { MapPlus as MapAddIcon } from 'lucide-react'                // Add marker
export { MapMinus as MapRemoveIcon } from 'lucide-react'            // Remove marker
export { Globe as GlobeIcon } from 'lucide-react'                   // World map
export { Earth as EarthIcon } from 'lucide-react'                   // Planet / realm
export { EarthLock as EarthLockedIcon } from 'lucide-react'         // Locked region
export { Compass as CompassIcon } from 'lucide-react'               // Direction
export { Navigation as NavigationIcon } from 'lucide-react'         // Wayfinding
export { Plane as PlaneIcon } from 'lucide-react'                   // Airship
export { PlaneLanding as LandingIcon } from 'lucide-react'          // Arrival
export { PlaneTakeoff as TakeoffIcon } from 'lucide-react'          // Departure
export { Rocket as RocketIcon } from 'lucide-react'                 // Rocket / signal
export { Car as CarIcon } from 'lucide-react'                       // Wagon / cart
export { CarFront as CarriageIcon } from 'lucide-react'             // Carriage
export { Bus as BusIcon } from 'lucide-react'                       // Large transport
export { BusFront as BusFrontIcon } from 'lucide-react'             // Bus / wagon front
export { TrainFront as TrainIcon } from 'lucide-react'              // Rail transport
export { TrainTrack as TrainTrackIcon } from 'lucide-react'         // Tracks
export { Bike as BikeIcon } from 'lucide-react'                     // Mount / cycle
export { Footprints as FootprintsIcon } from 'lucide-react'         // Tracks / trail

// ─── Status Indicators ──────────────────────────────────────────────────
export { Layers as MultipleStatusesIcon } from 'lucide-react'      // Two+ active statuses (distinct from PropWindowIcon)
export { Check as CheckIcon } from 'lucide-react'                   // Confirm
export { CheckCheck as DoubleCheckIcon } from 'lucide-react'        // Verified
export { CheckCircle as CheckCircleIcon } from 'lucide-react'       // Success
export { CheckCircle2 as SuccessIcon } from 'lucide-react'          // Completed
export { X as XIcon } from 'lucide-react'                           // Cancel
export { XCircle as XCircleIcon } from 'lucide-react'               // Error
export { AlertTriangle as WarningIcon } from 'lucide-react'         // Warning
export { AlertCircle as AlertIcon } from 'lucide-react'             // Alert
export { AlertOctagon as DangerIcon } from 'lucide-react'           // Danger
export { Info as InfoIcon } from 'lucide-react'                     // Hint / info
export { HelpCircle as HelpIcon } from 'lucide-react'               // Help
export { CircleHelp as QuestionIcon } from 'lucide-react'           // Question
export { CircleDot as ActiveIcon } from 'lucide-react'              // Active
export { CircleSlash as InactiveIcon } from 'lucide-react'          // Disabled
export { Ban as BanIcon } from 'lucide-react'                       // Forbidden
export { Circle as EmptyIcon } from 'lucide-react'                  // Unselected
export { CircleCheck as SelectedIcon } from 'lucide-react'          // Selected
export { CirclePlus as AddCircleIcon } from 'lucide-react'          // Add
export { CircleMinus as RemoveCircleIcon } from 'lucide-react'      // Remove
export { CircleX as DeleteCircleIcon } from 'lucide-react'          // Delete
export { Loader as LoaderIcon } from 'lucide-react'                 // Loading
export { LoaderCircle as SpinnerIcon } from 'lucide-react'          // Spinner

// ─── Communication / Social ─────────────────────────────────────────────
export { MessageSquare as MessageIcon } from 'lucide-react'         // Chat message
export { MessageSquareText as MessageTextIcon } from 'lucide-react' // Text message
export { MessageSquareMore as MessageMoreIcon } from 'lucide-react' // More messages
export { MessageSquarePlus as MessageAddIcon } from 'lucide-react'  // New message
export { MessageSquareX as MessageRemoveIcon } from 'lucide-react'  // Remove
export { MessageSquareQuote as MessageQuoteIcon } from 'lucide-react' // Quote
export { MessageSquareShare as MessageShareIcon } from 'lucide-react' // Share
export { MessageCircle as ChatIcon } from 'lucide-react'            // Speech bubble
export { MessageCircleHeart as ChatHeartIcon } from 'lucide-react'  // Friendly
export { MessageCircleWarning as ChatWarningIcon } from 'lucide-react' // Warning
export { MessageCircleX as ChatDismissIcon } from 'lucide-react'    // Dismiss
export { Speech as SpeechIcon } from 'lucide-react'                 // Talking
export { Send as SendIcon } from 'lucide-react'                     // Deliver
export { SendHorizontal as ReplyIcon } from 'lucide-react'          // Reply
export { Share as ShareIcon } from 'lucide-react'                   // Distribute
export { Share2 as ShareNodesIcon } from 'lucide-react'             // Network share
export { Link as LinkIcon } from 'lucide-react'                     // Connection
export { Link2 as ChainLinkIcon } from 'lucide-react'               // Chain
export { Unlink as UnlinkIcon } from 'lucide-react'                 // Break link
export { Mail as MailIcon } from 'lucide-react'                     // Message
export { MailOpen as MailOpenIcon } from 'lucide-react'             // Opened
export { MailPlus as MailAddIcon } from 'lucide-react'              // New mail
export { MailCheck as MailCheckIcon } from 'lucide-react'           // Received
export { MailX as MailRemoveIcon } from 'lucide-react'              // Removed
export { Inbox as InboxIcon } from 'lucide-react'                   // Received items
export { Megaphone as AnnounceIcon } from 'lucide-react'            // Shout / announce
export { MegaphoneOff as AnnounceOffIcon } from 'lucide-react'      // Silence

// ─── Conditions / Status Effects ────────────────────────────────────────
export { EyeOff as BlindedIcon } from 'lucide-react'                // Blinded
export { Ear as HearingIcon } from 'lucide-react'                   // Hearing
export { EarOff as DeafenedIcon } from 'lucide-react'               // Deafened
export { Lock as BoundIcon } from 'lucide-react'                    // Restrained
export { LockOpen as FreedIcon } from 'lucide-react'                // Unrestrained
export { Footprints as ProneIcon } from 'lucide-react'              // Prone / downed
export { Skull as DeadIcon } from 'lucide-react'                    // Dead
export { Heart as HealthyIcon } from 'lucide-react'                 // Healthy
export { HeartCrack as UnhealthyIcon } from 'lucide-react'          // Unhealthy
export { Zap as StunIcon } from 'lucide-react'                      // Stunned
export { Flame as BurningIcon } from 'lucide-react'                 // Burning
export { Snowflake as FrozenIcon } from 'lucide-react'              // Frozen
export { Ban as CursedIcon } from 'lucide-react'                    // Cursed
export { Sparkles as BlessedIcon } from 'lucide-react'              // Buffed
export { ShieldCheck as ProtectedIcon } from 'lucide-react'         // Protected

// ─── Exploration / Interaction ──────────────────────────────────────────
export { Search as SearchIcon } from 'lucide-react'                 // Search
export { SearchCheck as SearchFoundIcon } from 'lucide-react'       // Found
export { SearchX as SearchLostIcon } from 'lucide-react'            // Failed
export { SearchCode as SearchDetailIcon } from 'lucide-react'       // Detailed search
export { Scan as ScanIcon } from 'lucide-react'                     // Detect
export { ScanEye as DetectMagicIcon } from 'lucide-react'           // Detect magic
export { ScanFace as DetectLifeIcon } from 'lucide-react'           // Detect life
export { ScanSearch as InvestigateIcon } from 'lucide-react'        // Investigate
export { ScanText as ReadIcon } from 'lucide-react'                 // Read / literacy
export { Lightbulb as LightbulbIcon } from 'lucide-react'           // Bright idea
export { Flashlight as FlashlightIcon } from 'lucide-react'         // Light cone
export { Telescope as TelescopeIcon } from 'lucide-react'           // Far viewing
export { Microscope as MicroscopeIcon } from 'lucide-react'         // Scrutiny
export { Magnet as MagnetIcon } from 'lucide-react'                 // Attraction

// ─── Actions / Skills ───────────────────────────────────────────────────
export { PersonStanding as StandIcon } from 'lucide-react'          // Stand up
export { HandFist as UnarmedIcon } from 'lucide-react'              // Unarmed
export { Hand as GrappleIcon } from 'lucide-react'                  // Grapple
export { HandHelping as HelpActionIcon } from 'lucide-react'        // Help
export { EyeOff as HideActionIcon } from 'lucide-react'             // Hide
export { Eye as SearchActionIcon } from 'lucide-react'              // Search
export { Target as AttackIcon } from 'lucide-react'                 // Attack
export { Zap as CastSpellIcon } from 'lucide-react'                // Cast spell
export { Crosshair as ReadyActionIcon } from 'lucide-react'         // Ready
export { Shield as DodgeIcon } from 'lucide-react'                  // Dodge
export { Dumbbell as StrengthIcon } from 'lucide-react'             // Athletics
export { Brain as IntelligenceIcon } from 'lucide-react'            // Arcana
export { Sparkles as CharismaIcons } from 'lucide-react'            // Persuasion
export { EyeOff as StealthIcon } from 'lucide-react'                // Stealth
export { Hand as SleightIcon } from 'lucide-react'                  // Sleight of hand
export { Wrench as RepairIcon } from 'lucide-react'                 // Tinker

// ─── Factions / Organizations ───────────────────────────────────────────
export { Crown as RoyaltyIcon } from 'lucide-react'                 // Monarchy
export { Church as TempleIcon } from 'lucide-react'                 // Religion
export { Castle as FortressIcon } from 'lucide-react'               // Military
export { GraduationCap as GuildIcon } from 'lucide-react'           // Academy
export { Swords as MercenariesIcon } from 'lucide-react'            // Fighters
export { BookOpen as SageIcon } from 'lucide-react'                 // Scholars
export { Gem as MerchantIcon } from 'lucide-react'                  // Trade
export { Tent as NomadIcon } from 'lucide-react'                    // Travelers
export { Skull as CultIcon } from 'lucide-react'                    // Dark order
export { Eye as WatchersIcon } from 'lucide-react'                  // Spies
export { Theater as PerformersIcon } from 'lucide-react'            // Bards guild

// ─── Items / Writing / Documents ────────────────────────────────────────
export { Clipboard as ClipboardIcon } from 'lucide-react'           // Notes
export { ClipboardList as ChecklistIcon } from 'lucide-react'       // Inventory
export { ClipboardCheck as ClipboardCheckIcon } from 'lucide-react' // Completed
export { ClipboardPen as ClipboardWriteIcon } from 'lucide-react'   // Write
export { ClipboardX as ClipboardRemoveIcon } from 'lucide-react'    // Remove
export { ClipboardCopy as ClipboardCopyIcon } from 'lucide-react'   // Copy
export { Paperclip as PaperclipIcon } from 'lucide-react'           // Attached
export { Pen as PenIcon } from 'lucide-react'                       // Quill
export { Pencil as PencilIcon } from 'lucide-react'                 // Edit
export { Eraser as EraserIcon } from 'lucide-react'                 // Remove mark
export { Highlighter as HighlighterIcon } from 'lucide-react'       // Mark
export { File as FileIcon } from 'lucide-react'                     // Document
export { FileText as FileTextIcon } from 'lucide-react'             // Text doc
export { FileCode as RuneIcon } from 'lucide-react'                 // Runes
export { FileImage as FileImageIcon } from 'lucide-react'           // Drawing
export { FileStack as FileStackIcon } from 'lucide-react'           // Stack
export { FileArchive as FileArchiveIcon } from 'lucide-react'       // Archive
export { FileSearch as FileSearchIcon } from 'lucide-react'         // Find
export { FilePen as FileEditIcon } from 'lucide-react'              // Edit doc
export { FileX as FileDeleteIcon } from 'lucide-react'              // Delete doc
export { StickyNote as NoteIcon } from 'lucide-react'               // Sticky note
export { StickyNotes as NotesIcon } from 'lucide-react'             // Multiple notes
export { Paintbrush as PaintbrushIcon } from 'lucide-react'         // Artisan tool
export { Palette as PaletteIcon } from 'lucide-react'               // Artist
export { Brush as BrushIcon } from 'lucide-react'                   // Painter
export { Ruler as RulerIcon } from 'lucide-react'                   // Measurement
export { Scale as ScaleIcon } from 'lucide-react'                   // Balance
export { Weight as WeightIcon } from 'lucide-react'                 // Heavy object
export { Hourglass as HourglassIcon } from 'lucide-react'           // Time
export { Timer as TimerIcon } from 'lucide-react'                   // Countdown
export { TimerOff as TimerOffIcon } from 'lucide-react'             // Stopped
export { TimerReset as TimerResetIcon } from 'lucide-react'         // Reset / rest
export { Clock as ClockIcon } from 'lucide-react'                   // Timepiece
export { ClockAlert as ClockAlertIcon } from 'lucide-react'         // Urgent
export { Calendar as CalendarIcon } from 'lucide-react'             // Date
export { CalendarDays as CalendarDaysIcon } from 'lucide-react'     // Multiple days
export { CalendarClock as CalendarClockIcon } from 'lucide-react'   // Schedule
export { CalendarCheck as CalendarCheckIcon } from 'lucide-react'   // Completed
export { Watch as WatchIcon } from 'lucide-react'                   // Worn timepiece

export type { LucideIcon } from 'lucide-react'
