import type { LucideIcon } from '../../components/icons'
import {
  BackpackIcon,
  CoinsIcon,
  FlaskIcon,
  GemIcon,
  ItemIcon,
  PackageIcon,
  PaletteIcon,
  ScrollIcon,
} from '../../components/icons'

export const ITEM_CATEGORIES: { slug: string; label: string; icon: LucideIcon }[] = [
  { slug: 'gem', label: 'Gem', icon: GemIcon },
  { slug: 'art', label: 'Art', icon: PaletteIcon },
  { slug: 'coin', label: 'Coin', icon: CoinsIcon },
  { slug: 'treasure', label: 'Treasure', icon: CoinsIcon },
  { slug: 'consumable', label: 'Consumable', icon: FlaskIcon },
  { slug: 'scroll', label: 'Scroll', icon: ScrollIcon },
  { slug: 'trade-good', label: 'Trade Good', icon: PackageIcon },
  { slug: 'gear', label: 'Gear', icon: BackpackIcon },
  { slug: 'other', label: 'Other', icon: ItemIcon },
]

export function categoryIcon(slug?: string | null): LucideIcon {
  return ITEM_CATEGORIES.find((category) => category.slug === slug)?.icon ?? PackageIcon
}
