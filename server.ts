import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side OpenAI client (left null when no key is configured, so routes
// can fall back to non-AI behavior instead of the server crashing on boot)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const OPENAI_MODEL = 'gpt-4o-mini';

async function generateJSON(systemInstruction: string, prompt: string): Promise<any> {
  if (!openai) throw new Error('OPENAI_API_KEY is not set');
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(response.choices[0]?.message?.content || '{}');
}

// Helper for fast algorithmic word diff & fallback score
function computeFallbackEvaluation(target: string, spoken: string, isJapanese: boolean = false) {
  const cleanTarget = target.trim().toLowerCase().replace(/[.,?!'、。！？]/g, '');
  const cleanSpoken = spoken.trim().toLowerCase().replace(/[.,?!'、。！？]/g, '');

  if (isJapanese) {
    // Character / Morpheme based matching for Japanese
    let matches = 0;
    const targetChars = cleanTarget.split('');
    const spokenChars = cleanSpoken.split('');

    for (const c of targetChars) {
      if (spokenChars.includes(c)) matches++;
    }
    const score = targetChars.length > 0 ? Math.min(100, Math.round((matches / targetChars.length) * 100)) : 0;
    return {
      score,
      passed: score >= 70,
      feedback: score >= 85 ? '자연스럽고 정확한 일본어 발화입니다!' : '조사나 한자 발음(훈독/음독)에 유의해서 다시 연습해보세요.',
      weaknessCategory: score >= 85 ? '정확함' : '조사 및 훈독/음독',
      nativeAlternative: target,
      wordDiff: [{ word: target, status: score >= 75 ? 'correct' : 'wrong' }],
    };
  }

  const targetWords = cleanTarget.split(/\s+/).filter(Boolean);
  const spokenWords = cleanSpoken.split(/\s+/).filter(Boolean);

  let matchCount = 0;
  const wordDiff: Array<{ word: string; status: 'correct' | 'missing' | 'wrong' | 'added'; spoken?: string }> = [];
  const spokenSet = [...spokenWords];

  for (const tWord of targetWords) {
    const foundIdx = spokenSet.indexOf(tWord);
    if (foundIdx !== -1) {
      matchCount++;
      spokenSet.splice(foundIdx, 1);
      wordDiff.push({ word: tWord, status: 'correct' });
    } else {
      wordDiff.push({ word: tWord, status: 'missing' });
    }
  }

  for (const sWord of spokenSet) {
    wordDiff.push({ word: sWord, status: 'added' });
  }

  const score = targetWords.length > 0
    ? Math.round((matchCount / Math.max(targetWords.length, spokenWords.length)) * 100)
    : 0;

  return {
    score,
    passed: score >= 70,
    feedback: score >= 85
      ? '발화가 매우 정확하고 자연스럽습니다!'
      : score >= 60
      ? '의미는 충분히 통하지만 몇 가지 단어/전치사에 유의해보세요.'
      : '원문과 차이가 있습니다. 다시 한 번 듣고 따라해보세요.',
    weaknessCategory: score >= 85 ? '정확함' : '단어 선택 및 숙어',
    nativeAlternative: target,
    wordDiff,
  };
}

// 1. Evaluate spoken speech (English or Japanese)
app.post('/api/evaluate-speech', async (req, res) => {
  try {
    const { targetSentence, spokenText, koreanMeaning, language = 'en' } = req.body;

    if (!targetSentence || !spokenText) {
      return res.status(400).json({ error: 'targetSentence and spokenText are required' });
    }

    const isJapanese = language === 'ja';

    if (!process.env.OPENAI_API_KEY) {
      const fallback = computeFallbackEvaluation(targetSentence, spokenText, isJapanese);
      return res.json(fallback);
    }

    const prompt = isJapanese
      ? `
당신은 최고의 1:1 일본어 회화 및 발음 전문 코치입니다.
학습자가 한국어 뜻을 보고 일본어로 말한 음성 인식 결과(spokenText)를 목표 일본어 문장(targetSentence)과 비교 평가해주세요.
특히 일본어의 한자 발음(훈독/음독) 및 조사(は, が, を, に 등), 억양 및 정중어(です/ます)를 주의 깊게 평가해주세요.

- 한국어 뜻: "${koreanMeaning || ''}"
- 목표 일본어 문장: "${targetSentence}"
- 사용자가 발화한 일본어: "${spokenText}"

평가 기준:
1. score (0~100):
   - 90~100: 완벽하거나 동등하게 자연스러운 원어민 표현.
   - 75~89: 핵심 의미와 조사가 통하며 약간의 발음/어휘 차이만 있음 (Pass 인정).
   - 50~74: 의미는 대략 통하나 조사 오류나 한자 훈독/음독 오독이 있음.
   - 0~49: 원문과 많이 다르거나 핵심 표현이 누락됨.
2. passed: score >= 75 이면 true, 아니면 false.
3. feedback: 한국어로 작성된 2~3문장의 친절한 피드백 (조사, 한자 훈독/음독 팁 포함).
4. weaknessCategory: 다음 중 하나 선택:
   ["조사 및 연결형", "한자 훈독(訓読み) 오독", "한자 음독(音読み) 오독", "경어 및 존칭", "단어 선택 및 표현", "연음 및 억양", "정확함"]
5. nativeAlternative: 일본 현지에서 더 자주 쓰이는 자연스러운 구어체 변형이나 발음 팁.
6. wordDiff: targetSentence를 의미 단위/단어 단위로 분절하여 각 상태를 표시:
   각 원소는 { "word": string, "status": "correct" | "missing" | "wrong" | "added" }
`
      : `
당신은 최고의 1:1 영어 회화 코치입니다.
사용자가 한국어 뜻을 보고 영어로 말한 음성 인식 결과(spokenText)를 원문 영어 문장(targetSentence)과 비교 평가해주세요.

- 한국어 뜻: "${koreanMeaning || ''}"
- 목표 영어 문장: "${targetSentence}"
- 사용자가 발화한 영어: "${spokenText}"

평가 기준:
1. score (0~100):
   - 90~100: 완벽하거나 동등하게 자연스러운 원어민 표현.
   - 75~89: 핵심 의미가 완벽히 통하며 작은 전치사/관사/시제 차이만 있음 (Pass 인정).
   - 50~74: 의미는 대략 통하나 중요한 핵심 동사나 어순 오류가 있음.
   - 0~49: 원문과 많이 다르거나 핵심 표현이 누락됨.
2. passed: score >= 75 이면 true, 아니면 false.
3. feedback: 한국어로 작성된 2~3문장의 따뜻하고 명확한 피드백.
4. weaknessCategory: 다음 중 정확히 하나만 선택:
   ["시제 및 조동사", "전치사 및 관사", "연음 및 발음 혼동", "단어 선택 및 숙어", "어순 및 구문", "자연스러운 구어체", "정확함"]
5. nativeAlternative: 원어민들이 일상에서 정말 자주 쓰는 자연스러운 구어체 변형이나 발음/연음 팁 (1문장).
6. wordDiff: targetSentence의 단어들을 기준으로 각 단어의 상태를 분석한 배열.
   각 원소는 { "word": string, "status": "correct" | "missing" | "wrong" | "added" }

반드시 아래 JSON 형식으로만 응답하세요:
{
  "score": number,
  "passed": boolean,
  "feedback": string,
  "weaknessCategory": string,
  "nativeAlternative": string,
  "wordDiff": [{ "word": string, "status": "correct" | "missing" | "wrong" | "added" }]
}
`;

    const parsed = await generateJSON(
      'You are an expert bilingual speaking tutor. Return valid JSON only.',
      prompt
    );
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error evaluating speech with OpenAI:', error);
    const { targetSentence, spokenText, language } = req.body;
    const fallback = computeFallbackEvaluation(targetSentence || '', spokenText || '', language === 'ja');
    return res.json(fallback);
  }
});

// 2. Extract Kanji Words & Kun'yomi / On'yomi from Japanese sentence
app.post('/api/extract-kanji', async (req, res) => {
  try {
    const { japaneseSentence } = req.body;
    if (!japaneseSentence) {
      return res.status(400).json({ error: 'japaneseSentence is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.json({ kanjiList: [] });
    }

    const prompt = `
다음 일본어 문장에서 한자(漢字)가 포함된 핵심 단어들을 모두 추출하고,
학습자가 훈독(訓読み)과 음독(音読み)을 헷갈리지 않고 정확히 읽을 수 있도록 읽는 법(히라가나)과 훈독/음독 여부, 뜻을 분석해주세요.

일본어 문장: "${japaneseSentence}"

출력 JSON 스키마:
{
  "kanjiList": [
    {
      "kanji": "한자 단어 (예: 手伝う, 今日, 連絡, 書類, 開ける)",
      "reading": "히라가나 읽는 법 (예: てつだう, きょう, れんらく, しょるい, あける)",
      "readingType": "훈독 (訓読み) 또는 음독 (音読み) 또는 혼합/특수",
      "meaning": "한국어 뜻 및 한자 구성 설명 (예: '도와주다 (손 수 手 + 전할 전 伝의 훈독)')"
    }
  ]
}
`;

    const parsed = await generateJSON(
      'You are a master Japanese Kanji linguist. Return valid JSON only.',
      prompt
    );
    return res.json({ kanjiList: parsed.kanjiList || [] });
  } catch (error: any) {
    console.error('Error extracting kanji:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. Generate 10-Day Cumulative AI Analysis Report (Supports English and Japanese)
app.post('/api/generate-report', async (req, res) => {
  try {
    const { sentences = [], reviewLogs = [], daysCount = 10, language = 'all' } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
    }

    const isJaOnly = language === 'ja';
    const isEnOnly = language === 'en';

    const prompt = `
당신은 학습자의 ${daysCount}일간의 ${isJaOnly ? '일본어 회화 및 한자 훈독/음독' : isEnOnly ? '영어 회화' : '영어 및 일본어 회화'} 누적 학습 데이터를 정밀 진단하는 수석 AI 코치입니다.
학습자가 매일 아침과 저녁으로 10문장씩 복습하고 있으며, 특히 일본어의 경우 한자어 훈독(訓読み) 및 음독 읽기를 중요하게 다루고 있습니다.

학습 데이터 요약:
- 총 등록 문장 수: ${sentences.length}
- 최근 복습 로그 수: ${reviewLogs.length}
- 언어 모드: ${language}
- 문장 세부 데이터 샘플:
${JSON.stringify(sentences.slice(0, 30), null, 2)}
- 최근 테스트 로그 샘플:
${JSON.stringify(reviewLogs.slice(0, 25), null, 2)}

리포트에 담겨야 할 내용:
1. reportTitle: "10일 누적 AI 회화 & 한자 정밀 진단 리포트" 형식의 매력적인 제목.
2. overallScore: 누적 평균 발화 점수 (0~100).
3. masteryRate: 숙달된 문장 비율 (% 단위, 0~100).
4. totalReviews: 총 테스트 횟수.
5. kanjiMasteryRate: (일본어가 포함된 경우) 한자 훈독/음독 읽기 정답률 추정치 (0~100).
6. summaryDiagnosis: 10일간의 발화 추이, 한자 훈독 습득도, 전반적 성장 진단 요약 (3~4문장).
7. coreStrengths: 학습자가 잘하고 있는 강점 2~3가지.
8. topWeaknesses: 자주 틀리는 약점 패턴 리스트 (category, frequency, explanation, sampleMistake, correctiveRule).
9. spacedRepetitionAdjustments: AI가 취약점 보완을 위해 앞으로 10문장 랜덤 복습 풀에서 각 파트별 출제 빈도를 어떻게 가중 조절했는지 설명 (category, weightMultiplier, reason).
10. actionPlan: 향후 10일간 실천해야 할 구체적인 말하기 및 한자 훈독 학습 행동 지침 3가지.
11. suggestedNewSentences: 학습자의 취약점을 극복하기 위해 추천하는 새로운 실전 문장 3~4개 ({ language, targetText, reading, korean, focusReason }).
12. coachEncouragement: 학습자를 격려하는 따뜻한 응원 한마디.

반드시 아래 JSON 형식으로만 응답하세요 (모든 필드 필수):
{
  "reportTitle": string,
  "period": string,
  "overallScore": number,
  "masteryRate": number,
  "totalReviews": number,
  "kanjiMasteryRate": number,
  "summaryDiagnosis": string,
  "coreStrengths": string[],
  "topWeaknesses": [{ "category": string, "frequency": number, "explanation": string, "sampleMistake": string, "correctiveRule": string }],
  "spacedRepetitionAdjustments": [{ "category": string, "weightMultiplier": number, "reason": string }],
  "actionPlan": string[],
  "suggestedNewSentences": [{ "language": string, "targetText": string, "reading": string, "korean": string, "focusReason": string }],
  "coachEncouragement": string
}
`;

    const parsed = await generateJSON(
      'You are an elite bilingual Japanese & English coach providing an inspiring diagnostic report in Korean.',
      prompt
    );
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating report:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// 4. AI Sentence Assistant: Parse & auto-translate English or Japanese sentence
app.post('/api/parse-sentence', async (req, res) => {
  try {
    const { input, language = 'en' } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        targetText: input,
        korean: '한국어 번역을 직접 입력해주세요',
        category: '일상 회화',
        reading: '',
        keyPattern: '',
        kanjiList: [],
      });
    }

    const isJapanese = language === 'ja';
    // If the user already typed the sentence in the target language, we must
    // not let the model rephrase/"clean up" their wording — only translate.
    const isKoreanInput = /[가-힣]/.test(input) && !/[぀-ヿ一-鿿]/.test(input);

    const preserveInstruction = isKoreanInput
      ? ''
      : `\n\n중요: 입력이 이미 ${isJapanese ? '일본어' : '영어'}로 작성되어 있으므로, targetText는 입력 문장을 토씨 하나 바꾸지 말고 그대로 사용하세요. 절대 문장을 고치거나 더 자연스럽게 다듬지 마세요. 나머지 필드(번역, 분류 등)만 새로 작성하세요.`;

    const prompt = isJapanese
      ? `
학습자가 입력한 일본어 또는 한국어 텍스트를 분석하여, 일본어 회화 및 한자 훈독 학습에 최적화된 데이터로 정리해주세요.
- 일본어 문장: 입력이 한국어면 자연스러운 일본어로 새로 작성, 입력이 이미 일본어면 아래 "중요" 지침대로 원문 그대로 사용
- 히라가나 읽기 (reading): 전체 문장의 후리가나/히라가나 읽는 법
- 한국어 뜻 (korean): 매끄러운 한국어 해석
- category: 일상 회화 / 비즈니스 / 여행/식당 / 감정/의견 / 숙어패턴 중 택1
- keyPattern: 핵심 문형이나 조사 (예: '~ていただく', '~ほうがいい')
- kanjiList: 문장에 포함된 한자 단어들의 훈독/음독 상세 리스트 ({ kanji, reading, readingType, meaning })

입력: "${input}"${preserveInstruction}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "targetText": string,
  "reading": string,
  "korean": string,
  "category": string,
  "keyPattern": string,
  "kanjiList": [{ "kanji": string, "reading": string, "readingType": string, "meaning": string }]
}
`
      : `
입력된 문장이나 텍스트를 분석하여, 영어 학습자가 매일 복습하기 좋은 영어 문장과 자연스러운 한국어 뜻으로 정리해주세요.
만약 한국어만 주어지면 가장 자연스러운 원어민 영어 회화 문장을 새로 만들어주시고, 입력이 이미 영어면 아래 "중요" 지침대로 원문 그대로 사용하세요.

입력: "${input}"${preserveInstruction}

출력 JSON 형식:
{
  "targetText": "영어 문장",
  "korean": "자연스러운 한국어 뜻",
  "category": "일상 / 비즈니스 / 여행 / 감정표현 / 숙어패턴 중 택1",
  "keyPattern": "문장의 핵심 표현이나 문법 포인트"
}
`;

    const parsed = await generateJSON('Return valid JSON only.', prompt);

    // Belt-and-suspenders: guarantee the original sentence is never altered,
    // regardless of what the model actually returned.
    if (!isKoreanInput) {
      parsed.targetText = input.trim();
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing sentence:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Setup Vite middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
