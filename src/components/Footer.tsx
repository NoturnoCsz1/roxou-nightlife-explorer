import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="pb-28 md:pb-12 pt-8 md:pt-12">
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      {/* SEO internal links */}
      <nav className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-xs">
        <div>
          <h3 className="font-bold text-foreground mb-2">Eventos</h3>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link to="/eventos-hoje-em-presidente-prudente" className="hover:text-primary transition-colors">Eventos hoje</Link></li>
            <li><Link to="/eventos-amanha-em-presidente-prudente" className="hover:text-primary transition-colors">Eventos amanhã</Link></li>
            <li><Link to="/eventos-fim-de-semana-em-presidente-prudente" className="hover:text-primary transition-colors">Fim de semana</Link></li>
            <li><Link to="/agenda" className="hover:text-primary transition-colors">Esta semana</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-foreground mb-2">Categorias</h3>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link to="/baladas-em-presidente-prudente" className="hover:text-primary transition-colors">Baladas</Link></li>
            <li><Link to="/bares-em-presidente-prudente" className="hover:text-primary transition-colors">Bares</Link></li>
            <li><Link to="/shows-em-presidente-prudente" className="hover:text-primary transition-colors">Shows</Link></li>
            <li><Link to="/descobrir" className="hover:text-primary transition-colors">Todas categorias</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-foreground mb-2">Gêneros</h3>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link to="/sertanejo-em-presidente-prudente" className="hover:text-primary transition-colors">Sertanejo</Link></li>
            <li><Link to="/funk-em-presidente-prudente" className="hover:text-primary transition-colors">Funk</Link></li>
            <li><Link to="/pagode-em-presidente-prudente" className="hover:text-primary transition-colors">Pagode</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-foreground mb-2">ROXOU</h3>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link to="/sobre" className="hover:text-primary transition-colors">Sobre</Link></li>
            <li><Link to="/contato" className="hover:text-primary transition-colors">Contato</Link></li>
            <li><Link to="/cadastro-motorista" className="hover:text-primary transition-colors">Seja motorista</Link></li>
            <li><Link to="/" className="hover:text-primary transition-colors">Página inicial</Link></li>
          </ul>
        </div>
      </nav>

      {/* Links legais obrigatórios */}
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4 text-[11px] text-muted-foreground">
        <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
        <span className="opacity-40">·</span>
        <Link to="/terms" className="hover:text-primary transition-colors">Termos</Link>
        <span className="opacity-40">·</span>
        <Link to="/remover-dados" className="hover:text-primary transition-colors">Remover dados</Link>
        <span className="opacity-40">·</span>
        <Link to="/contato" className="hover:text-primary transition-colors">Contato</Link>
        <span className="opacity-40">·</span>
        <Link to="/sobre" className="hover:text-primary transition-colors">Sobre</Link>
      </nav>

      <div className="border-t border-border/20 pt-4 md:flex md:items-center md:justify-between text-center">
        <p className="text-[11px] md:text-xs text-muted-foreground/60 leading-relaxed">
          © 2026 ROXOU — Todos os direitos reservados
        </p>
        <p className="text-[10px] md:text-xs text-muted-foreground/40 mt-0.5 md:mt-0">
          Desenvolvido por{" "}
          <a
            href="https://instagram.com/onoturnocsz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            @onoturnocsz
          </a>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
