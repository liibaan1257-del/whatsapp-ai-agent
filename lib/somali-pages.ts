/**
 * Somali-language landing pages, one per search phrase Somali business owners use
 * ("WhatsApp Business Af-Soomaali", "AI Af-Soomaali", "bot dukaan", ...). Always
 * Somali, rendered by components/marketing/somali-landing.tsx.
 */

import { PRICES_USD, YEARLY_PRICES_USD } from "@/lib/billing";

export type ChatLine = { from: "customer" | "bot"; text: string; booked?: boolean };
export type Faq = { q: string; a: string };

export type SomaliPage = {
  path: string;
  title: string;
  description: string;
  kicker: string;
  intro: string;
  chatLabel: string;
  chatName: string;
  chat: ChatLine[];
  benefitsTitle: string;
  benefits: string[];
  stepsTitle: string;
  faq: Faq[];
  /** Page-specific steps; defaults to SOMALI_STEPS (connecting the WhatsApp bot). */
  steps?: { title: string; text: string }[];
  /** Page language; defaults to Somali. */
  lang?: "so" | "en";
  /** The same page in the other language (hreflang). */
  alternate?: { lang: "so" | "en"; path: string };
};

/** Shared setup steps (also the HowTo structured data). */
export const SOMALI_STEPS: { title: string; text: string }[] = [
  { title: "Isdiiwaangeli bilaash", text: "Gal replybooker.com oo samee akoon. 14 maalmood waa bilaash, kaar looma baahna." },
  {
    title: "Ku qor ganacsigaaga",
    text: "\"Xogta ganacsiga\" → \"Dejin degdeg ah\": dhowr jumladood ku qor waxa aad iibiso, qiimaha, saacadaha iyo goobta. AI-ga ayaa buuxinaya adeegyada iyo su'aalaha.",
  },
  { title: "Tijaabi chat-ka", text: "\"Tijaabi chat-ka\" ku weydii su'aal sidii macmiil oo kale, oo arag jawaabta Af-Soomaaliga ah." },
  { title: "WhatsApp-ka ku xidh", text: "Marka aad bixiso bisha 1aad, lambar WhatsApp ah oo ganacsiga u gaar ah ayaan kuu xidhaynaa. Kadib bot-kaagu wuxuu macaamiishaada uga jawaabayaa 24 saacadood." },
];

const PRICE_FAQ: Faq = {
  q: "Immisa ayay ku kacaysaa?",
  a: `14 maalmood waa bilaash, kaar looma baahna. Kadib Starter waa $${PRICES_USD.starter} bishii (500 jawaabood AI), Pro-na waa $${PRICES_USD.pro} bishii (2,000 jawaabood AI). Ku xidhidda WhatsApp-ku waxay bilaabantaa marka aad bixiso bisha 1aad.`,
};

const NUMBER_FAQ: Faq = {
  q: "Lambarkee WhatsApp ah ayaa la isticmaalayaa?",
  a: "Lambar ganacsiga u gaar ah, oo lagu xidho WhatsApp Business API-ga rasmiga ah ee Meta. Lambarkaasi waa inuusan ku jirin app-ka WhatsApp (caadi ama Business) marka la xidhayo. Waxaa fiican SIM cusub; lambarkaaga hadda jira sidiisa ayuu u sii shaqaynayaa.",
};

