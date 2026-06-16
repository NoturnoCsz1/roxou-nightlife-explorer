/**
 * PartnerVipListDetailRoute — Fase 9J
 *
 * Wrapper de rota para PartnerVipListDetailPage, que recebe `listId` via props.
 */
import { useParams, Navigate } from "react-router-dom";
import PartnerVipListDetailPage from "../pages/PartnerVipListDetailPage";

const PartnerVipListDetailRoute = () => {
  const { listId } = useParams<{ listId: string }>();
  if (!listId) return <Navigate to="/admin/partner-preview/lista-vip" replace />;
  return <PartnerVipListDetailPage listId={listId} />;
};

export default PartnerVipListDetailRoute;
