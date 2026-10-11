import { connection } from "next/server";
import { getOwner } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const PAGE = 1000;

/**
 * GET /api/account/export — everything stored for the signed-in owner's
 * business, as a JSON download (GDPR right of access / portability).
 * Read as the owner, so RLS limits it to their own rows.
 */
export async function GET() {
  await connection();
  const owner = await getOwner();
  if (!owner) return Response.json({ error: "Please sign in." }, { status: 401 });

  const supabase = await createClient();

  // Supabase returns at most 1000 rows per request: page through bigger tables.
  async function all(table: "conversations" | "messages" | "bookings", order: string) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from(table).select("*").order(order).range(from, from + PAGE - 1);
      if (error) throw new Error(`${table}: ${error.code}`);
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) return rows;
    }
  }

  try {
    const [{ data: profile }, { data: business }, conversations, messages, bookings] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", owner.id).maybeSingle(),
      supabase.from("business_knowledge").select("*").eq("owner_id", owner.id).maybeSingle(),
      all("conversations", "created_at"),
      all("messages", "id"),
      all("bookings", "created_at"),
    ]);
    const body = JSON.stringify(
      { exported_at: new Date().toISOString(), account: { id: owner.id, email: owner.email }, profile, business, conversations, messages, bookings },
      null,
      2,
    );
    const date = new Date().toISOString().slice(0, 10);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="whatsapp-agent-export-${date}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logger.error("export_failed", { ownerId: owner.id, error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
