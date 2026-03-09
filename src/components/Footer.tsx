const Footer = () => (
  <footer className="pb-28 md:pb-12 pt-8 md:pt-12 text-center">
    <div className="mx-auto max-w-6xl px-4 md:px-6 md:flex md:items-center md:justify-between">
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
  </footer>
);

export default Footer;
