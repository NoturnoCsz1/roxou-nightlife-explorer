import { Crown } from "lucide-react";
import { Card } from "@/components/ui/card";

export function VipListEmptyState({ message }: { message?: string }) {
  return (
    <Card className="p-10 text-center">
      <Crown className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-3 text-lg font-semibold">Nenhuma lista VIP ainda</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {message ?? "Crie sua primeira lista para receber convidados especiais."}
      </p>
    </Card>
  );
}
