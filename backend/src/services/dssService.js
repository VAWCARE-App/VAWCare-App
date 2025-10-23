const fs = require('fs');
const path = require('path');
let tf = null;
try {
  tf = require('@tensorflow/tfjs');
  // Use debug logging controlled by DSS_DEBUG env var
  const dssDebug = !!(process.env.DSS_DEBUG && String(process.env.DSS_DEBUG).toLowerCase() !== 'false');
  function dlog(...args) { if (dssDebug) console.log(...args); }
  dlog('Using @tensorflow/tfjs (pure JS) for DSS');
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

// Calculate retraction probability based on cancelled cases and alerts
async function calculateRetractionProbability(victimId) {
  console.log('Calculating retraction probability for victim:', victimId);
  if (!victimId) {
    console.log('No victimId provided for retraction analysis');
    return null;
  }
  
  try {
    // First try to find the victim to get their ObjectId
    const Victims = require('../models/Victims');
    let victim = null;
    
    try {
      // Try finding by victimID string first
      victim = await Victims.findOne({ victimID: victimId }).exec();
      if (!victim && victimId.length === 24) {
        // If not found and victimId looks like an ObjectId, try finding by _id
        victim = await Victims.findById(victimId).exec();
      }
    } catch (e) {
      console.warn('Error finding victim:', e);
    }

    const victimObjectId = victim?._id || victimId;
    const Cases = require('../models/Cases');
    const Alert = require('../models/Alert');
    
    // Get counts of cancelled cases and alerts for this victim
    const cancelledCases = await Cases.countDocuments({
      $or: [
        { victimID: victimObjectId },
        { victimID: victimId }
      ],
      status: { $in: ['Cancelled', 'Canceled'] }
    });
    
    const cancelledAlerts = await Alert.countDocuments({
      $or: [
        { victimID: victimObjectId },
        { victimID: victimId }
      ],
      status: { $in: ['Cancelled', 'Canceled'] }
    });

    // Calculate probability and generate suggestion
    console.log('Found cancelled counts:', { cancelledCases, cancelledAlerts });
    
    const suggestion = {
      cancelledCases,
      cancelledAlerts,
      hasRetractionPattern: false,
      retractionRisk: 'Low',
      suggestion: ''
    };

    // Logic for determining retraction patterns
    if (cancelledCases >= 3 && cancelledAlerts >= 3) {
      suggestion.hasRetractionPattern = true;
      suggestion.retractionRisk = 'High';
      suggestion.suggestion = 'CRITICAL: Victim demonstrates a consistent pattern of both case and alert retractions. This strongly indicates potential external pressures or barriers preventing case progression. Immediate intervention recommended:\n\n' +
        '1. Schedule urgent counseling session\n' +
        '2. Assess potential safety concerns or external pressures\n' +
        '3. Consider assigning a dedicated support officer\n' +
        '4. Evaluate need for protective measures';
    } else if (cancelledCases >= 3) {
      suggestion.hasRetractionPattern = true;
      suggestion.retractionRisk = 'High';
      suggestion.suggestion = 'WARNING: Multiple case retractions detected. This pattern suggests serious underlying issues that need attention:\n\n' +
        '1. Review case withdrawal reasons\n' +
        '2. Assess potential intimidation or pressure\n' +
        '3. Consider enhanced victim support services\n' +
        '4. Schedule follow-up counseling sessions';
    } else if (cancelledAlerts >= 3) {
      suggestion.hasRetractionPattern = true;
      suggestion.retractionRisk = 'High';
      suggestion.suggestion = 'ALERT: Multiple emergency alerts have been cancelled. This could indicate:\n\n' +
        '1. Possible coercion to cancel alerts\n' +
        '2. Need for safe communication channels\n' +
        '3. Review of emergency response procedures\n' +
        '4. Safety planning assessment needed\n' +
        '5. Check whether alerts were accidental or exploratory (for example, testing or "playing" with the alert feature). Verify circumstances before assuming coercion and escalating.';
    } else if (cancelledCases >= 2 && cancelledAlerts >= 2) {
      suggestion.hasRetractionPattern = true;
      suggestion.retractionRisk = 'Medium';
      suggestion.suggestion = 'CAUTION: Pattern of both case and alert cancellations observed. Recommended actions:\n\n' +
        '1. Schedule support consultation\n' +
        '2. Review case withdrawal reasons\n' +
        '3. Assess victim support needs\n' +
        '4. Consider preventive measures';
    } else if (cancelledCases >= 2) {
      suggestion.hasRetractionPattern = true;
      suggestion.retractionRisk = 'Medium';
      suggestion.suggestion = 'NOTE: Multiple case withdrawals observed. Consider:\n\n' +
        '1. Follow-up consultation\n' +
        '2. Review support services effectiveness\n' +
        '3. Assess any barriers to case completion';
    } else if (cancelledAlerts >= 2) {
      suggestion.hasRetractionPattern = true;
      suggestion.retractionRisk = 'Medium';
      suggestion.suggestion = 'NOTE: Multiple cancelled alerts detected. Recommended steps:\n\n' +
        '1. Review alert cancellation reasons\n' +
        '2. Verify alert system effectiveness\n' +
        '3. Assess if additional support is needed\n' +
        '4. Consider whether some cancellations were accidental or part of user experimentation/testing and confirm context before drawing conclusions.';
    }

    return suggestion;
  } catch (error) {
    console.error('Error calculating retraction probability:', error);
    return null;
  }
}

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


async function synthesizeProbabilities(incidentType, storedRisk, options = {}) {
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
  // start with base distribution
  let probs = canonical.map((c, i) => (i === idx ? strength : base));

  // If options request DB-aware synthesis, consider historical cancellations
  try {
    const dssDebug = !!(process.env.DSS_DEBUG && String(process.env.DSS_DEBUG).toLowerCase() !== 'false');
    // Lookback window (ms) for counting cancellations (default 365 days)
    const lookbackMs = Number.isFinite(parseInt(process.env.DSS_CANCEL_LOOKBACK_MS, 10)) ? parseInt(process.env.DSS_CANCEL_LOOKBACK_MS, 10) : (365 * 24 * 60 * 60 * 1000);
    const since = new Date(Date.now() - lookbackMs);

    let canceledCases = 0;
    let canceledAlerts = 0;

    // Prefer victim-scoped counts when a victimId is provided. If not available,
    // fallback to incidentType-scoped counts (still informative).
    if (options && (options.victimId || options.victimID)) {
      const vid = options.victimId || options.victimID;
      try {
        canceledCases = await Cases.countDocuments({ victimID: vid, status: 'Canceled', updatedAt: { $gte: since } }).exec();
      } catch (e) {
        if (dssDebug) console.warn('synthesizeProbabilities: Cases count failed', e && e.message);
      }
      try {
        const AlertModel = require('../models/Alert');
        canceledAlerts = await AlertModel.countDocuments({ victimId: vid, status: 'Cancelled', updatedAt: { $gte: since } }).exec();
      } catch (e) {
        if (dssDebug) console.warn('synthesizeProbabilities: Alert count failed', e && e.message);
      }
    } else {
      // Fallback by incidentType
      try {
        canceledCases = await Cases.countDocuments({ incidentType: incidentType, status: 'Canceled', updatedAt: { $gte: since } }).exec();
      } catch (e) {
        if (dssDebug) console.warn('synthesizeProbabilities: Cases (by type) count failed', e && e.message);
      }
      try {
        const AlertModel = require('../models/Alert');
        canceledAlerts = await AlertModel.countDocuments({ incidentType: incidentType, status: 'Cancelled', updatedAt: { $gte: since } }).exec();
      } catch (e) {
        if (dssDebug) console.warn('synthesizeProbabilities: Alert (by type) count failed', e && e.message);
      }
    }

    if (dssDebug) dlog && dlog('Cancellation signals:', { canceledCases, canceledAlerts });

    // Apply heuristic boosts if cancellation thresholds are met.
    // - If the victim (or incidentType) has >=2 cancelled cases -> boost the reported type
    // - If the victim (or incidentType) has >=3 cancelled alerts -> boost the reported type
    const CANCEL_CASES_THRESHOLD = Number.isFinite(parseInt(process.env.DSS_CANCEL_CASES_THRESHOLD, 10)) ? parseInt(process.env.DSS_CANCEL_CASES_THRESHOLD, 10) : 2;
    const CANCEL_ALERTS_THRESHOLD = Number.isFinite(parseInt(process.env.DSS_CANCEL_ALERTS_THRESHOLD, 10)) ? parseInt(process.env.DSS_CANCEL_ALERTS_THRESHOLD, 10) : 3;
    const BOOST_AMOUNT = Number.isFinite(parseFloat(process.env.DSS_CANCEL_BOOST)) ? parseFloat(process.env.DSS_CANCEL_BOOST) : 0.15;

    const targetIdx = canonical.indexOf((incidentType || '').toString());
    const boostIdx = targetIdx >= 0 ? targetIdx : 0;

    if (canceledCases >= CANCEL_CASES_THRESHOLD) {
      probs[boostIdx] = Math.min(1, probs[boostIdx] + BOOST_AMOUNT);
    }
    if (canceledAlerts >= CANCEL_ALERTS_THRESHOLD) {
      probs[boostIdx] = Math.min(1, probs[boostIdx] + BOOST_AMOUNT);
    }

    // Normalize to sum to 1
    const sum = probs.reduce((a, b) => a + b, 0) || 1;
    probs = probs.map(p => Math.max(0, Math.min(1, p / sum)));
  } catch (err) {
    // If anything went wrong with DB checks, silently fall back to base distribution
    // Debug-only logging
    if (process.env.DSS_DEBUG && String(process.env.DSS_DEBUG).toLowerCase() !== 'false') {
      console.warn('synthesizeProbabilities: DB-aware adjustment failed', err && err.message);
    }
  }

  return probs;
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

async function trainModelFromCases(minSamples = 20) {
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
  dlog('DSS Input:', payload);

  // Get retraction analysis if we have a victim ID
  const retractionAnalysis = await calculateRetractionProbability(payload.victimId);
  
  const victimType = normalizeVictimType(payload.victimType || payload.victimCategory || payload.victim);
  dlog('Normalized victim type:', victimType);
  
  // Keep track of original incident type
  const originalIncidentType = payload.incidentType;
  
  // Detect severity from description keywords
  const severity = detectSeverityFromKeywords(payload.description, payload.incidentType);
  dlog('Detected severity:', severity);
  
  // Check if this is a manual risk level override
  const isManualOverride = !!payload.riskLevel;
  
  // Get base risk from incident type, considering manual override
  const baseRisk = mapIncidentToBaseRisk(payload.incidentType, severity, payload.riskLevel);
  dlog('Base risk:', baseRisk);
  
  // Adjust for victim type (children get higher risk), respecting manual override
  // Use `let` because ML prediction logic below may update this value conditionally
  let adjustedRisk = adjustRiskForVictimType(baseRisk, victimType, payload.incidentType, isManualOverride);
  dlog('Adjusted risk:', adjustedRisk);
  
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
  
  // Calculate probabilities for the risk levels (DB-aware: include cancellation history)
  const probs = await synthesizeProbabilities(payload.incidentType, adjustedRisk, { victimId: payload.victimId || payload.victimID });

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
    manualRiskLevel: isManualOverride ? adjustedRisk : null,
    recentReports: 0 // This will be calculated by the rules engine
  };

  dlog('Evaluating DSS rules with facts:', facts);
  
  // Get appropriate suggestion based on risk level and incident type
  // Pass the flat facts object (rules engine expects top-level facts)
  const ruleResult = await evaluateRules(facts);

  dlog('Rule evaluation result:', {
    matched: ruleResult.matched,
    eventsTriggered: ruleResult.events ? ruleResult.events.length : 0,
    firstEvent: ruleResult.events && ruleResult.events.length > 0 ? ruleResult.events[0].type : null
  });

  // Get specific solution-focused suggestion from detailed suggestions map
  // Use resolvedVictimType (may have been fetched from Victims model) to pick the correct bucket
  const finalSuggestion = getSolutionSuggestion(adjustedRisk, payload.incidentType, resolvedVictimType || victimType);

  // Return object with proper handling of incident type and risk level
  // Build a concise, unambiguous response object (avoid duplicate keys)
  const response = {
    predictedRisk: originalIncidentType || 'Unknown',
    incidentType: originalIncidentType,
    riskLevel: adjustedRisk,
    mlPrediction: mlPrediction ? { risk: mlPrediction, confidence } : null,

    // DSS fields that map to database/case schema
    dssPredictedRisk: originalIncidentType || 'Unknown',
    dssStoredRisk: adjustedRisk,
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
    retractionAnalysis, // Include retraction probability analysis
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

// Helper to compute since/until based on options.range
function computeSinceUntil(options = {}) {
  const now = new Date();
  const range = options.range || (options.useCurrentMonth ? 'current' : null);
  let since = null;
  let until = null;

  if (range === 'current') {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
    until = null;
  } else if (range === 'previous') {
    // previous calendar month
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    since = prev;
    until = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'last2') {
    // previous + current month compiled as one
    since = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    until = null;
  } else if (range === 'all') {
    since = new Date(0);
    until = null;
  } else {
    // fallback to lookbackDays behavior
    const lookbackDays = Number.isFinite(parseInt(options.lookbackDays, 10)) ? parseInt(options.lookbackDays, 10) : 30;
    since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    until = null;
  }

  return { since, until };
}

// Suggest insights for the Cases insights page (moved from frontend)
async function suggestForCasesInsights(options = {}) {
  try {
    // options can include lookbackDays, minSpikeFactor, victimId, incidentType
    const { since, until } = computeSinceUntil(options);
    const CasesModel = require('../models/Cases');
    const query = since ? { createdAt: { $gte: since } } : {};
    if (until) query.createdAt.$lt = until;
    const docs = await CasesModel.find(query).lean().exec();

  const insights = [];
  const total = docs.length;
  const sampleSize = total;
  const lowSample = sampleSize < 5; // consider small samples when <5 records
  const sampleNote = lowSample ? ` (small sample: ${sampleSize} records — interpret with caution)` : '';
    const open = docs.filter(d => d.status === 'Open').length;
    const resolved = docs.filter(d => d.status === 'Resolved').length;
    const cancelled = docs.filter(d => d.status === 'Cancelled' || d.status === 'Canceled').length;

    // Trend data by date
    const counts = {};
    docs.forEach(d => {
      const date = new Date(d.createdAt).toISOString().slice(0,10);
      counts[date] = (counts[date] || 0) + 1;
    });
    const trend = Object.entries(counts).map(([date,count]) => ({ date, count }));

    // For the 'current' range, compute month-over-month counts directly and
    // emit an Increase in Cases insight when the current calendar month has
    // more cases than the previous calendar month. This avoids relying on
    // short-term daily spikes which may not appear for small samples.
    if (options.range === 'current') {
      try {
        const CasesModel = require('../models/Cases');
        const now = new Date();
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthCount = await CasesModel.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: curMonthStart } }).exec();
        const curMonthCount = await CasesModel.countDocuments({ createdAt: { $gte: curMonthStart } }).exec();

        if (curMonthCount > prevMonthCount) {
          let percent = null;
          let percentBasis = 'monthly';
          let deltaCount = null;
          if (prevMonthCount > 0) {
            deltaCount = (curMonthCount - prevMonthCount);
            percent = (deltaCount / prevMonthCount) * 100;
          } else {
            // fallback to daily basis using the trend if the previous month had 0
            const last7 = trend.slice(-7);
            const last = last7.length >= 1 ? last7[last7.length - 1].count : 0;
            const prev = last7.length >= 2 ? last7[last7.length - 2].count || 0 : 0;
            deltaCount = (last - prev);
            percent = ((last - prev) / (prev || 1)) * 100;
            percentBasis = 'daily';
          }

          insights.push({
            label: 'Increase in Cases',
            value: percent,
            type: 'warning',
            message: `There has been a recent jump in cases (increase of ${deltaCount} ${percentBasis === 'monthly' ? 'cases month-over-month' : 'cases day-over-day'}; ${Math.round(percent)}%).${sampleNote}`,
            message_tl: `May biglang pagtaas ng mga kaso (tumaas ng ${deltaCount} ${percentBasis === 'monthly' ? 'kaso buwan-sa-buwan' : 'kaso araw-sa-araw'}; ${Math.round(percent)}%).${sampleNote}`,
            details: { prevMonthCount, curMonthCount, percentBasis, deltaCount },
            recommendations: [
              'Identify geographic or time-based hotspots and prioritize patrols/visits.',
              'Temporarily increase staff presence in affected areas.',
              'Coordinate with partner agencies if multiple cases point to the same issue.'
            ],
            recommendations_tl: [
              'Tukuyin ang mga hotspot base sa lokasyon/oras at unahin ang outreach/patrol.',
              'Pansamantalang dagdagan ang presensya ng staff sa mga apektadong lugar.',
              'Makipag-coordinate sa mga partner agencies kung maraming kaso ang tumuturo sa parehong isyu.'
            ]
          });
        }
      } catch (e) {
        // Don't let insight generation crash the whole suggestions flow
        console.warn('suggestForCasesInsights: monthly comparison failed', e && e.message);
      }
    }


  // Active ratio
    const activeRatio = (open / (total || 1)) * 100;
    if (lowSample) {
      insights.push({
        label: 'Active Case Ratio',
        value: activeRatio,
        type: 'info',
        message: `About ${Math.round(activeRatio)}% of cases are still open.${sampleNote}`,
        message_tl: `Tinatayang ${Math.round(activeRatio)}% ng mga kaso ay nananatiling bukas.${sampleNote}`,
        recommendations: [
          'Review open cases and prioritize simple closures where possible.'
        ],
        recommendations_tl: [
          'Suriin ang mga bukas na kaso at unahin ang mabilis na pagsasara kung maaari.'
        ]
      });
    } else {
      insights.push({
        label: 'Active Case Ratio',
        value: activeRatio,
        type: activeRatio > 50 ? 'error' : activeRatio > 25 ? 'warning' : 'success',
        message: `About ${Math.round(activeRatio)}% of cases are still open. Try to close simple cases quickly and reassign difficult cases to experienced staff.`,
        message_tl: `Tinatayang ${Math.round(activeRatio)}% ng mga kaso ay nananatiling bukas. Sikaping isara agad ang mga simpleng kaso at i-reassign ang mahihirap na kaso sa mga may karanasan.`,
        recommendations: [
          'Review open cases and mark low-complexity ones for quick closure.',
          'Reassign complex cases to senior staff and set target resolution dates.',
          'Use daily stand-ups to unblock stalled cases.'
        ],
        recommendations_tl: [
          'Suriin ang mga bukas na kaso at markahan ang mga simpleng kaso para mabilis na pagsasara.',
          'I-reassign ang kumplikadong kaso sa senior staff at magtakda ng target na petsa ng resolusyon.',
          'Gumamit ng araw-araw na stand-up para alisin ang mga hadlang sa mga naka-stall na kaso.'
        ]
      });
    }

// High-risk cases proportion
    const highRiskCount = docs.filter(d => (d.riskLevel || '').toString().toLowerCase() === 'high').length;
    const highRiskRate = highRiskCount / (total || 1);
    if (highRiskRate > 0.15) {
      insights.push({
        label: 'High-Risk Cases Present',
        value: highRiskRate * 100,
        type: lowSample ? 'warning' : 'error',
        urgent: true,
        message: `${Math.round(highRiskRate * 100)}% of cases are marked High risk.${sampleNote}`,
        message_tl: `Tinatayang ${Math.round(highRiskRate * 100)}% ng mga kaso ay may markang High risk.${sampleNote}`,
        recommendations: [
          'Immediately review and prioritize High-risk cases.',
          'Assign protective measures and consider emergency referrals.',
          'Ensure senior oversight for case plans.'
        ],
        recommendations_tl: [
          'Agad na suriin at unahin ang High-risk na mga kaso.',
          'Magtalaga ng mga hakbang para sa proteksyon at isaalang-alang ang emergency referrals.',
          'Siguraduhin ang senior oversight para sa mga plano ng kaso.'
        ]
      });
    }

    // Stagnant cases (>14 days)
    const stagnant = docs.filter(d => {
      const ageDays = (Date.now() - new Date(d.createdAt)) / (1000*60*60*24);
      return (d.status === 'Open' || d.status === 'Under Investigation') && ageDays > 14;
    }).length;
    if (stagnant > 0) insights.push({
      label: 'Stagnant Cases',
      value: stagnant,
      type: lowSample ? 'warning' : 'error',
      message: `${stagnant} case(s) have had no progress for more than 14 days.${sampleNote}`,
      message_tl: `${stagnant} kaso ang walang progreso nang higit sa 14 na araw.${sampleNote}`,
      recommendations: [
        'Run a quick audit of all cases older than 14 days to identify blockers.',
        'Reassign stalled cases to a fresh investigator with a 7-day action plan.',
        'Escalate urgent stalled cases to supervisors for immediate review.'
      ],
      recommendations_tl: [
        'Gumawa ng mabilis na audit ng lahat ng kaso na higit sa 14 na araw upang tukuyin ang mga harang.',
        'I-reassign ang mga naka-stall na kaso sa bagong imbestigador na may 7-araw na action plan.',
        'I-escalate ang mga agarang naka-stall na kaso sa mga supervisor para sa agarang pagsusuri.'
      ]
    });

    // Cancellation rate
    const cancellationRate = cancelled / (total || 1);
    if (cancellationRate > 0.1) insights.push({
      label: 'High Cancellation Rate',
      value: cancellationRate * 100,
      type: lowSample ? 'info' : 'warning',
      message: `About ${Math.round(cancellationRate * 100)}% of cases were cancelled.${sampleNote}`,
      message_tl: `Tinatayang ${Math.round(cancellationRate * 100)}% ng mga kaso ang kinansela.${sampleNote}`,
      recommendations: [
        'Contact victims who cancelled to ask why and offer help (use gentle wording).',
        'Check for patterns of cancellation (same area, same timeframe).',
        'Ensure safe channels for victims to follow up without pressure.'
      ],
      recommendations_tl: [
        'Makipag-ugnayan sa mga biktimang nag-cancel para alamin ang dahilan at mag-alok ng tulong (gamit ang maingat na pananalita).',
        'Suriin ang mga pattern ng pagkansela (parehong lugar, parehong oras).',
        'Siguraduhin ang ligtas na mga channel para sa mga biktima na mag-follow up nang walang presyon.'
      ]
    });

    // --- Additional comprehensive insights for Cases ---
    // Incident type distribution
    const byType = {};
    docs.forEach(d => { const t = (d.incidentType || 'Other'); byType[t] = (byType[t] || 0) + 1; });
    const typeEntries = Object.entries(byType).sort((a,b) => b[1] - a[1]);
    if (typeEntries.length > 0) {
      const [topType, topCount] = typeEntries[0];
      const pct = (topCount / (total || 1)) * 100;
      // Predominant insight (always show when we have at least one type)
      insights.push({
        label: 'Predominant Incident Type',
        value: `${topType} — ${topCount} cases (${Math.round(pct)}% of total)`,
        type: pct > 40 ? 'warning' : 'info',
        message: `Predominant incident: "${topType}" (${topCount} case${topCount !== 1 ? 's' : ''}, ${Math.round(pct)}% of total). Consider focused prevention and response for this type.`,
        message_tl: `Pangunahing insidente: "${topType}" (${topCount} kaso${topCount !== 1 ? 's' : ''}, ${Math.round(pct)}% ng kabuuan). Isaalang-alang ang nakatuong pag-iwas at tugon para sa ganitong uri.`,
        recommendations: [
          `Focus prevention strategies on ${topType}.`,
          `Develop specialized response protocols for ${topType} cases.`,
          `Enhance support services related to ${topType}.`
        ],
        recommendations_tl: [
          `Ituon ang mga estratehiya sa pag-iwas para sa ${topType}.`,
          `Gumawa ng espesyal na protocol para sa pagtugon sa mga ${topType} na kaso.`,
          `Palakasin ang mga serbisyo ng suporta na may kinalaman sa ${topType}.`
        ]
      });

      // Secondary insight (if there is a second most common type)
      if (typeEntries.length > 1) {
        const [secondType, secondCount] = typeEntries[1];
        insights.push({
          label: 'Secondary Concern',
          value: `${secondType} — ${secondCount} case${secondCount !== 1 ? 's' : ''}`,
          type: 'info',
          message: `Secondary concern: High prevalence of "${secondType}" (${secondCount} case${secondCount !== 1 ? 's' : ''}). Consider checking correlation with ${topType} cases.`,
          message_tl: `Pangalawang alalahanin: Mataas ang bilang ng "${secondType}" (${secondCount} kaso${secondCount !== 1 ? 's' : ''}). Isaalang-alang ang pagsusuri ng kaugnayan sa mga ${topType} na kaso.`,
          recommendations: [
            `Investigate overlap or correlation between ${secondType} and ${topType} cases.`,
            `Adjust outreach or training to address both ${topType} and ${secondType} where relevant.`
          ],
          recommendations_tl: [
            `Suriin ang pag-ookupa o kaugnayan ng ${secondType} at ${topType} na mga kaso.`,
            `I-adjust ang outreach o pagsasanay upang tugunan ang parehong ${topType} at ${secondType} kung kinakailangan.`
          ]
        });
      }
    }

// Anonymous cases: show count and proportion (focus on cases rather than 'reporting')
    const anonCount = docs.filter(d => {
      try {
        if ((d.victimType || '').toString().toLowerCase() === 'anonymous') return true;
        if (d.victimID && typeof d.victimID === 'object' && d.victimID.isAnonymous) return true;
        if (d.victimID && typeof d.victimID === 'string' && d.victimID.toUpperCase().startsWith('ANONYMOUS')) return true;
        if (d.victimID && d.victimID._id && typeof d.victimID._id === 'string' && d.victimID._id.toUpperCase().startsWith('ANONYMOUS')) return true;
      } catch (e) {
        // ignore
      }
      return false;
    }).length;
    const anonRate = anonCount / (total || 1);

    if (anonCount > 0) {
      const pct = Math.round(anonRate * 100);
      const severityType = anonRate > 0.6 ? 'warning' : anonRate > 0.25 ? 'info' : 'success';
      insights.push({
        label: 'Anonymous Cases',
        value: `${anonCount} (${pct}%)`,
        type: severityType,
        message: `There are ${anonCount} anonymous case${anonCount !== 1 ? 's' : ''} (${pct}% of total). These records lack an identified victim; ensure they are handled with appropriate confidentiality and low-barrier follow-up options.`,
        message_tl: `Mayroong ${anonCount} anonymous na kaso (${pct}% ng kabuuan). Ang mga rekord na ito ay walang natukoy na biktima; siguraduhing maingat ang paghawak at mag-alok ng madaling paraan ng follow-up.`,
        recommendations: [
          'Flag anonymous cases for sensitive handling and low-barrier support.',
          'Provide clear instructions for anonymous-to-identified follow-up (opt-in contact methods).',
          'Monitor whether anonymous cases cluster by area or time to inform outreach.'
        ],
        recommendations_tl: [
          'I-flag ang mga anonymous na kaso para sa maingat na paghawak at madaling suporta.',
          'Magbigay ng malinaw na gabay para sa anonymous-to-identified follow-up (opsyonal na contact).',
          'Subaybayan kung may pag-oorlap ang mga anonymous na kaso ayon sa lugar o oras para gabayan ang outreach.'
        ]
      });
    }

    // Child victim proportion
    const childCount = docs.filter(d => (d.victimType || '').toString().toLowerCase().includes('child') || (d.victimID && d.victimID.victimType === 'child')).length;
    const childRate = childCount / (total || 1);
    if (childRate > 0.25) {
      insights.push({
        label: 'Childrens Cases',
        value: childRate * 100,
        type: 'warning',
        message: `Approximately ${Math.round(childRate * 100)}% of cases involve children. Prioritize child protection procedures.`,
        message_tl: `Tinatayang ${Math.round(childRate * 100)}% ng mga kaso ay may kinalaman sa mga bata. Bigyang prayoridad ang mga proseso para sa proteksyon ng bata.`,
        recommendations: [
          'Ensure child-friendly intake and immediate safety checks.',
          'Assign child protection specialists to these cases.',
          'Coordinate with DSWD/child protection services as needed.'
        ],
        recommendations_tl: [
          'Siguraduhin ang child-friendly intake at agarang safety checks.',
          'Magtalaga ng mga espesyalista sa proteksyon ng bata sa mga kasong ito.',
          'Makipag-ugnayan sa DSWD/child protection services kung kinakailangan.'
        ]
      });
    }

    // Woman victim proportion (mirror child proportion logic)
    const womanCount = docs.filter(d => {
      try {
        if ((d.victimType || '').toString().toLowerCase().includes('woman')) return true;
        if ((d.victimType || '').toString().toLowerCase().includes('female')) return true;
        if (d.victimID && d.victimID.victimType === 'woman') return true;
        if (d.victimID && d.victimID.victimType === 'female') return true;
      } catch (e) {
        // ignore errors
      }
      return false;
    }).length;
    const womanRate = womanCount / (total || 1);
    if (womanCount > 0) {
      const pct = Math.round(womanRate * 100);
      insights.push({
        label: 'Womens Cases',
        value: `${womanCount} (${pct}%)`,
        type: womanRate > 0.6 ? 'warning' : womanRate > 0.25 ? 'info' : 'success',
        message: `There are ${womanCount} woman case${womanCount !== 1 ? 's' : ''} (${pct}% of total). Prioritize services and protections for women victims.`,
        message_tl: `Mayroong ${womanCount} kaso na may kinalaman sa kababaihan (${pct}% ng kabuuan). Bigyang prayoridad ang mga serbisyo at proteksyon para sa mga biktimang babae.`,
        recommendations: [
          'Ensure service pathways and referrals are accessible for women victims.',
          'Provide gender-sensitive counseling and legal support.',
          'Monitor and prioritize resources for areas with high woman-case proportions.'
        ],
        recommendations_tl: [
          'Siguraduhin na accessible ang mga serbisyo at referral para sa mga biktimang babae.',
          'Magbigay ng gender-sensitive na counseling at legal na suporta.',
          'Subaybayan at unahin ang mga resources para sa mga lugar na may mataas na proporsyon ng kaso ng kababaihan.'
        ]
      });
    }

    // Document completeness (cases may not include attachments in this workflow)
    // Instead of 'low evidence capture' we surface opportunities to improve structured case details
    try {
      const docsMissingKeyInfo = docs.filter(d => {
        // consider key fields: summary/description, location, incidentType, victimType
        const missingSummary = !(d.summary || d.description || '').toString().trim();
        const missingLocation = !(d.location && d.location.latitude && d.location.longitude);
        const missingType = !(d.incidentType);
        return missingSummary || missingLocation || missingType;
      }).length;
      const missingRate = docsMissingKeyInfo / (total || 1);
      // (Removed: Limited details / contactability insight per user request)
    } catch (e) { /* ignore errors in optional completeness check */ }

    // (Removed) Time-of-day concentration for cases — moved to Reports insights per request

    // Optionally ensure ML model is trained and include status
    let mlInfo = null;
    try {
      await ensureModelTrained(false);
      mlInfo = { mlAvailable: !!mlModel, lastTrainedAt: lastTrainingTime || null };
    } catch (e) {
      mlInfo = { mlAvailable: false };
    }

    return { total, open, resolved, cancelled, trend, insights, mlInfo, meta: { since: since ? since.toISOString() : null, until: until ? until.toISOString() : null, range: options.range || null } };
  } catch (err) {
    console.error('suggestForCasesInsights error:', err);
    return { total: 0, open: 0, resolved: 0, cancelled: 0, trend: [], insights: [], mlInfo: { mlAvailable: false } };
  }
}

