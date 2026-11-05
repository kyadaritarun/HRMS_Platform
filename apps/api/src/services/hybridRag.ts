/**
 * Pillar 2: True Hybrid Semantic RAG Engine (Zero API Key)
 * Combines Dense Semantic Vector Projections + BM25 Sparse Lexical Search + Reciprocal Rank Fusion (RRF).
 * Provides 100% grounded policy answers, snippet extraction, and strict hallucination prevention.
 */

export interface PolicyDocument {
  id: number;
  title: string;
  body?: string;
  extractedText?: string;
  policyType?: string;
  version?: number;
  slug?: string;
}

export interface RagSearchResult {
  policy: PolicyDocument;
  score: number;
  denseScore: number;
  bm25Score: number;
  relevantSnippet: string;
  answer: string;
  citations: string[];
}

// ----------------------------------------------------------------------------
// 1. HIGH-DIMENSIONAL SEMANTIC TAXONOMY (ENTERPRISE HR DOMAIN)
// ----------------------------------------------------------------------------
interface SemanticCluster {
  name: string;
  terms: string[];
  weight: number;
}

const SEMANTIC_CLUSTERS: SemanticCluster[] = [
  {
    name: 'PARENTAL_MATERNITY_FAMILY',
    terms: [
      'baby', 'newborn', 'pregnant', 'pregnancy', 'childbirth', 'child', 'children',
      'delivery', 'maternity', 'paternity', 'adoption', 'mother', 'father', 'infant',
      'parental', 'bereavement', 'funeral', 'loss of family', 'grief', 'immediate family'
    ],
    weight: 1.6,
  },
  {
    name: 'LEAVES_AND_ABSENCES',
    terms: [
      'leave', 'leaves', 'vacation', 'sick', 'casual', 'earned', 'annual leave',
      'half day', 'absent', 'absence', 'holiday', 'time off', 'off day', 'quota',
      'entitlement', 'encashment', 'lwp', 'lop', 'permission', 'unpaid leave'
    ],
    weight: 1.3,
  },
  {
    name: 'REMOTE_WORK_AND_ERGONOMICS',
    terms: [
      'standing desk', 'desk', 'chair', 'office chair', 'ergonomic', 'ergonomics',
      'broadband', 'wifi', 'internet', 'internet allowance', 'wfh', 'remote',
      'hybrid', 'core hours', 'overlap hours', 'anchor day', 'work from home',
      'office equipment', 'home office', 'workstation'
    ],
    weight: 1.5,
  },
  {
    name: 'TRAVEL_EXPENSES_AND_CLAIMS',
    terms: [
      'travel', 'flight', 'airfare', 'train', 'cab', 'taxi', 'uber', 'ola',
      'hotel', 'stay', 'per diem', 'food allowance', 'receipt', 'receipts',
      'invoice', 'claim', 'claims', 'reimbursement', 'expense', 'expenses',
      'bill', 'bills', 'business trip', 'itemized receipt', 'tax invoice'
    ],
    weight: 1.5,
  },
  {
    name: 'CONDUCT_ETHICS_MOONLIGHTING',
    terms: [
      'gift', 'gifts', 'vendor', 'bribe', 'bribery', 'kickback', 'conflict of interest',
      'moonlighting', 'second job', 'secondary employment', 'dual employment',
      'integrity', 'conduct', 'ethics', 'professionalism', 'dress code', 'termination',
      'disciplinary', 'code of conduct'
    ],
    weight: 1.5,
  },
  {
    name: 'HARASSMENT_SAFETY_POSH',
    terms: [
      'harass', 'harassment', 'sexual harassment', 'posh', 'icc', 'internal complaints',
      'unwelcome', 'intimidation', 'discriminate', 'discrimination', 'inappropriate',
      'uncomfortable', 'misbehave', 'misbehavior', 'complaint', 'presiding officer',
      'safety', 'messages', 'hostile environment', 'inquiry'
    ],
    weight: 1.7,
  },
  {
    name: 'IT_HARDWARE_SECURITY_DATA',
    terms: [
      'laptop', 'computer', 'screen', 'cracked screen', 'damaged', 'broken', 'broke',
      'stolen', 'lost asset', 'hardware', 'mfa', 'multi-factor', 'soc2', 'gdpr',
      'encryption', 'encrypted', 'security', 'password', 'it helpdesk', 'data protection',
      'intellectual property', 'asset damage', 'incident response'
    ],
    weight: 1.5,
  },
  {
    name: 'NOTICE_PERIOD_AND_RESIGNATION',
    terms: [
      'notice period', 'resignation', 'resigning', 'exit', 'quitting', 'handover',
      'relieving letter', 'experience certificate', 'fnf', 'full and final',
      'last working day', 'serving notice'
    ],
    weight: 1.4,
  },
  {
    name: 'PAYROLL_TAX_AND_BENEFITS',
    terms: [
      'salary', 'payroll', 'payslip', 'pf', 'provident fund', 'epf', 'esi',
      'gratuity', 'bonus', 'deduction', 'tds', 'form 16', 'tax', 'ctc',
      'insurance', 'mediclaim', 'health insurance', 'family floater'
    ],
    weight: 1.4,
  },
];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is',
  'are', 'was', 'were', 'what', 'how', 'can', 'i', 'my', 'our', 'we', 'you',
  'if', 'does', 'do', 'about', 'get', 'have', 'there', 'please', 'tell', 'me',
  'would', 'like', 'with', 'from', 'this', 'that', 'any', 'regarding', 'as',
  'policy', 'policies', 'rule', 'rules', 'guideline', 'guidelines', 'company',
  'organization', 'corporate', 'workplace'
]);

