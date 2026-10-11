import { notFound } from "next/navigation";

/** Any unknown path: the translated 404 page (app/[lang]/not-found.tsx) inside the normal layout. */
export default function CatchAll() {
  notFound();
}
