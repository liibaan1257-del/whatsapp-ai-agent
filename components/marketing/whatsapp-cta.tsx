import { MessageCircle } from "lucide-react";
import { contactWhatsappLink } from "@/lib/billing";
import { cn } from "@/lib/utils";

/**
 * Big green "message us on WhatsApp" button for the Somali landing pages:
 * many visitors (most from Facebook ads) would rather talk to a person than
 * fill in a form. Renders nothing when no contact number is set.
 */
export function WhatsAppCta({ label, text, className }: { label: string; text: string; className?: string }) {
  const href = contactWhatsappLink(text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] px-6 py-3 text-base font-semibold text-[#04301b] shadow-sm transition hover:bg-[#1fbe5b]",
        className,
      )}
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      {label}
    </a>
  );
}

/** Floating WhatsApp button, bottom right, on every scroll position. */
export function WhatsAppFloat({ label, text }: { label: string; text: string }) {
  const href = contactWhatsappLink(text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed right-4 bottom-4 z-50 inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-3 text-sm font-semibold text-[#04301b] shadow-lg ring-4 ring-[#25d366]/25 transition hover:bg-[#1fbe5b]"
    >
      <MessageCircle className="size-5" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}
