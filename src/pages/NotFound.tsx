import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import NotFoundView from "@/components/NotFoundView";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Onda 25 — usa view padronizada (noindex,follow + corpo com sugestões).
  return <NotFoundView />;
};

export default NotFound;
