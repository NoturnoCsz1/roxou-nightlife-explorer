import {
  Crown,
  CalendarCheck,
  UserCheck,
  Sparkles,
  ClipboardList,
  Users,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { OpsTile, PromoterRow } from "./AnalyticsOpsTiles";
import type { PartnerAnalytics } from "../services/partnerAnalytics";

export default function AnalyticsAccordions({ data }: { data: PartnerAnalytics }) {
  return (
    <Accordion type="multiple" className="space-y-2">
      <AccordionItem value="vip" className="partner-glass rounded-lg border border-white/5 px-3">
        <AccordionTrigger className="text-sm font-medium hover:no-underline">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Lista VIP — detalhamento
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
            <OpsTile icon={ClipboardList} label="Listas ativas" value={data.vip.active} />
            <OpsTile icon={ClipboardList} label="Fechadas" value={data.vip.closed} />
            <OpsTile icon={ClipboardList} label="Encerradas" value={data.vip.ended} />
            <OpsTile icon={Crown} label="Inscritos" value={data.vip.signups} />
            <OpsTile icon={UserCheck} label="Check-ins" value={data.vip.checkins} />
            <OpsTile icon={Sparkles} label="Presença" value={`${data.vip.attendanceRate}%`} />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="leads" className="partner-glass rounded-lg border border-white/5 px-3">
        <AccordionTrigger className="text-sm font-medium hover:no-underline">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Leads / CRM
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
            <OpsTile icon={Users} label="Total leads" value={data.leads.total} />
            <OpsTile icon={ShieldCheck} label="WhatsApp ok" value={data.leads.whatsapp} />
            <OpsTile icon={ShieldCheck} label="E-mail ok" value={data.leads.email} />
            <OpsTile icon={ShieldCheck} label="Sem consent." value={data.leads.noConsent} />
            <OpsTile icon={Sparkles} label="Novos" value={data.leads.newInPeriod} />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="ranking" className="partner-glass rounded-lg border border-white/5 px-3">
        <AccordionTrigger className="text-sm font-medium hover:no-underline">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Ranking completo de promoters
          </span>
        </AccordionTrigger>
        <AccordionContent>
          {data.promoters.length === 0 ? (
            <p className="text-xs text-muted-foreground pb-2">Nenhum promoter no período.</p>
          ) : (
            <>
              <div className="md:hidden space-y-2 pb-2">
                {data.promoters.map((p, idx) => (
                  <PromoterRow
                    key={p.promoterId ?? `none-${idx}`}
                    rank={idx}
                    name={p.name}
                    signups={p.signups}
                    checkins={p.checkins}
                    conversion={p.conversion}
                  />
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground bg-muted/30">
                    <tr>
                      <th className="text-left py-2 px-3">Promoter</th>
                      <th className="text-right py-2 px-3">Inscritos</th>
                      <th className="text-right py-2 px-3">Check-ins</th>
                      <th className="text-right py-2 px-3">No-show</th>
                      <th className="text-right py-2 px-3">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.promoters.map((p, idx) => (
                      <tr key={p.promoterId ?? `none-${idx}`} className="border-t border-border">
                        <td className="py-2 px-3">{p.name}</td>
                        <td className="text-right py-2 px-3 tabular-nums">{p.signups}</td>
                        <td className="text-right py-2 px-3 tabular-nums">{p.checkins}</td>
                        <td className="text-right py-2 px-3 tabular-nums">{p.noShows}</td>
                        <td className="text-right py-2 px-3 tabular-nums">{p.conversion}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="eventos" className="partner-glass rounded-lg border border-white/5 px-3">
        <AccordionTrigger className="text-sm font-medium hover:no-underline">
          <span className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Eventos vinculados
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm text-muted-foreground pb-2">
            Eventos com listas ou reservas no período:{" "}
            <span className="tabular-nums text-foreground font-semibold">{data.kpis.eventsLinked}</span>
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