export const SOMALI_PAGES = {
  "whatsapp-business-af-soomaali": {
    path: "/whatsapp-business-af-soomaali",
    title: "WhatsApp Business Af-Soomaali: AI macaamiisha u jawaaba",
    description:
      "Ku dar kaaliye AI ah WhatsApp Business-kaaga: macaamiishaada Af-Soomaali ugu jawaab 24 saacadood, qiimaha u sheeg, dalabaadka iyo ballamahana qaado. 14 maalmood bilaash.",
    kicker: "WhatsApp Business + AI",
    intro:
      "WhatsApp Business app-ku wuxuu leeyahay fariimo toos ah oo kooban (away message, greeting). ReplyBooker wuu ka sii fog yahay: AI ayaa akhriya su'aal kasta oo macmiilka, Af-Soomaali ayuu uga jawaabaa isagoo isticmaalaya xogtaada, dalabaadka iyo ballamahana wuu qaataa.",
    chatLabel: "Tusaale: dukaan dhar ah",
    chatName: "Dukaanka Dharka · AI",
    chat: [
      { from: "customer", text: "Asc, khamiis rag ah ma haysaan? Size L." },
      { from: "bot", text: "Wcs 😊 Haa, khamiisyada ragga size L waa la heli karaa, qiimuhu waa $12. Midabkee ayaad rabtaa: cad, madow mise buluug?" },
      { from: "customer", text: "Cad, 2 xabbo." },
      { from: "bot", text: "Hagaag ✅ 2 khamiis oo cad (L) = $24. Magacaaga iyo meesha laguu keenayo ii soo dir." },
    ],
    benefitsTitle: "Maxaa uga duwan WhatsApp Business-ka caadiga ah?",
    benefits: [
      "Fariimaha tooska ah ee WhatsApp Business hal jawaab oo keliya ayay bixiyaan. ReplyBooker su'aal kasta ayuu si gaar ah uga jawaabaa.",
      "Wuxuu sheegaa qiimayaasha, saacadaha iyo goobta sida aad u qorto, isagoo aan khaldin.",
      "Wuxuu qaataa dalabaadka iyo ballamaha, adiguna dashboard-ka ayaad ka aragtaa.",
      "Af-Soomaali dabiici ah, sidoo kale Ingiriis iyo Carabi, macmiil kasta luqaddiisa.",
      "Wuxuu isticmaalaa WhatsApp Business API-ga rasmiga ah ee Meta.",
      "Wada-hadal kasta waad aragtaa, AI-gana waad damin kartaa markaad rabto.",
    ],
    stepsTitle: "Sidee AI loogu daraa WhatsApp Business?",
    faq: [
      {
        q: "WhatsApp Business app-ka miyaan sii isticmaali karaa?",
        a: "Lambarka bot-ka lagu xidho app-ka kama shaqaynayo, maxaa yeelay wuxuu ku shaqaynayaa API-ga Meta. Sidaas darteed waxaa fiican lambar ganacsiga u gaar ah (SIM cusub). Lambarkaaga hadda jira app-ka ayuu sii ahaanayaa, waxaadna ku shidi kartaa greeting message u gudbiya macaamiisha lambarka bot-ka.",
      },
      {
        q: "Maxay ku kala duwan yihiin away message iyo ReplyBooker?",
        a: "Away message waa hal qoraal oo isku mid ah oo qof kasta loo diro. ReplyBooker wuxuu fahmaa su'aasha macmiilka (\"Qiimuhu waa immisa?\", \"Ma furan tihiin?\") wuxuuna ka jawaabaa jawaab sax ah oo ku salaysan xogta ganacsigaaga.",
      },
      NUMBER_FAQ,
      PRICE_FAQ,
    ],
  },

  "ai-af-soomaali": {
    path: "/ai-af-soomaali",
    title: "AI ku hadla Af-Soomaali: kaaliye ganacsigaaga u shaqeeya",
    description:
      "AI ku hadla Af-Soomaali dabiici ah oo macaamiishaada WhatsApp-ka uga jawaaba 24 saacadood: qiimaha, dalabaadka iyo ballamaha. Kood uma baahnid. 14 maalmood bilaash.",
    kicker: "AI Af-Soomaali",
    intro:
      "AI-ga maanta wuu fahmaa oo ku hadlaa Af-Soomaali. ReplyBooker wuxuu awooddaas u isticmaalaa ganacsigaaga: macmiil kasta oo WhatsApp-ka kuu soo qora wuxuu helayaa jawaab Af-Soomaali ah oo degdeg ah, adigoo aan qorin wax code ah.",
    chatLabel: "Tusaale: farmashiye",
    chatName: "Farmashiye · AI",
    chat: [
      { from: "customer", text: "Asc, Panadol ma haysaan? Imisa waaye?" },
      { from: "bot", text: "Wcs 😊 Haa, Panadol waa la helayaa: xirmada 24 kiniin waa $2. Ma rabtaa inaan kuu diyaarino?" },
      { from: "customer", text: "Haa, goorma ayaad xidhaan?" },
      { from: "bot", text: "Waxaan furan nahay 7:00 subaxnimo ilaa 11:00 habeennimo, maalin kasta 🕖 Waan ku sugaynaa!" },
    ],
    benefitsTitle: "Waxa AI-ga Af-Soomaaliga ah kuu qabanayo",
    benefits: [
      "Wuxuu fahmaa Af-Soomaali sida dadku dhab ahaan u qoraan, xitaa higgaad kala duwan iyo erayo Ingiriis ah oo ku dhex jira.",
      "Wuxuu ka jawaabaa su'aalaha badanaa la is weydiiyo: qiimaha, saacadaha, goobta, gaadhsiinta.",
      "Wuxuu isticmaalaa oo keliya xogta aad siiso, sidaas darteed ma sheego qiime aanad qorin.",
      "Habeen iyo maalin, fasax iyo ciid, wuu shaqeeyaa.",
      "Macmiilku haddii uu Ingiriis ama Carabi ku qoro, luqaddaas ayuu ugu jawaabaa.",
      "Dashboard-ku waa Af-Soomaali, si fudud ayaad u maamuli kartaa.",
    ],
    stepsTitle: "Sidee loo bilaabaa AI Af-Soomaali ah?",
    faq: [
      {
        q: "AI-gu si fiican ma u yaqaan Af-Soomaali?",
        a: "Haa. Wuxuu fahmaa oo ku jawaabaa Af-Soomaali dabiici ah. Dejinta kadib \"Tijaabi chat-ka\" ka weydii su'aalo sidii macmiil oo kale, si aad u aragto tayada jawaabaha ka hor intaanu macaamiishaada la hadlin.",
      },
      {
        q: "AI-gu ma sheegi karaa qiime khaldan?",
        a: "Wuxuu isticmaalaa xogta aad ku qorto \"Xogta ganacsiga\". Haddii qiimuhu isbeddelo, isla markiiba cusboonaysii. Haddii qiime aanu jirin, wuxuu macmiilka u sheegaa in laga xaqiijin doono.",
      },
      {
        q: "Maxay ku kala duwan yihiin ReplyBooker iyo Meta AI?",
        a: "Meta AI waa kaaliye shakhsi ah oo adiga ku caawiya. ReplyBooker waa kaaliye ganacsi oo macaamiishaada uga jawaaba lambarka WhatsApp-ka ganacsigaaga, isagoo isticmaalaya xogtaada.",
      },
      PRICE_FAQ,
    ],
  },

  "sida-loo-sameeyo-bot-whatsapp": {
    path: "/sida-loo-sameeyo-bot-whatsapp",
    title: "Sida loo sameeyo bot WhatsApp ah (Af-Soomaali, code la'aan)",
    description:
      "Tallaabo tallaabo: sida loo sameeyo bot WhatsApp ah oo Af-Soomaali macaamiishaada ugu jawaaba, code la'aan, 2 daqiiqo gudahood. 14 maalmood bilaash.",
    kicker: "Hagaha 2026",
    intro:
      "Uma baahnid barnaamij-sameeye ama code. Hagahan wuxuu ku tusayaa 4 tallaabo oo fudud oo aad ku samaynayso bot WhatsApp ah oo Af-Soomaali ku hadla, kaasoo macaamiishaada u jawaaba, qiimaha u sheega, dalabaadkana qaata.",
    chatLabel: "Natiijada: bot diyaar ah",
    chatName: "Ganacsigaaga · AI",
    chat: [
      { from: "customer", text: "Asc, ma furan tihiin maanta?" },
      { from: "bot", text: "Wcs 😊 Haa, maanta waxaan furan nahay ilaa 10:00 habeennimo. Maxaan kaa caawin karaa?" },
      { from: "customer", text: "Qiimaha liiska ii soo dir." },
      { from: "bot", text: "Waa kan liiskeenna 👇 Bariis 25kg $22 · Saliid 3L $9 · Sonkor 10kg $12. Midkee kuu diyaariyaa?" },
    ],
    benefitsTitle: "Waxa aad u baahan tahay",
    benefits: [
      "Akoon ReplyBooker (bilaash 14 maalmood).",
      "Liiska waxa aad iibiso iyo qiimayaashooda.",
      "Saacadaha aad furan tahay iyo goobta.",
      "Lambar WhatsApp ah oo ganacsiga u gaar ah (SIM cusub ayaa fiican).",
      "2 daqiiqo oo wakhti ah. Code iyo farsamo uma baahnid.",
      "Haddii aad ku xannibanto, WhatsApp-ka ayaan kaaga caawinaynaa.",
    ],
    stepsTitle: "4 tallaabo oo lagu sameeyo bot WhatsApp ah",
    faq: [
      {
        q: "Ma u baahanahay inaan code qoro?",
        a: "Maya. Waxaad qoraysaa macluumaadka ganacsigaaga sidii adigoo saaxiib u sheegaya, AI-ga ayaa diyaarinaya bot-ka.",
      },
      {
        q: "Intee ayay qaadanaysaa?",
        a: "Dejinta bot-ku inta badan waa 2 daqiiqo. Ku xidhidda lambarka WhatsApp waxay u baahan tahay code xaqiijin ah oo SMS ama wicitaan ah, waanan kula socnaa.",
      },
      NUMBER_FAQ,
      PRICE_FAQ,
    ],
  },

  "bot-whatsapp-dukaan": {
    path: "/bot-whatsapp-dukaan",
    title: "Bot WhatsApp ah oo dukaankaaga u shaqeeya (Af-Soomaali)",
    description:
      "Bot WhatsApp ah oo dukaankaaga macaamiishiisa Af-Soomaali ugu jawaaba: qiimaha alaabta, waxa la heli karo iyo dalabaadka, 24 saacadood. 14 maalmood bilaash.",
    kicker: "Dukaamada",
    intro:
      "Macaamiishu waxay weydiiyaan isla su'aalaha maalin kasta: \"Ma haysaan?\", \"Waa immisa?\", \"Ma keentaan?\". Bot-ka ReplyBooker ayaa ka jawaaba si degdeg ah oo Af-Soomaali ah, dalabkana wuu qaataa, adigoo macaamiisha dukaanka joogta u adeegaya.",
    chatLabel: "Tusaale: dukaan cunto",
    chatName: "Dukaanka Hodan · AI",
    chat: [
      { from: "customer", text: "Asc, bariis ma haysaan? 25kg." },
      { from: "bot", text: "Wcs 😊 Haa, Bariis 25kg waa $22. Ma kuu diyaariyaa?" },
      { from: "customer", text: "Haa, 2 kiish. Ma keentaan?" },
      { from: "bot", text: "Hagaag ✅ 2 × Bariis 25kg = $44. Waan keenaynaa, magacaaga iyo meesha ii soo dir 🚚" },
    ],
    benefitsTitle: "Waxa bot-ku dukaankaaga u qabanayo",
    benefits: [
      "Wuxuu sheegaa qiimaha alaab kasta oo aad ku qorto.",
      "Wuxuu u sheegaa macmiilka waxa la heli karo iyo waxa dhammaaday.",
      "Wuxuu qaataa dalabaadka (alaabta, tirada, meesha) adiguna dashboard-ka ayaad ka aragtaa.",
      "Habeenkii adigoo hurda, dalabaadku way imanayaan.",
      "Macaamiisha dukaanka joogta ayaad u adeegaysaa, bot-kuna WhatsApp-ka ayuu qabtaa.",
      "Af-Soomaali dabiici ah, kood la'aan.",
    ],
    stepsTitle: "Sidee loogu sameeyaa dukaankaaga bot WhatsApp ah?",
    faq: [
      {
        q: "Alaab badan ayaan haystaa, ma geli karaa dhammaan?",
        a: "Haa. \"Dejin degdeg ah\" ku qor liiska alaabta iyo qiimayaasha, AI-ga ayaa u kala qaybinaya adeegyo. Waxaad sidoo kale gacanta ku dari kartaa ama beddeli kartaa markaad rabto.",
      },
      {
        q: "Qiimuhu marka uu isbeddelo maxaa dhacaya?",
        a: "\"Xogta ganacsiga\" ka beddel qiimaha, bot-ku isla markiiba qiimaha cusub ayuu sheegayaa.",
      },
      NUMBER_FAQ,
      PRICE_FAQ,
    ],
  },

  "bot-whatsapp-makhaayad": {
    path: "/bot-whatsapp-makhaayad",
    title: "Bot WhatsApp ah oo makhaayaddaada dalabaadka qaata",
    description:
      "Bot WhatsApp ah oo makhaayaddaada u qaata dalabaadka cuntada, menu-ga iyo qiimaha u sheega macaamiisha, Af-Soomaali, 24 saacadood. 14 maalmood bilaash.",
    kicker: "Makhaayadaha",
    intro:
      "Waqtiga qadada gacmahaagu way mashquul yihiin, WhatsApp-kuna wuu buuxsamaa. Bot-ka ReplyBooker ayaa macaamiisha u sheega menu-ga iyo qiimaha, dalabkana qaata, si aanad u lumin macmiil kaliya maxaa yeelay cidna uma jawaabin.",
    chatLabel: "Tusaale: makhaayad",
    chatName: "Makhaayadda · AI",
    chat: [
      { from: "customer", text: "Asc, bariis iyo hilib ari immisa waaye?" },
      { from: "bot", text: "Wcs 😊 Bariis iyo hilib ari waa $6, waxaa la socda moos iyo cabitaan. Ma kuu diyaarinnaa?" },
      { from: "customer", text: "Haa, 3 saxan, 1:00." },
      { from: "bot", text: "Hagaag ✅ 3 × Bariis iyo hilib = $18, saacadda 1:00 ayuu diyaar noqonayaa. Mahadsanid!", booked: true },
    ],
    benefitsTitle: "Waxa bot-ku makhaayaddaada u qabanayo",
    benefits: [
      "Wuxuu u sheegaa macaamiisha menu-ga iyo qiimaha cunto kasta.",
      "Wuxuu qaataa dalabaadka (cuntada, tirada, wakhtiga) adiguna dashboard-ka ayaad ka aragtaa.",
      "Wuxuu sheegaa saacadaha aad furan tahay iyo goobta.",
      "Wuxuu qaataa ballamaha miisaska iyo dalabaadka xafladaha.",
      "Waqtiga mashquulka, macmiil kasta isla markiiba wuu helaa jawaab.",
      "Af-Soomaali dabiici ah, kood la'aan.",
    ],
    stepsTitle: "Sidee loogu sameeyaa makhaayaddaada bot WhatsApp ah?",
    faq: [
      {
        q: "Bot-ku ma qaadan karaa dalabaadka cuntada?",
        a: "Haa. Wuxuu weydiiyaa macmiilka cuntada, tirada iyo wakhtiga, kadibna dalabka wuxuu ka muuqanayaa dashboard-kaaga. Lacag-bixinta adiga ayaa macmiilka la xaqiijinaya.",
      },
      {
        q: "Menu-gu marka uu isbeddelo?",
        a: "\"Xogta ganacsiga\" ka beddel cuntooyinka iyo qiimayaasha, bot-ku isla markiiba menu-ga cusub ayuu isticmaalayaa.",
      },
      NUMBER_FAQ,
      PRICE_FAQ,
    ],
  },

  "ballan-qabsasho-whatsapp": {
    path: "/ballan-qabsasho-whatsapp",
    title: "Ballan qabsasho WhatsApp ah oo toos ah (Af-Soomaali)",
    description:
      "Macaamiishaadu ha ku qabsadaan ballamaha WhatsApp-ka, Af-Soomaali, 24 saacadood: salon, rugaha caafimaadka, garaashka iyo adeeg kasta. 14 maalmood bilaash.",
    kicker: "Ballamaha",
    intro:
      "Ballan kasta oo telefoonka lagu qabsado wakhti ayay kaa qaadataa. ReplyBooker wuxuu macmiilka WhatsApp-ka ugu qabtaa ballanta Af-Soomaali: wuxuu weydiiyaa adeegga iyo wakhtiga, wuxuu hubiyaa saacadahaaga shaqada, ballantana dashboard-ka ayuu kuu dhigaa.",
    chatLabel: "Tusaale: salon",
    chatName: "Salon Hodan · AI",
    chat: [
      { from: "customer", text: "Asc, berri ballan ma la qabsan karaa? Timo-jarid iyo henna." },
      { from: "bot", text: "Wcs 😊 Haa! Timo-jarid + henna waa $25, qiyaastii 2 saac. Berri goormaa kuu fiican: 10:00 subaxnimo mise 3:00 galabnimo?" },
      { from: "customer", text: "10:00." },
      { from: "bot", text: "Hagaag ✅ Berri 10:00 subaxnimo ayaa laguu qabtay. Waan ku sugaynaa!", booked: true },
    ],
    benefitsTitle: "Waxa ballan-qabsashada tooska ah kuu qabanayso",
    benefits: [
      "Macaamiishu waxay ballan qabsadaan habeen iyo maalin, xitaa adigoo shaqo kale haya.",
      "Bot-ku wuxuu weydiiyaa adeegga, maalinta iyo wakhtiga, wuxuuna ilaaliyaa saacadahaaga shaqada.",
      "Ballan kasta waxay ka muuqataa dashboard-ka (Ballamaha).",
      "Wuxuu u sheegaa macmiilka qiimaha iyo muddada adeegga.",
      "Ku habboon salon, rugaha caafimaadka, ilkaha, garaashka, tababarka iyo adeegyo kale.",
      "Af-Soomaali dabiici ah, kood la'aan.",
    ],
    stepsTitle: "Sidee loo dejiyaa ballan qabsasho WhatsApp ah?",
    faq: [
      {
        q: "Ballamuhu xaggee ka muuqdaan?",
        a: "Dashboard-ka ReplyBooker, qaybta \"Ballamaha\". Halkaas ayaad ka arkaysaa macmiilka, adeegga, maalinta iyo wakhtiga.",
      },
      {
        q: "Bot-ku ma ogaanayaa saacadaha aan furan nahay?",
        a: "Haa. Saacadaha shaqada ee aad ku qorto \"Xogta ganacsiga\" ayuu raacaa, wuxuuna macmiilka u soo jeediyaa wakhtiyo ku jira saacadahaas.",
      },
      NUMBER_FAQ,
      PRICE_FAQ,
    ],
  },
  "buugga-deynta": {
    path: "/buugga-deynta",
    lang: "so",
    alternate: { lang: "en", path: "/debt-book-app" },
    title: "Buugga Deynta: qor deymaha macaamiisha, WhatsApp ku xasuusi",
    description:
      "Buugga Deynta (Buugga Daynta) oo online ah, Af-Soomaali: qor deymaha macaamiisha, arag wadarta iyo kuwa dib u dhacay, una dir xasuusin WhatsApp ah hal riix. App la'aan, 14 maalmood bilaash.",
    kicker: "Buugga Deynta",
    intro:
      "Dukaanno badan deymaha waxay ku qoraan buug warqad ah: wuu lumaa, wuu qoyaa, mana xasuusato cidda wakhtigeedu dhaafay. ReplyBooker wuxuu kuu siinayaa Buugga Deynta (qaar waxay u qoraan Buugga Daynta ama buug deyn), oo telefoon kasta iyo kombiyuutar ka shaqeeya, app la'aan: macmiil kasta iyo lacagtiisa ku qor, wadarta isla markiiba arag, kadibna \"Xasuusi\" riix si WhatsApp-kaagu ugu furmo fariin xasuusin ah oo diyaar ah.",
    chatLabel: "Tusaale: xasuusinta deynta",
    chatName: "Dukaanka Barwaaqo",
    chat: [
      { from: "bot", text: "Asc Cali 👋 Waa Dukaanka Barwaaqo. Xasuusin yar: $15 ayaad nagu leedahay (2 kiish bariis). Fadlan noo sheeg goorta aad bixin karto. Mahadsanid 🙏" },
      { from: "customer", text: "Wcs, waan ka xumahay dib u dhaca. Berri ayaan EVC kuugu soo dirayaa." },
      { from: "bot", text: "Mahadsanid Cali 🙏 Waan sugaynaa." },
    ],
    benefitsTitle: "Waxa Buugga Deyntu kuu qabanayo",
    benefits: [
      "Macmiil kasta, lacagta, waxa uu qaatay iyo goorta uu bixinayo hal meel ayaad ku qorataa.",
      "Wadarta lacagta lagugu leeyahay iyo inta deyn ee furan isla markiiba ayaad aragtaa.",
      "Deymaha wakhtigoodu dhaafay waxay ku muuqdaan casaan, mid kuma dhaafayo.",
      "\"Xasuusi\": WhatsApp-kaaga ayaa ku furmaya fariin edeb leh oo diyaar ah. Adiga ayaa diraya, waana bilaash.",
      "\"Waa la bixiyay\" riix marka uu bixiyo, taariikhdana waa la kaydiyaa.",
      "Telefoonka ama kombiyuutarka ka isticmaal. Xogtaadu waa mid kuu gaar ah, cid kale ma arkayso.",
    ],
    stepsTitle: "Sidee loo isticmaalaa Buugga Deynta?",
    steps: [
      { title: "Isdiiwaangeli bilaash", text: "Gal replybooker.com oo samee akoon. 14 maalmood waa bilaash, kaar looma baahna." },
      { title: "Fur \"Buugga Deynta\"", text: "Dashboard-ka menu-giisa ka dooro \"Buugga Deynta\"." },
      { title: "Ku dar deyn", text: "Qor magaca macmiilka, WhatsApp-kiisa, lacagta, waxa uu qaatay iyo goorta uu bixinayo." },
      { title: "Xasuusi oo xir", text: "\"Xasuusi\" riix si fariinta WhatsApp-ka ugu furmo. Marka uu bixiyo, \"Waa la bixiyay\" riix." },
    ],
    faq: [
      {
        q: "Buugga Deynta iyo Buugga Daynta ma isku mid baa?",
        a: "Haa. Labadaba waa buug deyn: halka aad ku qorto deymaha macaamiisha (dayn ama deyn, labadaba waa sax). ReplyBooker-ka waa online: app ma soo dejinaysid, telefoon kasta ama kombiyuutar ayaad ka furaysaa, wuxuuna leeyahay xasuusin WhatsApp ah iyo, haddii aad rabto, bot AI ah oo macaamiishaada uga jawaaba.",
      },
      {
        q: "Xasuusintu ma lacag baa?",
        a: "Maya. \"Xasuusi\" wuxuu WhatsApp-kaaga ku furaa fariin diyaar ah, adigaana ka diraya lambarkaaga. Meta iyo ReplyBooker midkoodna lacag kaagama qaadanayo fariintaas.",
      },
      {
        q: "Macmiilku miyuu arkayaa buuggayga?",
        a: "Maya. Buugga waxaa arka adiga oo keliya (akoonkaaga). Macmiilku wuxuu helayaa fariinta xasuusinta ee aad u dirto oo keliya.",
      },
      {
        q: "Lacag aan doolar ahayn ma qori karaa?",
        a: "Haa. Lacagta waxaa loo qoraa lacagta aad ku dooratay \"Xogta ganacsiga\" (tusaale USD, KES, UGX ama ETB).",
      },
      {
        q: "Bot-ka WhatsApp ma u baahanahay si aan u isticmaalo?",
        a: "Maya. Buugga Deynta isagaa iskiis u shaqeeya. Haddii aad rabto, waxaad sidoo kale ku dari kartaa bot AI ah oo macaamiishaada 24 saacadood uga jawaaba.",
      },
      {
        q: "Immisa ayay ku kacaysaa?",
        a: `14 maalmood waa bilaash, kaar looma baahna. Kadib qorshaha Buug (Buugga Deynta oo keliya) waa $${PRICES_USD.book} bishii ama $${YEARLY_PRICES_USD.book} sannadkii. Haddii aad bot-ka AI-na rabto, Starter waa $${PRICES_USD.starter} bishii, Buugga Deyntana wuu ku jiraa.`,
      },
    ],
  },

  "debt-book-app": {
    path: "/debt-book-app",
    lang: "en",
    alternate: { lang: "so", path: "/buugga-deynta" },
    title: "Debt Book App: track customer credit and remind on WhatsApp",
    description:
      "A simple online debt book (credit ledger) for small shops: record what customers owe, see the total and overdue debts, and send a WhatsApp payment reminder in one tap. Free for 14 days.",
    kicker: "Debt book",
    intro:
      "Many shops still track customer credit in a paper notebook: it gets lost, it gets wet, and nobody remembers who is overdue. ReplyBooker's debt book keeps every customer and amount in one place, shows the total owed at a glance, and opens WhatsApp with a ready, polite reminder when you tap Remind.",
    chatLabel: "Example: a payment reminder",
    chatName: "Barwaaqo Shop",
    chat: [
      { from: "bot", text: "Hi Ali 👋 This is Barwaaqo Shop. A friendly reminder: you owe us $15 (2 bags of rice). Please let us know when you can pay. Thank you 🙏" },
      { from: "customer", text: "Sorry for the delay! I'll send it by mobile money tomorrow." },
      { from: "bot", text: "Thank you Ali 🙏 Talk soon." },
    ],
    benefitsTitle: "What the debt book does for you",
    benefits: [
      "Record each customer, the amount, what they took and when they'll pay.",
      "See the total owed to you and the number of open debts instantly.",
      "Overdue debts are highlighted in red, so none slip through.",
      "Remind opens your own WhatsApp with a polite, ready message. You send it, for free.",
      "Tap Paid when they pay; the date is saved.",
      "Works on phone or computer. Your data is private to your account.",
    ],
    stepsTitle: "How to use the debt book",
    steps: [
      { title: "Sign up free", text: "Create an account at replybooker.com. 14 days free, no card needed." },
      { title: "Open \"Debt book\"", text: "Pick \"Debt book\" in the dashboard menu." },
      { title: "Add a debt", text: "Enter the customer's name, WhatsApp number, amount, note and due date." },
      { title: "Remind and close", text: "Tap Remind to open the WhatsApp message. When they pay, tap Paid." },
    ],
    faq: [
      {
        q: "Do reminders cost anything?",
        a: "No. Remind opens WhatsApp on your phone with the message filled in, and you send it from your own number. Neither Meta nor ReplyBooker charges for it.",
      },
      {
        q: "Can customers see my debt book?",
        a: "No. Only you (your account) can see it. Customers only receive the reminder you send.",
      },
      {
        q: "Can I use my local currency?",
        a: "Yes. Amounts use the currency you set in Business info (for example USD, KES, UGX or ETB).",
      },
      {
        q: "Do I need the WhatsApp bot to use it?",
        a: "No. The debt book works on its own. If you want, you can also add an AI bot that answers your customers on WhatsApp 24/7.",
      },
      {
        q: "How much does it cost?",
        a: `14 days free, no card needed. After that the Debt book plan is $${PRICES_USD.book}/month or $${YEARLY_PRICES_USD.book}/year. If you also want the AI bot, Starter is $${PRICES_USD.starter}/month and includes the debt book.`,
      },
    ],
  },
} satisfies Record<string, SomaliPage>;

export type SomaliPageSlug = keyof typeof SOMALI_PAGES;

/** Every Somali landing page (the main one included), for cross-links, the footer and the sitemap. */
export const SOMALI_LINKS: { path: string; label: string }[] = [
  { path: "/whatsapp-chatbot-soomaali", label: "WhatsApp chatbot Af-Soomaali" },
  { path: "/whatsapp-business-af-soomaali", label: "WhatsApp Business Af-Soomaali" },
  { path: "/ai-af-soomaali", label: "AI ku hadla Af-Soomaali" },
  { path: "/sida-loo-sameeyo-bot-whatsapp", label: "Sida loo sameeyo bot WhatsApp" },
  { path: "/bot-whatsapp-dukaan", label: "Bot WhatsApp dukaan" },
  { path: "/bot-whatsapp-makhaayad", label: "Bot WhatsApp makhaayad" },
  { path: "/ballan-qabsasho-whatsapp", label: "Ballan qabsasho WhatsApp" },
  { path: "/buugga-deynta", label: "Buugga Deynta" },
];

/** English landing pages built with the same component (sitemap). */
export const ENGLISH_LINKS: { path: string; label: string }[] = [{ path: "/debt-book-app", label: "Debt book app" }];
