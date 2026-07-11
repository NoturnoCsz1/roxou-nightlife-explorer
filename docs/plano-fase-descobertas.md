# Plano da Fase Descobertas

Preparação do módulo `modules/discovery/` sem implementar categorias em massa.

## 1. Motor único de Descobertas

Em vez de criar 30 páginas manuais para cada categoria (churrascaria, pizzaria, pet friendly, romântico…), definir um **motor reutilizável**:

```ts
// modules/discovery/discovery-engine/types.ts
export type DiscoveryQuery = {
  city: string;                 // "presidente-prudente"
  occasion?: 'jantar' | 'almoco' | 'happy-hour' | 'sair' | 'brunch' | 'lanche';
  category?: string;            // 'churrascaria' | 'pizzaria' | ...
  audience?: 'casal' | 'familia' | 'criancas' | 'pet-friendly' | 'grupo';
  price?: 'econ' | 'medio' | 'premium';
  day?: 'today' | 'tomorrow' | 'weekend' | Date;
  time?: string;                // '19:00'
  features?: string[];          // 'ao-vivo' | 'estacionamento' | 'terraco' | ...
  location?: { lat: number; lng: number; radiusKm: number };
  userProfile?: PublicUserProfile;
};

export type DiscoveryResult = {
  places: PublicPartner[];
  events: PublicEvent[];
  narrative?: string;           // gerado por IA opcional
  reasons: Record<string, string>; // por que cada lugar foi recomendado
};
```

## 2. Uma URL declarativa gera N páginas

Rotas SEO baseadas em templates:

- `/onde-{ocasiao}/{cidade}` → `/onde-jantar/presidente-prudente`
- `/onde-{ocasiao}/{cidade}/{categoria}` → `/onde-jantar/presidente-prudente/pizzaria`
- `/onde-{ocasiao}/{cidade}/{audiencia}` → `/onde-jantar/presidente-prudente/casal`
- `/{categoria}/{cidade}` → `/churrascaria/presidente-prudente`
- `/happy-hour/{cidade}`
- `/pet-friendly/{cidade}`

Cada URL é resolvida pelo mesmo componente `<DiscoveryPage/>` que traduz slug → `DiscoveryQuery`. Um único arquivo de template + N slugs canônicos.

## 3. Fonte de verdade

- `partners` (dados reais) + `events` (agenda).
- Enriquecimento por `partners.features`, `partners.tags`, `partners.opening_hours`, `partners.price_range`, `partners.audience` — verificar quais colunas já existem; **não** criar migrations agora.
- IA (Lovable AI Gateway) complementa **narrativa** e **razões**, nunca dados factuais.

## 4. SEO

- Cada slug tem `title`, `description`, `canonical`, `og:image` baseados em template.
- JSON-LD `ItemList` + `LocalBusiness` para cada item.
- BreadcrumbList: `Roxou > Cidade > Ocasião > Categoria`.
- Sitemap dinâmico enumera slugs válidos por cidade + evita explosão combinatória (permitir apenas combinações com >N locais).
- `robots.txt`: permitir.

## 5. Landing de local (Onda 12)

Componentes internos: `<VenueHero>`, `<VenueGallery>`, `<VenueDescription>`, `<VenueHighlights>`, `<VenueSchedule>`, `<VenueContact>`, `<VenueMenu>`, `<VenueReservation>`, `<VenueVip>`, `<VenueEvents>`, `<VenueSimilar>`, `<VenueFAQ>`, `<VenueMap>`, `<VenueAIRecommendation>`.

## 6. Página da cidade (Onda 11)

`/cidade/:slug` = agregador. Reaproveita `<Hoje>`, `<AgendaSemana>`, `<PopularVenues>`, `<Jogos>`, `<Guias>`, `<Categorias>`, `<AIChatCidade>`.

## 7. Ordem de execução (dentro de Descobertas)

1. Criar `modules/discovery/discovery-engine/` (Onda 10 do plano geral).
2. Criar tipos e contratos.
3. Testar engine com queries reais em modo dev.
4. Criar `<DiscoveryPage>` template.
5. Registrar rotas dinâmicas.
6. Habilitar apenas 3–5 categorias de início (bares, restaurantes, churrascarias) — validar SEO.
7. Expandir progressivamente com base em dados reais (>N locais na cidade).

## 8. IA — regras

- A IA nunca cria estabelecimentos, endereços, horários ou preços.
- A IA só complementa: descrição textual, motivos de recomendação, agrupamentos, resposta a perguntas do usuário.
- Todo output de IA passa por sanitização (`shared/utils/sanitize.ts`).

## 9. Fora do escopo desta onda

- Não criar todas as 30+ categorias.
- Não criar landing page completa de local (fica na Onda 12).
- Não trocar layout do público.
- Não migrar dados.
