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
  if (t === 'sexual' || t === 'physical') return 'High';
  if (t === 'psychological') return 'Medium';
  if (t === 'economic') return 'Low';
  return 'Medium'; // Default to Medium for safety
}

function adjustRiskForVictimType(baseRisk, victimType, isManualOverride = false) {
  // If it's a manual override, don't adjust the risk level
  if (isManualOverride) {
    return baseRisk;
  }

  const vt = normalizeVictimType(victimType);
  if (vt === 'child') {
    // Children always get elevated risk (unless manual override)
    if (baseRisk === 'Low') return 'Medium';
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
      'ginahasa', 'nirape', 'hinalay', 'hinipuan', 'pinagsamantalahan', 'sekswal na karahasan', 
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
  
  // Check high severity first
  for (const kw of SEVERITY_KEYWORDS.High[type] || []) {
    if (desc.includes(kw.toLowerCase())) return 'High';
  }
  for (const kw of SEVERITY_KEYWORDS.Medium[type] || []) {
    if (desc.includes(kw.toLowerCase())) return 'Medium';
  }
  for (const kw of SEVERITY_KEYWORDS.Low[type] || []) {
    if (desc.includes(kw.toLowerCase())) return 'Low';
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
        sexual: 'URGENT: Immediate child protection and medical response required.\n' +
               '1. Contact child protection services immediately\n' +
               '2. Arrange emergency medical exam and documentation\n' +
               '3. Secure safe placement away from perpetrator\n' +
               '4. Coordinate with police and legal services\n' +
               '5. Assign emergency case worker for 24/7 support\n' +
               '6. Arrange trauma-informed counseling',
        physical: 'URGENT: Immediate protective intervention needed.\n' +
                 '1. Document injuries and arrange medical care\n' +
                 '2. Contact child protection services\n' +
                 '3. Remove child from dangerous environment\n' +
                 '4. File police report and gather evidence\n' +
                 '5. Arrange emergency shelter if needed\n' +
                 '6. Begin trauma-informed support',
        psychological: 'HIGH RISK: Urgent mental health intervention required.\n' +
                      '1. Assess suicide/self-harm risk immediately\n' +
                      '2. Contact child protection services\n' +
                      '3. Arrange emergency counseling\n' +
                      '4. Create safety plan with guardians\n' +
                      '5. Monitor closely and follow up daily',
        economic: 'URGENT: Basic needs and safety at risk.\n' +
                 '1. Assess immediate needs (food, shelter, medical)\n' +
                 '2. Contact child welfare services\n' +
                 '3. Arrange emergency assistance\n' +
                 '4. Ensure school continuity\n' +
                 '5. Connect to social services'
      },
      Medium: {
        sexual: 'PRIORITY: Protective intervention needed.\n' +
               '1. Report to child protection services\n' +
               '2. Arrange medical check and documentation\n' +
               '3. Begin counseling and support services\n' +
               '4. Create safety plan with family/guardians\n' +
               '5. Monitor situation closely',
        physical: 'PRIORITY: Protection and support needed.\n' +
                 '1. Document any injuries\n' +
                 '2. Arrange medical check if needed\n' +
                 '3. Contact child protection services\n' +
                 '4. Begin regular monitoring\n' +
                 '5. Arrange counseling support',
        psychological: 'PRIORITY: Mental health support needed.\n' +
                      '1. Begin regular counseling\n' +
                      '2. Assess home environment\n' +
                      '3. Create support plan with guardians\n' +
                      '4. Monitor school performance\n' +
                      '5. Schedule weekly check-ins',
        economic: 'PRIORITY: Support services needed.\n' +
                 '1. Assess family resources\n' +
                 '2. Connect to assistance programs\n' +
                 '3. Ensure educational access\n' +
                 '4. Monitor basic needs\n' +
                 '5. Regular welfare checks'
      },
      Low: {
        sexual: 'MONITOR: Preventive intervention needed.\n' +
               '1. Document concerns\n' +
               '2. Begin preventive counseling\n' +
               '3. Educate about boundaries\n' +
               '4. Create safety awareness plan\n' +
               '5. Schedule regular check-ins',
        physical: 'MONITOR: Support and prevention needed.\n' +
                 '1. Document situation\n' +
                 '2. Begin family support services\n' +
                 '3. Arrange counseling\n' +
                 '4. Create safety plan\n' +
                 '5. Regular monitoring',
        psychological: 'MONITOR: Support services recommended.\n' +
                      '1. Begin counseling support\n' +
                      '2. Create coping strategies\n' +
                      '3. Work with family/school\n' +
                      '4. Regular check-ins\n' +
                      '5. Monitor behavior changes',
        economic: 'MONITOR: Support services recommended.\n' +
                 '1. Assess needs\n' +
                 '2. Connect to resources\n' +
                 '3. Monitor school attendance\n' +
                 '4. Regular welfare checks\n' +
                 '5. Provide family support'
      }
    },
    woman: {
      High: {
        sexual: 'URGENT: Immediate intervention required.\n' +
               '1. Arrange emergency medical exam\n' +
               '2. Contact police/legal services\n' +
               '3. Secure safe accommodation\n' +
               '4. Begin crisis counseling\n' +
               '5. Create safety plan\n' +
               '6. Connect to support services',
        physical: 'URGENT: Immediate safety measures needed.\n' +
                 '1. Document injuries and evidence\n' +
                 '2. Arrange medical care\n' +
                 '3. Contact police if desired\n' +
                 '4. Secure safe shelter\n' +
                 '5. Create escape plan\n' +
                 '6. Begin support services',
        psychological: 'HIGH RISK: Urgent support needed.\n' +
                      '1. Assess suicide/harm risk\n' +
                      '2. Begin crisis counseling\n' +
                      '3. Create safety plan\n' +
                      '4. Connect to support services\n' +
                      '5. Regular monitoring',
        economic: 'URGENT: Critical support needed.\n' +
                 '1. Assess immediate needs\n' +
                 '2. Arrange emergency assistance\n' +
                 '3. Connect to shelter services\n' +
                 '4. Begin financial counseling\n' +
                 '5. Create independence plan'
      },
      Medium: {
        sexual: 'PRIORITY: Protection and support needed.\n' +
               '1. Document incidents\n' +
               '2. Arrange counseling\n' +
               '3. Create safety plan\n' +
               '4. Connect to support groups\n' +
               '5. Discuss reporting options',
        physical: 'PRIORITY: Safety planning needed.\n' +
                 '1. Document incidents\n' +
                 '2. Create safety plan\n' +
                 '3. Connect to support services\n' +
                 '4. Begin counseling\n' +
                 '5. Discuss legal options',
        psychological: 'PRIORITY: Support services needed.\n' +
                      '1. Begin counseling\n' +
                      '2. Create coping strategies\n' +
                      '3. Build support network\n' +
                      '4. Regular check-ins\n' +
                      '5. Safety planning',
        economic: 'PRIORITY: Support services needed.\n' +
                 '1. Financial counseling\n' +
                 '2. Job search assistance\n' +
                 '3. Connect to resources\n' +
                 '4. Create budget plan\n' +
                 '5. Regular monitoring'
      },
      Low: {
        sexual: 'MONITOR: Support recommended.\n' +
               '1. Document concerns\n' +
               '2. Discuss boundaries\n' +
               '3. Connect to counseling\n' +
               '4. Create safety awareness\n' +
               '5. Regular check-ins',
        physical: 'MONITOR: Prevention needed.\n' +
                 '1. Document situation\n' +
                 '2. Create safety plan\n' +
                 '3. Connect to counseling\n' +
                 '4. Build support network\n' +
                 '5. Regular check-ins',
        psychological: 'MONITOR: Support recommended.\n' +
                      '1. Begin counseling\n' +
                      '2. Build coping skills\n' +
                      '3. Create support network\n' +
                      '4. Regular check-ins\n' +
                      '5. Monitor changes',
        economic: 'MONITOR: Support recommended.\n' +
                 '1. Financial counseling\n' +
                 '2. Resource connection\n' +
                 '3. Skills development\n' +
                 '4. Create action plan\n' +
                 '5. Regular monitoring'
      }
    },
    anonymous: {
      High: {
        sexual: 'URGENT RESPONSE NEEDED\n' +
               '1. Document all available details\n' +
               '2. Attempt to identify victim safely\n' +
               '3. Contact authorities if location known\n' +
               '4. Mobilize local support services\n' +
               '5. Monitor for additional reports\n' +
               '6. Keep report channel open',
        physical: 'URGENT RESPONSE NEEDED\n' +
                 '1. Document reported violence\n' +
                 '2. Alert local authorities if location known\n' +
                 '3. Attempt to establish safe contact\n' +
                 '4. Monitor situation\n' +
                 '5. Keep report channel open',
        psychological: 'HIGH RISK SITUATION\n' +
                      '1. Document reported threats\n' +
                      '2. Attempt to establish safe contact\n' +
                      '3. Provide crisis hotline information\n' +
                      '4. Monitor for escalation\n' +
                      '5. Keep communication open',
        economic: 'URGENT SUPPORT NEEDED\n' +
                 '1. Document reported situation\n' +
                 '2. Provide resource information\n' +
                 '3. List local support services\n' +
                 '4. Keep report channel open\n' +
                 '5. Monitor for updates'
      },
      Medium: {
        sexual: 'PRIORITY RESPONSE\n' +
               '1. Document reported harassment\n' +
               '2. Provide safety resources\n' +
               '3. List support services\n' +
               '4. Monitor situation\n' +
               '5. Keep channel open',
        physical: 'PRIORITY RESPONSE\n' +
                 '1. Document reported incidents\n' +
                 '2. Provide safety planning info\n' +
                 '3. List local resources\n' +
                 '4. Monitor situation\n' +
                 '5. Maintain open channel',
        psychological: 'SUPPORT NEEDED\n' +
                      '1. Document reported abuse\n' +
                      '2. Provide counseling resources\n' +
                      '3. Share coping strategies\n' +
                      '4. List support services\n' +
                      '5. Keep channel open',
        economic: 'SUPPORT NEEDED\n' +
                 '1. Document situation\n' +
                 '2. Provide resource list\n' +
                 '3. Share support options\n' +
                 '4. Monitor for changes\n' +
                 '5. Maintain contact'
      },
      Low: {
        sexual: 'MONITOR SITUATION\n' +
               '1. Document reported concerns\n' +
               '2. Provide safety information\n' +
               '3. List available resources\n' +
               '4. Keep channel open\n' +
               '5. Monitor for escalation',
        physical: 'MONITOR SITUATION\n' +
                 '1. Document reports\n' +
                 '2. Share safety resources\n' +
                 '3. List support services\n' +
                 '4. Keep channel open\n' +
                 '5. Watch for changes',
        psychological: 'MONITOR SITUATION\n' +
                      '1. Document concerns\n' +
                      '2. Provide support resources\n' +
                      '3. Share coping information\n' +
                      '4. Keep channel open\n' +
                      '5. Monitor reports',
        economic: 'MONITOR SITUATION\n' +
                 '1. Document reports\n' +
                 '2. Share resource list\n' +
                 '3. Provide support options\n' +
                 '4. Keep channel open\n' +
                 '5. Watch for changes'
      }
    }
  };

  const defaultResponse = 'Review case and provide appropriate support or referrals. Assign case officer to follow up.';

  try {
    return solutions[vt][risk][it] || solutions[vt][risk]['physical'] || defaultResponse;
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
  const adjustedRisk = adjustRiskForVictimType(baseRisk, victimType, isManualOverride);
  console.log('Adjusted risk:', adjustedRisk);
  
  // Get specific solution-focused suggestion
  console.log('Getting suggestion for:', { risk: adjustedRisk, incidentType: payload.incidentType, victimType });
  const suggestion = getSolutionSuggestion(adjustedRisk, payload.incidentType, victimType);
  
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
      
      // Get ML prediction
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
      // If confidence is low, stick with rule-based assessment
    } catch (error) {
      console.error('ML prediction error:', error);
      // Continue with rule-based assessment
    }
  }
  
  // Calculate probabilities for the risk levels
  const probs = synthesizeProbabilities(payload.incidentType, adjustedRisk);
  
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
    // Original calculation for automated assessment
    immediateProb = (probs[2] || 0) + (probs[3] || 0) + (adjustedRisk === 'High' ? 0.3 : 0);
  }
  
  // Adjust for children, but respect manual override
  const finalImmediateProb = (!isManualOverride && victimType === 'child') ? 
    Math.max(immediateProb, 0.6) : immediateProb;
  
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
  
  // Format incident type to Title Case (match rule values like 'Psychological')
  const formattedIncidentType = payload.incidentType ? (
    payload.incidentType.split(/\s+/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ')
  ) : '';
  
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
  const finalSuggestion = getSolutionSuggestion(adjustedRisk, payload.incidentType, victimType);

  // Return object with proper handling of incident type and risk level
  // Build human-readable explanations for the probability vector (keeps numeric array in `dssProbabilities`)
  const canonicalTypes = ['Economic', 'Psychological', 'Physical', 'Sexual'];
  const dssProbabilitiesExplanation = canonicalTypes.map((label, i) => ({
    label,
    probability: Number((probs[i] || 0).toFixed(3)),
    description: `Estimated probability the case involves ${label.toLowerCase()} harm based on rule-based and heuristic analysis.`,
    recommendedAction: label === 'Sexual' || label === 'Physical' ? 'Prioritize immediate safety and medical/legal referral' : 'Provide counseling/support and monitor for escalation'
  }));

  return {
    predictedRisk: originalIncidentType || 'Unknown',
    incidentType: originalIncidentType,
    riskLevel: adjustedRisk,
    mlPrediction: mlPrediction ? {
      risk: mlPrediction,
      confidence: confidence
    } : null,
    // DSS fields that match the schema
    dssPredictedRisk: originalIncidentType || 'Unknown',
    dssStoredRisk: adjustedRisk,
    dssProbabilities: probs,
  dssProbabilitiesExplanation: dssProbabilitiesExplanation,
    dssImmediateAssistanceProbability: finalImmediateProb,
    dssSuggestion: finalSuggestion || suggestion || 'Based on the case details, a specific recommendation will be provided by the assigned officer.',
    dssRuleMatched: ruleResult.matched,
    dssChosenRule: ruleResult.matched && ruleResult.events.length > 0 ? ruleResult.events[0] : null,
    dssManualOverride: isManualOverride,
    // Additional fields for API response
    suggestion: finalSuggestion || suggestion || 'Based on the case details, a specific recommendation will be provided by the assigned officer.',
    requiresImmediateAssistance: isManualOverride ? (adjustedRisk === 'High') : (finalImmediateProb >= 0.5 || adjustedRisk === 'High'),
    ruleDetails: ruleResult.matched && ruleResult.events.length > 0 ? ruleResult.events[0] : null,
    severity,
    victimType,
    // Add database fields with correct names
    dssPredictedRisk: originalIncidentType,
    dssStoredRisk: adjustedRisk,
    dssSuggestion: suggestion || '',
    dssRuleMatched: ruleResult.matched,
    dssChosenRule: ruleResult.matched && ruleResult.events.length > 0 ? ruleResult.events[0] : null,
    dssManualOverride: !!payload.riskLevel  // true if risk level was manually provided
  };
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
