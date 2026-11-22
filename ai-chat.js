const quickQuestions = [
  'Tìm hiểu GORISE',
  'Khám phá Safe Home',
  'Hướng dẫn cách chơi',
  'Hỏi TIGORI',
];
const allowedRoutes = new Set(['/', '/ve-gorise/', '/kham-pha-tro-choi/', '/thu-thach/', '/lien-he/', '/gio-hang/', '/tin-tuc/', '/video-tinh-huong/', '/gorise-play/']);
const sourceLabels = { official: 'Thông tin từ GORISE', web: 'Thông tin tham khảo từ Web', mixed: 'Thông tin GORISE + nguồn tham khảo' };
const storageKey = 'goriseAiConversationV1';
let controller;

function loadHistory() {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value.filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-8) : [];
  } catch { return []; }
}

function saveHistory(history) {
  try { sessionStorage.setItem(storageKey, JSON.stringify(history.slice(-8))); }
  catch { /* Private browsing may disable storage; this tab still retains in-memory context. */ }
}

function textNode(tag, className, value) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  return node;
}

function makePills(items, onClick) {
  const group = document.createElement('div');
  group.className = 'ai-chat-pills';
  items.forEach((item) => {
    const button = textNode('button', 'ai-chat-pill', item);
    button.type = 'button';
    button.addEventListener('click', () => onClick(item.replace(/^[^\p{L}\p{N}]+/u, '')));
    group.append(button);
  });
  return group;
}

function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}

