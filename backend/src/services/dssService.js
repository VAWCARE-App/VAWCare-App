let tf = null;
// Use the pure-JS TensorFlow package only. This project does not require native bindings.
try {
  tf = require('@tensorflow/tfjs');
  console.log('Using @tensorflow/tfjs (pure JS) for DSS');
} catch (err) {
  console.info('No @tensorflow/tfjs available; DSS will run heuristics only.');
  tf = null;
}
const Cases = require('../models/Cases');
const { evaluateRules, initEngine } = require('./rulesEngine');

/**
 * Simple helper: convert incidentType string to one-hot vector
 */
function incidentTypeToOneHot(type) {
  // Order matches the risk ordering we use elsewhere: Economic < Psychological < Physical < Sexual
  const types = ['Economic', 'Psychological', 'Physical', 'Sexual', 'Other'];
  const idx = types.indexOf(type);
  return types.map((t, i) => (i === idx ? 1 : 0));
}

function riskLabelToIndex(label, incidentType) {
  // Our canonical risk labels (0..3)
  const canonical = ['Economic', 'Psychological', 'Physical', 'Sexual'];

  if (label && canonical.includes(label)) return canonical.indexOf(label);

  // Backwards-compatibility: map old Low/Medium/High to the new scale
  if (label === 'Low') return 0; // Economic
  if (label === 'Medium') return 1; // Psychological
  if (label === 'High') {
    // If the incident type is sexual, prefer mapping to Sexual; otherwise Physical
    if ((incidentType || '').toLowerCase() === 'sexual') return 3;
    return 2; // Physical
  }

  // If no label, but incidentType suggests sexual, return Sexual
  if ((incidentType || '').toLowerCase() === 'sexual') return 3;

  return 0; // default to Economic
}

function indexToRiskLabel(i) {
  return ['Economic', 'Psychological', 'Physical', 'Sexual'][i] || 'Economic';
}

/**
 * Build a more specific suggestion string using predicted risk and incident type
 */
function getDetailedSuggestion(predictedRisk, incidentType) {
  const it = (incidentType || '').toLowerCase();
  const pr = (predictedRisk || '').toLowerCase();

  // Sexual incidents: immediate referral, medical exam, legal support
  if (pr === 'sexual' || it.includes('sexual')) {
    return 'Escalate immediately: ensure victim safety, arrange medical/forensic exam, notify legal support, and assign a case officer for urgent follow-up.';
  }

  // Physical incidents: urgent medical and safety measures
  if (pr === 'physical' || it.includes('physical')) {
    return 'Escalate: provide/arrange medical attention, ensure safe accommodation, document injuries, and assign a case officer to coordinate response.';
  }

  // Psychological incidents: prioritize counselling and monitoring
  if (pr === 'psychological' || it.includes('psych')) {
    return 'Prioritize mental health support: refer to counselling services, schedule follow-up assessment, and assign an officer to monitor progress.';
  }

  // Economic incidents: connect to resources and support
  if (pr === 'economic' || it.includes('economic') || it.includes('financial')) {
    return 'Provide economic support: connect victim to social services, cash/benefit programs, livelihood assistance, and schedule a follow-up.';
  }

  // Default
  return 'Review the case and provide appropriate support or referrals; assign a case officer to follow up.';
}

async function buildAndTrainModel(samples, labels) {
  if (!tf) throw new Error('TensorFlow is not available');
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [samples[0].length], units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 4, activation: 'softmax' }));

  model.compile({ optimizer: 'adam', loss: 'sparseCategoricalCrossentropy', metrics: ['accuracy'] });

  const xs = tf.tensor2d(samples);
  const ys = tf.tensor1d(labels, 'int32');

  await model.fit(xs, ys, { epochs: 25, batchSize: 16, verbose: 0 });

  return model;
}

async function trainModelFromCases(minSamples = 50) {
  const docs = await Cases.find({}).limit(500).lean();
  if (!docs || docs.length < minSamples) return null; // not enough data

  const samples = [];
  const labels = [];

  docs.forEach(d => {
    const itVec = incidentTypeToOneHot(d.incidentType || 'Other');
    const status = d.status === 'Open' || d.status === 'Under Investigation' ? 1 : 0;
    const assigned = d.assignedOfficer ? 1 : 0;
    const descLen = (d.description || '').length;
    const descBucket = Math.min(1, Math.floor(descLen / 200));

    const feat = [...itVec, status, assigned, descBucket];
    samples.push(feat);
    labels.push(riskLabelToIndex(d.riskLevel, d.incidentType));
  });

  const model = await buildAndTrainModel(samples, labels);
  return { model, sampleCount: samples.length, lastTrainedAt: new Date().toISOString() };
}

/**
 * Suggest action from a case payload. If model is present, use it; otherwise heuristics.
 */
