/**
 * Roxou Bio — barrel + container das abas.
 * Os componentes vivem em ./tabs/* para reduzir o tamanho do módulo
 * e habilitar tree-shaking. API pública mantida.
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { type BioProfile } from "@/services/bio";

export { BioHomeTab } from "./tabs/BioHomeTab";
export { BioProfileTab } from "./tabs/BioProfileTab";
export { BioLinksTab } from "./tabs/BioLinksTab";
export { BioMenuTab } from "./tabs/BioMenuTab";
export { BioAnalyticsTab } from "./tabs/BioAnalyticsTab";
export { BioQrTab } from "./tabs/BioQrTab";
export { BioSettingsTab } from "./tabs/BioSettingsTab";
export { BioSharePanel } from "./tabs/BioSharePanel";
export { BioLivePreview } from "./tabs/BioLivePreview";

import { BioHomeTab } from "./tabs/BioHomeTab";
import { BioProfileTab } from "./tabs/BioProfileTab";
import { BioLinksTab } from "./tabs/BioLinksTab";
import { BioMenuTab } from "./tabs/BioMenuTab";
import { BioAnalyticsTab } from "./tabs/BioAnalyticsTab";
import { BioQrTab } from "./tabs/BioQrTab";
import { BioSettingsTab } from "./tabs/BioSettingsTab";
import { BioSharePanel } from "./tabs/BioSharePanel";

export function BioTabsContainer({
  bio,
  partnerId,
  tab,
  onTabChange,
  onBioUpdated,
}: {
  bio: BioProfile;
  partnerId: string;
  tab: string;
  onTabChange: (t: string) => void;
  onBioUpdated: (b: BioProfile) => void;
}) {
  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="home">Home</TabsTrigger>
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="links">Links</TabsTrigger>
        <TabsTrigger value="menu">Cardápio</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="qr">QR</TabsTrigger>
        <TabsTrigger value="compartilhar">Compartilhar</TabsTrigger>
        <TabsTrigger value="configuracoes">Módulos</TabsTrigger>
      </TabsList>
      <TabsContent value="home" className="mt-4">
        <BioHomeTab bio={bio} partnerId={partnerId} />
      </TabsContent>
      <TabsContent value="perfil" className="mt-4">
        <BioProfileTab bio={bio} onUpdated={onBioUpdated} />
      </TabsContent>
      <TabsContent value="links" className="mt-4">
        <BioLinksTab bio={bio} />
      </TabsContent>
      <TabsContent value="menu" className="mt-4">
        <BioMenuTab bio={bio} />
      </TabsContent>
      <TabsContent value="analytics" className="mt-4">
        <BioAnalyticsTab bio={bio} />
      </TabsContent>
      <TabsContent value="qr" className="mt-4">
        <BioQrTab bio={bio} />
      </TabsContent>
      <TabsContent value="compartilhar" className="mt-4">
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Central de compartilhamento — copie o link, envie no WhatsApp, baixe o QR e use as legendas prontas.
          </div>
          <BioSharePanel bio={bio} />
          <BioQrTab bio={bio} />
        </div>
      </TabsContent>
      <TabsContent value="configuracoes" className="mt-4">
        <BioSettingsTab bio={bio} onUpdated={onBioUpdated} />
      </TabsContent>
    </Tabs>
  );
}