function renderMessage(log, role, content, options = {}) {
  const item = document.createElement('div');
  item.className = `ai-chat-message ai-chat-message-${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'ai-chat-bubble';
  bubble.append(textNode('p', 'ai-chat-copy', content));
  if (role === 'assistant') {
    const avatar = document.createElement('img');
    avatar.className = 'ai-chat-message-avatar';
    avatar.src = '/tigori-mascot.png';
    avatar.alt = 'TIGORI';
    avatar.width = 38;
    avatar.height = 38;
    item.append(avatar);
  }
  if (role === 'assistant' && sourceLabels[options.sourceType]) {
    bubble.append(textNode('span', 'ai-chat-origin', sourceLabels[options.sourceType]));
  }
  if (role === 'assistant' && options.cta && allowedRoutes.has(options.cta.path)) {
    const action = textNode('a', 'ai-chat-cta', options.cta.label);
    action.href = options.cta.path;
    bubble.append(action);
  }
  if (role === 'assistant' && Array.isArray(options.sources) && options.sources.length) {
    const references = document.createElement('div');
    references.className = 'ai-chat-sources';
    references.append(textNode('strong', '', '🔎 Nguồn tham khảo'));
    options.sources.slice(0, 5).forEach((source) => {
      const url = safeSourceUrl(source.url);
      if (!url) return;
      const a = textNode('a', '', source.label || source.title || 'Nguồn Web');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = source.title || a.textContent;
      references.append(a);
    });
    bubble.append(references);
  }
  item.append(bubble);
  log.append(item);
  log.scrollTop = log.scrollHeight;
  return item;
}

function buildChat(root) {
  const dialog = document.createElement('section');
  dialog.className = 'mascot-chat';
  dialog.id = 'mascot-chat';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-label', 'Trò chuyện với GORISE AI');
  dialog.innerHTML = `<div class="ai-chat-header"><img src="/tigori-mascot.png" alt="TIGORI" width="52" height="52" /><div><strong>TIGORI – Trợ lý GORISE</strong><span><i aria-hidden="true"></i> Sẵn sàng hỗ trợ</span></div><button type="button" class="ai-chat-minimize" aria-label="Thu nhỏ cửa sổ TIGORI">−</button><button type="button" class="ai-chat-close" aria-label="Đóng cửa sổ TIGORI">×</button></div><div class="ai-chat-log" role="log" aria-live="polite" aria-relevant="additions"></div><form class="ai-chat-form"><label class="ai-chat-input-label" for="ai-chat-input">Hỏi TIGORI</label><input id="ai-chat-input" name="message" type="text" placeholder="Nhập tin nhắn cho TIGORI..." maxlength="500" autocomplete="off" required /><button type="submit" aria-label="Gửi câu hỏi">➤</button></form>`;
  root.append(dialog);
  const log = dialog.querySelector('.ai-chat-log');
  const form = dialog.querySelector('.ai-chat-form');
  const input = form.querySelector('input');
  const send = form.querySelector('button');
  const history = loadHistory();
  let busy = false;

  function setMascotState(state) {
    root.dispatchEvent(new CustomEvent('gorise-mascot-state', { detail: { state } }));
  }

  function close() {
    if (dialog.hidden) return;
    root.classList.remove('is-chatting');
    dialog.hidden = true;
    setMascotState('goodbye');
    window.setTimeout(() => setMascotState('idle'), 650);
    root.querySelector('.mascot-trigger')?.setAttribute('aria-expanded', 'false');
    root.querySelector('.mascot-trigger')?.focus();
  }

  function open() {
    root.classList.remove('is-open');
    root.classList.add('is-chatting');
    dialog.hidden = false;
    setMascotState('answering');
    root.querySelector('.mascot-trigger')?.setAttribute('aria-expanded', 'true');
    input.focus({ preventScroll: true });
    log.scrollTop = log.scrollHeight;
    window.requestAnimationFrame(() => avoidImportantControls({ checkoutOnly: true }));
  }

  function avoidImportantControls({ checkoutOnly = false } = {}) {
    if (dialog.hidden || window.innerWidth > 600) return;
    const activeCheckout = document.querySelector('[data-step-panel="info"].is-active, [data-step-panel="payment"].is-active');
    if (checkoutOnly && !activeCheckout) return;
    const main = activeCheckout || document.querySelector('main');
    if (!main) return;
    const chatBox = dialog.getBoundingClientRect();
    const controls = main.querySelectorAll('input, textarea, select, button, a.button, .challenge-card-cta, .qr-wrap, .transfer-card');
    for (const control of controls) {
      const box = control.getBoundingClientRect();
      if (box.width && box.height && box.top < chatBox.bottom && box.bottom > chatBox.top && box.left < chatBox.right && box.right > chatBox.left) {
        close();
        break;
      }
    }
  }

  if (history.length) {
    history.forEach((item) => renderMessage(log, item.role, item.content));
  }
  renderMessage(log, 'assistant', 'Xin chào! 🐯 Mình là TIGORI, người bạn đồng hành của bạn tại GORISE. Bạn muốn khám phá điều gì hôm nay?');
  log.append(makePills(quickQuestions, ask));

  async function ask(question) {
    const message = question.trim();
    if (!message || busy) return;
    busy = true;
    input.value = '';
    input.disabled = true;
    send.disabled = true;
    renderMessage(log, 'user', message);
    const searching = /xu hướng|mới nhất|hiện nay|năm 2026|board game giáo dục là gì|lợi ích.*board game/i.test(message);
    setMascotState('thinking');
    const loading = renderMessage(log, 'assistant', searching ? 'TIGORI đang tìm thêm thông tin cho bạn nhé... 🔎' : 'TIGORI đang suy nghĩ một chút... ✨');
    const dots = textNode('span', 'ai-chat-dots', '● ● ●');
    loading.append(dots);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: history.slice(-8), page: { path: window.location.pathname, title: document.title } }),
        signal: AbortSignal.timeout(65000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chat unavailable');
      loading.remove();
      setMascotState('answering');
      renderMessage(log, 'assistant', result.answer, result);
      history.push({ role: 'user', content: message }, { role: 'assistant', content: result.answer, topic: result.topic });
      while (history.length > 8) history.shift();
      saveHistory(history);
      if (Array.isArray(result.suggestions) && result.suggestions.length) {
        log.append(textNode('span', 'ai-chat-next-label', 'Bạn có thể hỏi thêm:'));
        log.append(makePills(result.suggestions.slice(0, 3), ask));
      }
    } catch {
      loading.remove();
      setMascotState('answering');
      renderMessage(log, 'assistant', 'TIGORI chưa lấy được câu trả lời lần này. Bạn thử hỏi lại mình nhé!');
    } finally {
      busy = false;
      input.disabled = false;
      send.disabled = false;
      if (!dialog.hidden) { input.focus({ preventScroll: true }); setMascotState('answering'); }
    }
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); ask(input.value); });
  dialog.querySelector('.ai-chat-close').addEventListener('click', close);
  dialog.querySelector('.ai-chat-minimize').addEventListener('click', close);
  root.addEventListener('gorise-close-chat', close);
  dialog.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } });
  document.addEventListener('pointerdown', (event) => {
    if (!dialog.hidden && !root.contains(event.target)) close();
  });
  window.addEventListener('scroll', () => avoidImportantControls(), { passive: true });
  window.addEventListener('resize', () => avoidImportantControls());
  return { open, close, ask };
}

export function openChat(root, question = '') {
  if (!controller || controller.root !== root) controller = { root, ...buildChat(root) };
  controller.open();
  if (question) window.setTimeout(() => controller.ask(question), 80);
}