async function suggestForCase(payload, modelObj = null) {
  // reflect the manual change.
  function normalizeStoredRisk(r) {
    if (!r) return null;
    const s = String(r).toLowerCase();
    if (s === 'low') return 'Low';
    if (s === 'medium') return 'Medium';
    if (s === 'high') return 'High';
    return null;
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
    const probs = canonical.map((c, i) => (i === idx ? strength : base));
    return probs;
  }

  function getSuggestionForManualRisk(storedRisk, incidentType) {
    const sr = normalizeStoredRisk(storedRisk);
    const it = (incidentType || '').toLowerCase();

    // Provide tailored messaging per incident type and stored risk
    if (it.includes('sexual')) {
      if (sr === 'High') return 'High sexual risk — immediate escalation, ensure victim safety, arrange forensic/medical exam, notify legal and child/sexual assault response teams as appropriate.';
      if (sr === 'Medium') return 'Medium sexual risk — arrange prompt medical evaluation, provide counselling and consider legal referral; monitor closely.';
      return 'Low sexual risk — ensure victim has access to support services and follow-up; escalate if any concerning signs emerge.';
    }

    if (it.includes('physical')) {
      if (sr === 'High') return 'High physical risk — urgent medical attention and safety planning required; consider emergency accommodations and police referral.';
      if (sr === 'Medium') return 'Medium physical risk — arrange medical check, document injuries, create a safety plan and schedule follow-up.';
      return 'Low physical risk — provide referrals for medical and psychosocial support and monitor the situation.';
    }

    if (it.includes('psych')) {
      if (sr === 'High') return 'High psychological risk — immediate psychosocial intervention, crisis counselling and frequent follow-up; prioritize mental health referral.';
      if (sr === 'Medium') return 'Medium psychological risk — refer to counselling services and schedule regular check-ins.';
      return 'Low psychological risk — provide information about counselling and self-help resources; monitor over time.';
    }

    // default to economic/other
  if (sr === 'High') return 'High economic/other risk — prioritize urgent social/financial support, ensure basic needs met and assign social worker.';
  if (sr === 'Medium') return 'Medium economic/other risk — connect to social services and follow up on benefits or livelihood assistance.';
  return 'Low economic/other risk — provide information about available support and schedule routine follow-up.';
  }

  // If client provided a manual riskLevel explicitly, use it and return a manual override response
  const manualStored = normalizeStoredRisk(payload && payload.riskLevel);
  if (manualStored) {
    const predictedRisk = payload.incidentType || null;
    const storedRisk = manualStored;
    const suggestion = getSuggestionForManualRisk(storedRisk, payload.incidentType || 'Other');
    const probabilities = synthesizeProbabilities(payload.incidentType || 'Other', storedRisk);
    const immediateProb = (probabilities[2] || 0) + (probabilities[3] || 0);
    const requiresImmediate = immediateProb >= 0.5;
    return { predictedRisk, storedRisk, probabilities, suggestion, immediateAssistanceProbability: immediateProb, requiresImmediateAssistance: requiresImmediate, manualOverride: true };
  }
  // --- Keyword-based detection ---
  const descriptionLower = (payload.description || '').toString().toLowerCase();

  const KEYWORDS = {
    Physical: [
      'sinaktan','binugbog','sinampal','sinuntok','sinipa','pinagsusuntok','nasaktan','may pasa','may sugat','sinakal',
      'physical abuse','domestic violence','karahasan sa katawan','pananakit','pang-aabuso sa katawan',
      // English counterparts
      'hurt','beaten','punched','kicked','slapped','physically abused','injured','has bruises','has wounds','choked','physical assault'
    ],
    Economic: [
      'kinuha ang pera','walang binibigay na pera','hindi pinapayagang magtrabaho','sinusumbatan sa gastos','kontrolado ang pera','pinagkakaitan ng panggastos',
      'economic abuse','pinagkakaitan ng kabuhayan','pampinansyal na pang-aabuso','kontrol sa pera','pagkukulang sa suporta',
      // English counterparts
      'took my money','no financial support','not allowed to work','controls the money','financial abuse','withholding money','economic control','denied financial help','not giving allowance','financial manipulation'
    ],
    Psychological: [
      'minumura','inaalipusta','pinapahiya','sinisigawan','tinatakot','binabantaan','inaaway lagi','pinipilit sumunod',
      'psychological abuse','emosyonal na pang-aabuso','mental abuse','pang-aapi sa isip','pagmamanipula',
      // English counterparts
      'insulted','cursed at','humiliated','shouted at','threatened','always being yelled at','forced to obey','manipulated','controlled emotionally','emotionally abused','verbal abuse','gaslighting'
    ],
    Sexual: [
      'hinipuan','pinilit','ginahasa','niyurakan','pinuwersa','minolestiya','hinubaran','sekswal na pang-aabuso',
      'rape','sexual assault','sexual harassment','sekswal na karahasan','pinilit makipagtalik',
      // English counterparts
      'touched without consent','forced','raped','molested','sexually assaulted','harassed','forced to have sex','sexual abuse','sexual violence','sexual harassment'
    ]
  };

  // Per-keyword tailored responses (child vs woman). 
  const KEYWORD_RESPONSES = {
    // Physical
    'sinaktan': {
      child: 'Child shows signs of being physically hurt — arrange urgent medical check, document injuries, and notify child protection.',
      woman: 'Reported being hit — advise medical check, document injuries, and assist with safety planning and legal referral.'
    },
    'binugbog': {
      child: 'Severe physical harm reported for a child — urgent medical care and immediate child protection referral required.',
      woman: 'Severe beating reported — prioritize safety, urgent medical attention and police/legal referral where appropriate.'
    },
    'sinampal': {
      child: 'Child was slapped — check for injuries, ensure safe placement and provide psychosocial support.',
      woman: 'Was slapped — recommend medical check if injured, document incident and develop a safety plan.'
    },
    'sinuntok': {
      child: 'Child was punched — seek medical care, document injuries, and contact child protection services.',
      woman: 'Was punched — seek medical attention, consider police report and safety planning.'
    },
    'sinipa': {
      child: 'Child was kicked — urgent evaluation for injury and referral to child protection recommended.',
      woman: 'Was kicked — advise medical assessment, document injuries and safety planning.'
    },
    'pinagsusuntok': {
      child: 'Child was repeatedly struck — immediate protective actions and medical/psychosocial support needed.',
      woman: 'Repeated physical assault reported — prioritize safety, medical exam and legal support.'
    },
    'nasaktan': {
      child: 'Child indicates they were hurt — arrange medical review and child welfare referral.',
      woman: 'Reported being hurt — recommend medical check and offer support/referral services.'
    },
    'may pasa': {
      child: 'Child has bruises — document injuries photographically, provide medical care and refer to child protection.',
      woman: 'Bruising observed — encourage medical evaluation and documentation; consider reporting options.'
    },
    'may sugat': {
      child: 'Child has wounds — urgent medical attention and child protection notification advised.',
      woman: 'Wounds present — arrange medical care and document injuries for follow-up.'
    },
    'sinakal': {
      child: 'Child reports being strangled — this is high risk; seek emergency medical care and immediate protection.',
      woman: 'Strangulation reported — immediate medical and safety measures required; escalate to emergency response.'
    },
    'physical abuse': {
      child: 'Physical abuse reported for a child — ensure immediate safety, medical care and child protection referral.',
      woman: 'Physical abuse reported — arrange medical and legal support and safety planning.'
    },
    'domestic violence': {
      child: 'Domestic violence affecting a child — prioritize removal from harm, medical and child protection interventions.',
      woman: 'Domestic violence reported — provide safety planning, shelters and legal/medical referrals.'
    },
    'karahasan sa katawan': {
      child: 'Child experienced bodily harm — urgent medical attention and child protection referral needed.',
      woman: 'Reported bodily harm — recommend medical care, documentation and safety measures.'
    },
    'pananakit': {
      child: 'Child has been hurt — arrange medical check and child protection follow-up.',
      woman: 'Reported being hurt — advise medical exam and consider reporting for protection.'
    },
    'pang-aabuso sa katawan': {
      child: 'Physical abuse of a child — urgent child protection and medical response required.',
      woman: 'Physical abuse reported — arrange medical, psychosocial and legal support.'
    },
    // English counterparts for Physical responses
    'hurt': {
      child: 'Child shows signs of being physically hurt — arrange urgent medical check, document injuries, and notify child protection.',
      woman: 'Reported being hit — advise medical check, document injuries, and assist with safety planning and legal referral.'
    },
    'beaten': {
      child: 'Severe physical harm reported for a child — urgent medical care and immediate child protection referral required.',
      woman: 'Severe beating reported — prioritize safety, urgent medical attention and police/legal referral where appropriate.'
    },
    'slapped': {
      child: 'Child was slapped — check for injuries, ensure safe placement and provide psychosocial support.',
      woman: 'Was slapped — recommend medical check if injured, document incident and develop a safety plan.'
    },
    'punched': {
      child: 'Child was punched — seek medical care, document injuries, and contact child protection services.',
      woman: 'Was punched — seek medical attention, consider police report and safety planning.'
    },
    'kicked': {
      child: 'Child was kicked — urgent evaluation for injury and referral to child protection recommended.',
      woman: 'Was kicked — advise medical assessment, document injuries and safety planning.'
    },
    'physically abused': {
      child: 'Physical abuse reported for a child — ensure immediate safety, medical care and child protection referral.',
      woman: 'Physical abuse reported — arrange medical and legal support and safety planning.'
    },
    'injured': {
      child: 'Child indicates they were hurt — arrange medical review and child welfare referral.',
      woman: 'Reported being hurt — recommend medical check and offer support/referral services.'
    },
    'has bruises': {
      child: 'Child has bruises — document injuries photographically, provide medical care and refer to child protection.',
      woman: 'Bruising observed — encourage medical evaluation and documentation; consider reporting options.'
    },
    'has wounds': {
      child: 'Child has wounds — urgent medical attention and child protection notification advised.',
      woman: 'Wounds present — arrange medical care and document injuries for follow-up.'
    },
    'choked': {
      child: 'Child reports being strangled — this is high risk; seek emergency medical care and immediate protection.',
      woman: 'Strangulation reported — immediate medical and safety measures required; escalate to emergency response.'
    },
    'physical assault': {
      child: 'Physical abuse reported for a child — ensure immediate safety, medical care and child protection referral.',
      woman: 'Physical abuse reported — arrange medical and legal support and safety planning.'
    },
    // Economic
    'kinuha ang pera': {
      child: 'Child is deprived of money/resources — ensure immediate basic needs are met and involve child protection.',
      woman: 'Money was taken — check for immediate financial needs and connect to social/financial support services.'
    },
    'walang binibigay na pera': {
      child: 'Child lacks financial support — ensure basic needs and notify child welfare services.',
      woman: 'No financial support — link to social assistance, financial counseling and livelihood programs.'
    },
    'hindi pinapayagang magtrabaho': {
      child: 'If a child is prevented from working or earning, check for exploitation and notify child protection.',
      woman: 'Prevented from working — connect to legal advice and economic empowerment resources.'
    },
    'sinusumbatan sa gastos': {
      child: 'Family restricts spending affecting a child — ensure child’s needs are secured and refer to support services.',
      woman: 'Controlled spending — refer to financial counselling and social services to secure basic needs.'
    },
    'kontrolado ang pera': {
      child: 'Child affected by financial control — ensure guardianship and protection of the child’s needs.',
      woman: 'Financial control reported — provide economic empowerment referrals and safety planning.'
    },
    'pinagkakaitan ng panggastos': {
      child: 'Child denied necessary funds — ensure basic needs and involve protection services.',
      woman: 'Denied access to funds — link to social support and consider protective interventions.'
    },
    'economic abuse': {
      child: 'Economic abuse affecting a child — secure basic needs and connect to child welfare services.',
      woman: 'Economic abuse reported — connect to social welfare, cash assistance and livelihood support.'
    },
    'pinagkakaitan ng kabuhayan': {
      child: 'Child impacted by deprivation of livelihood — prioritize meeting needs and referral to protection.',
      woman: 'Deprived of livelihood — refer to economic/legal support and social services.'
    },
    'pampinansyal na pang-aabuso': {
      child: 'Financial abuse affecting a child — ensure the child’s care needs are met and engage protection services.',
      woman: 'Financial abuse reported — provide referrals for financial aid and legal counsel.'
    },
    'kontrol sa pera': {
      child: 'Child affected by monetary control — ensure essentials are available and notify child protection.',
      woman: 'Control over money reported — advise seeking financial support services and safety planning.'
    },
    'pagkukulang sa suporta': {
      child: 'Lack of support for a child — secure immediate needs and refer to social services.',
      woman: 'Insufficient support — connect to social assistance and community resources.'
    },
    // English counterparts for Economic responses
    'took my money': {
      child: 'Child is deprived of money/resources — ensure immediate basic needs are met and involve child protection.',
      woman: 'Money was taken — check for immediate financial needs and connect to social/financial support services.'
    },
    'no financial support': {
      child: 'Child lacks financial support — ensure basic needs and notify child welfare services.',
      woman: 'No financial support — link to social assistance, financial counseling and livelihood programs.'
    },
    'not allowed to work': {
      child: 'If a child is prevented from working or earning, check for exploitation and notify child protection.',
      woman: 'Prevented from working — connect to legal advice and economic empowerment resources.'
    },
    'controls the money': {
      child: 'Child affected by financial control — ensure guardianship and protection of the child’s needs.',
      woman: 'Financial control reported — provide economic empowerment referrals and safety planning.'
    },
    'financial abuse': {
      child: 'Financial abuse affecting a child — ensure the child’s care needs are met and engage protection services.',
      woman: 'Financial abuse reported — provide referrals for financial aid and legal counsel.'
    },
    'withholding money': {
      child: 'Child denied necessary funds — ensure basic needs and involve protection services.',
      woman: 'Denied access to funds — link to social support and consider protective interventions.'
    },
    'economic control': {
      child: 'Child affected by monetary control — ensure essentials are available and notify child protection.',
      woman: 'Control over money reported — advise seeking financial support services and safety planning.'
    },
    'denied financial help': {
      child: 'Child impacted by deprivation of livelihood — prioritize meeting needs and referral to protection.',
      woman: 'Deprived of livelihood — refer to economic/legal support and social services.'
    },
    'not giving allowance': {
      child: 'Child lacks financial support — ensure basic needs and notify child welfare services.',
      woman: 'No financial support — link to social assistance, financial counseling and livelihood programs.'
    },
    'financial manipulation': {
      child: 'Financial abuse affecting a child — ensure the child’s care needs are met and engage protection services.',
      woman: 'Financial abuse reported — provide referrals for financial aid and legal counsel.'
    },
    // Psychological
    'minumura': {
      child: 'Child is verbally abused — offer psychosocial support and ensure a safe environment.',
      woman: 'Verbal abuse reported — provide counselling resources and safety planning.'
    },
    'inaalipusta': {
      child: 'Child is humiliated — provide protective psychosocial interventions and supportive caregivers.',
      woman: 'Subject to humiliation — suggest counselling and assertive support services.'
    },
    'pinapahiya': {
      child: 'Child feels shamed — prioritize psychosocial support and restore safe caregiving.',
      woman: 'Shaming behavior reported — recommend counselling and supportive services.'
    },
    'sinisigawan': {
      child: 'Child exposed to yelling — provide calm, supportive intervention and psychosocial follow-up.',
      woman: 'Exposed to shouting — refer to counselling and de-escalation strategies.'
    },
    'tinatakot': {
      child: 'Child is being threatened — immediate protective action and psychosocial support required.',
      woman: 'Being threatened — safety planning and legal/psychosocial referrals advised.'
    },
    'binabantaan': {
      child: 'Child faces threats — engage protection services and ensure safe placement.',
      woman: 'Receiving threats — document, prioritize safety, and connect to legal services.'
    },
    'inaaway lagi': {
      child: 'Child frequently in conflict situations — provide protective, therapeutic support and case management.',
      woman: 'Frequent conflicts reported — offer counselling and conflict-resolution referrals.'
    },
    'pinipilit sumunod': {
      child: 'Child is coerced to comply — check for coercion/exploitation and involve child protection.',
      woman: 'Coercion reported — offer psychosocial support and legal advice as needed.'
    },
    'psychological abuse': {
      child: 'Psychological abuse reported — prioritize child-focused psychosocial support and monitoring.',
      woman: 'Psychological abuse reported — refer to counselling and follow-up care.'
    },
    'emosyonal na pang-aabuso': {
      child: 'Emotional abuse of a child — arrange psychosocial interventions and ensure safe caregiving.',
      woman: 'Emotional abuse reported — arrange counselling and supportive services.'
    },
    'mental abuse': {
      child: 'Mental/emotional harm reported — prioritize child mental health services and support.',
      woman: 'Mental abuse reported — recommend mental health services and follow-up.'
    },
    'pang-aapi sa isip': {
      child: 'Psychological bullying or abuse — provide child-centered psychosocial care and monitoring.',
      woman: 'Mental oppression reported — connect to psychosocial support and counselling.'
    },
    'pagmamanipula': {
      child: 'Manipulation of a child — assess for coercion/exploitation and involve protection services.',
      woman: 'Manipulation reported — advise counselling and legal/advocacy referral.'
    },
    // English counterparts for Psychological responses
    'insulted': {
      child: 'Child is verbally abused — offer psychosocial support and ensure a safe environment.',
      woman: 'Verbal abuse reported — provide counselling resources and safety planning.'
    },
    'cursed at': {
      child: 'Child is verbally abused — offer psychosocial support and ensure a safe environment.',
      woman: 'Verbal abuse reported — provide counselling resources and safety planning.'
    },
    'humiliated': {
      child: 'Child is humiliated — provide protective psychosocial interventions and supportive caregivers.',
      woman: 'Subject to humiliation — suggest counselling and assertive support services.'
    },
    'shouted at': {
      child: 'Child exposed to yelling — provide calm, supportive intervention and psychosocial follow-up.',
      woman: 'Exposed to shouting — refer to counselling and de-escalation strategies.'
    },
    'threatened': {
      child: 'Child is being threatened — immediate protective action and psychosocial support required.',
      woman: 'Being threatened — safety planning and legal/psychosocial referrals advised.'
    },
    'always being yelled at': {
      child: 'Child frequently in conflict situations — provide protective, therapeutic support and case management.',
      woman: 'Frequent conflicts reported — offer counselling and conflict-resolution referrals.'
    },
    'forced to obey': {
      child: 'Child is coerced to comply — check for coercion/exploitation and involve child protection.',
      woman: 'Coercion reported — offer psychosocial support and legal advice as needed.'
    },
    'manipulated': {
      child: 'Manipulation of a child — assess for coercion/exploitation and involve protection services.',
      woman: 'Manipulation reported — advise counselling and legal/advocacy referral.'
    },
    'controlled emotionally': {
      child: 'Emotional abuse of a child — arrange psychosocial interventions and ensure safe caregiving.',
      woman: 'Emotional abuse reported — arrange counselling and supportive services.'
    },
    'emotionally abused': {
      child: 'Emotional abuse of a child — arrange psychosocial interventions and ensure safe caregiving.',
      woman: 'Emotional abuse reported — arrange counselling and supportive services.'
    },
    'verbal abuse': {
      child: 'Child is verbally abused — offer psychosocial support and ensure a safe environment.',
      woman: 'Verbal abuse reported — provide counselling resources and safety planning.'
    },
    'gaslighting': {
      child: 'Manipulation of a child — assess for coercion/exploitation and involve protection services.',
      woman: 'Manipulation reported — advise counselling and legal/advocacy referral.'
    },
    // Sexual
    'hinipuan': {
      child: 'Child reports being touched inappropriately — urgent child protection, medical exam and forensic referral required.',
      woman: 'Reported inappropriate touching — offer medical exam, psychosocial support and legal options.'
    },
    'pinilit': {
      child: 'Child forced into acts — immediate protective measures and forensic/medical care are needed.',
      woman: 'Forced sexual contact reported — immediate support, medical/forensic exam and legal referral recommended.'
    },
    'ginahasa': {
      child: 'Child raped — this is extremely high risk; emergency medical care, child protection and legal action are required immediately.',
      woman: 'Rape reported — immediate emergency medical care, forensic evidence collection and legal support should be arranged.'
    },
    'niyurakan': {
      child: 'Child suffered sexual violence — urgent medical and protection response required.',
      woman: 'Sexual assault with trauma reported — urgent medical and forensic support recommended.'
    },
    'pinuwersa': {
      child: 'Child forced into sexual acts — immediate protective intervention and medical/forensic care needed.',
      woman: 'Sexual coercion/force reported — prioritize safety, medical evaluation and legal referral.'
    },
    'minolestiya': {
      child: 'Molestation reported for a child — urgent child protection, medical exam and psychosocial support required.',
      woman: 'Molestation reported — provide medical, psychosocial and legal referrals.'
    },
    'hinubaran': {
      child: 'Child reports being undressed by another — this indicates sexual abuse; urgent protection and medical referral required.',
      woman: 'Reported being undressed forcibly — recommend immediate medical and legal support.'
    },
    'sekswal na pang-aabuso': {
      child: 'Sexual abuse of a child — immediate child protection, medical/forensic exam and psychosocial support are required.',
      woman: 'Sexual abuse reported — arrange medical, psychosocial and legal support.'
    },
    'rape': {
      child: 'Rape reported (child) — emergency response, forensic exam and child protection are critical.',
      woman: 'Rape reported — immediate medical/forensic care and legal assistance should be provided.'
    },
    'sexual assault': {
      child: 'Sexual assault of a child — urgent protective and medical actions required.',
      woman: 'Sexual assault reported — arrange urgent medical and legal support.'
    },
    'sexual harassment': {
      child: 'Sexual harassment affecting a child — provide protection, counselling and appropriate reporting.',
      woman: 'Sexual harassment reported — offer psychosocial support and reporting/legal options.'
    },
    'sekswal na karahasan': {
      child: 'Sexual violence reported against a child — immediate protection and medical/forensic examination required.',
      woman: 'Sexual violence reported — urgent medical and legal referrals recommended.'
    },
    'pinilit makipagtalik': {
      child: 'Child forced into sexual intercourse — this is a critical emergency; seek immediate protection and medical/forensic care.',
      woman: 'Forced intercourse reported — urgent medical and legal support should be arranged.'
    }
    ,
    // English counterparts for Sexual responses
    'touched without consent': {
      child: 'Child reports being touched inappropriately — urgent child protection, medical exam and forensic referral required.',
      woman: 'Reported inappropriate touching — offer medical exam, psychosocial support and legal options.'
    },
    'forced': {
      child: 'Child forced into acts — immediate protective measures and forensic/medical care are needed.',
      woman: 'Forced sexual contact reported — immediate support, medical/forensic exam and legal referral recommended.'
    },
    'raped': {
      child: 'Child raped — this is extremely high risk; emergency medical care, child protection and legal action are required immediately.',
      woman: 'Rape reported — immediate emergency medical care, forensic evidence collection and legal support should be arranged.'
    },
    'molested': {
      child: 'Molestation reported for a child — urgent child protection, medical exam and psychosocial support required.',
      woman: 'Molestation reported — provide medical, psychosocial and legal referrals.'
    },
    'sexually assaulted': {
      child: 'Sexual assault of a child — urgent protective and medical actions required.',
      woman: 'Sexual assault reported — arrange urgent medical and legal support.'
    },
    'harassed': {
      child: 'Sexual harassment affecting a child — provide protection, counselling and appropriate reporting.',
      woman: 'Sexual harassment reported — offer psychosocial support and reporting/legal options.'
    },
    'forced to have sex': {
      child: 'Child forced into sexual intercourse — this is a critical emergency; seek immediate protection and medical/forensic care.',
      woman: 'Forced intercourse reported — urgent medical and legal support should be arranged.'
    },
    'sexual abuse': {
      child: 'Sexual abuse of a child — immediate child protection, medical/forensic exam and psychosocial support are required.',
      woman: 'Sexual abuse reported — arrange medical, psychosocial and legal support.'
    },
    'sexual violence': {
      child: 'Sexual violence reported against a child — immediate protection and medical/forensic examination required.',
      woman: 'Sexual violence reported — urgent medical and legal referrals recommended.'
    },
    'sexual harassment': {
      child: 'Sexual harassment affecting a child — provide protection, counselling and appropriate reporting.',
      woman: 'Sexual harassment reported — offer psychosocial support and reporting/legal options.'
    }
  };

  // helper: check if any keyword in list appears in description
  function containsAny(desc, list) {
    for (const kw of list) {
      if (!kw) continue;
      if (desc.includes(kw)) return true;
    }
    return false;
  }

  // severity order: Sexual > Physical > Psychological > Economic
  let keywordMatchedRisk = null;
  if (containsAny(descriptionLower, KEYWORDS.Sexual)) keywordMatchedRisk = 'Sexual';
  else if (containsAny(descriptionLower, KEYWORDS.Physical)) keywordMatchedRisk = 'Physical';
  else if (containsAny(descriptionLower, KEYWORDS.Psychological)) keywordMatchedRisk = 'Psychological';
  else if (containsAny(descriptionLower, KEYWORDS.Economic)) keywordMatchedRisk = 'Economic';

  if (keywordMatchedRisk) {
    // Determine the exact matched keyword (prefer longer matches first)
    const allKeywords = [].concat(KEYWORDS.Sexual, KEYWORDS.Physical, KEYWORDS.Psychological, KEYWORDS.Economic);
    // sort by length desc so multi-word keywords are matched first
    allKeywords.sort((a, b) => b.length - a.length);
    let matchedKeyword = null;
    for (const kw of allKeywords) {
      if (!kw) continue;
      if (descriptionLower.includes(kw)) {
        matchedKeyword = kw;
        break;
      }
    }

    // Build tailored suggestion depending on victimType and specific keyword
    const vtRaw = (payload.victimType || payload.victimCategory || payload.victim || '').toString();
    const vt = (vtRaw || '').toLowerCase();

    let suggestion = null;
    if (matchedKeyword && KEYWORD_RESPONSES[matchedKeyword]) {
      const resp = KEYWORD_RESPONSES[matchedKeyword];
      suggestion = vt === 'child' ? resp.child : (vt === 'woman' ? resp.woman : resp.woman || resp.child);
    }
    if (!suggestion) {
      // fallback to category-level tailored suggestions
      function tailoredSuggestionFor(risk, victimTypeRaw) {
        const v = (victimTypeRaw || '').toLowerCase();
        if (risk === 'Sexual') {
          if (v === 'child') return 'Child victim — high priority: ensure immediate safety, arrange medical/forensic exam, notify child protection and legal support.';
          return 'Sexual incident involving an adult woman — immediate safety, medical/forensic exam and legal support recommended.';
        }
        if (risk === 'Physical') {
          if (v === 'child') return 'Child victim with physical harm — urgent medical attention and child protection referral.';
          return 'Physical violence reported — prioritize medical attention and safety planning.';
        }
        if (risk === 'Psychological') {
          if (v === 'child') return 'Child showing psychological harm — prioritize safe environment and rapid child-focused psychosocial support.';
          return 'Psychological harm — prioritize counselling and follow-up; escalate if symptoms worsen.';
        }
        if (risk === 'Economic') {
          if (v === 'child') return 'Child affected by economic abuse — prioritize meeting basic needs and child protection measures.';
          return 'Economic abuse reported — connect to financial and social support services and monitor for escalation.';
        }
        return getDetailedSuggestion(risk, payload.incidentType);
      }
      suggestion = tailoredSuggestionFor(keywordMatchedRisk, payload.victimType || payload.victimCategory || '');
    }

    const predictedRisk = keywordMatchedRisk;
    const storedRisk = mapPredictedRiskToStored(predictedRisk);
    const immediateProb = (predictedRisk === 'Sexual' || predictedRisk === 'Physical') ? 1.0 : 0.3;
    const requiresImmediate = immediateProb >= 0.5;

    return { predictedRisk, storedRisk, probabilities: [], suggestion, immediateAssistanceProbability: immediateProb, requiresImmediateAssistance: requiresImmediate, keywordMatched: true, matchedKeyword };
  }
  // Evaluate rule-based overrides first (if any rules match, they take precedence)
  try {
    // Ensure engine initialized
    initEngine();
    const ruleResult = await evaluateRules(payload);
    if (ruleResult && ruleResult.matched && Array.isArray(ruleResult.events) && ruleResult.events.length) {
      // Use the first event's params as override if provided
      const ev = ruleResult.events[0];
      const override = ev.params || {};
      const predictedRisk = override.predictedRisk || override.risk || (override.action === 'escalate' ? 'Sexual' : null);
      const storedRisk = mapPredictedRiskToStored(predictedRisk || null);
      const suggestion = override.suggestion || getDetailedSuggestion(predictedRisk || null, payload.incidentType);
      const immediateProb = override.immediateProbability || 1.0;
      const requiresImmediate = !!override.requiresImmediate || immediateProb >= 0.5;
      return { predictedRisk, storedRisk, probabilities: override.probabilities || [], suggestion, immediateAssistanceProbability: immediateProb, requiresImmediateAssistance: requiresImmediate, ruleMatched: true, ruleEvent: ev };
    }
  } catch (e) {
    console.warn('Rules engine failed during suggestForCase', e && e.message);
  }
  // payload: { incidentType, description, assignedOfficer, status }
  const itVec = incidentTypeToOneHot(payload.incidentType || 'Other');
  const status = payload.status === 'Open' || payload.status === 'Under Investigation' ? 1 : 0;
  const assigned = payload.assignedOfficer ? 1 : 0;
  const descLen = (payload.description || '').length;
  const descBucket = Math.min(1, Math.floor(descLen / 200));
  const feat = [...itVec, status, assigned, descBucket];

  if (modelObj && modelObj.model) {
    const logits = modelObj.model.predict(tf.tensor2d([feat]));
    const probs = Array.from(await logits.data());
    const idx = probs.indexOf(Math.max(...probs));
    const predictedRisk = indexToRiskLabel(idx);

    const suggestion = getDetailedSuggestion(predictedRisk, payload.incidentType);

    // Probability that immediate assistance is required (Physical or Sexual)
    const immediateProb = (probs[2] || 0) + (probs[3] || 0);
    const requiresImmediate = immediateProb >= 0.5;

  // Also include a mapping to stored risk levels used by case records (Low/Medium/High)
  const storedRisk = mapPredictedRiskToStored(predictedRisk);
  return { predictedRisk, storedRisk, probabilities: probs, suggestion, immediateAssistanceProbability: immediateProb, requiresImmediateAssistance: requiresImmediate };
  }

  // heuristics fallback
  // Determine heuristic index
  let heuristicIdx = 0; // default Economic
  const itLower = (payload.incidentType || '').toLowerCase();
  if (itLower === 'sexual') heuristicIdx = 3;
  else if (itLower === 'physical') heuristicIdx = 2;
  else if (itLower === 'psychological' || itLower === 'psychological abuse') heuristicIdx = 1;
  else if (itLower === 'economic' || itLower === 'financial') heuristicIdx = 0;
  else if (descLen > 500) heuristicIdx = 2; // long descriptions -> physical
  else if (payload.perpetrator) heuristicIdx = 2;

  const heuristicRisk = indexToRiskLabel(heuristicIdx);

  // Build a simple probability vector that places most mass on the heuristicIdx
  const probs = [0, 0, 0, 0].map(() => 0.0);
  const base = 0.05;
  for (let i = 0; i < probs.length; i++) probs[i] = base;
  probs[heuristicIdx] = 1 - base * (probs.length - 1);

  const suggestion = getDetailedSuggestion(heuristicRisk, payload.incidentType);

  // Also report immediate assistance probability (Physical + Sexual)
  const immediateProb = (probs[2] || 0) + (probs[3] || 0);
  const requiresImmediate = immediateProb >= 0.5;

  const storedRisk = mapPredictedRiskToStored(heuristicRisk);
  return { predictedRisk: heuristicRisk, storedRisk, probabilities: probs, suggestion, immediateAssistanceProbability: immediateProb, requiresImmediateAssistance: requiresImmediate };
}

/**
* Map the 4-class predicted risk (Economic/Psychological/Physical/Sexual)
* to the stored 3-level risk used in Cases (Low/Medium/High).
*/
function mapPredictedRiskToStored(predicted) {
  const p = (predicted || '').toLowerCase();
  if (p === 'economic') return 'Low';
  if (p === 'psychological') return 'Medium';
  if (p === 'physical') return 'High';
  if (p === 'sexual') return 'High';
  return 'Low';
}

module.exports = {
  trainModelFromCases,
  suggestForCase,
};
