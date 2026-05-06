import { Navigate, useSearchParams } from "react-router-dom";
import V3RideRequest from "@/pages/v3/V3RideRequest";

/**
 * /pedir-carona só é permitido vinculado a um evento (eventId ou eventSlug).
 * Sem evento: redireciona para /agenda.
 */
export default function PedirCaronaGate() {
  const [params] = useSearchParams();
  const hasEvent = !!(params.get("eventId") || params.get("eventSlug"));
  if (!hasEvent) return <Navigate to="/agenda" replace />;
  return <V3RideRequest />;
}
