/**
 * ExcursaoPassageiroPage — etapa 3/4.
 * Formulário do passageiro. Persiste em sessionStorage e avança.
 * Não chama o banco aqui — a reserva ocorre na etapa de confirmação.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readFlow, writeFlow } from "./excursao/excursaoFlow";
import ExcursaoStepper from "./excursao/ExcursaoStepper";

export default function ExcursaoPassageiroPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [doc, setDoc] = useState("");
  const [seatNumber, setSeatNumber] = useState<string | null>(null);
  const [missingSeat, setMissingSeat] = useState(false);

  useEffect(() => {
    document.title = "Seus dados · Excursão Roxou";
    const saved = readFlow(slug);
    if (!saved.seat_id) {
      setMissingSeat(true);
      return;
    }
    setSeatNumber(saved.seat_number ?? null);
    setName(saved.name ?? "");
    setPhone(saved.phone ?? "");
    setDoc(saved.doc ?? "");
  }, [slug]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    writeFlow(slug, {
      name: name.trim(),
      phone: phone.trim(),
      doc: doc.trim(),
    });
    navigate(`/transportes/excursoes/${slug}/confirmacao`);
  }

  return (
    <main
      className="min-h-screen w-full bg-gradient-to-b from-background to-purple-950/20"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-4">
        <Link
          to={`/transportes/excursoes/${slug}/assentos`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Assentos
        </Link>
        <ExcursaoStepper slug={slug} current="passageiro" />

        {missingSeat ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Nenhum assento selecionado. Volte para escolher um.
            </p>
            <Button asChild size="sm">
              <Link to={`/transportes/excursoes/${slug}/assentos`}>
                Escolher assento
              </Link>
            </Button>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card className="p-4 space-y-3">
              <header className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-widest text-primary">
                  Passo 3 · Passageiro
                </p>
                <h1 className="text-xl font-bold">Seus dados</h1>
                {seatNumber ? (
                  <p className="text-xs text-muted-foreground">
                    Assento {seatNumber}
                  </p>
                ) : null}
              </header>

              <div className="space-y-1.5">
                <Label htmlFor="exc-name" className="text-xs">
                  Nome completo
                </Label>
                <Input
                  id="exc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como está no documento"
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exc-phone" className="text-xs">
                  WhatsApp com DDD
                </Label>
                <Input
                  id="exc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 90000-0000"
                  inputMode="tel"
                  required
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exc-doc" className="text-xs">
                  Documento (opcional)
                </Label>
                <Input
                  id="exc-doc"
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                  placeholder="CPF ou RG"
                  maxLength={32}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={!name.trim() || phone.trim().length < 10}
              >
                Revisar e confirmar
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                A reserva só é efetivada na próxima etapa.
              </p>
            </Card>
          </form>
        )}
      </div>
    </main>
  );
}
