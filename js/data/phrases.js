/*
 * Preset phrase cards. Add more by appending objects to a category's list.
 * Fields: id (unique, stable), en, zh (繁體), ja, romaji (optional reading aid).
 */
window.JP = window.JP || {};

JP.data = JP.data || {};

JP.data.phraseCategories = [
  { id: 'restaurant', en: 'Restaurant', zh: '餐廳', icon: '🍜' },
  { id: 'shopping', en: 'Shopping', zh: '購物', icon: '🛍️' },
  { id: 'hotel', en: 'Hotel', zh: '酒店', icon: '🏨' },
  { id: 'transport', en: 'Transport', zh: '交通', icon: '🚆' },
  { id: 'help', en: 'Help', zh: '求助', icon: '🆘' }
];

JP.data.phrases = {
  restaurant: [
    { id: 'r1', en: 'Table for two, please.', zh: '兩位，謝謝。', ja: '二人です。', romaji: 'Futari desu.' },
    { id: 'r2', en: 'Do you have an English menu?', zh: '請問有英文菜單嗎？', ja: '英語のメニューはありますか？', romaji: 'Eigo no menyū wa arimasu ka?' },
    { id: 'r3', en: 'This one, please.', zh: '我要這個。', ja: 'これをお願いします。', romaji: 'Kore o onegai shimasu.' },
    { id: 'r4', en: 'What do you recommend?', zh: '有甚麼推薦？', ja: 'おすすめは何ですか？', romaji: 'Osusume wa nan desu ka?' },
    { id: 'r5', en: 'Water, please.', zh: '請給我水。', ja: 'お水をください。', romaji: 'Omizu o kudasai.' },
    { id: 'r6', en: 'Not spicy, please.', zh: '請不要辣。', ja: '辛くしないでください。', romaji: 'Karaku shinaide kudasai.' },
    { id: 'r7', en: 'The bill, please.', zh: '請結帳。', ja: 'お会計をお願いします。', romaji: 'Okaikei o onegai shimasu.' },
    { id: 'r8', en: 'Can I pay by credit card?', zh: '可以用信用卡付款嗎？', ja: 'クレジットカードで払えますか？', romaji: 'Kurejitto kādo de haraemasu ka?' },
    { id: 'r9', en: 'It was delicious. Thank you!', zh: '很好吃，謝謝！', ja: 'ごちそうさまでした。おいしかったです！', romaji: 'Gochisōsama deshita. Oishikatta desu!' },
    { id: 'r10', en: 'Can we take this away?', zh: '可以外帶嗎？', ja: '持ち帰りできますか？', romaji: 'Mochikaeri dekimasu ka?' }
  ],
  shopping: [
    { id: 's1', en: 'How much is this?', zh: '這個多少錢？', ja: 'これはいくらですか？', romaji: 'Kore wa ikura desu ka?' },
    { id: 's2', en: 'Can I try this on?', zh: '可以試穿嗎？', ja: '試着してもいいですか？', romaji: 'Shichaku shite mo ii desu ka?' },
    { id: 's3', en: 'Do you have a bigger size?', zh: '有大一點的尺碼嗎？', ja: 'もっと大きいサイズはありますか？', romaji: 'Motto ōkii saizu wa arimasu ka?' },
    { id: 's4', en: 'Do you have a smaller size?', zh: '有小一點的尺碼嗎？', ja: 'もっと小さいサイズはありますか？', romaji: 'Motto chiisai saizu wa arimasu ka?' },
    { id: 's5', en: 'Tax-free, please. (Here is my passport.)', zh: '請辦理免稅。（這是我的護照。）', ja: '免税でお願いします。パスポートです。', romaji: 'Menzei de onegai shimasu. Pasupōto desu.' },
    { id: 's6', en: 'Could you gift-wrap it?', zh: '可以包裝成禮物嗎？', ja: 'プレゼント用に包んでもらえますか？', romaji: 'Purezento-yō ni tsutsunde moraemasu ka?' },
    { id: 's7', en: 'No bag needed, thank you.', zh: '不用袋子，謝謝。', ja: '袋はいりません。', romaji: 'Fukuro wa irimasen.' },
    { id: 's8', en: 'Could I have a separate bag for each?', zh: '可以每樣分開一個袋子嗎？', ja: '小分けの袋をもらえますか？', romaji: 'Kowake no fukuro o moraemasu ka?' },
    { id: 's9', en: 'I am just looking, thank you.', zh: '我只是看看，謝謝。', ja: '見ているだけです。ありがとう。', romaji: 'Mite iru dake desu. Arigatō.' }
  ],
  hotel: [
    { id: 'h1', en: 'I have a reservation.', zh: '我有預約。', ja: '予約しています。', romaji: 'Yoyaku shite imasu.' },
    { id: 'h2', en: 'Can you keep our luggage?', zh: '可以寄存行李嗎？', ja: '荷物を預かってもらえますか？', romaji: 'Nimotsu o azukatte moraemasu ka?' },
    { id: 'h3', en: 'What time is breakfast?', zh: '早餐是幾點？', ja: '朝食は何時ですか？', romaji: 'Chōshoku wa nanji desu ka?' },
    { id: 'h4', en: 'What time is check-out?', zh: '幾點退房？', ja: 'チェックアウトは何時ですか？', romaji: 'Chekku-auto wa nanji desu ka?' },
    { id: 'h5', en: 'What is the Wi-Fi password?', zh: 'Wi-Fi 密碼是甚麼？', ja: 'Wi-Fiのパスワードは何ですか？', romaji: 'Wai-fai no pasuwādo wa nan desu ka?' },
    { id: 'h6', en: 'The air conditioner is not working.', zh: '冷氣壞了。', ja: 'エアコンが動きません。', romaji: 'Eakon ga ugokimasen.' },
    { id: 'h7', en: 'Could you call a taxi for us?', zh: '可以幫我們叫計程車嗎？', ja: 'タクシーを呼んでもらえますか？', romaji: 'Takushī o yonde moraemasu ka?' },
    { id: 'h8', en: 'Could we have more towels?', zh: '可以多給一些毛巾嗎？', ja: 'タオルをもう少しもらえますか？', romaji: 'Taoru o mō sukoshi moraemasu ka?' }
  ],
  transport: [
    { id: 't1', en: 'Where is the station?', zh: '車站在哪裡？', ja: '駅はどこですか？', romaji: 'Eki wa doko desu ka?' },
    { id: 't2', en: 'Does this train go to …?', zh: '這班車去……嗎？', ja: 'この電車は〜に行きますか？', romaji: 'Kono densha wa … ni ikimasu ka?' },
    { id: 't3', en: 'Which platform?', zh: '在哪個月台？', ja: '何番線ですか？', romaji: 'Nanban-sen desu ka?' },
    { id: 't4', en: 'Two tickets to …, please.', zh: '請給我兩張去……的車票。', ja: '〜まで二枚お願いします。', romaji: '… made nimai onegai shimasu.' },
    { id: 't5', en: 'Reserved seats, please.', zh: '請給我指定席。', ja: '指定席をお願いします。', romaji: 'Shitei-seki o onegai shimasu.' },
    { id: 't6', en: 'Please take me to this address.', zh: '請載我到這個地址。', ja: 'この住所までお願いします。', romaji: 'Kono jūsho made onegai shimasu.' },
    { id: 't7', en: 'Please stop here.', zh: '請在這裡停車。', ja: 'ここで止めてください。', romaji: 'Koko de tomete kudasai.' },
    { id: 't8', en: 'Where is the elevator?', zh: '電梯在哪裡？', ja: 'エレベーターはどこですか？', romaji: 'Erebētā wa doko desu ka?' },
    { id: 't9', en: 'Where is the toilet?', zh: '洗手間在哪裡？', ja: 'トイレはどこですか？', romaji: 'Toire wa doko desu ka?' },
    { id: 't10', en: 'Where are the coin lockers?', zh: '投幣式儲物櫃在哪裡？', ja: 'コインロッカーはどこですか？', romaji: 'Koin rokkā wa doko desu ka?' }
  ],
  help: [
    { id: 'x1', en: 'Excuse me.', zh: '不好意思。', ja: 'すみません。', romaji: 'Sumimasen.' },
    { id: 'x2', en: 'I do not speak Japanese.', zh: '我不會說日語。', ja: '日本語が話せません。', romaji: 'Nihongo ga hanasemasen.' },
    { id: 'x3', en: 'Do you speak English?', zh: '你會說英語嗎？', ja: '英語を話せますか？', romaji: 'Eigo o hanasemasu ka?' },
    { id: 'x4', en: 'Could you speak slowly, please?', zh: '請說慢一點。', ja: 'ゆっくり話してください。', romaji: 'Yukkuri hanashite kudasai.' },
    { id: 'x5', en: 'Could you write it down, please?', zh: '可以寫下來嗎？', ja: '書いてもらえますか？', romaji: 'Kaite moraemasu ka?' },
    { id: 'x6', en: 'I am lost.', zh: '我迷路了。', ja: '道に迷いました。', romaji: 'Michi ni mayoimashita.' },
    { id: 'x7', en: 'Could you take our photo?', zh: '可以幫我們拍照嗎？', ja: '写真を撮ってもらえますか？', romaji: 'Shashin o totte moraemasu ka?' },
    { id: 'x8', en: 'Thank you very much.', zh: '非常感謝。', ja: 'どうもありがとうございます。', romaji: 'Dōmo arigatō gozaimasu.' },
    { id: 'x9', en: 'We are from Canada.', zh: '我們來自加拿大。', ja: 'カナダから来ました。', romaji: 'Kanada kara kimashita.' }
  ]
};