// Suggest insights for Reports insights page
async function suggestForReportsInsights(options = {}) {
  try {
    const { since, until } = computeSinceUntil(options);
    const Reports = require('../models/IncidentReports');
    const query = since ? { createdAt: { $gte: since } } : {};
    if (until) query.createdAt.$lt = until;
    const docs = await Reports.find(query).lean().exec();

  const insights = [];
  const total = docs.length;
  const sampleSize = total;
  const lowSample = sampleSize < 5;
  const sampleNote = lowSample ? ` (small sample: ${sampleSize} records — interpret with caution)` : '';
    const open = docs.filter(d => d.status === 'Open').length;
    const pending = docs.filter(d => d.status === 'Pending').length;
    const closed = docs.filter(d => d.status === 'Closed').length;

    // Trend
    const counts = {};
    docs.forEach(d => {
      const date = new Date(d.createdAt).toISOString().slice(0,10);
      counts[date] = (counts[date] || 0) + 1;
    });
    const trend = Object.entries(counts).map(([date,count]) => ({ date, count }));

    // Check for month-over-month increase in current range
    if (options.range === 'current') {
      try {
        const ReportsModel = require('../models/IncidentReports');
        const now = new Date();
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthCount = await ReportsModel.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: curMonthStart } }).exec();
        const curMonthCount = await ReportsModel.countDocuments({ createdAt: { $gte: curMonthStart } }).exec();
        
        if (curMonthCount > prevMonthCount) {
          let percent = null;
          let deltaCount = null;
          if (prevMonthCount > 0) {
            deltaCount = (curMonthCount - prevMonthCount);
            percent = (deltaCount / prevMonthCount) * 100;
          } else if (curMonthCount > 0) {
            deltaCount = curMonthCount;
            percent = 100;
          }
          
          if (deltaCount > 0) {
            insights.push({
              label: 'Increase in Reports',
              value: percent,
              type: lowSample ? 'warning' : 'warning',
              message: `There has been an increase in reports compared to last month (${deltaCount} more report${deltaCount !== 1 ? 's' : ''}; +${Math.round(percent)}%).${sampleNote}`,
              message_tl: `May tumaas na mga ulat kumpara sa nakaraang buwan (${deltaCount} karagdagang ulat; +${Math.round(percent)}%).${sampleNote}`,
              details: { prevMonthCount, curMonthCount, deltaCount, percent },
              recommendations: [
                'Identify geographic or time-based hotspots and prioritize patrols/visits.',
                'Temporarily increase staff presence in affected areas.',
                'Coordinate with partner agencies if multiple reports point to the same issue.'
              ],
              recommendations_tl: [
                'Tukuyin ang mga hotspot ayon sa lokasyon o oras at unahin ang mag patrol/pagbisita.',
                'Pansamantalang dagdagan ang presensya ng staff sa mga apektadong lugar.',
                'Makipag-coordinate sa mga partner agencies kung maraming ulat ang tumuturo sa parehong isyu.'
              ]
            });
          }
        }
      } catch (e) {
        console.warn('suggestForReportsInsights: monthly comparison failed', e && e.message);
      }
    }

    // Unresolved ratio
    const unresolved = docs.filter(d => d.status === 'Open' || d.status === 'Pending').length;
    const unresolvedRate = unresolved / (total || 1);
    if (unresolvedRate > 0.5) insights.push({
      label: 'Unresolved Rate',
      value: unresolvedRate * 100,
      type: lowSample ? 'info' : 'error',
      message: `About ${Math.round(unresolvedRate * 100)}% of reports are still open or pending.${sampleNote}`,
      message_tl: `Tinatayang ${Math.round(unresolvedRate * 100)}% ng mga ulat ay bukas o naka-pending.${sampleNote}`,
      recommendations: [
        'Create a rapid-response team to close high-priority reports.',
        'Review and simplify the reporting-to-resolution workflow.',
        'Set daily targets for clearing pending reports and track progress.'
      ],
      recommendations_tl: [
        'Gumawa ng rapid-response na grupo para isara ang  mataas na prioritying ulat.',
        'Suriin at gawing mas simple ang workflow mula report hanggang resolusyon.',
        'Magtakda ng araw-araw na target para linisin ang pending reports at subaybayan ang progreso.'
      ]
    });
    else if (unresolvedRate > 0.3) insights.push({
      label: 'Moderate Unresolved Rate',
      value: unresolvedRate * 100,
      type: lowSample ? 'info' : 'warning',
      message: `Around ${Math.round(unresolvedRate * 100)}% of reports are unresolved.${sampleNote}`,
      message_tl: `Tinatayang ${Math.round(unresolvedRate * 100)}% ng mga ulat ay hindi pa nareresolba.${sampleNote}`,
      recommendations: [
        'Assign a case owner to each pending report.',
        'Hold weekly case-review meetings to unblock difficult items.',
        'Use simple templates to speed up initial assessments.'
      ],
      recommendations_tl: [
        'Magtatalaga ng may-ari para sa bawat pending report.',
        'Mag-hold ng lingguhang case-review meetings upang alisin ang mga hadlang.',
        'Gumamit ng simpleng template upang pabilisin ang paunang pagsusuri.'
      ]
    });

    // Anonymous rate
    const anon = docs.filter(d => d.victimID && d.victimID.isAnonymous).length;
    const anonRate = anon / (total || 1);
    if (anonRate > 0.6) insights.push({
      label: 'Anonymous Reporting',
      value: anonRate * 100,
      type: 'warning',
      message: `About ${Math.round(anonRate * 100)}% of reports are anonymous. Consider ways to build trust and encourage safer reporting.`,
      message_tl: `Tinatayang ${Math.round(anonRate * 100)}% ng mga ulat ay anonymous. Isaalang-alang ang mga paraan upang bumuo ng tiwala at hikayatin ang mas ligtas na pag-uulat.`,
      recommendations: [
        'Develop outreach messages that stress confidentiality and support.',
        'Offer anonymous reporting with an option to provide contact later.',
        'Train staff to respond sensitively to anonymous reports to build trust.'
      ],
      recommendations_tl: [
        'Gumawa ng outreach messages na binibigyang-diin ang pagiging kumpidensyal at suporta.',
        'Mag-alok ng anonymous reporting na may opsyon na magbigay ng contact mamaya.',
        'Sanayin ang staff na tumugon nang may sensitivity sa mga anonymous na ulat upang bumuo ng tiwala.'
      ]
    });

    // Pending >7 days
    const oldPending = docs.filter(d => {
      const age = (Date.now() - new Date(d.createdAt)) / (1000*60*60*24);
      return (d.status === 'Open' || d.status === 'Pending') && age > 7;
    }).length;
    if (oldPending > 0) insights.push({
      label: 'Aged Pending Reports (>7d)',
      value: oldPending,
      type: 'error',
      message: `${oldPending} report(s) have been pending for more than 7 days. These should be reviewed and acted on as soon as possible.`,
      message_tl: `Mayroong ${oldPending} ulat na naka-pending nang higit sa 7 araw. Dapat suriin at aksyunan agad ang mga ito.`,
      recommendations: [
        'Create a task list for reports pending >7 days and assign owners.',
        'Escalate the most urgent pending reports to supervisors.',
        'Consider reassigning very old items to fresh reviewers.'
      ],
      recommendations_tl: [
        'Gumawa ng task list para sa mga ulat na naka-pending nang higit sa 7 araw at magtalaga ng may-ari.',
        'I-escalate ang pinaka-urgent na pending reports sa mga supervisor.',
        'Isaalang-alang ang pag-reassign ng mga napakatandang item sa bagong reviewer.'
      ]
    });

    // --- Additional comprehensive insights for Reports ---
    // Incident type distribution
    const rptByType = {};
    docs.forEach(d => { const t = (d.incidentType || 'Other'); rptByType[t] = (rptByType[t] || 0) + 1; });
    const rptTypeEntries = Object.entries(rptByType).sort((a,b) => b[1] - a[1]);
    if (rptTypeEntries.length > 0) {
      const [topType, topCount] = rptTypeEntries[0];
      const pct = (topCount / (total || 1)) * 100;
      // Always surface the predominant report type (with severity depending on proportion)
      insights.push({
        label: 'Predominant Report Type',
        value: `${topType} — ${topCount} reports (${Math.round(pct)}% of total)`,
        type: pct > 40 ? 'warning' : 'info',
        message: `Predominant report type: "${topType}" (${topCount} report${topCount !== 1 ? 's' : ''}, ${Math.round(pct)}% of total). Consider focused outreach and response for this type.`,
        message_tl: `Pangunahing uri ng ulat: "${topType}" (${topCount} ulat${topCount !== 1 ? 's' : ''}, ${Math.round(pct)}% ng kabuuan). Isaalang-alang ang nakatuong outreach at tugon para sa ganitong uri.`,
        recommendations: [
          `Train staff on ${topType} report handling and referral pathways.`,
          'Coordinate prevention messaging targeted to this issue.'
        ],
        recommendations_tl: [
          `Sanayin ang mga staff sa pag-handle ng ${topType} na ulat at mga referral pathway.`,
          'I-coordinate ang prevention messaging na naka-target sa isyung ito.'
        ]
      });

      // Secondary most-common type (if present)
      if (rptTypeEntries.length > 1) {
        const [secondType, secondCount] = rptTypeEntries[1];
        insights.push({
          label: 'Secondary Concern',
          value: `${secondType} — ${secondCount} report${secondCount !== 1 ? 's' : ''}`,
          type: 'info',
          message: `Secondary concern: high prevalence of "${secondType}" (${secondCount} report${secondCount !== 1 ? 's' : ''}). Consider checking correlation with ${topType} reports.`,
          message_tl: `Pangalawang alalahanin: mataas ang bilang ng "${secondType}" (${secondCount} ulat${secondCount !== 1 ? 's' : ''}). Isaalang-alang ang pagsusuri ng kaugnayan sa mga ${topType} na ulat.`,
          recommendations: [
            `Investigate overlap or correlation between ${secondType} and ${topType} reports.`,
            `Adjust outreach or training to address both ${topType} and ${secondType} where relevant.`
          ],
          recommendations_tl: [
            `Suriin ang pag-oorlap o kaugnayan ng ${secondType} at ${topType} na mga ulat.`,
            `I-adjust ang outreach o pagsasanay upang tugunan ang parehong ${topType} at ${secondType} kung kinakailangan.`
          ]
        });
      }
    }

    // Repeat reporters (same reporter submits multiple reports)
    try {
      const reporterCounts = {};
      docs.forEach(d => {
        const r = (d.reporterId || d.reporter || 'unknown');
        reporterCounts[r] = (reporterCounts[r] || 0) + 1;
      });
      const repeaters = Object.values(reporterCounts).filter(c => c > 1).length;
      if (repeaters > 0) {
        insights.push({
          label: 'Repeat Reporters',
          value: repeaters,
          type: 'info',
          message: `${repeaters} reporters submitted more than one report. Follow up to see if these indicate ongoing issues.`,
          message_tl: `${repeaters} nag-ulat ang higit sa isang ulat. Makipag-ugnayan upang alamin kung ito ay nagpapahiwatig ng patuloy na isyu.`,
          recommendations: [
            'Follow up with repeat reporters to gather more context.',
            'Identify possible ongoing incidents that need urgent attention.'
          ],
          recommendations_tl: [
            'Makipag-ugnayan sa mga paulit-ulit na nag-uulat upang makakuha ng higit na konteksto.',
            'Tukuyin ang mga posibleng patuloy na insidente na nangangailangan ng agarang pansin.'
          ]
        });
      }
    } catch (e) { /* ignore */ }

    // Time-of-day concentration for reports
    try {
      const hours = Array(24).fill(0);
      docs.forEach(d => { const h = new Date(d.createdAt).getHours(); hours[h] = (hours[h] || 0) + 1; });
      const max = Math.max(...hours);
      const totalDocs = hours.reduce((a,b) => a + b, 0) || 1;
      if (max / totalDocs > 0.4) {
        const hour = hours.indexOf(max);
        function formatHour(h) {
          const period = h >= 12 ? 'PM' : 'AM';
          const hh = ((h + 11) % 12) + 1;
          return `${hh}:00 ${period}`;
        }
        const start = formatHour(hour);
        const end = formatHour((hour + 2) % 24);
        insights.push({
          label: 'Report Time Concentration',
          value: (max / totalDocs) * 100,
          type: 'info',
            message: `Many reports are submitted around ${start} (${Math.round((max/totalDocs)*100)}%). Consider targeted monitoring.`,
            message_tl: `Maraming ulat ang isinusumite bandang ${start} (${Math.round((max/totalDocs)*100)}%). Isaalang-alang ang nakatuong monitoring.`,
            recommendations: [
              `Increase monitoring around ${start}–${end}.`,
              'Check correlation with local events or shifts.'
            ],
            recommendations_tl: [
              `Dagdagan ang monitoring bandang ${start}–${end}.`,
              'Suriin ang kaugnayan sa mga lokal na kaganapan o shift.'
            ]
        });
      }
    } catch (e) { /* ignore */ }

    return { total, open, pending, closed, trend, insights, meta: { since: since ? since.toISOString() : null, until: until ? until.toISOString() : null, range: options.range || null } };
  } catch (err) {
    console.error('suggestForReportsInsights error:', err);
    return { total: 0, open: 0, pending: 0, closed: 0, trend: [], insights: [] };
  }
}

