/**
 * CustomerAccount — perfil e consentimentos LGPD.
 */
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import {
  deleteMyCustomerAccount,
  getMyCustomerProfile,
  updateMyCustomerProfile,
  type CustomerProfile,
} from "@/services/customerProfile";

const CustomerAccount = () => {
  const { user, loading: authLoading, signOut } = useCustomerSession();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMyCustomerProfile()
      .then((p) => setProfile(p))
      .catch((err) =>
        toast({
          title: "Erro ao carregar perfil",
          description: (err as Error).message,
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  }, [user, toast]);

  if (authLoading) {
    return (
      <main className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }
  if (!user) {
    return (
      <Navigate
        to="/cliente/login?redirect=%2Fcliente%2Fminha-conta"
        replace
      />
    );
  }

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await updateMyCustomerProfile({
        full_name: profile.full_name,
        phone: profile.phone,
        marketing_consent: profile.marketing_consent,
        whatsapp_consent: profile.whatsapp_consent,
        email_consent: profile.email_consent,
      });
      setProfile(updated);
      toast({ title: "Preferências salvas." });
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background">
      <SEO
        title="Minha conta | Roxou"
        description="Seu perfil, consentimentos e logout."
      />
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">
            Minha conta
          </p>
          <h1 className="text-2xl font-bold">Perfil e preferências</h1>
        </header>

        {loading || !profile ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <Card className="space-y-3 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Nome</Label>
                <Input
                  id="acc-name"
                  value={profile.full_name ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-email">E-mail</Label>
                <Input
                  id="acc-email"
                  type="email"
                  value={profile.email ?? user.email ?? ""}
                  disabled
                  className="min-h-[44px] opacity-70"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-phone">WhatsApp</Label>
                <Input
                  id="acc-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="(18) 99999-9999"
                  value={profile.phone ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  className="min-h-[44px]"
                />
              </div>
            </Card>

            <Card className="space-y-4 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Consentimentos
              </p>
              <ConsentRow
                label="Receber novidades por WhatsApp"
                value={profile.whatsapp_consent}
                onChange={(v) =>
                  setProfile({ ...profile, whatsapp_consent: v })
                }
              />
              <ConsentRow
                label="Receber novidades por e-mail"
                value={profile.email_consent}
                onChange={(v) => setProfile({ ...profile, email_consent: v })}
              />
              <ConsentRow
                label="Receber comunicações de marketing"
                value={profile.marketing_consent}
                onChange={(v) =>
                  setProfile({ ...profile, marketing_consent: v })
                }
              />
            </Card>

            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full min-h-[44px]"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button asChild variant="outline" className="min-h-[44px]">
                <Link to="/cliente/minhas-reservas">Ver minhas reservas</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => void handleLogout()}
                className="min-h-[44px]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

function ConsentRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export default CustomerAccount;
