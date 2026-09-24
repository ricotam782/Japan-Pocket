/*
 * Emergency numbers, embassy details and emergency phrases.
 * Please re-check embassy details on travel.gc.ca before departure.
 */
window.JP = window.JP || {};
JP.data = JP.data || {};

JP.data.emergencyNumbers = [
  {
    number: '110', en: 'Police', zh: '警察', ja: '警察', icon: '🚓', cls: 'police',
    say: { ja: '事件です。英語を話せる人はいますか？', en: 'It is an incident. Is there anyone who speaks English?', zh: '發生了事件。有人會說英語嗎？' }
  },
  {
    number: '119', en: 'Ambulance / Fire', zh: '救護車／消防', ja: '救急・消防', icon: '🚑', cls: 'ambulance',
    say: { ja: '救急です。英語を話せる人はいますか？', en: 'It is a medical emergency. Is there anyone who speaks English?', zh: '有緊急醫療情況。有人會說英語嗎？' }
  }
];

JP.data.helplines = [
  {
    en: 'Japan Visitor Hotline (24h, English)', zh: '日本訪客熱線（24 小時，英語）',
    tel: '+81-50-3816-2787', display: '050-3816-2787'
  },
  {
    en: 'Tokyo police English line (weekdays)', zh: '東京警視廳英語諮詢（平日）',
    tel: '+81-3-3501-0110', display: '03-3501-0110'
  }
];

JP.data.embassy = {
  name: { en: 'Embassy of Canada to Japan', zh: '加拿大駐日本大使館', ja: 'カナダ大使館' },
  address: {
    en: '7-3-38 Akasaka, Minato-ku, Tokyo 107-8503',
    ja: '〒107-8503 東京都港区赤坂7-3-38 カナダ大使館'
  },
  phone: { tel: '+81-3-5412-6200', display: '03-5412-6200 (+81-3-5412-6200)' },
  station: { en: 'Nearest station: Aoyama-itchome (Ginza / Hanzomon / Oedo lines)', zh: '最近車站：青山一丁目站（銀座線／半藏門線／大江戶線）' },
  emergency: {
    en: '24/7 Emergency Watch and Response Centre (Ottawa)', zh: '加拿大外交部 24 小時緊急應變中心（渥太華）',
    tel: '+1-613-996-8885', display: '+1 613-996-8885', email: 'sos@international.gc.ca'
  },
  web: 'https://travel.gc.ca/assistance/embassies-consulates/japan'
};

JP.data.emergencyPhrases = [
  { id: 'e1', en: 'Help!', zh: '救命！', ja: '助けて！', romaji: 'Tasukete!' },
  { id: 'e2', en: 'Please call an ambulance.', zh: '請叫救護車。', ja: '救急車を呼んでください。', romaji: 'Kyūkyūsha o yonde kudasai.' },
  { id: 'e3', en: 'Please call the police.', zh: '請報警。', ja: '警察を呼んでください。', romaji: 'Keisatsu o yonde kudasai.' },
  { id: 'e4', en: 'I feel sick.', zh: '我身體不舒服。', ja: '気分が悪いです。', romaji: 'Kibun ga warui desu.' },
  { id: 'e5', en: 'It hurts here.', zh: '這裡痛。', ja: 'ここが痛いです。', romaji: 'Koko ga itai desu.' },
  { id: 'e6', en: 'I have chest pain.', zh: '我胸口痛。', ja: '胸が痛いです。', romaji: 'Mune ga itai desu.' },
  { id: 'e7', en: 'I fell down.', zh: '我跌倒了。', ja: '転びました。', romaji: 'Korobimashita.' },
  { id: 'e8', en: 'Please take me to a hospital.', zh: '請帶我去醫院。', ja: '病院に連れて行ってください。', romaji: 'Byōin ni tsurete itte kudasai.' },
  { id: 'e9', en: 'Is there an English-speaking doctor?', zh: '有會說英語的醫生嗎？', ja: '英語を話せる医者はいますか？', romaji: 'Eigo o hanaseru isha wa imasu ka?' },
  { id: 'e10', en: 'Where is the nearest pharmacy?', zh: '最近的藥房在哪裡？', ja: '一番近い薬局はどこですか？', romaji: 'Ichiban chikai yakkyoku wa doko desu ka?' },
  { id: 'e11', en: 'I lost my wallet.', zh: '我遺失了錢包。', ja: '財布をなくしました。', romaji: 'Saifu o nakushimashita.' },
  { id: 'e12', en: 'I lost my passport.', zh: '我遺失了護照。', ja: 'パスポートをなくしました。', romaji: 'Pasupōto o nakushimashita.' },
  { id: 'e13', en: 'My bag was stolen.', zh: '我的包被偷了。', ja: 'かばんを盗まれました。', romaji: 'Kaban o nusumaremashita.' },
  { id: 'e14', en: 'I cannot find my companion.', zh: '我找不到同行的人。', ja: '連れとはぐれました。', romaji: 'Tsure to haguremashita.' },
  { id: 'e15', en: 'Please contact the Canadian Embassy.', zh: '請聯絡加拿大大使館。', ja: 'カナダ大使館に連絡してください。', romaji: 'Kanada taishikan ni renraku shite kudasai.' }
];

/* Medical card fields: key, English, 中文, Japanese label */
JP.data.medicalFields = [
  { key: 'name', en: 'Name', zh: '姓名', ja: '氏名' },
  { key: 'dob', en: 'Date of birth', zh: '出生日期', ja: '生年月日', type: 'date' },
  { key: 'blood', en: 'Blood type', zh: '血型', ja: '血液型', type: 'select',
    options: ['', 'A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−', 'Unknown 不明'] },
  { key: 'allergies', en: 'Allergies', zh: '過敏', ja: 'アレルギー', multiline: true },
  { key: 'medications', en: 'Medications', zh: '正在服用的藥物', ja: '服用中の薬', multiline: true },
  { key: 'conditions', en: 'Medical conditions', zh: '病歷／長期病患', ja: '持病・既往歴', multiline: true },
  { key: 'contactName', en: 'Emergency contact', zh: '緊急聯絡人', ja: '緊急連絡先（氏名）' },
  { key: 'contactPhone', en: 'Contact phone', zh: '聯絡電話', ja: '緊急連絡先（電話）', type: 'tel' },
  { key: 'insurance', en: 'Travel insurance & policy no.', zh: '旅遊保險及保單號碼', ja: '海外旅行保険・証券番号', multiline: true },
  { key: 'hotel', en: 'Hotel in Japan', zh: '日本住宿', ja: '滞在先ホテル' }
];
