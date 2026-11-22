import { readFile } from 'node:fs/promises';
import { getProduct } from './db.js';
import { classifyQuestion, summarizeWeb } from './llm.js';
import { searchWeb } from './search.js';

const knowledge = JSON.parse(await readFile(new URL('./knowledge.json', import.meta.url), 'utf8'));
const money = (value) => `${new Intl.NumberFormat('vi-VN').format(value)}₫`;
const strip = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const routes = new Set(['/', '/ve-gorise/', '/kham-pha-tro-choi/', '/thu-thach/', '/lien-he/', '/gio-hang/', '/video-tinh-huong/', '/gorise-play/']);
const link = (label, path) => routes.has(path) ? { label, path } : null;
const noFact = 'Mình chưa có thông tin chính xác về vấn đề này trong dữ liệu GORISE hiện tại. Bạn có thể liên hệ với đội ngũ GORISE để được hỗ trợ thêm nhé!';

function directIntent(question, lastTopic) {
  const raw = strip(question);
  const q = raw.replace(/\b(hien nay|moi nhat|nam 2026)\b/g, '').replace(/\s+/g, ' ');
  if (/trong do|trong bo do|no gom|co nhung gi/.test(q) && ['price', 'products', 'components'].includes(lastTopic)) return 'components';
  if (/phi (van chuyen|giao hang|ship)|mien phi (giao|ship)|giao hang bao nhieu/.test(q)) return 'shipping';
  if (/gia bao nhieu|bao nhieu tien|xin gia|gia bo|gia san pham|gia cua|gia hien tai/.test(q)) return 'price';
  if (/video|tinh huong|qr tren the|ma qr mo video/.test(q)) return 'videos';
  if (/ngan hang|so tai khoan|chuyen khoan|qu[ée]t ma thanh toan|qr thanh toan|thanh toan/.test(q)) return 'payment';
  if (/ton kho|con hang|san hang|het hang|trang thai san pham/.test(q)) return 'availability';
  if (/khuyen mai|giam gia|voucher|ma giam gia|dia chi cua hang|dia chi van phong/.test(q)) return 'unknown';
  if (/chinh sach|doi tra|bao hanh|hoan tien/.test(q)) return 'policies';
  if (/lien he|so dien thoai|email|dia chi|tu van/.test(q)) return 'contact';
  if (/mua o dau|dat hang|mua hang|cach mua|lam the nao de mua|them vao gio/.test(q)) return 'order';
  if (/trong hop|trong bo|gom nhung gi|thanh phan|quan co|the tinh huong|xuc xac/.test(q)) return 'components';
  if (/cach choi|choi nhu the nao|luat choi|huong dan choi|tung buoc|bat dau choi/.test(q)) return 'play';
  if (/ky nang an toan|an toan trong nha|nhan biet nguy hiem|xu ly tinh huong|phong chay|an toan dien|nguoi la/.test(q)) return 'safety';
  if (/thu thach|tinh huong|an toan giao thong|phong chay/.test(q) && /gorise|thu thach|tro choi|bo game/.test(q)) return 'challenges';
  if (/gorise/.test(q) && /so sanh|so voi|voi cac board game khac|va board game noi chung/.test(q)) return 'external';
  if (/loi ich|gia tri giao duc|tac dung|de lam gi/.test(q) && /gorise|game nay|tro nay/.test(q)) return 'benefits';
  if (/danh cho ai|do tuoi|tre may tuoi|tre em|gia dinh|truong hoc/.test(q) && /gorise|bo game|san pham|danh cho ai/.test(q)) return 'audience';
  if (/tam nhin|su menh|gia tri cot loi|den nam 2030/.test(q)) return 'vision';
  if (/gorise la gi|cho minh biet.*gorise|san pham la gi/.test(q)) return 'about';
  if (/gorise/.test(q) && /moi nhat|hien nay|nam 2026|xu huong/.test(raw)) return 'unknown';
  if (/xu huong|moi nhat|nam 2026|hien nay|loi ich.*board game|board game.*loi ich|board game giao duc la gi|tro choi giao duc la gi/.test(raw) && !/gia.*gorise|gorise.*gia/.test(q)) return 'external';
  if (/tim.*san pham|san pham nao|cac loai|co may loai/.test(q)) return 'products';
  if (/cau chuyen|ra doi|sang lap|nguon goc/.test(q)) return 'story';
  if (/game nay de lam gi|tro nay de lam gi/.test(q)) return 'about';
  return null;
}

