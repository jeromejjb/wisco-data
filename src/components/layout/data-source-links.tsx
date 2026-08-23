import { cn } from "@/lib/utils";
import { DATA_SOURCES } from "@/lib/site-meta";

type DataSourceLinksProps = {
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
};

const externalLinkProps = {
  target: "_blank" as const,
  rel: "noopener noreferrer" as const,
};

/** Outbound links to live data providers — shared by footer and About. */
export function DataSourceLinks({
  className,
  linkClassName,
  separatorClassName,
}: DataSourceLinksProps) {
  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      {DATA_SOURCES.map((source) => (
        <li key={source.links.map((l) => l.href).join("-")}>
          {source.links.map((link, i) => (
            <span key={link.href}>
              {i > 0 && (
                <span className={cn("text-white/30", separatorClassName)} aria-hidden>
                  {" · "}
                </span>
              )}
              <a
                href={link.href}
                {...externalLinkProps}
                className={cn(
                  "underline-offset-2 transition-colors hover:text-cyan-200 hover:underline",
                  linkClassName
                )}
              >
                {link.label}
              </a>
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}
