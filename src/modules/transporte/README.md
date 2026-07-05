# modules/transporte

**Domínio:** Transporte (excursões, caronas, privativo, admin).

Responsabilidades futuras deste módulo:

- **Excursões**: listagem, detalhe, seleção de assentos, passageiro,
  confirmação, acompanhamento por token, motorista de van.
- **Caronas**: solicitação, oferta, board do motorista, minhas
  viagens, chat.
- **Privativo**: solicitação, minhas, motoristas.
- **Booking / Quote / Pricing** compartilhados.
- **Integração** com Google Places e Google Routes.
- **Painel admin** de Transporte (a criar).

Não pertence a este módulo: dashboard financeiro do motorista
(fica em `modules/motorista`).

**Status:** pasta criada, nenhum arquivo migrado. Código atual em
`src/pages/transportes/**` e `src/pages/v3/V3{Transport,RideRequest,
DriverBoard,MyRides,Chat}.tsx` até a Etapa 4 do plano.
