/*
 * Dietary needs → polite Japanese sentences for the Food card.
 */
window.JP = window.JP || {};
JP.data = JP.data || {};

JP.data.dietary = [
  { id: 'pork', en: 'No pork', zh: '不吃豬肉', ja: '豚肉が食べられません。' },
  { id: 'beef', en: 'No beef', zh: '不吃牛肉', ja: '牛肉が食べられません。' },
  { id: 'meat', en: 'No meat', zh: '不吃肉類', ja: '肉が食べられません。' },
  { id: 'fish', en: 'No fish', zh: '不吃魚', ja: '魚が食べられません。' },
  { id: 'raw', en: 'No raw fish or raw egg', zh: '不吃生魚片或生雞蛋', ja: '生の魚と生卵が食べられません。' },
  { id: 'vegetarian', en: 'Vegetarian (no meat, no fish, no dashi)', zh: '素食（無肉、無魚、無高湯）', ja: 'ベジタリアンです。肉・魚・だしが食べられません。' },
  { id: 'vegan', en: 'Vegan (no animal products)', zh: '純素（無任何動物製品）', ja: 'ヴィーガンです。肉・魚・卵・乳製品・だしが食べられません。' },
  { id: 'shellfish', en: 'Shellfish allergy (shrimp, crab)', zh: '甲殼類過敏（蝦、蟹）', ja: 'えび・かにのアレルギーがあります。', allergy: true },
  { id: 'peanut', en: 'Peanut / nut allergy', zh: '花生／堅果過敏', ja: 'ピーナッツ・ナッツ類のアレルギーがあります。', allergy: true },
  { id: 'egg', en: 'Egg allergy', zh: '雞蛋過敏', ja: '卵のアレルギーがあります。', allergy: true },
  { id: 'dairy', en: 'Dairy / milk allergy', zh: '乳製品過敏', ja: '乳製品のアレルギーがあります。', allergy: true },
  { id: 'wheat', en: 'Gluten / wheat free', zh: '無麩質／不吃小麥', ja: '小麦（グルテン）が食べられません。', allergy: true },
  { id: 'soba', en: 'Buckwheat (soba) allergy', zh: '蕎麥過敏', ja: 'そばのアレルギーがあります。', allergy: true },
  { id: 'sesame', en: 'Sesame allergy', zh: '芝麻過敏', ja: 'ごまのアレルギーがあります。', allergy: true },
  { id: 'alcohol', en: 'No alcohol (including in cooking)', zh: '不含酒精（包括烹調用酒）', ja: 'アルコールが飲めません。料理酒・みりんも控えています。' },
  { id: 'lowsalt', en: 'Low salt, please', zh: '請少鹽', ja: '塩分を控えめにしてください。' },
  { id: 'soft', en: 'Soft food, please (hard to chew)', zh: '請給軟一點的食物', ja: 'やわらかい食事をお願いします。' },
  { id: 'diabetic', en: 'Diabetic — low sugar', zh: '糖尿病，請少糖', ja: '糖尿病のため、糖分を控えています。' }
];

JP.data.dietaryIntro = {
  ja: 'すみません。食事について、お願いがあります。',
  en: 'Excuse me. I have a request about my food.',
  zh: '不好意思，關於飲食我有一些要求。'
};

JP.data.dietaryAllergyWarn = {
  ja: '少量でも体調が悪くなります。料理に入っているか教えてください。',
  en: 'Even a small amount makes me ill. Please tell me if a dish contains it.',
  zh: '即使少量也會令我不適。請告訴我菜式是否含有這些成分。'
};

JP.data.dietaryOutro = {
  ja: 'ご対応いただけますか？よろしくお願いいたします。',
  en: 'Could you help with this? Thank you very much.',
  zh: '請問可以配合嗎？非常感謝。'
};
