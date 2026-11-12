import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Check, Globe, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { PRICES_USD } from "@/lib/billing";
import { LOCALES } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/dictionaries";
import { siteUrl } from "@/lib/site";

/**
 * Somali-language landing page for "WhatsApp AI chatbot in Somali" searches.
 * Always Somali (whatever the visitor's language) so search engines index one
 * Somali page at one URL; the header/footer use the Somali dictionary too.
 */

const PATH = "/whatsapp-chatbot-soomaali";
const TITLE = "WhatsApp AI Chatbot ku hadla Af-Soomaali";
const DESCRIPTION =
  "ReplyBooker waa kaaliye AI ah oo WhatsApp-ka macaamiishaada Af-Soomaali ugaga jawaaba 24/7, qiimahaaga sharxa, ballamahana qabta. 14 maalmood bilaash, kaar looma baahna.";

const CHAT: { from: "customer" | "bot"; text: string; booked?: boolean }[] = [
  { from: "customer", text: "Asc, xagee joogtaan? Shixnad Nairobi ilaa Muqdisho immisa ayay ku kacaysaa?" },
  {
    from: "bot",
    text: "Wcs 😊 Xafiiskeennu wuxuu ku yaal Kisenyi, Kampala. Kiilada Nairobi → Muqdisho waa $4, alaabtuna waxay gaartaa 3–5 maalmood. Ma rabtaa inaan kuu qabto waqti aad alaabta keento?",
  },
  { from: "customer", text: "Haa, berri subax." },
  { from: "bot", text: "Hagaag ✅ Berri 10:00 subaxnimo ayaa laguu qabtay. Waan ku sugaynaa!", booked: true },
];

const BENEFITS = [
  "Wuxuu fahmaa oo ku jawaabaa Af-Soomaali dabiici ah, sidoo kale Ingiriisi, Carabi, Sawaaxili iyo luqado kale: macmiil kasta luqaddiisa.",
  "Habeen iyo maalin, fasax iyo ciid, wuu jawaabaa. Macmiil ma lumayo maxaa yeelay cid ma jirin.",
  "Wuxuu sharxaa adeegyadaada iyo qiimahaaga sida aad u qorto, wuxuuna qabtaa ballamaha. Adigu dashboard-ka ayaad ka aragtaa.",
  "Dashboard-ku waa Af-Soomaali. Wax code ah uma baahnid; macluumaadka ganacsigaaga ayaad qoraysaa oo keliya.",
  "Wuxuu isticmaalaa WhatsApp Business API-ga rasmiga ah ee Meta, lambarkaaga ganacsiga.",
  "Fariin kasta iyo ballan kasta waad ka aragtaa dashboard-ka, waxaadna damin kartaa AI-ga markaad rabto.",
];

const BUSINESSES = [
  "Cargo iyo shixnadaha",
  "Safarka iyo tigidhada",
  "Salon iyo qurxinta",
  "Rugaha caafimaadka",
  "Farmashiyaha",
  "Garaashka baabuurta",
  "Dukaamada iyo hoteelada",
  "Dugsiyada iyo tababarka",
];

const REGIONS = ["Soomaaliya", "Somaliland", "Kenya", "Uganda", "Itoobiya", "Jabuuti", "Qurbajoogta (Yurub, Maraykan, Khaliijka)"];

const STEPS: { title: string; text: string }[] = [
  { title: "Isdiiwaangeli bilaash", text: "Gal replybooker.com, samee akoon. 14 maalmood waa bilaash, kaar looma baahna." },
  { title: "Ku qor ganacsigaaga", text: "\"Xogta ganacsiga\" → \"Dejin degdeg ah\": dhowr jumladood ku qor waxa aad iibiso, qiimaha, saacadaha iyo goobta, kadibna riix \"AI ha buuxiyo\". AI-ga ayaa buuxinaya adeegyada iyo su'aalaha." },
  { title: "Tijaabi chat-ka", text: "\"Tijaabi chat-ka\" ku weydii su'aal sida macmiil oo kale, tusaale \"Bariisku immisa waaye?\", oo arag jawaabta Af-Soomaaliga ah." },
  { title: "WhatsApp-ka ku xidh", text: "Lambar WhatsApp Business ah oo cusub ayaan kuu xidhaynaa. Kadib chatbot-kaagu wuxuu macaamiishaada uga jawaabayaa 24 saac." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Sidee loo sameeyaa WhatsApp chatbot Af-Soomaali ah?",
    a: "ReplyBooker code uma baahna: 1) isdiiwaangeli bilaash, 2) \"Dejin degdeg ah\" ku qor waxa aad iibiso iyo qiimaha, AI-ga ayaa buuxinaya, 3) \"Tijaabi chat-ka\" ku tijaabi, 4) lambarkaaga WhatsApp ayaan kuu xidhaynaa. Inta badan hal daqiiqo ayuu bot-ku ku diyaar noqdaa.",
  },
  {
    q: "Chatbot-ku ma si fiican ayuu Af-Soomaali u yaqaan?",
    a: "Haa. ReplyBooker wuxuu u jawaabaa macmiilka luqadda uu ku qoro, Af-Soomaalina waa luqad si buuxda loo taageero. Dashboard-ka iyo farriimaha ganacsigaaguba waa Af-Soomaali.",
  },
  {
    q: "Ma u baahanahay inaan code qoro ama aan farsamo yaqaan noqdo?",
    a: "Maya. Waxaad qoraysaa adeegyadaada, qiimahaaga, saacadaha shaqada iyo su'aalaha badanaa la weydiiyo. Kaaliyaha AI ayaa intaas ka jawaabaya.",
  },
  {
    q: "Lambarkee WhatsApp ah ayaa la isticmaalayaa?",
    a: "Lambarka ganacsigaaga, adigoo isticmaalaya WhatsApp Business API-ga rasmiga ah ee Meta. Lambarku waa inuusan ku jirin app-ka WhatsApp ee caadiga ah; waan kugu caawinaynaa dejinta.",
  },
  {
    q: "Immisa ayay ku kacaysaa?",
    a: `14 maalmood waa bilaash, kaarna looma baahna. Kadib Starter waa $${PRICES_USD.starter} bishii (500 jawaabood AI), Pro-na waa $${PRICES_USD.pro} bishii (2,000 jawaabood AI).`,
  },
  {
    q: "Ma joojin karaa AI-ga haddii aan rabo inaan anigu jawaabo?",
    a: "Haa. Wada-hadal kasta waad ka aragtaa dashboard-ka, Habaynta ayaadna ka damin kartaa AI-ga ganacsigaaga markaad rabto.",
  },
];

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    type: "website",
    siteName: "ReplyBooker",
    locale: "so_SO",
    title: TITLE,
    description: DESCRIPTION,
    url: PATH,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ReplyBooker" }],
  },
};

