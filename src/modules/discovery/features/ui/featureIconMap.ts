/**
 * Onda 19 — Icon mapper para o Feature Engine.
 *
 * Traduz `Feature.icon` (nome lucide) em componente React.
 * Fallback: `Sparkles`.
 */
import {
  Accessibility,
  Baby,
  Beef,
  Beer,
  Bike,
  Briefcase,
  CalendarCheck,
  Camera,
  CreditCard,
  Dog,
  Fish,
  Flame,
  Heart,
  Leaf,
  Martini,
  Music,
  ParkingSquare,
  PartyPopper,
  Pizza,
  QrCode,
  Salad,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Star,
  Trees,
  Tv,
  Users,
  Utensils,
  UtensilsCrossed,
  WheatOff,
  Wifi,
  Wine,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  Accessibility,
  Baby,
  Beef,
  Beer,
  Bike,
  Briefcase,
  CalendarCheck,
  Camera,
  CreditCard,
  Dog,
  Fish,
  Flame,
  Heart,
  Leaf,
  Martini,
  Music,
  ParkingSquare,
  PartyPopper,
  Pizza,
  QrCode,
  Salad,
  ShoppingBag,
  Snowflake,
  Star,
  Trees,
  Tv,
  Users,
  Utensils,
  UtensilsCrossed,
  WheatOff,
  Wifi,
  Wine,
};

export function getFeatureIcon(name: string | undefined | null): LucideIcon {
  if (!name) return Sparkles;
  return REGISTRY[name] ?? Sparkles;
}
