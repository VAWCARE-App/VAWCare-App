/**
 * Subtype Detection Utility
 * Detects incident subtypes from descriptions using English and Tagalog/Filipino keywords
 */

const SUBTYPES_MAPPING = {
  Physical: [
    "Slapping",
    "Hitting",
    "Strangulation",
    "Threat with weapon",
    "Uncategorized"
  ],
  Sexual: [
    "Rape",
    "Attempted rape",
    "Molestation",
    "Coercion",
    "Uncategorized"
  ],
  Psychological: [
    "Verbal abuse",
    "Gaslighting",
    "Threats",
    "Stalking",
    "Uncategorized"
  ],
  Economic: [
    "Withholding support",
    "Employment restriction",
    "Financial manipulation",
    "Uncategorized"
  ],
  Others: [
    "Cyber harassment",
    "Theft involving minors",
    "Uncategorized"
  ],
};

// Keywords for detection (English and Tagalog/Filipino)
// NOTE: Best used on lowercased victim descriptions to improve matching.
const KEYWORD_MAPPING = {
  // -----------------------------
  // Physical Violence
  // -----------------------------
  Slapping: {
    english: [
      "slap",
      "slapped",
      "slapping",
      "face slap",
      "hit my face",
      "hit her face",
      "palm strike",
      "slapped me",
      "kept slapping",
      "backhanded"
    ],
    tagalog: [
      "sampal",
      "sinampal",
      "sinasampal",
      "sampalin",
      "pinagsasampal",
      "pagsampal",
      "pinagsampal"
    ],
  },

  Hitting: {
    english: [
      "hit",
      "hitting",
      "hit me",
      "hit her",
      "beaten",
      "beating",
      "beat me",
      "beat her",
      "punch",
      "punched",
      "punching",
      "struck",
      "striking",
      "blow to my",
      "kicked",
      "kick",
      "kicking",
      "slammed me",
      "slammed against",
      "pushed",
      "pushing",
      "shoved",
      "shove",
      "scratched",
      "scratching",
      "scratch",
      "grabbed",
      "grabbing",
      "twisted my arm",
      "twisted her arm",
      "pulled my hair",
      "hair pulling",
      "dragged me",
      "dragged her",
      "physically hurt",
      "physically abused",
      "physically assaulted",
      "beat me up",
      "beat her up",
      "bruise",
      "bruised",
      "bruises"
    ],
    tagalog: [
      "suntok",
      "sinuntok",
      "sinasuntok",
      "suntukin",
      "sapak",
      "sinapak",
      "nanapak",
      "binugbog",
      "bugbog",
      "pinukpok",
      "pinalo",
      "palo",
      "sinipa",
      "sipa",
      "sipain",
      "tinulak",
      "itinulak",
      "tinutulak",
      "itinapon",
      "hinila",
      "kinaladkad",
      "kinurot",
      "kinukurot",
      "paso",
      "pinaso",
      "may pasa",
      "may mga pasa",
      "pinagbubugbog",
      "binato",
      "binatuhan"
    ],
  },

  Strangulation: {
    english: [
      "strangle",
      "strangled",
      "strangulation",
      "choke",
      "choked",
      "choking",
      "hands on my neck",
      "grabbed my neck",
      "squeezed my neck",
      "throttle",
      "suffocate",
      "suffocated",
      "suffocating",
      "couldn't breathe",
      "could not breathe",
      "hard to breathe",
      "asphyxiate"
    ],
    tagalog: [
      "sakal",
      "sinakal",
      "sinasakal",
      "sakalin",
      "hinigpitan ang leeg",
      "higpitan ang leeg",
      "hinawakan sa leeg",
      "hawak sa leeg",
      "hindi ako makahinga",
      "nahihirapan huminga"
    ],
  },

  "Threat with weapon": {
    english: [
      "threatened with a knife",
      "threatened with a gun",
      "threatened with a weapon",
      "pointed a knife",
      "pointed a gun",
      "pointed a weapon",
      "pulled a knife",
      "pulled a gun",
      "brandished a weapon",
      "armed with a knife",
      "armed with a gun",
      "holding a knife",
      "holding a gun",
      "holding a weapon",
      "used a weapon",
      "used a knife",
      "used a gun",
      "threatening me with",
      "threatening her with"
    ],
    tagalog: [
      "sandata",
      "armas",
      "may armas",
      "may dalang kutsilyo",
      "may dala na kutsilyo",
      "may baril",
      "tinutukan ng baril",
      "tinutukan ng kutsilyo",
      "tinutukan ako ng",
      "tinutukan siya ng",
      "tinakot gamit ang kutsilyo",
      "tinakot gamit ang baril",
      "may dalang itak",
      "pinagbantaan na may armas",
      "pinagbantaan na may baril",
      "pinagbantaan na may kutsilyo"
    ],
  },

  // -----------------------------
  // Sexual Violence
  // -----------------------------
  Rape: {
    english: [
      "rape",
      "raped",
      "was raped",
      "sexual assault",
      "sexually assaulted",
      "assaulted me sexually",
      "forced sexual act",
      "forced me to have sex",
      "forced her to have sex",
      "non-consensual sex",
      "without my consent",
      "without her consent",
      "forced himself on me",
      "forced himself on her"
    ],
    tagalog: [
      "rape",
      "ginahasa",
      "hinalay",
      "ni-rape",
      "nirape",
      "minolestiya sa sekswal",
      "pinagsamantalahan",
      "pinwersa ako",
      "pinwersa siya",
      "pinilit makipag-sex",
      "pinilit makipagtalik",
      "sekswal na pang-aabuso",
      "sekswal na inabuso"
    ],
  },

  "Attempted rape": {
    english: [
      "attempted rape",
      "tried to rape",
      "attempted to rape me",
      "attempted to rape her",
      "attempted sexual assault",
      "tried to force himself on me",
      "tried to force himself on her",
      "tried to force me sexually"
    ],
    tagalog: [
      "sinubukan akong i-rape",
      "sinubukan siya i-rape",
      "tangkang rape",
      "tangkang panggagahasa",
      "tangkang panghahalay",
      "sinubukan akong gahasain",
      "sinubukan siyang gahasain",
      "tangkang sekswal na pag-atake"
    ],
  },

  Molestation: {
    english: [
      "molest",
      "molested",
      "molestation",
      "touched inappropriately",
      "inappropriate touch",
      "inappropriately touched",
      "fondled",
      "groped",
      "sexually harassed",
      "harassed me sexually",
      "harassed her sexually",
      "touched my body",
      "touched her body",
      "kept touching me",
      "kept touching her"
    ],
    tagalog: [
      "minolestiya",
      "minolesya",
      "molestiya",
      "hinipuan",
      "hinipo",
      "hinahawakan nang malaswa",
      "mahahalay na hawak",
      "malaswang paghawak",
      "sekswal na panghihipo",
      "hinarass sa sekswal",
      "sekswal na harassment"
    ],
  },

  Coercion: {
    english: [
      "coerced",
      "coercion",
      "forced to do sexual things",
      "forced into sexual activity",
      "pressured into sex",
      "pressured into sexual act",
      "manipulated into sexual act",
      "threatened to force me",
      "threatened to force her",
      "blackmailed for sex",
      "blackmail for sex"
    ],
    tagalog: [
      "pinilit",
      "pinipilit",
      "napilitan",
      "pinwersa",
      "pinipwersa",
      "pinilit ako sa sexual",
      "pinilit siya sa sexual",
      "pinilit makipagtalik",
      "pinilit makipag-sex",
      "pinagbantaan para makipagtalik",
      "pinagbantaan para makipag-sex",
      "minanipula para sa sexual",
      "sekswal na pamimilit"
    ],
  },

  // -----------------------------
  // Psychological / Emotional Abuse
  // -----------------------------
  "Verbal abuse": {
    english: [
      "verbal abuse",
      "verbally abused",
      "insult",
      "insulted",
      "insulting me",
      "name calling",
      "called me names",
      "called her names",
      "degrade",
      "degrading",
      "humiliate",
      "humiliated",
      "humiliating",
      "yelled at me",
      "yelled at her",
      "screamed at me",
      "screamed at her",
      "shout",
      "shouted",
      "cursed at me",
      "cursed at her",
      "kept cursing",
      "told me i'm stupid",
      "called me stupid",
      "called me useless",
      "called me worthless",
      "called me ugly"
    ],
    tagalog: [
      "binastos",
      "bastos na pananalita",
      "bastos na salita",
      "bastusan",
      "minura",
      "minumura",
      "pagmumura",
      "sinigawan",
      "sigawan",
      "sinisigawan",
      "inaaway sa salita",
      "iniinsulto",
      "iniinsulto ako",
      "iniinsulto siya",
      "pang-iinsulto",
      "tinawag akong tanga",
      "tinawag akong bobo",
      "tinawag akong walang kwenta",
      "tinawag akong pangit",
      "binabastos ako",
      "binabastos siya"
    ],
  },

  Gaslighting: {
    english: [
      "gaslighting",
      "gaslighted",
      "you're crazy",
      "you are crazy",
      "you're just imagining",
      "you're imagining it",
      "that didn't happen",
      "that never happened",
      "you're overreacting",
      "you're too sensitive",
      "making me doubt myself",
      "making her doubt herself",
      "denying what happened",
      "denied what happened",
      "twisting my words",
      "twisting her words",
      "manipulating reality",
      "made me feel like i'm crazy"
    ],
    tagalog: [
      "ginagawang baliw ako",
      "sinasabi na baliw ako",
      "baliw ka",
      "guni-guni mo lang",
      "guni guni mo lang",
      "hindi nangyari yan",
      "wala namang nangyari",
      "ikaw ang may problema",
      "ikaw ang may sira",
      "binabaliktad ang kwento",
      "binabaliktad ang istorya",
      "binabaliktad ang nangyari",
      "pinagdududahan ko na ang sarili ko",
      "pinagdududa niya ang isip ko",
      "minamanipula ako sa isip"
    ],
  },

  Threats: {
    english: [
      "threat",
      "threatened",
      "threatening",
      "threaten",
      "will hurt me",
      "will hurt her",
      "will kill me",
      "will kill her",
      "will harm me",
      "will harm her",
      "will leave me",
      "will take the children",
      "will expose me",
      "if you don't do this",
      "if you don't obey",
      "if you don't listen",
      "i will hurt you",
      "i will kill you",
      "i'll hurt you",
      "i'll kill you",
      "going to hurt me",
      "going to hurt her",
      "going to kill me",
      "going to kill her"
    ],
    tagalog: [
      "banta",
      "binabantaan",
      "binantaan",
      "pinagbantaan",
      "babastusin",
      "saktan kita",
      "sasaktan kita",
      "papaluin kita",
      "papatayin kita",
      "papakain kita sa",
      "iiwan kita",
      "kukunin ko ang mga bata",
      "kukunin ko ang anak",
      "ilalabas ko ang sikreto mo",
      "ibubuking kita",
      "ipapahiya kita",
      "sisiguraduhin kong magsisisi ka"
    ],
  },

  Stalking: {
    english: [
      "stalk",
      "stalking",
      "stalked",
      "keeps following me",
      "keeps following her",
      "following me around",
      "following her around",
      "spying on me",
      "spying on her",
      "monitoring my phone",
      "monitoring her phone",
      "tracking my location",
      "tracking her location",
      "surveillance",
      "watching me",
      "watching her",
      "checking my messages",
      "checking her messages"
    ],
    tagalog: [
      "sinusundan ako",
      "sinusundan siya",
      "sinusubaybayan ako",
      "sinusubaybayan siya",
      "minamanmanan ako",
      "minamanmanan siya",
      "binabantayan ang kilos ko",
      "binabantayan ang galaw ko",
      "pinapanood ako",
      "pinapanood siya",
      "tinitingnan ang cellphone ko",
      "tinitingnan ang phone ko",
      "tinitingnan ang mga mensahe ko",
      "chine-check ang mga chat ko"
    ],
  },

  // -----------------------------
  // Economic Abuse
  // -----------------------------
  "Withholding support": {
    english: [
      "withhold support",
      "withholding support",
      "not providing support",
      "refused to provide money",
      "refused to give money",
      "cut off money",
      "no allowance",
      "stopped giving money",
      "does not give money",
      "does not support us",
      "won't buy basic needs"
    ],
    tagalog: [
      "hindi nagbibigay ng pera",
      "hindi na nagbibigay ng pera",
      "hindi tumutulong sa gastusin",
      "hindi nagbibigay ng suporta",
      "wala nang suporta",
      "walang suporta sa bata",
      "walang allowance",
      "itinigil ang suporta",
      "titigilan ang suporta",
      "ayaw bumili ng pangangailangan"
    ],
  },

  "Employment restriction": {
    english: [
      "prevented me from working",
      "prevented her from working",
      "not allowed to work",
      "won't allow me to work",
      "won't allow her to work",
      "forced me to quit my job",
      "forced her to quit her job",
      "told me to quit my job",
      "told her to quit her job",
      "forbid me to work",
      "forbid her to work",
      "not allowed to have a job",
      "no job allowed",
      "can't work",
      "cannot work because of him",
      "cannot work because of her"
    ],
    tagalog: [
      "hindi pinayagan magtrabaho",
      "hindi pinapayagan magtrabaho",
      "pinagbawalan magtrabaho",
      "pinapigil sa trabaho",
      "pinapahinto sa trabaho",
      "pinatigil sa trabaho",
      "pinilit akong mag-resign",
      "pinilit siyang mag-resign",
      "pinag-resign ako",
      "pinag-resign siya",
      "bawal daw akong magtrabaho",
      "bawal daw siyang magtrabaho",
      "ayaw niya akong magtrabaho",
      "ayaw niya siyang magtrabaho"
    ],
  },

  "Financial manipulation": {
    english: [
      "financial abuse",
      "controls all the money",
      "controls the money",
      "controlling finances",
      "controls my salary",
      "controls her salary",
      "takes my salary",
      "takes her salary",
      "steals my money",
      "steals her money",
      "stole my money",
      "stole her money",
      "keeps all the money",
      "no access to money",
      "does not let me use money",
      "does not let her use money",
      "forced me into debt",
      "forced her into debt"
    ],
    tagalog: [
      "kinokontrol ang pera",
      "kontrolado niya ang pera",
      "siya lang humahawak ng pera",
      "kinukuha ang sweldo ko",
      "kinukuha ang sweldo niya",
      "kinuha ang pera ko",
      "kinuha ang pera niya",
      "nagnakaw ng pera ko",
      "nagnakaw ng pera niya",
      "wala akong hawak na pera",
      "wala siyang hawak na pera",
      "hindi ako pinapagamit ng pera",
      "hindi siya pinapagamit ng pera",
      "pinilit ako mangutang",
      "pinilit siya mangutang",
      "pinapautang sa pangalan ko"
    ],
  },

  // -----------------------------
  // Other Forms
  // -----------------------------
  "Cyber harassment": {
    english: [
      "cyber harassment",
      "online harassment",
      "harass me online",
      "harass her online",
      "cyberbully",
      "cyber bullying",
      "online bullying",
      "social media bullying",
      "social media harassment",
      "harassed me on facebook",
      "harassed me on messenger",
      "harassed me on instagram",
      "harassed me on tiktok",
      "sent threatening messages",
      "posted about me online",
      "posted about her online",
      "shared my photos without consent",
      "shared her photos without consent",
      "leaked my photos",
      "leaked her photos"
    ],
    tagalog: [
      "online harassment",
      "inaaway ako online",
      "inaaway siya online",
      "inaaway sa facebook",
      "inaaway sa messenger",
      "inaaway sa chat",
      "inaaway sa social media",
      "cyberbullying",
      "cyber bullying",
      "kinakaaway ako sa social media",
      "pinapahiya ako online",
      "pinapahiya siya online",
      "ginagawang viral",
      "ginawang viral",
      "shinare ang picture ko",
      "shinare ang pictures ko",
      "shinare ang picture niya",
      "pinost ang litrato ko",
      "pinost ang litrato niya",
      "screenshot na pinakalat",
      "pinakalat ang screenshot"
    ],
  },

  "Theft involving minors": {
  english: [
    "minor stole",
    "the child stole",
    "my child stole",
    "our child stole",
    "the kid stole",
    "the minor took something",
    "the child took something",
    "the kid took something",
    "stole something at home",
    "took money at home",
    "took items without permission",
    "the child was caught stealing",
    "caught the minor stealing",
    "caught the child stealing"
  ],
  tagalog: [
    "nagnakaw",
    "nanakaw",
    "nagnakaw ng gamit",
    "nanakaw ng gamit",
    "nagnakaw ng pera",
    "nanakaw ng pera",
    "nagnakaw ang bata",
    "nagnakaw ang anak",
    "nagnakaw yung bata",
    "nagnakaw yung anak",
    "ang bata ang nagnakaw",
    "ang anak ang nagnakaw",
    "kumuha ang bata ng gamit",
    "kumuha ang anak ng gamit",
    "kinuha ng bata ang pera",
    "kinuha ng anak ang pera",
    "nahuling nagnanakaw ang bata",
    "nahuli ang bata na nagnanakaw",
    "nahuling nagnanakaw ang anak"
    ],
  },
};


