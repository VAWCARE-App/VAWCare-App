const fs = require('fs');
const path = require('path');
let tf = null;
try {
  tf = require('@tensorflow/tfjs');
  console.log('Using @tensorflow/tfjs (pure JS) for DSS');
} catch (e) {
  tf = null; // model features will be disabled if tf is missing
}

const Cases = require('../models/Cases');
const { evaluateRules } = require('./rulesEngine');

// --- Victim type handling ---
function normalizeVictimType(v) {
  if (!v) return 'anonymous';
  const s = String(v).toLowerCase();
  if (s.includes('child')) return 'child';
  if (s.includes('woman') || s.includes('female')) return 'woman';
  return 'anonymous';
}

// --- Risk level mapping ---
function mapIncidentToBaseRisk(type, severity, manualRisk = null) {
  // If manual risk level is provided, use it
  if (manualRisk) {
    return manualRisk;
  }

  const t = (type || '').toLowerCase();
  // Default risk levels based on incident type
  // Emergency should always be treated as High risk
  if (t === 'emergency') return 'High';
  if (t === 'sexual' || t === 'physical') return 'High';
  if (t === 'psychological') return 'Medium';
  if (t === 'economic') return 'Low';
  return 'Medium'; // Default to Medium for safety
}

function adjustRiskForVictimType(baseRisk, victimType, incidentType, isManualOverride = false) {
  // If it's a manual override, don't adjust the risk level
  if (isManualOverride) {
    return baseRisk;
  }

  const vt = normalizeVictimType(victimType);
  if (vt === 'child') {
    // Only escalate children for incidents where escalation is desired (sexual, physical, emergency).
    // Suppress elevation for economic and psychological incidents per user request.
    const it = (incidentType || '').toString().toLowerCase();
    if (it === 'economic' || it === 'psychological') {
      return baseRisk;
    }
    // For remaining incident types (sexual, physical, emergency, etc.) apply elevation:
    if (baseRisk === 'Low') return 'Medium';
    if (baseRisk === 'Medium') return 'High';
    return 'High';
  }
  if (vt === 'anonymous') {
    return baseRisk;
  }
  return baseRisk;
}

// --- Keyword triggers with severity ---
const SEVERITY_KEYWORDS = {
  High: {
    Sexual: [
      // Tagalog
      'ginahasa', 'nirape','rape', 'hinalay', 'hinipuan', 'pinagsamantalahan', 'sekswal na karahasan', 
      'inabuso', 'kinantot', 'tinira', 'pinilit makipagtalik', 'pinagsamantalahan', 'kinikilan',
      // English
      'rape', 'molested', 'sexual assault', 'forced sex', 'sexually abused', 'gang rape',
      'sexual violence', 'penetration', 'non-consensual', 'sex trafficking'
    ],
    Physical: [
      // Tagalog
      'sinakal', 'binugbog', 'pinatay', 'sinaksak', 'binaril', 'tinaga', 'binagsakan ng kamao',
      'sinuntok hanggang duguin', 'pinalo ng', 'pinukpok', 'kinuryente', 'sinunog',
      // English
      'choked', 'strangled', 'weapon', 'threatened to kill', 'severe beating', 'hospitalized',
      'stabbed', 'shot', 'burned', 'broken bones', 'head injury', 'internal bleeding'
    ],
    Psychological: [
      // Tagalog
      'papataying', 'papatayin', 'magpapakamatay', 'pakakamatay', 'nagbanta ng kamatayan',
      'tinatakot ang pamilya', 'hinihimas ang leeg', 'kinukuyog', 'kinocontrol lahat',
      // English
      'death threats', 'threatened family', 'suicidal', 'extreme fear', 'severe trauma', 'hostage',
      'kill myself', 'end my life', 'torture', 'complete control', 'death wish', 'threatening suicide'
    ],
    Economic: [
      // Tagalog
      'walang makain', 'gutom na gutom', 'hindi pinapakain', 'walang pera', 'kinukuha lahat ng pera',
      'hindi pinapayagang magtrabaho', 'kinukuhaan ng sahod', 'ipinapautang ng walang pahintulot',
      // English
      'completely dependent', 'no access to money', 'starvation', 'denied medical care',
      'financial hostage', 'debt bondage', 'withholding necessities', 'stealing income'
    ]
  },
  Medium: {
    Sexual: [
      // Tagalog
      'hinihipuan', 'tinitingnan nang masama', 'hinuhubaran', 'sinusundan', 'kinakalabit',
      'binabantayan', 'pinapadaan sa madilim', 'tinatawag na malaswa', 'binubulungan ng bastos',
      // English
      'harassment', 'touched inappropriately', 'stalking', 'groping', 'unwanted advances',
      'indecent exposure', 'voyeurism', 'sexual comments', 'inappropriate touching'
    ],
    Physical: [
      // Tagalog
      'sinaktan', 'sinampal', 'sinuntok', 'sinipa', 'kinurot', 'hinampas', 'inumog',
      'tinulak', 'hinila', 'binatukan', 'pinalo', 'kinalmot', 'pasa',
      // English
      'hit', 'slapped', 'kicked', 'punched', 'bruised', 'grabbed forcefully', 'pushed around',
      'physical restraint', 'pulling hair', 'twisted arm'
    ],
    Psychological: [
      // Tagalog
      'binabantaan', 'tinatakot', 'nilalait', 'inaalipusta', 'sinisigawan', 'minumura',
      'hinihiya', 'kinokontrol', 'pinagbabawalan', 'pinaghihinalaang nambabae',
      // English
      'threatened', 'controlled', 'isolated', 'emotional abuse', 'intimidation', 'manipulation',
      'gaslighting', 'constant criticism', 'public humiliation', 'monitoring communications'
    ],
    Economic: [
      // Tagalog
      'kinukontrol ang pera', 'hindi pinapayagang magtrabaho', 'kinukuhaan ng sweldo',
      'pinagbabawalan kumita', 'pinaghihinalaang gumagastos', 'tinatago ang pera',
      // English
      'controls money', 'prevents working', 'financial abuse', 'restricting income',
      'hiding assets', 'forced debt', 'controlling expenses', 'financial manipulation'
    ]
  },
  Low: {
    Sexual: [
      // Tagalog
      'tinititigan', 'pinagtsitsismisan', 'pinagtitinginan', 'binibiro ng bastos',
      'nagkokomento ng malaswa', 'sinusundan ng tingin', 'binubulungan',
      // English
      'uncomfortable comments', 'unwanted attention', 'suggestive remarks', 'leering',
      'inappropriate jokes', 'personal space violation', 'unwanted flirting'
    ],
    Physical: [
      // Tagalog
      'tinulak', 'hinawakan', 'hinaharang', 'sinusundan', 'inuunahan',
      'binabangga', 'dinidiinan', 'hinihila ang gamit',
      // English
      'pushed', 'grabbed', 'rough handling', 'blocking path', 'intimidating presence',
      'invasion of space', 'aggressive gestures', 'minor physical contact'
    ],
    Psychological: [
      // Tagalog
      'nilalait', 'sinisigawan', 'minumura', 'binabara', 'pinapahiya',
      'kinukutya', 'tinatawanan', 'binabalewalang sinasabi',
      // English
      'insulted', 'yelling', 'cursing', 'verbal abuse', 'name-calling',
      'dismissive behavior', 'patronizing', 'mild threats', 'passive-aggressive'
    ],
    Economic: [
      // Tagalog
      'pinagdadamot', 'hindi pinapautang', 'tinatago ang pera', 'kinukwestyon ang gastos',
      'pinagbabawalan gumastos', 'hinihinging magpapaliwanag sa bawat gastos',
      // English
      'withholds money', 'restricts spending', 'financial control', 'questions purchases',
      'demanding receipts', 'monitoring expenses', 'guilt over spending'
    ]
  }
};

