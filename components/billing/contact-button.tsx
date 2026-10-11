import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contactWhatsappLink } from "@/lib/billing";
import { contactEmail } from "@/lib/contact";
import { fmt } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";

/** "Contact us on WhatsApp" with a ready-made payment message (or email if no number is set). */
export function ContactButton({ m, email, size = "sm" }: { m: Messages; email: string | null; size?: "sm" | "default" }) {
  const message = fmt(m.billing.waMessage, { email: email ?? "" });
  const wa = contactWhatsappLink(message);
  if (wa) {
    return (
      <Button variant="brand" size={size} asChild>
        <a href={wa} target="_blank" rel="noopener noreferrer">
          <MessageCircle aria-hidden="true" />
          {m.billing.contact}
        </a>
      </Button>
    );
  }
  const to = contactEmail();
  if (!to) return null;
  return (
    <Button variant="outline" size={size} asChild>
      <a href={`mailto:${to}?subject=${encodeURIComponent(m.meta.appName)}&body=${encodeURIComponent(message)}`}>
        <Mail aria-hidden="true" />
        {m.billing.contactEmail}
      </a>
    </Button>
  );
}
