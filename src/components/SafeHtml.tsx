import * as DOMPurifyNS from "dompurify";

const DOMPurify: any = (DOMPurifyNS as any).default ?? DOMPurifyNS;

interface SafeHtmlProps {
  html?: string | null;
  className?: string;
}

const ALLOWED_TAGS = ["p", "strong", "em", "ul", "ol", "li", "br", "b", "i"];

/**
 * Renders rich HTML safely. Strips markdown fences and disallowed tags.
 * Falls back to plain-text rendering when content has no HTML tags.
 */
export default function SafeHtml({ html, className }: SafeHtmlProps) {
  if (!html) return null;

  // Strip markdown code fences (```html ... ```)
  let cleaned = html
    .replace(/^\s*```(?:html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(cleaned);

  if (!hasHtml) {
    return <p className={className} style={{ whiteSpace: "pre-line" }}>{cleaned}</p>;
  }

  const sanitized = DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