function detectSeverityFromKeywords(description, incidentType) {
  const desc = (description || '').toLowerCase();
  const type = (incidentType || '').toLowerCase();
  // --- Fuzzy matching helpers ---
  // Simple Levenshtein distance implementation
  function levenshtein(a, b) {
    if (!a || !b) return (a || b) ? Math.max((a||'').length, (b||'').length) : 0;
    const al = a.length;
    const bl = b.length;
    const dp = Array(al + 1).fill(null).map(() => Array(bl + 1).fill(0));
    for (let i = 0; i <= al; i++) dp[i][0] = i;
    for (let j = 0; j <= bl; j++) dp[0][j] = j;
    for (let i = 1; i <= al; i++) {
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[al][bl];
  }

  // Return true when two strings are sufficiently similar (threshold is conservative)
  function isFuzzyEqual(a, b, threshold = 0.72) {
    if (!a || !b) return false;
    if (a === b) return true;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return true;
    const dist = levenshtein(a, b);
    const ratio = 1 - dist / maxLen; // 1.0 means identical
    return ratio >= threshold;
  }

  // Tokenize description into words for individual comparisons
  const descTokens = desc.split(/\W+/).filter(Boolean);

  // Helper to check if the description contains the keyword either exactly
  // (substring) or via a fuzzy match against individual tokens.
  function matchesKeywordFuzzy(keyword) {
    const kw = (keyword || '').toLowerCase().trim();
    if (!kw) return false;
    // Exact substring match (covers multi-word phrases)
    if (desc.includes(kw)) return true;
    // For multi-word keyword, also check each component fuzzily
    const kwParts = kw.split(/\s+/).filter(Boolean);
    if (kwParts.length > 1) {
      // If every part fuzzy-matches some token, consider it a match
      const allPartsMatch = kwParts.every(part => descTokens.some(t => isFuzzyEqual(part, t)));
      if (allPartsMatch) return true;
    }
    // For single-word keywords, compare against tokens fuzzily
    if (kwParts.length === 1) {
      const part = kwParts[0];
      // Only compare reasonable-length tokens
      for (const t of descTokens) {
        // skip very short tokens
        if (t.length < 2) continue;
        if (isFuzzyEqual(part, t)) return true;
      }
    }
    return false;
  }

  // Check high severity first
  for (const kw of SEVERITY_KEYWORDS.High[type] || []) {
    if (matchesKeywordFuzzy(kw)) return 'High';
  }
  for (const kw of SEVERITY_KEYWORDS.Medium[type] || []) {
    if (matchesKeywordFuzzy(kw)) return 'Medium';
  }
  for (const kw of SEVERITY_KEYWORDS.Low[type] || []) {
    if (matchesKeywordFuzzy(kw)) return 'Low';
  }
  
  // Default severities by type
  if (type === 'sexual') return 'High';
  if (type === 'physical') return 'Medium';
  return 'Low';
}

// --- Solution-focused suggestions ---
function getSolutionSuggestion(risk, incidentType, victimType) {
  const vt = normalizeVictimType(victimType);
  const it = (incidentType || '').toLowerCase();
  const solutions = {
    child: {
      High: {
        emergency:
          'EMERGENCY: Immediate child-safety action (RA 7610/RA 9344).\n' +
          '1. Activate WCPU/RHU for urgent medical exam; preserve evidence (no washing, clothes bagged)\n' +
          '2. Notify/coordinate with WCPD-PNP; record in blotter and secure scene if applicable\n' +
          '3. Contact MSWDO/DSWD for immediate protective custody and safety placement\n' +
          '4. Conduct brief risk/ lethality screen; remove child from perpetrator\n' +
          '5. Start child-friendly intake; obtain consent/assent; assign case officer on 24/7 standby\n' +
          '6. Prepare referrals (medical, psychosocial, legal); schedule case conference within 24 hours',
        sexual:
          'URGENT: Child sexual abuse protocol (within 72 hrs if possible).\n' +
          '1. Arrange WCPU/RHU medico-legal exam; instruct evidence preservation\n' +
          '2. Coordinate WCPD for investigation and in-camera child interview\n' +
          '3. Ensure immediate safety placement (relative/DSWD shelter) away from suspect\n' +
          '4. Begin trauma-informed counseling; brief caregiver on do’s/don’ts\n' +
          '5. Document with standardized child intake; set follow-up within 24–48 hours',
        physical:
          'URGENT: Protective intervention for child.\n' +
          '1. Photograph/document injuries; send to RHU/WCPU for treatment and MLE\n' +
          '2. Notify WCPD; assess risk and separate from alleged perpetrator\n' +
          '3. Coordinate MSWDO/DSWD for temporary custody/kinship care\n' +
          '4. Start safety plan with caregiver; daily check-ins for 3 days\n' +
          '5. Prepare referrals (counseling, legal) and case conference schedule',
        psychological:
          'HIGH RISK: Immediate MH support and safety stabilization.\n' +
          '1. Screen for self-harm/suicide; escalate to RHU MH provider if positive\n' +
          '2. Notify MSWDO for home visit and safety planning with caregiver\n' +
          '3. Start child-focused counseling; engage school guidance\n' +
          '4. Document incidents; set daily monitoring for 3–5 days\n' +
          '5. Coordinate WCPD if threats/coercion persist',
        economic:
          'URGENT: Basic-needs/security compromise.\n' +
          '1. Rapid needs assessment (food/shelter/medicine); provide emergency assistance\n' +
          '2. Engage MSWDO for AICS/DSWD support and education continuity\n' +
          '3. Verify caregiver capacity; evaluate temporary placement if unsafe\n' +
          '4. Document and link to livelihood/aid; schedule welfare checks within 48 hours\n' +
          '5. Monitor for neglect/abuse indicators; escalate as needed'
      },
      Medium: {
        emergency:
          'EMERGENCY (Priority): Rapid child-safety response.\n' +
          '1. Alert MSWDO/WCPD; validate immediate risks and protective factors\n' +
          '2. Arrange prompt medical check and basic evidence documentation\n' +
          '3. Draft interim safety plan with caregiver; identify safe alternate carer\n' +
          '4. Provide counseling referral; follow-up within 24–48 hours\n' +
          '5. Prepare contingency for protective custody if risks increase',
        sexual:
          'PRIORITY: Protective measures and evidence care.\n' +
          '1. Refer to WCPU/RHU for exam; brief on evidence preservation\n' +
          '2. Coordinate WCPD for case build-up; use child-sensitive interview\n' +
          '3. Establish safety plan and supervised contact rules\n' +
          '4. Initiate psychosocial support; set weekly monitoring\n' +
          '5. Document thoroughly using child intake forms',
        physical:
          'PRIORITY: Injury verification and safety planning.\n' +
          '1. Document injuries; RHU check if indicated\n' +
          '2. Notify WCPD; assess home safety and proximity to perpetrator\n' +
          '3. Engage MSWDO; agree on supervision and safe caregiver\n' +
          '4. Counseling referral; schedule twice-weekly check-ins\n' +
          '5. Prepare escalation path if new harm occurs',
        psychological:
          'PRIORITY: MH support and school coordination.\n' +
          '1. Start regular counseling; provide coping tools to child/caregiver\n' +
          '2. Home environment assessment via MSWDO\n' +
          '3. Link with school guidance for monitoring\n' +
          '4. Weekly check-ins for 4 weeks; adjust plan if symptoms worsen\n' +
          '5. WCPD referral if threats/harassment present',
        economic:
          'PRIORITY: Stabilize basic needs and routines.\n' +
          '1. MSWDO assessment for assistance (AICS/food/transport)\n' +
          '2. Ensure school continuity; coordinate learning support\n' +
          '3. Link to NGO/government programs; document commitments\n' +
          '4. Biweekly welfare checks; update support plan\n' +
          '5. Monitor for neglect risks'
      },
      Low: {
        emergency:
          'EMERGENCY (Monitor): Reported as emergency; current severity lower.\n' +
          '1. Validate details with caregiver/MSWDO; confirm safety\n' +
          '2. Provide hotlines and clear escalation steps\n' +
          '3. Offer fast-track counseling/medical check if needed\n' +
          '4. Schedule follow-up within 24–48 hours\n' +
          '5. Keep contact line open for urgent changes',
        sexual:
          'MONITOR: Preventive protection and education.\n' +
          '1. Record concerns; advise evidence consciousness if risk rises\n' +
          '2. Start counseling; educate on boundaries/body safety\n' +
          '3. Safety awareness plan with caregiver\n' +
          '4. Biweekly check-ins; school coordination as needed\n' +
          '5. Escalate to WCPD if new incidents occur',
        physical:
          'MONITOR: Family support and prevention.\n' +
          '1. Document history; provide RHU referral if bruising/pain\n' +
          '2. MSWDO family session on non-violent discipline\n' +
          '3. Child safety plan and trusted-adult mapping\n' +
          '4. Regular monitoring for 4 weeks\n' +
          '5. Escalate upon signs of harm',
        psychological:
          'MONITOR: Counseling and home/school support.\n' +
          '1. Initiate counseling; develop coping strategies\n' +
          '2. Coordinate with caregiver and school guidance\n' +
          '3. Scheduled check-ins; mood/behavior tracker\n' +
          '4. Reinforce safety plan and hotline use\n' +
          '5. Escalate if ideation/threats appear',
        economic:
          'MONITOR: Link to services and welfare checks.\n' +
          '1. Assess needs; connect to MSWDO aid and feeding programs\n' +
          '2. Ensure school attendance and transport solutions\n' +
          '3. Monthly welfare checks; adjust support plan\n' +
          '4. Document progress; escalate if neglect indicators emerge\n' +
          '5. Maintain caregiver coaching'
      }
    },
    woman: {
      High: {
        emergency:
          'EMERGENCY: Immediate safety (RA 9262/Barangay Protocols).\n' +
          '1. Issue/assist Temporary BPO if criteria met; record blotter\n' +
          '2. Arrange secure transport to shelter/relative; separate from aggressor\n' +
          '3. RHU/WCPU medico-legal; preserve evidence; photo-document\n' +
          '4. Coordinate WCPD for protection/filing; brief on rights and remedies\n' +
          '5. Crisis counseling; individualized Safety Plan with lethality screen\n' +
          '6. Prepare referrals (legal aid, DSWD shelter, psychosocial); 24-hour follow-up',
        sexual:
          'URGENT: Sexual violence response (within 72 hrs if possible).\n' +
          '1. RHU/WCPU exam, PEP/EC counseling; evidence preservation guidance\n' +
          '2. WCPD coordination for statement and case build-up\n' +
          '3. Safe accommodation (DSWD facility/relative); no contact with suspect\n' +
          '4. Crisis counseling and trauma care; inform rights under RA 8353/9262\n' +
          '5. Schedule follow-up within 24–48 hours and legal consult',
        physical:
          'URGENT: Safety and documentation.\n' +
          '1. Photograph/document injuries; RHU treatment and MLE\n' +
          '2. Consider BPO issuance; assess high-risk indicators\n' +
          '3. WCPD referral; discuss filing options and safety escort\n' +
          '4. Arrange temporary shelter/safe house\n' +
          '5. Start counseling; finalize Safety Plan with emergency contacts',
        psychological:
          'HIGH RISK: Mental health stabilization and protection.\n' +
          '1. Screen for suicide/lethality; urgent MH referral if positive\n' +
          '2. Enforce BPO/safety measures if threats persist\n' +
          '3. Begin counseling (trauma-informed); peer support linkage\n' +
          '4. Daily check-ins for 3 days; then every 2–3 days\n' +
          '5. WCPD involvement if coercion/harassment continues',
        economic:
          'URGENT: Stabilize needs and independence.\n' +
          '1. Rapid needs assessment; provide immediate assistance (AICS)\n' +
          '2. Secure shelter/transport/childcare arrangements\n' +
          '3. Link to livelihood/financial counseling; apply to gov’t programs\n' +
          '4. Integrate economic steps in Safety Plan; monitor weekly\n' +
          '5. Coordinate legal remedies for support/maintenance'
      },
      Medium: {
        emergency:
          'EMERGENCY (Priority): Rapid support with safeguards.\n' +
          '1. Validate risk; consider BPO and safe accompaniment\n' +
          '2. RHU check if injury/somatic symptoms; document properly\n' +
          '3. Counseling and Safety Plan; concealment strategies if cohabiting\n' +
          '4. Connect to legal aid/NGOs; schedule close follow-up (48–72 hrs)\n' +
          '5. Escalate to WCPD if risk rises',
        sexual:
          'PRIORITY: Protection, documentation, options.\n' +
          '1. Document account; offer RHU/WCPU exam and psychosocial support\n' +
          '2. Safety plan and supervised/no-contact arrangements\n' +
          '3. WCPD/legal options discussion; assist if choosing to file\n' +
          '4. Weekly monitoring and referral updates\n' +
          '5. Record consent preferences clearly',
        physical:
          'PRIORITY: Safety planning and evidence.\n' +
          '1. Record/photograph injuries; RHU visit if needed\n' +
          '2. Draft Safety Plan (escape routes, code words, go-bag)\n' +
          '3. Counseling referral and support-group linkage\n' +
          '4. Discuss legal pathways (BPO, complaints)\n' +
          '5. Twice-weekly check-ins for 2 weeks',
        psychological:
          'PRIORITY: Counseling and network building.\n' +
          '1. Start counseling; teach coping/grounding techniques\n' +
          '2. Build support network (family/peers/faith-based, if desired)\n' +
          '3. Weekly check-ins; adjust plan per symptom changes\n' +
          '4. Consider MH referral if moderate/severe symptoms\n' +
          '5. Safety reminders for stalking/harassment',
        economic:
          'PRIORITY: Resource linkage and planning.\n' +
          '1. Financial counseling and budgeting; explore livelihood programs\n' +
          '2. Map support (food, transport, child needs)\n' +
          '3. Apply for assistance; track commitments\n' +
          '4. Biweekly monitoring; update independence milestones\n' +
          '5. Coordinate legal remedies for support'
      },
      Low: {
        emergency:
          'EMERGENCY (Monitor): Reported emergency; current severity lower.\n' +
          '1. Provide hotlines, BPO info, and discreet safety tips\n' +
          '2. Offer rapid counseling and RHU referral if needed\n' +
          '3. Schedule follow-up within 24–48 hours\n' +
          '4. Keep lines open for escalation; document consent choices',
        sexual:
          'MONITOR: Support and preparedness.\n' +
          '1. Document concerns; explain exam/time windows if future harm occurs\n' +
          '2. Counseling referral and safety awareness\n' +
          '3. Options talk (WCPD/legal) without pressure\n' +
          '4. Regular check-ins; adjust if risk increases\n' +
          '5. Maintain confidentiality per consent',
        physical:
          'MONITOR: Prevention and documentation.\n' +
          '1. Record incidents; advise safe evidence keeping\n' +
          '2. Create Safety Plan; identify safe contacts/places\n' +
          '3. Counseling and support-group linkage\n' +
          '4. Regular check-ins; escalate if pattern escalates\n' +
          '5. Discuss BPO options when ready',
        psychological:
          'MONITOR: Psychosocial support.\n' +
          '1. Begin counseling; coping and stress-management tools\n' +
          '2. Build support network; hotline awareness\n' +
          '3. Weekly check-ins for one month\n' +
          '4. MH referral if symptoms persist/worsen\n' +
          '5. Reassess safety if threats emerge',
        economic:
          'MONITOR: Gradual stabilization.\n' +
          '1. Basic resource mapping and referrals\n' +
          '2. Budgeting and skills training options\n' +
          '3. Monthly monitoring; update action plan\n' +
          '4. Track applications to assistance programs\n' +
          '5. Encourage savings/ID and document security'
      }
    },
    anonymous: {
      High: {
        emergency:
          'EMERGENCY: High-risk anonymous report; act on available data.\n' +
          '1. Capture details (time/place/pattern); tag for rapid triage\n' +
          '2. If location known, alert WCPD/EMS; document in blotter\n' +
          '3. Broadcast hotlines and safe-contact instructions (no retaliation)\n' +
          '4. Coordinate MSWDO/DSWD for possible outreach/shelter readiness\n' +
          '5. Keep reporting channel open; set 12–24h active monitoring',
        sexual:
          'URGENT RESPONSE NEEDED (Anonymous).\n' +
          '1. Record specifics; note timeframe (72-hr exam window)\n' +
          '2. Share discreet instructions for evidence preservation and WCPU access\n' +
          '3. If site identifiable, coordinate WCPD patrol/visibility\n' +
          '4. Keep line open; encourage safe direct contact\n' +
          '5. Flag case for daily review until stabilized',
        physical:
          'URGENT RESPONSE NEEDED (Anonymous).\n' +
          '1. Log details; check recurrence patterns/locations\n' +
          '2. Alert WCPD for patrol if area known; document blotter entry\n' +
          '3. Publish safety tips and hotline discreetly\n' +
          '4. Maintain open channel; 24h follow-up tickler\n' +
          '5. Prepare referral kit for when victim surfaces',
        psychological:
          'HIGH RISK SITUATION (Anonymous).\n' +
          '1. Document threats/harassment indicators\n' +
          '2. Provide MH/crisis hotlines and covert contact options\n' +
          '3. Monitor for escalation or corroborating reports\n' +
          '4. Coordinate WCPD if stalking/credible threats noted\n' +
          '5. Keep channel open for direct outreach',
        economic:
          'URGENT SUPPORT NEEDED (Anonymous).\n' +
          '1. Log situation; share how to access AICS/aid discreetly\n' +
          '2. Provide directory of services (RHU, MSWDO, shelters)\n' +
          '3. Encourage safe callback/contact; no-identification options\n' +
          '4. Monitor for updates and cross-reports\n' +
          '5. Keep channel open; prep referral package'
      },
      Medium: {
        emergency:
          'EMERGENCY (Priority): Rapid outreach despite anonymity.\n' +
          '1. Offer hotlines and safe-contact paths; capture any new details\n' +
          '2. Push situational safety tips for the described context\n' +
          '3. Stand up monitoring for 48–72 hours; tag for escalation\n' +
          '4. Coordinate quiet patrols if area is indicated',
        sexual:
          'PRIORITY RESPONSE (Anonymous).\n' +
          '1. Log report; share WCPU/RHU access steps and time sensitivity\n' +
          '2. Provide safety planning guide; encourage evidence care\n' +
          '3. Offer legal/WCPD options overview\n' +
          '4. Keep channel open; review every 48 hours\n' +
          '5. Update record upon any new detail',
        physical:
          'PRIORITY RESPONSE (Anonymous).\n' +
          '1. Record incidents; note hotspots and time patterns\n' +
          '2. Disseminate safety tips/hotlines in the vicinity when safe\n' +
          '3. Quiet WCPD visibility if feasible\n' +
          '4. Maintain open line; scheduled follow-up ping\n' +
          '5. Prepare referrals for rapid activation',
        psychological:
          'SUPPORT NEEDED (Anonymous).\n' +
          '1. Log concerns; provide MH and VAWC hotlines\n' +
          '2. Share coping/safety strategies for stalking/harassment\n' +
          '3. Encourage direct contact when safe\n' +
          '4. Review case in 2–3 days for signals of escalation\n' +
          '5. Update instructions as details emerge',
        economic:
          'SUPPORT NEEDED (Anonymous).\n' +
          '1. Record need; provide step-by-step access to aid\n' +
          '2. Share low-barrier services (feeding, shelter, transport)\n' +
          '3. Keep channel open; invite safe callback\n' +
          '4. Reassess in 2–3 days; prepare targeted referrals\n' +
          '5. Document any new identifiers'
      },
      Low: {
        emergency:
          'EMERGENCY (Monitor): Anonymous, low-severity at present.\n' +
          '1. Provide hotlines and clear escalation cues\n' +
          '2. Offer counseling/medical referral options\n' +
          '3. Schedule periodic check-ins via channel\n' +
          '4. Maintain monitoring flag for new intel',
        sexual:
          'MONITOR SITUATION (Anonymous).\n' +
          '1. Log concerns; share WCPU access info discreetly\n' +
          '2. Provide safety and evidence-preservation guidance\n' +
          '3. Keep line open; encourage details when safe\n' +
          '4. Elevate if corroborated by new reports\n' +
          '5. Refresh advice as facts update',
        physical:
          'MONITOR SITUATION (Anonymous).\n' +
          '1. Record report; keep index of time/place cues\n' +
          '2. Share safety planning resources\n' +
          '3. Maintain channel; send reminder check-in\n' +
          '4. Escalate to WCPD upon new risk indicators\n' +
          '5. Prepare info pack for immediate use',
        psychological:
          'MONITOR SITUATION (Anonymous).\n' +
          '1. Log threats/harassment themes\n' +
          '2. Provide MH/crisis lines and stalking safety tips\n' +
          '3. Keep channel open; recheck in 3–5 days\n' +
          '4. Escalate if threats become specific/credible\n' +
          '5. Update safety script as needed',
        economic:
          'MONITOR SITUATION (Anonymous).\n' +
          '1. Note needs; send directory of aid with low ID requirements\n' +
          '2. Encourage safe follow-up; maintain confidentiality\n' +
          '3. Recheck in one week for changes\n' +
          '4. Escalate if minors/neglect indicators surface\n' +
          '5. Keep channel open for immediate activation'
      }
    }
  };

  const defaultResponse =
    'Review case using barangay VAW Desk protocol. Document, assess risk, offer referrals (medical/psychosocial/legal), and assign a case officer for follow-up.';

  // Normalize incidentType to a canonical key for lookup (Emergency).
  const itKey = it && it.includes('emergency') ? 'emergency' : it;
  try {
    const bucket = (solutions[vt] && solutions[vt][risk]) ? solutions[vt][risk] : null;
    if (!bucket) return defaultResponse;
    return bucket[itKey] || bucket[it] || bucket['emergency'] || bucket['physical'] || defaultResponse;
  } catch (e) {
    return defaultResponse;
  }
}


function synthesizeProbabilities(incidentType, storedRisk) {
  // Map incidentType to index: Economic, Psychological, Physical, Sexual
  const canonical = ['Economic', 'Psychological', 'Physical', 'Sexual'];
  let idx = canonical.indexOf((incidentType || '').toString());
  if (idx === -1) idx = 0;

  // Base confidence by storedRisk
  let strength = 0.5;
  if (storedRisk === 'High') strength = 0.9;
  else if (storedRisk === 'Medium') strength = 0.6;
  else if (storedRisk === 'Low') strength = 0.25;

  const base = (1 - strength) / 3;
  return canonical.map((c, i) => (i === idx ? strength : base));
}

function normalizeStoredRisk(r) {
  if (!r) return null;
  const s = String(r).toLowerCase();
  if (s === 'low') return 'Low';
  if (s === 'medium') return 'Medium';
  if (s === 'high') return 'High';
  return null;
}

// --- Machine Learning Integration ---
let mlModel = null;
let lastTrainingTime = null;

// Text preprocessing for ML
function preprocessText(text) {
  if (!text) return new Array(20).fill(0);
  const keywords = {
    violence: ['hit', 'beat', 'punch', 'kick', 'hurt', 'force'],
    threat: ['threat', 'kill', 'die', 'afraid', 'scared', 'fear'],
    sexual: ['rape', 'touch', 'molest', 'assault', 'harass'],
    weapon: ['knife', 'gun', 'weapon', 'hurt', 'kill'],
    emergency: ['help', 'emergency', 'immediate', 'now', 'urgent'],
    severity: ['severe', 'serious', 'critical', 'extreme', 'dangerous'],
    // Tagalog keywords
    violenceTagalog: ['sinaktan', 'binugbog', 'sinampal', 'sinuntok', 'sinakal'],
    threatTagalog: ['papatayin', 'takot', 'bantaan', 'karahasan'],
    sexualTagalog: ['ginahasa', 'hinipuan', 'sekswal', 'hinubaran'],
    emergencyTagalog: ['tulong', 'agad', 'delikado', 'emergency']
  };

  const textLower = text.toLowerCase();
  const features = [];
  
  // Count keyword occurrences for each category
  Object.values(keywords).forEach(kwList => {
    const count = kwList.reduce((acc, kw) => 
      acc + (textLower.split(kw).length - 1), 0);
    features.push(Math.min(count, 5) / 5); // Normalize to [0,1]
  });

  // Add text length feature
  features.push(Math.min(text.length / 1000, 1));
  
  // Pad to fixed length
  while (features.length < 20) features.push(0);
  return features;
}

async function buildAndTrainModel(samples, labels) {
  if (!tf) throw new Error('TensorFlow is not available');
  
  // More sophisticated model architecture
  const model = tf.sequential();
  
  // Input layer with text features and categorical features
  model.add(tf.layers.dense({
    inputShape: [samples[0].length],
    units: 64,
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
  }));
  
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  // Hidden layers
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
  }));
  
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  // Output layer for risk levels
  model.add(tf.layers.dense({
    units: 3, // Low, Medium, High
    activation: 'softmax'
  }));
  
  // Compile with class weights to handle imbalanced data
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  // Convert data to tensors
  const xs = tf.tensor2d(samples);
  const ys = tf.oneHot(tf.tensor1d(labels, 'int32'), 3); // One-hot encode 3 risk levels
  
  // Train with early stopping
  const history = await model.fit(xs, ys, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: tf.callbacks.earlyStopping({
      monitor: 'val_loss',
      patience: 5
    })
  });
  
  return { model, history };
}

