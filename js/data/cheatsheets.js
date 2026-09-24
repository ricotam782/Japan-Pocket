/*
 * Cheat sheet content. Each sheet has a list of items:
 *   { ja: 'label to look for' (optional), en, zh, note (optional), warn (optional) }
 */
window.JP = window.JP || {};
JP.data = JP.data || {};

JP.data.cheatsheets = [
  {
    id: 'toilet', en: 'Toilet buttons', zh: '廁所按鈕', icon: '🚽',
    intro: { en: 'Japanese toilets have a control panel on the wall or beside the seat. Look for these words:', zh: '日本的廁所在牆上或座位旁有控制面板。請留意以下文字：' },
    items: [
      { ja: '流す', en: 'Flush', zh: '沖水', note: '大 = big flush 大量沖水 · 小 = small flush 少量沖水' },
      { ja: '止', en: 'STOP (stops the spray)', zh: '停止（停止噴水）', note: 'Often an orange/red button 通常是橙色或紅色按鈕' },
      { ja: 'おしり', en: 'Rear wash', zh: '臀部洗淨' },
      { ja: 'ビデ', en: 'Bidet (front wash)', zh: '前方洗淨（女性用）' },
      { ja: '乾燥', en: 'Dryer', zh: '暖風乾燥' },
      { ja: '水勢 / 強・弱', en: 'Water pressure (strong / weak)', zh: '水壓（強／弱）' },
      { ja: '温度', en: 'Water / seat temperature', zh: '水溫／座墊溫度' },
      { ja: '音姫 / 流水音', en: 'Flushing sound for privacy', zh: '模擬沖水聲（遮蓋聲音）' },
      { ja: '呼出 / 非常', en: 'CALL FOR HELP — emergency only!', zh: '緊急呼叫 — 只在緊急時使用！', warn: true },
      { ja: '洋式 / 和式', en: 'Western-style / squat toilet', zh: '西式坐廁／蹲廁' },
      { ja: '多目的トイレ', en: 'Accessible toilet (more space, handrails)', zh: '多功能洗手間（空間較大、有扶手）' }
    ]
  },
  {
    id: 'garbage', en: 'Garbage sorting', zh: '垃圾分類', icon: '♻️',
    intro: { en: 'Public bins are rare. Carry a small bag and take rubbish back to the hotel or a convenience store.', zh: '公共垃圾桶很少。請帶一個小袋，把垃圾帶回酒店或便利店丟棄。' },
    items: [
      { ja: '燃えるゴミ / 可燃', en: 'Burnable: food waste, paper, tissues', zh: '可燃垃圾：廚餘、紙張、紙巾' },
      { ja: '燃えないゴミ / 不燃', en: 'Non-burnable: metal, glass, ceramics, batteries', zh: '不可燃垃圾：金屬、玻璃、陶瓷、電池' },
      { ja: 'ペットボトル', en: 'PET bottles — remove cap and label if you can', zh: '塑膠瓶 — 盡量拆除瓶蓋和標籤' },
      { ja: 'キャップ', en: 'Bottle caps (separate bin)', zh: '瓶蓋（另外分類）' },
      { ja: '缶', en: 'Cans', zh: '罐' },
      { ja: 'びん', en: 'Glass bottles', zh: '玻璃瓶' },
      { ja: 'プラ / プラスチック', en: 'Plastic packaging', zh: '塑膠包裝' },
      { ja: '資源ゴミ', en: 'Recyclables', zh: '資源回收' },
      { ja: 'その他', en: 'Other', zh: '其他' }
    ]
  },
  {
    id: 'etiquette', en: 'Etiquette', zh: '禮儀', icon: '🙇',
    intro: { en: 'Small things that make a good impression:', zh: '一些能留下好印象的小事：' },
    items: [
      { en: 'Take shoes off when you see a step up or slippers at the entrance (homes, ryokan, some temples & restaurants).', zh: '入口有台階或拖鞋時要脫鞋（住宅、旅館、部分寺廟及餐廳）。' },
      { en: 'Use the special toilet slippers only in the toilet room.', zh: '廁所拖鞋只可在廁所內穿著。' },
      { en: 'No tipping — it can cause confusion. Great service is included.', zh: '不用給小費，反而會令人困擾。' },
      { en: 'Put money on the small tray at the counter, not in the hand.', zh: '付款時把錢放在櫃檯的小托盤上。' },
      { en: 'Keep quiet on trains; no phone calls. Set phone to silent (マナーモード).', zh: '在列車上保持安靜，不要講電話，手機設為靜音。' },
      { en: 'Priority seats (優先席) are for elderly, pregnant and disabled — you may use them too!', zh: '優先席供長者、孕婦及傷殘人士使用 — 你們也可以坐！' },
      { en: 'Escalators: stand on the LEFT in Tokyo, on the RIGHT in Osaka/Kyoto area.', zh: '扶手電梯：東京靠左站，大阪／京都一帶靠右站。' },
      { en: 'Avoid eating while walking; eat near the shop or at a bench.', zh: '避免邊走邊吃，可在店旁或長椅上吃。' },
      { en: 'Chopsticks: never stick them upright in rice or pass food chopstick-to-chopstick.', zh: '筷子：不要直插在飯中，也不要用筷子互相傳遞食物。' },
      { en: 'Onsen: wash fully before entering, no swimsuits, keep towel out of the water. Tattoos may not be allowed.', zh: '溫泉：入浴前先徹底清洗，不可穿泳衣，毛巾不要放入水中。有紋身者可能不准進入。' },
      { en: 'Temples & shrines: bow at the gate, wash hands at the basin, keep voices low.', zh: '寺廟和神社：在門口鞠躬，在手水舍洗手，保持安靜。' },
      { en: 'Queue neatly — lines are marked on train platforms.', zh: '排隊要整齊 — 月台上有標示排隊位置。' },
      { en: 'Carry some cash: small shops, shrines and rural places may not take cards.', zh: '帶備現金：小店、神社及鄉郊地方可能不收信用卡。' },
      { en: 'A small bow with "sumimasen" (すみません) works for excuse me, sorry and thank you.', zh: '輕輕鞠躬說「すみません」可表示借過、抱歉及謝謝。' }
    ]
  }
];
