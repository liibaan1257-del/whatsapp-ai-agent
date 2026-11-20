import { ShieldCheck, Users } from "lucide-react";
import { getBusinessCountFloor } from "@/lib/stats";

/**
 * Trust strip under the hero CTA: how many businesses have already signed up,
 * plus the free-setup promise. Renders nothing until there are enough
 * businesses to be worth showing, so it never displays a tiny number. The two
 * lines are passed in so the same component serves any locale's page; "{n}" in
 * `businesses` is replaced with the live count.
 */
export async function SocialProof({ businesses, freeSetup }: { businesses: string; freeSetup: string }) {
  const n = await getBusinessCountFloor();
  if (!n) return null;
  return (
    <div className="flex flex-col gap-2 text-sm font-medium sm:flex-row sm:items-center sm:gap-x-5">
      <span className="inline-flex items-center gap-2">
        <Users className="size-4 shrink-0 text-brand" aria-hidden="true" />
        {businesses.replace("{n}", String(n))}
      </span>
      <span className="inline-flex items-center gap-2">
        <ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden="true" />
        {freeSetup}
      </span>
    </div>
  );
}