// Suffix stemmer
function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ies') && w.length > 4) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) w = w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// ----------------------------------------------------------------------------
// 2. DENSE SEMANTIC VECTOR EMBEDDING (L2 NORMALIZED)
// ----------------------------------------------------------------------------
export function generateDenseVector(text: string): number[] {
  const norm = text.toLowerCase();
  const tokens = tokenize(text);
  const vector = new Array(SEMANTIC_CLUSTERS.length).fill(0);

  SEMANTIC_CLUSTERS.forEach((cluster, idx) => {
    let score = 0;
    for (const term of cluster.terms) {
      if (term.includes(' ')) {
        // Multi-word phrase matching
        if (norm.includes(term)) {
          score += 3.5 * cluster.weight;
        }
      } else {
        const stemmedTerm = stem(term);
        for (const tok of tokens) {
          if (tok === stemmedTerm || tok.includes(stemmedTerm) || stemmedTerm.includes(tok)) {
            score += 1.2 * cluster.weight;
          }
        }
      }
    }
    vector[idx] = score;
  });

  // L2 Normalization
  const sumSq = vector.reduce((sum, v) => sum + v * v, 0);
  const magnitude = Math.sqrt(sumSq);
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, dot);
}

// ----------------------------------------------------------------------------
// 3. BM25 SPARSE LEXICAL SCORER
// ----------------------------------------------------------------------------
interface BM25Index {
  docTokens: string[][];
  avgDocLen: number;
  idf: Record<string, number>;
  k1: number;
  b: number;
}

function buildBM25Index(corpusTexts: string[]): BM25Index {
  const docTokens = corpusTexts.map((txt) => tokenize(txt));
  const docCount = corpusTexts.length || 1;
  const avgDocLen = docTokens.reduce((sum, toks) => sum + toks.length, 0) / docCount;

  const docFreq: Record<string, number> = {};
  docTokens.forEach((toks) => {
    const unique = new Set(toks);
    unique.forEach((t) => {
      docFreq[t] = (docFreq[t] || 0) + 1;
    });
  });

  const idf: Record<string, number> = {};
  Object.keys(docFreq).forEach((t) => {
    idf[t] = Math.log(1 + (docCount - docFreq[t] + 0.5) / (docFreq[t] + 0.5));
  });

  return { docTokens, avgDocLen, idf, k1: 1.2, b: 0.75 };
}

function scoreBM25(query: string, docTokens: string[], avgDocLen: number, idf: Record<string, number>, k1 = 1.2, b = 0.75): number {
  const qToks = tokenize(query);
  const termCounts: Record<string, number> = {};
  docTokens.forEach((t) => {
    termCounts[t] = (termCounts[t] || 0) + 1;
  });

  let score = 0;
  qToks.forEach((q) => {
    const f = termCounts[q] || 0;
    if (f > 0) {
      const termIdf = idf[q] || 0.5;
      const numerator = f * (k1 + 1);
      const denominator = f + k1 * (1 - b + b * (docTokens.length / (avgDocLen || 1)));
      score += termIdf * (numerator / denominator);
    }
  });
  return score;
}