async function trainModelFromCases(minSamples = 50) {
  // Get historical cases
  const docs = await Cases.find({
    riskLevel: { $exists: true },
    description: { $exists: true }
  }).limit(1000).lean();
  
  if (!docs || docs.length < minSamples) {
    console.log(`Not enough samples for training (${docs?.length || 0} < ${minSamples})`);
    return null;
  }

  const samples = [];
  const labels = [];

  docs.forEach(d => {
    // Text features from description
    const textFeatures = preprocessText(d.description);
    
    // Categorical and numerical features
    const incidentTypeVec = incidentTypeToOneHot(d.incidentType);
    const victimTypeVec = victimTypeToOneHot(d.victimType);
    const status = d.status === 'Open' ? 1 : 0;
    const hasLocation = d.location ? 1 : 0;
    const hasEvidence = d.evidenceUrls?.length > 0 ? 1 : 0;
    const timeOfDay = d.createdAt ? new Date(d.createdAt).getHours() / 24 : 0.5;
    
    // Combine all features
    const features = [
      ...textFeatures,
      ...incidentTypeVec,
      ...victimTypeVec,
      status,
      hasLocation,
      hasEvidence,
      timeOfDay
    ];
    
    samples.push(features);
    
    // Convert risk level to numeric label
    const riskMap = { Low: 0, Medium: 1, High: 2 };
    labels.push(riskMap[d.riskLevel] || 0);
  });

  try {
    const { model, history } = await buildAndTrainModel(samples, labels);
    mlModel = model;
    lastTrainingTime = new Date().toISOString();
    
    return {
      model: mlModel,
      sampleCount: samples.length,
      lastTrainedAt: lastTrainingTime,
      accuracy: history.history.acc[history.history.acc.length - 1],
      valAccuracy: history.history.val_acc[history.history.val_acc.length - 1]
    };
  } catch (error) {
    console.error('Error training model:', error);
    return null;
  }
}