/**
 * Detect incident subtype from description
 * @param {string} description - The incident description
 * @param {string} incidentType - The incident type (Physical, Sexual, Psychological, Economic, Others)
 * @returns {string} - The detected subtype or "Uncategorized"
 */
function detectIncidentSubtype(description, incidentType) {
  if (!description || !incidentType) {
    return "Uncategorized";
  }

  const descLower = description.toLowerCase();

  // Get valid subtypes for this incident type
  const validSubtypes = SUBTYPES_MAPPING[incidentType] || [];

  // Check each potential subtype for keywords
  for (const subtype of validSubtypes) {
    if (subtype === "Uncategorized") continue; // Skip uncategorized for now

    const keywords = KEYWORD_MAPPING[subtype];
    if (!keywords) continue;

    // Check English keywords
    for (const keyword of keywords.english) {
      if (descLower.includes(keyword.toLowerCase())) {
        return subtype;
      }
    }

    // Check Tagalog/Filipino keywords
    for (const keyword of keywords.tagalog) {
      if (descLower.includes(keyword.toLowerCase())) {
        return subtype;
      }
    }
  }

  return "Uncategorized";
}

/**
 * Get all subtypes for an incident type
 * @param {string} incidentType - The incident type
 * @returns {array} - Array of subtypes
 */
function getSubtypesForType(incidentType) {
  return SUBTYPES_MAPPING[incidentType] || ["Uncategorized"];
}

/**
 * Get all incident types
 * @returns {array} - Array of incident types
 */
function getIncidentTypes() {
  return Object.keys(SUBTYPES_MAPPING);
}

module.exports = {
  detectIncidentSubtype,
  getSubtypesForType,
  getIncidentTypes,
  SUBTYPES_MAPPING,
  KEYWORD_MAPPING,
};
