import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-brand/15 text-brand">
        <MessageCircle className="size-6" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">WhatsApp AI Agent</h1>
        <p className="max-w-md text-muted-foreground">
          Answers your customers on WhatsApp, explains your services and prices, and books appointments for you.
        </p>
      </div>
      <Button variant="brand" disabled>
        Dashboard coming in the next steps
      </Button>
    </main>
  );
}
