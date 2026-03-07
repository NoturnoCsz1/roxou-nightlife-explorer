import event1 from "@/assets/event1.jpg";
import event2 from "@/assets/event2.jpg";
import event3 from "@/assets/event3.jpg";
import event4 from "@/assets/event4.jpg";
import event5 from "@/assets/event5.jpg";
import event6 from "@/assets/event6.jpg";

export type EventCategory = "balada" | "show" | "bar" | "festival" | "sertanejo" | "funk" | "eletronica";

export interface NightEvent {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  address: string;
  category: EventCategory;
  categoryLabel: string;
  badgeClass: string;
  image: string;
  description: string;
  featured?: boolean;
  isToday?: boolean;
  popular?: boolean;
}

export const categoryConfig: Record<EventCategory, { label: string; badge: string }> = {
  balada: { label: "Balada", badge: "badge-balada" },
  show: { label: "Show", badge: "badge-show" },
  bar: { label: "Bar", badge: "badge-bar" },
  festival: { label: "Festival", badge: "badge-festival" },
  sertanejo: { label: "Sertanejo", badge: "badge-sertanejo" },
  funk: { label: "Funk", badge: "badge-funk" },
  eletronica: { label: "Eletrônica", badge: "badge-eletronica" },
};

export const events: NightEvent[] = [
  {
    id: "1",
    title: "Neon Party — DJ Marcos",
    venue: "Club Vibe",
    date: "2026-03-07",
    time: "23:00",
    address: "Rua Tenente Nicolau Maffei, 1050 — Centro",
    category: "eletronica",
    categoryLabel: "Eletrônica",
    badgeClass: "badge-eletronica",
    image: event1,
    description:
      "A maior festa eletrônica de Presidente Prudente! DJ Marcos traz os melhores hits da cena eletrônica nacional e internacional. Open bar até meia-noite. Dress code: neon.",
    featured: true,
    isToday: true,
    popular: true,
  },
  {
    id: "2",
    title: "Rock in PP — Bandas Locais",
    venue: "Espaço Cultural",
    date: "2026-03-07",
    time: "20:00",
    address: "Av. Washington Luiz, 300 — Vila Marcondes",
    category: "show",
    categoryLabel: "Show",
    badgeClass: "badge-show",
    image: event2,
    description:
      "Uma noite especial com as melhores bandas de rock de Presidente Prudente. Line-up: The Vibes, Sonic Wave, Noite Escura. Ingressos limitados!",
    featured: true,
    isToday: true,
    popular: true,
  },
  {
    id: "3",
    title: "Sertanejo Universitário",
    venue: "Arena Prudente",
    date: "2026-03-08",
    time: "22:00",
    address: "Rod. Raposo Tavares, km 561 — Jd. Aviação",
    category: "sertanejo",
    categoryLabel: "Sertanejo",
    badgeClass: "badge-sertanejo",
    image: event3,
    description:
      "Venha curtir a melhor noite sertaneja da região! Duplas sertanejas convidadas, praça de alimentação e estacionamento amplo.",
    featured: true,
    popular: true,
  },
  {
    id: "4",
    title: "Happy Hour — Bear Lounge",
    venue: "Bear Lounge",
    date: "2026-03-07",
    time: "18:00",
    address: "Rua José Bongiovani, 780 — Cidade Universitária",
    category: "bar",
    categoryLabel: "Bar",
    badgeClass: "badge-bar",
    image: event4,
    description:
      "Cervejas artesanais, petiscos especiais e música ambiente. Promoção de chopp na primeira hora. O melhor happy hour da cidade!",
    isToday: true,
  },
  {
    id: "5",
    title: "Baile Funk do PP",
    venue: "Galpão 51",
    date: "2026-03-08",
    time: "23:30",
    address: "Rua Quintino Bocaiúva, 520 — Centro",
    category: "funk",
    categoryLabel: "Funk",
    badgeClass: "badge-funk",
    image: event5,
    description:
      "O funk mais pesado de Presidente Prudente! DJs convidados, MC battles e muita energia. Pista aberta a partir das 23h30.",
    popular: true,
  },
  {
    id: "6",
    title: "Festival de Verão PP",
    venue: "Parque do Povo",
    date: "2026-03-09",
    time: "16:00",
    address: "Av. 14 de Setembro — Parque do Povo",
    category: "festival",
    categoryLabel: "Festival",
    badgeClass: "badge-festival",
    image: event6,
    description:
      "O maior festival a céu aberto de Presidente Prudente! Mais de 10 atrações, food trucks, área kids e muito mais.",
  },
];

export const venues = [
  { name: "Club Vibe", type: "Balada", eventsCount: 12, address: "Centro" },
  { name: "Arena Prudente", type: "Shows", eventsCount: 8, address: "Jd. Aviação" },
  { name: "Bear Lounge", type: "Bar", eventsCount: 15, address: "Cidade Universitária" },
  { name: "Galpão 51", type: "Balada", eventsCount: 6, address: "Centro" },
  { name: "Espaço Cultural", type: "Shows", eventsCount: 10, address: "Vila Marcondes" },
];