function officialAnswer(intent, product) {
  const contact = link('Liên hệ GORISE →', '/lien-he/');
  const productLink = link('Xem sản phẩm →', '/kham-pha-tro-choi/');
  const videoLink = link('Xem video tình huống →', '/video-tinh-huong/');
  switch (intent) {
    case 'about': return { text: `${knowledge.brand.definition} 🎲`, cta: link('Xem GORISE →', '/ve-gorise/'), suggestions: ['GORISE dành cho ai?', 'Cách chơi như thế nào?'] };
    case 'story': return { text: `${knowledge.brand.story} 🌱`, cta: link('Tìm hiểu câu chuyện →', '/ve-gorise/'), suggestions: ['GORISE dành cho ai?', 'Cách chơi như thế nào?'] };
    case 'benefits': return { text: `${knowledge.brand.educationalValue} Các mục tiêu của GORISE là ${knowledge.brand.goals.join(', ').toLowerCase()}.`, cta: link('Về GORISE →', '/ve-gorise/'), suggestions: ['GORISE dành cho ai?', 'Cách chơi?'] };
    case 'audience': return { text: `GORISE hướng đến ${knowledge.brand.audience.join(', ').toLowerCase()}. Độ tuổi trên trang sản phẩm là ${product?.ageRange || 'chưa được xác nhận'}; thông số này còn dự kiến, bạn có thể hỏi đội ngũ GORISE để chọn cho phù hợp nhé!`, cta: link('Xem GORISE →', '/ve-gorise/'), suggestions: ['Trong hộp có gì?', 'Giá bao nhiêu?'] };
    case 'play': return { text: `Bạn chuẩn bị bàn chơi, quân cờ, thẻ và xúc xắc. Sau đó: ${knowledge.play.learningPath.map((item, i) => `${i + 1}. ${item}`).join(' → ')}. Mỗi tình huống giúp bạn cùng mọi người trao đổi và học từ lựa chọn của mình. 🎲`, cta: link('Khám phá Safe Home →', '/kham-pha-tro-choi/'), suggestions: ['GORISE có thử thách gì?', 'Trong hộp có gì?'] };
    case 'videos': return { text: 'Bạn có thể mở kho video tình huống Safe Home để xem từng chủ đề, lọc theo khu vực và quét QR trên thẻ để mở đúng câu chuyện. TIGORI khuyên bạn hãy cùng trẻ dừng lại, quan sát và trao đổi trước khi chọn cách xử lý nhé! 🎬', cta: videoLink, suggestions: ['Có những chủ đề tình huống nào?', 'Các kỹ năng an toàn là gì?'] };
    case 'safety': return { text: 'GORISE giúp trẻ luyện các kỹ năng nền tảng: nhận biết nguy hiểm, dừng lại quan sát, suy nghĩ trước khi hành động, trao đổi với người lớn và lựa chọn cách an toàn hơn. Với tình huống nguy hiểm thật, hãy ưu tiên rời khỏi khu vực nguy hiểm và gọi người lớn hoặc dịch vụ khẩn cấp phù hợp — trò chơi không thay thế hướng dẫn chuyên môn. 🛡️', cta: videoLink, suggestions: ['Xem video tình huống', 'GORISE dành cho ai?'] };
    case 'vision': return { text: 'Tầm nhìn của GORISE là trở thành thương hiệu giáo dục đáng tin cậy về kỹ năng an toàn và kỹ năng sống cho trẻ em tại Việt Nam, hướng tới năm 2030 và một hệ sinh thái học qua trải nghiệm. Sứ mệnh của GORISE là biến kiến thức thành những trải nghiệm có ý nghĩa, để trẻ chủ động quan sát, suy nghĩ, lựa chọn và học hỏi.', cta: link('Tìm hiểu Về GORISE →', '/ve-gorise/'), suggestions: ['GORISE là gì?', 'GORISE dành cho ai?'] };
    case 'components': return product ? { text: `Trong bộ ${product.productName} hiện được giới thiệu có: ${product.components.join(', ')}. Bạn muốn mình kể thêm về cách chơi không?`, cta: productLink, suggestions: ['Cách chơi như thế nào?', 'Giá bao nhiêu?'] } : { text: noFact, cta: contact, suggestions: ['Liên hệ GORISE?'] };
    case 'products': return product ? { text: `Hiện website giới thiệu ${product.productName}: ${product.description} Bạn có thể xem bộ game và các thành phần ngay trên trang sản phẩm nhé!`, cta: productLink, suggestions: ['Trong hộp có gì?', 'Giá bao nhiêu?', 'Cách đặt hàng?'] } : { text: noFact, cta: contact, suggestions: ['Liên hệ GORISE?'] };
    case 'price': return product?.price != null ? { text: `Giá hiện được lưu trong dữ liệu GORISE cho ${product.productName} là ${money(product.price)}. Bạn có thể xem sản phẩm để tìm hiểu thêm; thông tin phí giao hàng cần xác nhận riêng nhé! 🛒`, cta: productLink, suggestions: ['Trong hộp có gì?', 'Cách đặt hàng?', 'Phí giao hàng?'] } : { text: noFact, cta: contact, suggestions: ['Liên hệ GORISE?'] };
    case 'availability': return product?.availability ? { text: `Tình trạng ${product.productName} trong dữ liệu GORISE: ${product.availability}. Bạn kiểm tra lại với đội ngũ trước khi đặt hàng nhé!`, cta: productLink, suggestions: ['Giá bao nhiêu?', 'Cách đặt hàng?'] } : { text: `${noFact} Mình chưa có số lượng tồn kho đã xác minh.`, cta: contact, suggestions: ['Liên hệ GORISE?'] };
    case 'challenges': return { text: `GORISE có các nhóm thử thách: ${knowledge.challenges.groups.join(', ')}. Trang Thử thách còn có một tình huống mẫu để bạn thử lựa chọn nữa đó! 🚀`, cta: link('Khám phá thử thách →', '/thu-thach/'), suggestions: ['Cách chơi như thế nào?', 'GORISE dành cho ai?'] };
    case 'order': return { text: `Bạn có thể xem bộ game, thêm vào giỏ, nhập thông tin nhận hàng rồi xem lại đơn. Lưu ý: bước QR và màn hình hoàn tất hiện là mô phỏng, chưa tự động xác minh thanh toán hoặc ghi nhận đơn thật; hãy liên hệ GORISE trước khi chuyển tiền nhé!`, cta: link('Xem giỏ hàng →', '/gio-hang/'), suggestions: ['Giá bao nhiêu?', 'Thanh toán thế nào?', 'Liên hệ GORISE?'] };
    case 'payment': return { text: `Trang thanh toán hiện dùng QR minh họa và thông tin ngân hàng placeholder, nên mình chưa thể cung cấp số tài khoản, QR hay xác nhận giao dịch thật. Bạn đừng chuyển tiền theo phần demo; hãy liên hệ trực tiếp đội ngũ GORISE để nhận hướng dẫn thanh toán chính thức nhé!`, cta: contact, suggestions: ['Liên hệ GORISE?', 'Cách đặt hàng?'] };
    case 'shipping': return { text: `Mình chưa có mức phí vận chuyển chính thức để xác nhận: trang sản phẩm ghi miễn phí, còn giỏ hàng demo hiển thị 30.000₫. Hai thông tin chưa khớp, nên bạn hỏi đội ngũ GORISE trước khi đặt hàng nhé!`, cta: contact, suggestions: ['Liên hệ GORISE?', 'Giá sản phẩm?'] };
    case 'policies': return { text: `Trang sản phẩm có nhắc “Đổi trả trong 7 ngày”, nhưng điều kiện chi tiết chưa được công bố trên website. Mình không muốn tự đoán thêm; bạn liên hệ GORISE để được giải thích chính sách chính thức nhé!`, cta: contact, suggestions: ['Liên hệ GORISE?', 'Phí giao hàng?'] };
    case 'contact': return { text: `Bạn có thể liên hệ đội ngũ GORISE qua ${knowledge.contact.email} hoặc ${knowledge.contact.phone}. Mình cũng có thể dẫn bạn đến trang Liên hệ để xem thêm thông tin nhé!`, cta: contact, suggestions: ['Giá bao nhiêu?', 'Cách chơi?'] };
    default: return { text: noFact, cta: contact, suggestions: ['GORISE là gì?', 'Liên hệ GORISE?'] };
  }
}