export default function SomaliChatbotPage() {
  const m = getMessages("so");
  const url = `${siteUrl()}${PATH}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: TITLE,
      description: DESCRIPTION,
      url,
      inLanguage: "so",
      provider: { "@type": "Organization", name: "ReplyBooker", url: siteUrl() },
      areaServed: REGIONS,
      availableLanguage: ["so", "en", "ar", "sw"],
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "Sidee loo sameeyaa WhatsApp chatbot Af-Soomaali ah?",
      inLanguage: "so",
      step: STEPS.map((st, i) => ({ "@type": "HowToStep", position: i + 1, name: st.title, text: st.text })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: "so",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className="flex flex-1 flex-col" lang="so">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader m={m} />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              Kaaliye AI ah oo Soomaali ah
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{TITLE}</h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              Macaamiishaadu WhatsApp ayay kuugu qoraan habeen iyo maalin. ReplyBooker wuxuu Af-Soomaali ugaga jawaabaa daqiiqado gudahood, wuxuu u
              sheegaa qiimahaaga, wuxuuna u qabtaa ballamaha, xataa marka aad seexato.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="brand" size="lg" asChild>
                <Link href="/signup">{m.landing.ctaStart}</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{m.landing.noCard}</p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <p className="mb-3 text-center text-sm font-medium text-muted-foreground">Tusaale: shirkad cargo ah</p>
            <div className="overflow-hidden rounded-[2rem] border-8 border-foreground/10 bg-card shadow-xl" aria-hidden="true">
              <div className="flex items-center gap-3 bg-brand px-4 py-3 text-brand-foreground">
                <span className="grid size-9 place-items-center rounded-full bg-brand-foreground/20">
                  <MessageCircle className="size-4" />
                </span>
                <p className="text-sm font-semibold">Cargo · AI</p>
              </div>
              <div className="space-y-3 bg-muted/40 p-4 text-sm">
                {CHAT.map((c, i) => (
                  <div key={i} className={c.from === "customer" ? "flex justify-end" : "flex justify-start"}>
                    <div className={c.from === "customer" ? "max-w-[85%] rounded-xl bg-brand/20 px-3.5 py-2 shadow-xs" : "max-w-[85%] rounded-xl bg-background px-3.5 py-2 shadow-xs"}>
                      <p>{c.text}</p>
                      {c.booked ? (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand">
                          <CalendarCheck className="size-3" />
                          {m.landing.demo.booked}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">Maxaa ReplyBooker looga doortaa?</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <li key={b} className="rounded-xl border bg-card p-5 text-sm">
                  <Check className="mb-2 size-5 text-brand" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Sidee loo sameeyaa WhatsApp chatbot Af-Soomaali ah?</h2>
          <p className="mt-2 text-center text-muted-foreground">4 tallaabo, code la&apos;aan. Inta badan hal daqiiqo.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {STEPS.map((st, i) => (
              <li key={st.title} className="flex gap-4 rounded-xl border bg-card p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-semibold text-brand-foreground">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{st.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{st.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ganacsiyada ku habboon</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {BUSINESSES.map((b) => (
                <li key={b} className="rounded-full border px-3 py-1 text-sm">
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Globe className="size-5 text-brand" aria-hidden="true" />
              Meelaha aan u adeegno
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <li key={r} className="rounded-full border px-3 py-1 text-sm">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">Su&apos;aalaha badanaa la is weydiiyo</h2>
            <div className="mt-8 space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="rounded-xl border bg-card p-5">
                  <summary className="cursor-pointer font-medium">{f.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-brand/10">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">Maanta bilow, 14 maalmood bilaash</h2>
            <p className="mt-2 text-muted-foreground">{m.landing.finalBody}</p>
            <div className="mt-6 flex justify-center">
              <Button variant="brand" size="lg" asChild>
                <Link href="/signup">{m.landing.ctaStart}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter m={m} />
    </div>
  );
}
