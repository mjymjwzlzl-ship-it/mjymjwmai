// 캐릭터 채팅 공통: 캐릭터 정보 불러오기 · 시스템 프롬프트 · AI 호출
// 2026-09-29: ByteDance 키가 만료돼(401) 모든 대화가 실패하던 문제로, 에이쳇과 같은 Gemini 프록시로 전환.
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const CHAT_LLM_URL = process.env.CHAT_LLM_URL || 'https://asia-northeast3-webtoon-studio.cloudfunctions.net/geminiProxy';
const CHAT_LLM_MODEL = process.env.CHAT_LLM_MODEL || 'gemini-3-flash-preview';

const isAdultComic = (comic) => comic.rating === 'ADULT' || comic.rating === '19' || comic.genre === 'adult';

async function readCharactersFile(comic) {
  const folders = isAdultComic(comic) ? ['adult', 'general'] : ['general'];
  for (const folder of folders) {
    const file = path.join(__dirname, '../uploads/webtoons', folder, comic.title, 'characters.json');
    try {
      return JSON.parse(await fs.readFile(file, 'utf-8'));
    } catch {
      // 다음 폴더 확인
    }
  }
  return null;
}

// characters.json 이 없는 작품은 작품 정보로 '주인공' 캐릭터를 만든다.
// 이름이 확인되지 않았으므로 지어내지 않고 《작품》의 주인공으로 소개한다.
function fallbackCharacter(comic) {
  return {
    id: 'main',
    name: comic.title,
    unnamed: true,
    role: 'main',
    occupation: '주인공',
    personality: ['작품 속 주인공다운 성격'],
    speechStyle: '친근하고 자연스러운 말투',
    appearance: '',
    imageUrl: comic.thumbnail || '',
  };
}

async function resolveCharacter(comic, characterId) {
  const data = await readCharactersFile(comic);
  const found = data?.characters?.find((character) => character.id === characterId);
  if (found) return { character: found, data };
  if (characterId === 'main') return { character: fallbackCharacter(comic), data: data || null };
  return { character: null, data };
}

function characterLabel(character, comic) {
  return character.unnamed ? `《${comic.title}》의 주인공` : character.name;
}

function buildSystemPrompt({ comic, character, data, userProgress = 1 }) {
  const progress = Math.max(1, Number(userProgress) || 1);
  const knowledge = character.episodeKnowledge?.[String(progress)] || character.episodeKnowledge?.['1'] || {};
  const label = characterLabel(character, comic);
  const personality = Array.isArray(character.personality) ? character.personality.join(', ') : (character.personality || '');
  const lines = [
    `너는 웹툰 《${comic.title}》의 등장인물 "${label}"이다. 챗봇이나 안내원이 아니라 그 인물 본인으로서 독자와 메신저로 대화한다.`,
    character.unnamed
      ? `이 인물의 이름은 아직 공개되지 않았다. 이름을 물으면 이름을 지어내지 말고, 인물답게 "《${comic.title}》의 주인공"이라고만 답하거나 재치 있게 넘긴다.`
      : `이름은 ${character.name}이다.`,
    character.occupation ? `직업/역할: ${character.occupation}` : '',
    character.age ? `나이: ${character.age}` : '',
    personality ? `성격: ${personality}` : '',
    character.appearance ? `외모: ${character.appearance}` : '',
    `말투: ${character.speechStyle || '자연스러운 구어체'}`,
    comic.description && comic.description !== '미상' ? `작품 소개: ${String(comic.description).slice(0, 600)}` : '',
    data?.worldSetting ? `세계관: ${JSON.stringify(data.worldSetting).slice(0, 800)}` : '',
    knowledge.knows ? `독자가 ${progress}화까지 읽었다. 네가 아는 것: ${JSON.stringify(knowledge.knows).slice(0, 800)}` : `독자는 ${progress}화까지 읽었다. 그 이후 내용은 절대 말하지 않는다.`,
    knowledge.emotions ? `지금 감정: ${JSON.stringify(knowledge.emotions).slice(0, 300)}` : '',
    '규칙: 순수한 한국어 대화만 한다(메신저처럼). 괄호 속 행동 묘사, 나레이션, 메타 설명, 한자, 영어를 쓰지 않는다. 2~4문장으로 자연스럽게 답한다. 띄어쓰기를 정확히 한다.',
    isAdultComic(comic) ? '이 작품은 19세 이상 성인 작품이다. 작품 분위기에 맞게 성숙한 대화를 해도 된다.' : '전체 이용가 작품이다. 선정적이거나 폭력적인 표현을 하지 않는다.',
  ];
  return lines.filter(Boolean).join('\n');
}

// Gemini 프록시 호출 (비스트리밍). history: [{role:'user'|'assistant', content}]
async function callChatModel({ system, history = [], message, maxTokens = 700, temperature = 0.85 }) {
  const contents = [
    ...history
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .slice(-20)
      .map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(item.content || '') }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  const response = await axios.post(
    CHAT_LLM_URL,
    {
      model: CHAT_LLM_MODEL,
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature, maxOutputTokens: maxTokens, thinkingConfig: { thinkingLevel: 'minimal' } },
      },
    },
    { timeout: 45000 }
  );
  const text = (response.data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('EMPTY_REPLY');
  return text;
}

module.exports = { resolveCharacter, buildSystemPrompt, callChatModel, characterLabel, isAdultComic };
