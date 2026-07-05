# modules/partner

**Domínio:** Partner Pro — painel do parceiro + páginas públicas
ligadas ao parceiro (Bio, VIP, Reserva).

Responsabilidades futuras deste módulo:

- Dashboard, Home, Configurações, Perfil.
- Eventos do parceiro.
- Reservas Pro (tipos, lista, fila, operação, equipe).
- Listas VIP (abertas, fechadas, histórico, participantes, promoters).
- Validador QR e Check-in.
- Promoter Central.
- Analytics do parceiro.
- Bio pública (`/bio/:slug`, `/bio/:slug/menu`).
- Páginas públicas de VIP e Reserva.
- Área do cliente final do parceiro (`/cliente/*`).

**Status:** pasta criada, nenhum arquivo migrado. O código atual segue
em `src/apps/partner/**`, `src/pages/PublicVipList*`,
`src/pages/PublicReservation*`, `src/pages/bio/*` e `src/pages/customer/*`
até a Etapa 3 do plano de refatoração.
