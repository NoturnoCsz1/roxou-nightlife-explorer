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
            <li><Link to="/semana" className="hover:text-primary transition-colors">Esta semana</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-foreground mb-2">Categorias</h3>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link to="/baladas-em-presidente-prudente" className="hover:text-primary transition-colors">Baladas</Link></li>
            <li><Link to="/bares-em-presidente-prudente" className="hover:text-primary transition-colors">Bares</Link></li>
            <li><Link to="/shows-em-presidente-prudente" className="hover:text-primary transition-colors">Shows</Link></li>
            <li><Link to="/categorias" className="hover:text-primary transition-colors">Todas categorias</Link></li>
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
            <li><Link to="/indica" className="hover:text-primary transition-colors">Indicar evento</Link></li>
            <li><Link to="/" className="hover:text-primary transition-colors">Página inicial</Link></li>
          </ul>
        </div>
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