export async function answerQuestion(question, history = [], page = {}) {
  const lastTopic = [...history].reverse().find((item) => item.role === 'assistant' && typeof item.topic === 'string')?.topic || null;
  let intent = directIntent(question, lastTopic);
  const path = typeof page.path === 'string' ? page.path : '';
  if (!intent && /video-tinh-huong/.test(path)) intent = 'videos';
  if (!intent && /ve-gorise/.test(path) && /tam nhin|su menh|phan nay|section/i.test(strip(question))) intent = 'vision';
  if (!intent) {
    try { intent = await classifyQuestion(question, history, lastTopic); }
    catch (error) { console.error('Intent classification unavailable:', error.message); intent = 'unknown'; }
  }
  let product = null;
  try { product = await getProduct(); }
  catch (error) { console.error('Product database unavailable:', error.message); }

  const mixed = intent === 'external' && /gorise/i.test(question);
  if (intent === 'external') {
    const search = await searchWeb(question);
    if (!search.available) return {
      answer: 'Hiện tại mình chưa thể tìm kiếm thông tin trên Web. Nhưng mình vẫn có thể giúp bạn với những thông tin GORISE hiện có nhé!',
      cta: link('Khám phá GORISE →', '/ve-gorise/'), topic: 'external', sourceType: 'none', sources: [],
      suggestions: ['GORISE là gì?', 'Cách chơi như thế nào?'],
    };
    if (search.sources.length < 3) return {
      answer: 'Mình chưa tìm được đủ ba nguồn đáng tin cậy để đối chiếu thông tin này. Bạn thử hỏi cụ thể hơn nhé!',
      cta: null, topic: 'external', sourceType: 'none', sources: [], suggestions: ['Board game giáo dục là gì?'],
    };
    try {
      const summary = await summarizeWeb(question, search.sources);
      return {
        answer: mixed ? `${knowledge.brand.definition}\n\n${summary}` : summary,
        cta: mixed ? link('Về GORISE →', '/ve-gorise/') : null,
        topic: 'external', sourceType: mixed ? 'mixed' : 'web',
        sources: search.sources.map(({ label, title, url }) => ({ label, title, url })),
        suggestions: ['GORISE là gì?', 'Cách chơi như thế nào?'],
      };
    } catch (error) {
      console.error('Web synthesis unavailable:', error.message);
      return { answer: 'Mình tìm được nguồn nhưng chưa thể tổng hợp một câu trả lời đủ chắc chắn. Bạn thử lại sau nhé!', cta: null, topic: 'external', sourceType: 'none', sources: [], suggestions: ['GORISE là gì?'] };
    }
  }

  const official = officialAnswer(intent, product);
  return { answer: official.text, cta: official.cta, suggestions: official.suggestions, topic: intent, sourceType: 'official', sources: [] };
}