// Suggest insights for Alerts insights page
async function suggestForAlertsInsights(options = {}) {
  try {
    const { since, until } = computeSinceUntil(options);
    const Alert = require('../models/Alert');
    const query = since ? { createdAt: { $gte: since } } : {};
    if (until) query.createdAt.$lt = until;
    const docs = await Alert.find(query).lean().exec();

    const insights = [];
    const total = docs.length;
    const sampleSize = total;
    const lowSample = sampleSize < 5;
    const sampleNote = lowSample ? ` (small sample: ${sampleSize} records — interpret with caution)` : '';

    const active = docs.filter(d => d.status === 'Active').length;
    const resolved = docs.filter(d => d.status === 'Resolved').length;
    const cancelled = docs.filter(d => d.status === 'Cancelled').length;

    // Trend
    const counts = {};
    docs.forEach(d => {
      const date = new Date(d.createdAt).toISOString().slice(0,10);
      counts[date] = (counts[date] || 0) + 1;
    });
    const trend = Object.entries(counts).map(([date,count]) => ({ date, count }));

    // Alert spike detection
    const last7 = trend.slice(-7);
    if (last7.length >= 2) {
      const last = last7[last7.length - 1].count;
      const prev = last7[last7.length - 2].count || 0;
      const factor = Number.parseFloat(options.minSpikeFactor) || 1.5;
      if (prev > 0 && last > prev * factor) {
        try {
          const AlertModel = require('../models/Alert');
          const now = new Date();
          const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const prevMonthCount = await AlertModel.countDocuments({ createdAt: { $gte: prevMonthStart, $lt: curMonthStart } }).exec();
          const curMonthCount = await AlertModel.countDocuments({ createdAt: { $gte: curMonthStart } }).exec();
          if (curMonthCount > prevMonthCount) {
            let percent = null;
            let percentBasis = 'monthly';
            let deltaCount = null;
            if (prevMonthCount > 0) {
              deltaCount = (curMonthCount - prevMonthCount);
              percent = (deltaCount / prevMonthCount) * 100;
            } else {
              deltaCount = (last - prev);
              percent = ((last - prev) / prev) * 100;
              percentBasis = 'daily';
            }
            insights.push({
              label: 'Increase in Alerts',
              value: percent,
              type: 'warning',
              message: `There has been a recent jump in alerts (increase of ${deltaCount} ${percentBasis === 'monthly' ? 'alerts in over a month' : 'alerts day-over-day'}; ${Math.round(percent)}%).${sampleNote}`,
              message_tl: `May biglang pagtaas ng mga alerto (tumaas ng ${deltaCount} ${percentBasis === 'monthly' ? 'alerto buwan-sa-buwan' : 'alerto araw-sa-araw'}; ${Math.round(percent)}%).${sampleNote}`,
              details: { prevDayCount: prev, lastDayCount: last, prevMonthCount, curMonthCount, percentBasis, deltaCount },
              recommendations: [
                'Review the nature of recent alerts to identify patterns or common issues.',
                'Increase response team capacity during high-alert periods.',
                'Conduct outreach to understand why alerts have increased.'
              ],
              recommendations_tl: [
                'Suriin ang kalikasan ng mga kamakailang alerto upang tukuyin ang mga pattern o karaniwang isyu.',
                'Pataas ang kapasidad ng response team sa mga panahon ng mataas na alerto.',
                'Magsagawa ng outreach upang maunawaan kung bakit tumaas ang mga alerto.'
              ]
            });
          }
        } catch (e) {
          insights.push({
            label: 'Spike in Alerts',
            value: ((last - prev) / prev) * 100,
            type: 'warning',
            message: `There has been a recent jump in alerts.${sampleNote}`,
            message_tl: `May biglang pagtaas ng mga alerto kamakailan.${sampleNote}`,
            recommendations: [
              'Review the nature of recent alerts to identify patterns or common issues.',
              'Increase response team capacity during high-alert periods.'
            ],
            recommendations_tl: [
              'Suriin ang kalikasan ng mga kamakailang alerto upang tukuyin ang mga pattern o karaniwang isyu.',
              'Pataas ang kapasidad ng response team sa mga panahon ng mataas na alerto.'
            ]
          });
        }
      }
    }

    // Active alert ratio
    const activeRate = active / (total || 1);
    if (activeRate > 0.5) {
      insights.push({
        label: 'High Active Alert Ratio',
        value: activeRate * 100,
        type: lowSample ? 'info' : 'error',
        message: `About ${Math.round(activeRate * 100)}% of alerts are still active.${sampleNote}`,
        message_tl: `Tinatayang ${Math.round(activeRate * 100)}% ng mga alerto ay aktibo pa rin.${sampleNote}`,
        recommendations: [
          'Prioritize resolution of active alerts with highest severity.',
          'Allocate additional resources to response teams if needed.',
          'Set daily targets for resolving active alerts.'
        ],
        recommendations_tl: [
          'Unahin ang resolusyon ng mga aktibong alerto na may pinakamataas na kalidad.',
          'Maglaan ng dagdag na resources sa response teams kung kinakailangan.',
          'Magtakda ng araw-araw na target para sa pagresolba ng mga aktibong alerto.'
        ]
      });
    } else if (activeRate > 0.25) {
      insights.push({
        label: 'Moderate Active Alert Ratio',
        value: activeRate * 100,
        type: lowSample ? 'info' : 'warning',
        message: `Around ${Math.round(activeRate * 100)}% of alerts are active.${sampleNote}`,
        message_tl: `Tinatayang ${Math.round(activeRate * 100)}% ng mga alerto ay aktibo.${sampleNote}`,
        recommendations: [
          'Monitor active alerts closely and track resolution progress.',
          'Coordinate with field teams to expedite response.',
          'Review cases associated with long-standing active alerts.'
        ],
        recommendations_tl: [
          'Bantayan nang mabuti ang mga aktibong alerto at subaybayan ang progreso ng resolusyon.',
          'Makipag-coordinate sa field teams upang pabilisin ang tugon.',
          'Suriin ang mga case na nauugnay sa mahabang aktibong alerto.'
        ]
      });
    }

    // Resolution rate
    const resolvedRate = resolved / (total || 1);
    if (resolvedRate > 0.7) {
      insights.push({
        label: 'Excellent Resolution Rate',
        value: resolvedRate * 100,
        type: 'success',
        message: `Excellent response: ${Math.round(resolvedRate * 100)}% of alerts have been resolved.${sampleNote}`,
        message_tl: `Kahanga-hangang tugon: ${Math.round(resolvedRate * 100)}% ng mga alerto ay nalutas na.${sampleNote}`,
        recommendations: [
          'Continue current response practices and protocols.',
          'Document best practices for team training.',
          'Consider recognizing and rewarding effective response efforts.'
        ],
        recommendations_tl: [
          'Magpatuloy sa kasalukuyang mga practice at protokol sa tugon.',
          'I-dokumento ang best practices para sa pagsasanay ng team.',
          'Isaalang-alang ang pagkilala at paggantimpala sa epektibong effort sa tugon.'
        ]
      });
    }

    // Aged active alerts
    const oldActive = docs.filter(d => {
      const age = (Date.now() - new Date(d.createdAt)) / (1000*60*60*24);
      return d.status === 'Active' && age > 3; // More than 3 days
    }).length;
    if (oldActive > 0) {
      insights.push({
        label: 'Long-Standing Active Alerts',
        value: oldActive,
        type: 'error',
        urgent: true,
        message: `${oldActive} alert(s) have been active for more than 3 days. These require immediate review and escalation.`,
        message_tl: `Mayroong ${oldActive} alerto na aktibo nang higit sa 3 araw. Ang mga ito ay nangangailangan ng agarang pagsusuri at escalation.`,
        recommendations: [
          'Immediately review all alerts active for >3 days.',
          'Escalate to management and partner agencies if needed.',
          'Reassign or provide additional support to accelerate resolution.',
          'Ensure victim safety is prioritized during extended alert period.'
        ],
        recommendations_tl: [
          'Agad na suriin ang lahat ng alerto na aktibo nang higit sa 3 araw.',
          'I-escalate sa management at partner agencies kung kinakailangan.',
          'I-reassign o magbigay ng dagdag na suporta upang mapabilis ang resolusyon.',
          'Siguraduhin na ang kaligtasan ng biktima ay prioridad sa pahabang panahon ng alerto.'
        ]
      });
    }

    // Geographic concentration
    try {
      const locations = {};
      docs.forEach(d => {
        if (d.location && d.location.latitude && d.location.longitude) {
          const key = `${Math.round(d.location.latitude * 100) / 100},${Math.round(d.location.longitude * 100) / 100}`;
          locations[key] = (locations[key] || 0) + 1;
        }
      });
      const clusterCounts = Object.values(locations);
      if (clusterCounts.length > 0) {
        const maxCluster = Math.max(...clusterCounts);
        if (maxCluster > 2 && (maxCluster / (total || 1)) > 0.3) {
          insights.push({
            label: 'Geographic Clustering',
            value: maxCluster,
            type: 'warning',
            message: `${maxCluster} alert(s) are concentrated in a single geographic area (${Math.round((maxCluster / (total || 1)) * 100)}% of total). This may indicate a hotspot requiring focused intervention.`,
            message_tl: `Mayroong ${maxCluster} alerto na nakonsentrado sa isang lugar (${Math.round((maxCluster / (total || 1)) * 100)}% ng kabuuan). Ito ay maaaring nagpapahiwatig ng hotspot na nangangailangan ng nakatuong intervention.`,
            recommendations: [
              'Conduct targeted field assessment in the concentrated area.',
              'Increase presence and visibility in the hotspot.',
              'Coordinate community patrols or prevention activities.',
              'Document patterns to inform strategic planning.'
            ],
            recommendations_tl: [
              'Magsagawa ng nakatuong field assessment sa nakonsentradong lugar.',
              'Pataas ang presensya at visibility sa hotspot.',
              'I-coordinate ang community patrols o prevention activities.',
              'I-dokumento ang mga pattern upang maibalik sa strategic planning.'
            ]
          });
        }
      }
    } catch (e) { /* ignore */ }

    // Alert cancellation ratio
    const cancelledRate = cancelled / (total || 1);
    if (cancelledRate > 0.2) {
      insights.push({
        label: 'High Cancellation Rate',
        value: cancelledRate * 100,
        type: 'warning',
        message: `About ${Math.round(cancelledRate * 100)}% of alerts have been cancelled. Review cancellation reasons to improve alert quality.`,
        message_tl: `Tinatayang ${Math.round(cancelledRate * 100)}% ng mga alerto ay kinansela. Suriin ang dahilan ng pagkakansela upang mapabuti ang kalidad ng alerto.`,
        recommendations: [
          'Analyze cancelled alerts to identify false alarm patterns.',
          'Provide feedback to alert sources on quality expectations.',
          'Refine alert criteria to reduce false positives.',
          'Train teams on proper alert escalation procedures.'
        ],
        recommendations_tl: [
          'Suriin ang mga kinansyang alerto upang tukuyin ang mga pattern ng false alarm.',
          'Magbigay ng feedback sa mga source ng alerto tungkol sa quality expectations.',
          'Palitan ang alert criteria upang mabawasan ang false positives.',
          'Sanayin ang mga team sa tamang alert escalation procedures.'
        ]
      });
    }

    // Average response time for resolved alerts
    try {
      const resolvedWithDuration = docs.filter(d => d.status === 'Resolved' && d.durationMs);
      if (resolvedWithDuration.length > 0) {
        const avgDurationMs = resolvedWithDuration.reduce((sum, d) => sum + (d.durationMs || 0), 0) / resolvedWithDuration.length;
        const avgDurationMins = avgDurationMs / 1000 / 60;
        const avgDurationHours = avgDurationMins / 60;
        
        if (avgDurationHours > 4) {
          insights.push({
            label: 'Average Response Time',
            value: Math.round(avgDurationMins),
            type: 'warning',
            message: `Average time to resolve alerts is ${Math.round(avgDurationMins)} minutes (approximately ${Math.round(avgDurationHours)} hours). Target faster response times for better victim safety outcomes.`,
            message_tl: `Ang average na oras upang magresolba ng mga alerto ay ${Math.round(avgDurationMins)} minuto (tinatayang ${Math.round(avgDurationHours)} oras). Target ang mas mabilis na oras ng tugon para sa mas mahusay na resulta sa kaligtasan ng biktima.`,
            recommendations: [
              'Review response protocols to identify bottlenecks.',
              'Improve communication channels between teams.',
              'Set response time targets (e.g., 30 minutes for high-severity alerts).',
              'Conduct regular drills to maintain response readiness.'
            ],
            recommendations_tl: [
              'Suriin ang response protocols upang tukuyin ang mga hadlang.',
              'Mapabuti ang communication channels sa pagitan ng mga team.',
              'Magtakda ng response time targets (hal., 30 minuto para sa mataas na kalidad ng alerto).',
              'Magsagawa ng regular na drills upang mapanatili ang readiness ng response.'
            ]
          });
        } else if (avgDurationHours > 2) {
          insights.push({
            label: 'Average Response Time',
            value: Math.round(avgDurationMins),
            type: 'info',
            message: `Average response time is ${Math.round(avgDurationMins)} minutes (${Math.round(avgDurationHours)} hours). Consider optimizing for faster victim assistance.`,
            message_tl: `Ang average response time ay ${Math.round(avgDurationMins)} minuto (${Math.round(avgDurationHours)} oras). Isaalang-alang ang pag-optimize para sa mas mabilis na tulong sa biktima.`,
            recommendations: [
              'Analyze high-performing response times and document best practices.',
              'Share effective strategies across teams.'
            ],
            recommendations_tl: [
              'Suriin ang mataas na performance na oras ng tugon at i-dokumento ang best practices.',
              'Ibahagi ang epektibong estratehiya sa iba\'t ibang team.'
            ]
          });
        }
      }
    } catch (e) { /* ignore */ }

    return { total, active, resolved, cancelled, trend, insights, meta: { since: since ? since.toISOString() : null, until: until ? until.toISOString() : null, range: options.range || null } };
  } catch (err) {
    console.error('suggestForAlertsInsights error:', err);
    return { total: 0, active: 0, resolved: 0, cancelled: 0, trend: [], insights: [] };
  }
}

module.exports = { trainModelFromCases, suggestForCase, suggestForCasesInsights, suggestForReportsInsights, suggestForAlertsInsights };