function incidentTypeToOneHot(type) {
  const types = ['Economic', 'Psychological', 'Physical', 'Sexual', 'Other'];
  const idx = types.indexOf(type);
  return types.map((t, i) => (i === idx ? 1 : 0));
}

function riskLabelToIndex(label) {
  const canonical = ['Economic', 'Psychological', 'Physical', 'Sexual'];
  if (label && canonical.includes(label)) return canonical.indexOf(label);
  return 0; // default to Economic (lowest risk)
}

// Convert victim type to one-hot encoding
function victimTypeToOneHot(type) {
  const types = ['child', 'woman', 'anonymous'];
  const normalized = normalizeVictimType(type);
  return types.map(t => t === normalized ? 1 : 0);
}

// --- Main suggestion logic ---
async function suggestForCase(payload = {}, modelObj = null) {
  console.log('DSS Input:', payload);
  
  const victimType = normalizeVictimType(payload.victimType || payload.victimCategory || payload.victim);
  console.log('Normalized victim type:', victimType);
  
  // Keep track of original incident type
  const originalIncidentType = payload.incidentType;
  
  // Detect severity from description keywords
  const severity = detectSeverityFromKeywords(payload.description, payload.incidentType);
  console.log('Detected severity:', severity);
  
  // Check if this is a manual risk level override
  const isManualOverride = !!payload.riskLevel;
  
  // Get base risk from incident type, considering manual override
  const baseRisk = mapIncidentToBaseRisk(payload.incidentType, severity, payload.riskLevel);
  console.log('Base risk:', baseRisk);
  
  // Adjust for victim type (children get higher risk), respecting manual override
  // Use `let` because ML prediction logic below may update this value conditionally
  let adjustedRisk = adjustRiskForVictimType(baseRisk, victimType, payload.incidentType, isManualOverride);
  console.log('Adjusted risk:', adjustedRisk);
  
  // (defer suggestion lookup until we've attempted to resolve victim type from DB)
  
  // ML-enhanced risk assessment
  let mlPrediction = null;
  let confidence = 0;
  
  if (mlModel && tf) {
    try {
      // Prepare features for ML model
      const textFeatures = preprocessText(payload.description);
      const incidentTypeVec = incidentTypeToOneHot(payload.incidentType);
      const victimTypeVec = victimTypeToOneHot(victimType);
      const status = 1; // New case
      const hasLocation = payload.location ? 1 : 0;
      const hasEvidence = payload.evidenceUrls?.length > 0 ? 1 : 0;
      const timeOfDay = new Date().getHours() / 24;
      
      const features = [
        ...textFeatures,
        ...incidentTypeVec,
        ...victimTypeVec,
        status,
        hasLocation,
        hasEvidence,
        timeOfDay
      ];
      
      // Guard ML execution to avoid unexpected runtime errors
      try {
        const prediction = mlModel.predict(tf.tensor2d([features]));
        const probs = Array.from(prediction.dataSync());
        
        // Map probabilities to risk levels
        const riskLevels = ['Low', 'Medium', 'High'];
        const maxProb = Math.max(...probs);
        const maxIndex = probs.indexOf(maxProb);
        
        mlPrediction = riskLevels[maxIndex];
        confidence = maxProb;

        // Blend ML prediction with rule-based assessment
        if (confidence > 0.8) {
          // High confidence ML prediction
          if (victimType === 'child') {
            // For children, take the higher risk level
            adjustedRisk = ['Low', 'Medium', 'High'].indexOf(mlPrediction) >
                          ['Low', 'Medium', 'High'].indexOf(adjustedRisk) ?
                          mlPrediction : adjustedRisk;
          } else {
            // For others, use ML prediction with high confidence
            adjustedRisk = mlPrediction;
          }
        }
      } catch (mlErr) {
        // Log ML-specific errors but continue processing with rule-based values
        console.warn('DSS ML prediction failed, falling back to rules:', mlErr && mlErr.message ? mlErr.message : mlErr);
      }
      // If confidence is low or ML failed, stick with rule-based assessment
    } catch (error) {
      console.error('DSS feature-prep error:', error);
      // Continue with rule-based assessment
    }
  }
  
  // Calculate probabilities for the risk levels
  const probs = synthesizeProbabilities(payload.incidentType, adjustedRisk);

  // Format incident type to Title Case (match rule values like 'Psychological')
  const formattedIncidentType = payload.incidentType ? (
    payload.incidentType.split(/\s+/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ')
  ) : '';
  
  // Handle immediate assistance probability based on risk level and manual override
  let immediateProb = 0;
  
  if (isManualOverride) {
    // For manual override, set probability based on the risk level
    switch(adjustedRisk.toLowerCase()) {
      case 'high': immediateProb = 1.0; break;
      case 'medium': immediateProb = 0.5; break;
      case 'low': immediateProb = 0.2; break;
      default: immediateProb = 0;
    }
  } else {
    // Calculate immediate probability in a way that depends on the incident type
    // so an Economic case does not become immediate just because physical/sexual probabilities
    // have non-zero base values. Use the probability for the reported incidentType and
    // for special handling of Physical/Sexual/Emergency keep the original aggregation.
    const canonical = ['Economic', 'Psychological', 'Physical', 'Sexual'];
    const it = (payload.incidentType || '').toString();
    const itIndex = canonical.indexOf(it);

    if (['Physical', 'Sexual', 'Emergency'].includes(it)) {
      // For high-severity incident types, consider combined probability of physical/sexual
      immediateProb = (probs[2] || 0) + (probs[3] || 0) + (adjustedRisk === 'High' ? 0.3 : 0);
    } else if (itIndex >= 0) {
      // Use the probability for the specific incident type
      immediateProb = (probs[itIndex] || 0) + (adjustedRisk === 'High' ? 0.3 : 0);
    } else {
      // Fallback: conservative mix
      immediateProb = (probs[2] || 0) + (probs[3] || 0) + (adjustedRisk === 'High' ? 0.3 : 0);
    }
  }
  
  // Adjust for children, but respect manual override.
  // Do NOT apply the child immediate-probability floor for Economic or Psychological incident types
  const incidentLower = (formattedIncidentType || '').toLowerCase();
  const childImmediateAllowed = victimType === 'child' && !isManualOverride && !['economic', 'psychological'].includes(incidentLower);
  const finalImmediateProb = childImmediateAllowed ? Math.max(immediateProb, 0.6) : immediateProb;
  
  // Initialize rules engine and evaluate rules
  const { initEngine, evaluateRules } = require('./rulesEngine');
  initEngine(); // Make sure engine is initialized with current rules

  // Prepare facts with proper case for victimType and incidentType
  // If victimType wasn't provided, but we have a victimId, try to resolve it from the Victims model
  let resolvedVictimType = victimType;
  if ((!resolvedVictimType || resolvedVictimType === 'anonymous') && (payload.victimID || payload.victimId)) {
    try {
      const VictimModel = require('../models/Victims');
      const vid = payload.victimID || payload.victimId;
      let v = null;
      if (vid && v === null) {
        try {
          // try ObjectId lookup first
          if (v === null && vid && vid.length === 24) v = await VictimModel.findById(vid).lean();
        } catch (e) { /* ignore */ }
      }
      if (!v) {
        try { v = await VictimModel.findOne({ victimID: vid }).lean(); } catch (e) { /* ignore */ }
      }
      if (v && v.victimType) resolvedVictimType = normalizeVictimType(v.victimType);
    } catch (e) {
      // ignore lookup errors - keep resolvedVictimType as-is
      console.warn('Failed to resolve victim type from Victims model', e && e.message);
    }
  }

  const vtForRules = resolvedVictimType === 'child' ? 'Child' : 
                    resolvedVictimType === 'woman' ? 'Woman' : 'Anonymous';
  
  // Create facts object with all necessary information
  const facts = {
    victimType: vtForRules,
    victimId: payload.victimID || payload.victimId || null,
    incidentType: formattedIncidentType,
    description: payload.description || '',
    descriptionLower: (payload.description || '').toLowerCase(),
    severity,
    injuries: severity === 'High',
    manualRiskLevel: isManualOverride ? adjustedRisk : null,
    recentReports: 0 // This will be calculated by the rules engine
  };

  console.log('Evaluating DSS rules with facts:', facts);
  
  // Get appropriate suggestion based on risk level and incident type
  // Pass the flat facts object (rules engine expects top-level facts)
  const ruleResult = await evaluateRules(facts);

  console.log('Rule evaluation result:', {
    matched: ruleResult.matched,
    eventsTriggered: ruleResult.events ? ruleResult.events.length : 0,
    firstEvent: ruleResult.events && ruleResult.events.length > 0 ? ruleResult.events[0].type : null
  });

  // Get specific solution-focused suggestion from detailed suggestions map
  // Use resolvedVictimType (may have been fetched from Victims model) to pick the correct bucket
  const finalSuggestion = getSolutionSuggestion(adjustedRisk, payload.incidentType, resolvedVictimType || victimType);

  // Return object with proper handling of incident type and risk level
  // Build human-readable explanations for the probability vector (keeps numeric array in `dssProbabilities`)
  const canonicalTypes = ['Economic', 'Psychological', 'Physical', 'Sexual'];
  const dssProbabilitiesExplanation = canonicalTypes.map((label, i) => ({
    label,
    probability: Number((probs[i] || 0).toFixed(3)),
    description: `Estimated probability the case involves ${label.toLowerCase()} harm based on rule-based and heuristic analysis.`,
    recommendedAction: label === 'Sexual' || label === 'Physical' ? 'Prioritize immediate safety and medical/legal referral' : 'Provide counseling/support and monitor for escalation'
  }));

  // Build a concise, unambiguous response object (avoid duplicate keys)
  const response = {
    predictedRisk: originalIncidentType || 'Unknown',
    incidentType: originalIncidentType,
    riskLevel: adjustedRisk,
    mlPrediction: mlPrediction ? { risk: mlPrediction, confidence } : null,

    // DSS fields that map to database/case schema
    dssPredictedRisk: originalIncidentType || 'Unknown',
    dssStoredRisk: adjustedRisk,
    dssProbabilities: probs,
    dssProbabilitiesExplanation,
    dssImmediateAssistanceProbability: finalImmediateProb,
    dssSuggestion: finalSuggestion || 'Review the report and coordinate with MSWD or PNP-WCPD for proper intervention and documentation.',
    dssRuleMatched: ruleResult.matched,
  // dssChosenRule will be set below after selecting an authoritative event
    dssManualOverride: !!payload.riskLevel,

    // API-friendly fields
    suggestion: finalSuggestion || 'Review the report and coordinate with MSWD or PNP-WCPD for proper intervention and documentation.',
    requiresImmediateAssistance: isManualOverride ? (adjustedRisk === 'High') : (finalImmediateProb >= 0.5 || adjustedRisk === 'High'),
    ruleDetails: ruleResult.matched && ruleResult.events.length > 0 ? ruleResult.events[0] : null,
    severity,
    victimType: resolvedVictimType || victimType,
  };

  // Choose a single authoritative rule event from any matched events.
  // Prefer non-fallback events (rule types that do NOT include 'fallback') so that
  // specific keyword/escalation rules override generic fallbacks when both match.
  const allEvents = Array.isArray(ruleResult.events) ? ruleResult.events : [];
  let chosenEvent = null;
  if (allEvents.length > 0) {
    // Prefer the first event whose type does not include 'fallback'
    chosenEvent = allEvents.find(e => {
      try { return !String(e.type || '').toLowerCase().includes('fallback'); } catch (e) { return true; }
    }) || allEvents[0];
  }

  // Attach both the primary chosen rule and the full events list for auditing
  response.dssChosenRule = chosenEvent || null;
  response.ruleDetails = chosenEvent || null;
  response.dssAllMatchedRules = allEvents;

  // Compute detectionMethod for clarity in the UI (deterministic, no 'unknown')
  let detectionMethod = 'heuristic';
  if (isManualOverride) {
    detectionMethod = 'manual_override';
  } else if (mlPrediction && typeof confidence === 'number' && confidence > 0.8) {
    detectionMethod = `ml_high_confidence:${mlPrediction}`;
  } else if (chosenEvent) {
    // Use the selected authoritative event (chosenEvent) rather than the raw first event
    detectionMethod = `rule_engine:${chosenEvent.type}`;
  } else if (payload && payload.description && payload.description.length > 0) {
    // If we have text but no rules/ML/manual, it's likely keyword/heuristic based
    detectionMethod = 'heuristic';
  } else {
    detectionMethod = 'heuristic';
  }
  response.detectionMethod = detectionMethod;

  // Recompute explicit immediate-assistance decision now that we know the
  // authoritative rule (chosenEvent) and detection method. This lets rules
  // that explicitly require immediate action take precedence and prevents
  // medium-confidence heuristic probabilities from automatically forcing an
  // "immediate" label (e.g. Psychological: Medium should not always be immediate).
  // Priority order:
  // 1. Manual override -> immediate only if override is High
  // 2. If chosen rule explicitly requires immediate -> immediate
  // 3. Otherwise require a higher probability threshold to count as immediate
  //    (use 0.75 to avoid Medium risk being classified as immediate by default)
  let requiresImmediate = false;
  if (isManualOverride) {
    requiresImmediate = (adjustedRisk === 'High');
  } else if (response.dssChosenRule && response.dssChosenRule.params && response.dssChosenRule.params.requiresImmediate) {
    requiresImmediate = true;
  } else {
    // Use a stricter threshold for automatic immediate classification
    const IMMEDIATE_THRESHOLD = 0.75;
    requiresImmediate = (finalImmediateProb >= IMMEDIATE_THRESHOLD) || (adjustedRisk === 'High');
  }

  response.requiresImmediateAssistance = requiresImmediate;

  return response;
}

// Retrain model periodically or on demand
async function ensureModelTrained(force = false) {
  const TRAINING_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  
  if (force || !mlModel || !lastTrainingTime || 
      (new Date() - new Date(lastTrainingTime)) > TRAINING_INTERVAL) {
    return await trainModelFromCases();
  }
  return null;
}

module.exports = { trainModelFromCases, suggestForCase };
