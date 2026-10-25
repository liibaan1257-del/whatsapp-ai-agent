import type { MetadataRoute } from "next";

/** Web app manifest: lets the site install as an app and be packaged for Google Play (TWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ReplyBooker",
    short_name: "ReplyBooker",
    description: "AI receptionist for WhatsApp: answers your customers 24/7 in their language and books appointments automatically.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0fa05c",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
