// ═══════════════════════════════════════════════════════════
//  NEXUS — Games Engine
// ═══════════════════════════════════════════════════════════

import { Utils } from './utils.js';

export const Games = {
  generateId: () => Utils.randomToken(8),
  createGuess: (min = 1, max = 100) => ({
    number: Math.floor(Math.random() * (max - min + 1)) + min,
    min, max, attempts: 0,
  }),
  rpsResult(p1, p2) {
    if (p1 === p2) return 'tie';
    const w = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    return w[p1] === p2 ? 'p1' : 'p2';
  },
  spinSlot() {
    const s = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣'];
    const r = [
      s[Math.floor(Math.random() * s.length)],
      s[Math.floor(Math.random() * s.length)],
      s[Math.floor(Math.random() * s.length)],
    ];
    let m = 0;
    if (r[0] === r[1] && r[1] === r[2]) {
      if (r[0] === '💎') m = 50;
      else if (r[0] === '7️⃣') m = 20;
      else if (r[0] === '⭐') m = 10;
      else m = 5;
    } else if (r[0] === r[1] || r[1] === r[2]) m = 2;
    return { result: r, multiplier: m };
  },
  quiz: [
    { q: 'پایتخت ایران؟', options: ['تهران','اصفهان','شیراز','مشهد'], answer: 0 },
    { q: 'بزرگ‌ترین سیاره؟', options: ['زمین','مشتری','زحل','مریخ'], answer: 1 },
    { q: 'شاعر شاهنامه؟', options: ['حافظ','سعدی','فردوسی','مولانا'], answer: 2 },
    { q: 'کدام عنصر نیست؟', options: ['اکسیژن','طلا','نمک','آهن'], answer: 2 },
    { q: 'قدیمی‌ترین تمدن؟', options: ['یونان','مصر','ایران','بین‌النهرین'], answer: 3 },
    { q: 'سریع‌ترین حیوان؟', options: ['یوزپلنگ','شیر','اسب','گرگ'], answer: 0 },
    { q: 'بیشترین جمعیت؟', options: ['آمریکا','روسیه','هند','چین'], answer: 2 },
    { q: 'مخترع تلفن؟', options: ['ادیسون','گراهام بل','انیشتین','نیوتن'], answer: 1 },
    { q: '2 به توان 10؟', options: ['512','1024','2048','256'], answer: 1 },
    { q: 'رنگ پرچم ژاپن؟', options: ['قرمز و سفید','آبی','سبز','زرد'], answer: 0 },
  ],
  getRandomQuiz() { return this.quiz[Math.floor(Math.random() * this.quiz.length)]; },
  types: ['برنامه‌نویسی زیباست', 'دنیای دیجیتال', 'موفقیت در راه است', 'هوش مصنوعی آینده'],
  getRandomType() { return this.types[Math.floor(Math.random() * this.types.length)]; },
};