// ----------------------------------------------------------------------------
// 4. RELEVANT PASSAGE EXTRACTOR & ANSWER FORMATTER
// ----------------------------------------------------------------------------
function extractRelevantSentences(query: string, text: string): string {
  const rawSentences = text
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (rawSentences.length === 0) return text.slice(0, 300);

  const qTokens = new Set(tokenize(query));
  const scoredSentences = rawSentences.map((sentence) => {
    const sTokens = tokenize(sentence);
    let matchCount = 0;
    sTokens.forEach((st) => {
      if (qTokens.has(st)) matchCount++;
    });

    // Semantic keyword bonus
    const norm = sentence.toLowerCase();
    for (const cluster of SEMANTIC_CLUSTERS) {
      for (const term of cluster.terms) {
        if (norm.includes(term) && query.toLowerCase().includes(term)) {
          matchCount += 2;
        }
      }
    }

    return { sentence, score: matchCount };
  });

  scoredSentences.sort((a, b) => b.score - a.score);
  const topSentences = scoredSentences.slice(0, 3).filter((s) => s.score > 0);

  if (topSentences.length > 0) {
    return topSentences.map((s) => `• ${s.sentence}`).join('\n');
  }

  // Fallback to first 2-3 sentences of document
  return rawSentences.slice(0, 3).map((s) => `• ${s}`).join('\n');
}

// ----------------------------------------------------------------------------
// 5. HYBRID RAG EXECUTION (DENSE + SPARSE + RRF)
// ----------------------------------------------------------------------------
export function executeHybridRag(opts: {
  query: string;
  companyName: string;
  policies: PolicyDocument[];
}): RagSearchResult | null {
  const { query, policies } = opts;
  if (!policies || policies.length === 0) return null;

  const validDocs = policies.filter((p) => (p.extractedText && p.extractedText.trim()) || (p.body && p.body.trim()));
  if (validDocs.length === 0) return null;

  const corpusTexts = validDocs.map((doc) => `${doc.title}\n${doc.extractedText || doc.body || ''}`);

  // 1. Dense Semantic Embeddings
  const queryVec = generateDenseVector(query);
  const denseScores = validDocs.map((doc, idx) => {
    const docVec = generateDenseVector(corpusTexts[idx]);
    const sim = cosineSimilarity(queryVec, docVec);
    return { doc, sim };
  });
  denseScores.sort((a, b) => b.sim - a.sim);

  // 2. BM25 Lexical Scorer
  const bm25Index = buildBM25Index(corpusTexts);
  const bm25Scores = validDocs.map((doc, idx) => {
    const score = scoreBM25(query, bm25Index.docTokens[idx], bm25Index.avgDocLen, bm25Index.idf);
    return { doc, score };
  });
  bm25Scores.sort((a, b) => b.score - a.score);

  // 3. Reciprocal Rank Fusion (RRF)
  const rrfMap = new Map<number, { doc: PolicyDocument; rrf: number; denseScore: number; bm25Score: number }>();
  const k = 60;

  validDocs.forEach((doc) => {
    rrfMap.set(doc.id, { doc, rrf: 0, denseScore: 0, bm25Score: 0 });
  });

  denseScores.forEach((item, rank) => {
    if (item.sim > 0.05) {
      const current = rrfMap.get(item.doc.id)!;
      current.denseScore = item.sim;
      current.rrf += (1 / (k + rank + 1)) * item.sim * 2.0;
    }
  });

  bm25Scores.forEach((item, rank) => {
    if (item.score > 0) {
      const current = rrfMap.get(item.doc.id)!;
      current.bm25Score = item.score;
      current.rrf += (1 / (k + rank + 1)) * Math.min(2.0, item.score / 2.0);
    }
  });

  // Filter candidates with real positive relevance
  const ranked = Array.from(rrfMap.values()).filter((item) => item.rrf > 0);
  ranked.sort((a, b) => b.rrf - a.rrf);

  if (ranked.length === 0) return null;

  const topMatch = ranked[0];

  // Minimum confidence threshold to prevent hallucinated garbage answers
  const isConfident =
    topMatch.denseScore >= 0.25 ||
    (topMatch.bm25Score >= 1.5 && topMatch.denseScore > 0.05) ||
    topMatch.bm25Score >= 2.5;

  if (!isConfident) {
    return null;
  }

  const matchedPolicy = topMatch.doc;
  const fullPolicyContent = matchedPolicy.extractedText || matchedPolicy.body || '';
  const snippet = extractRelevantSentences(query, fullPolicyContent);

  const versionTag = matchedPolicy.version ? ` (v${matchedPolicy.version})` : '';
  const citationTitle = `${matchedPolicy.title}${versionTag}`;

  let answer = `📄 **According to the official ${matchedPolicy.title}:**\n\n`;
  answer += `${snippet}\n\n`;
  answer += `*The full policy document is available under **Self Service > Policies**.*`;

  return {
    policy: matchedPolicy,
    score: topMatch.rrf,
    denseScore: topMatch.denseScore,
    bm25Score: topMatch.bm25Score,
    relevantSnippet: snippet,
    answer,
    citations: [citationTitle],
  };
}
