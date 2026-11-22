const $ = (selector) => document.querySelector(selector);
const clone = (value) => JSON.parse(JSON.stringify(value));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

const state = {
  pages: [], page: null, selected: null, selectedField: null, undo: [], redo: [], dragId: null,
  viewport: 'desktop', query: '', category: 'all', clipboard: null, frameReady: false,
};

const components = [
  { type:'section', category:'Layout', title:'Section', desc:'Khung nội dung có nền, spacing và responsive' },
  { type:'container', category:'Layout', title:'Container', desc:'Khu vực căn giữa cho nội dung' },
  { type:'grid', category:'Layout', title:'Grid', desc:'Lưới nhiều cột linh hoạt' },
  { type:'columns', category:'Layout', title:'Columns', desc:'Bố cục hai hoặc ba cột' },
  { type:'flexbox', category:'Layout', title:'Flexbox', desc:'Hàng hoặc cột căn chỉnh tự do' },
  { type:'spacer', category:'Layout', title:'Spacer', desc:'Khoảng thở điều chỉnh được' },
  { type:'divider', category:'Layout', title:'Divider', desc:'Đường phân cách tinh tế' },
  { type:'background', category:'Layout', title:'Background Layer', desc:'Lớp nền màu, gradient hoặc ảnh' },
  { type:'heading', category:'Content', title:'Heading', desc:'Tiêu đề hỗ trợ tiếng Việt' },
  { type:'paragraph', category:'Content', title:'Paragraph', desc:'Đoạn văn có thể sửa trực tiếp' },
  { type:'rich-text', category:'Content', title:'Rich Text', desc:'Nội dung nhiều định dạng' },
  { type:'image', category:'Content', title:'Image', desc:'Ảnh responsive từ Media Library' },
  { type:'gallery', category:'Content', title:'Image Gallery', desc:'Bộ sưu tập ảnh' },
  { type:'video', category:'Content', title:'Video', desc:'Video có poster và controls' },
  { type:'icon', category:'Content', title:'Icon', desc:'Biểu tượng board game' },
  { type:'button', category:'Content', title:'Button', desc:'Nút có action và target' },
  { type:'badge', category:'Content', title:'Badge', desc:'Nhãn ngắn nổi bật' },
  { type:'card', category:'Content', title:'Card', desc:'Thẻ nội dung bo góc' },
  { type:'accordion', category:'Content', title:'Accordion', desc:'Khối câu hỏi mở rộng' },
  { type:'tabs', category:'Content', title:'Tabs', desc:'Nội dung theo tab' },
  { type:'hero', category:'Advanced', title:'Hero Banner', desc:'Hero GORISE với CTA' },
  { type:'product', category:'Advanced', title:'Product Showcase', desc:'Giới thiệu Safe Home' },
  { type:'comparison', category:'Advanced', title:'Safe Home Comparison', desc:'Bảng so sánh Standard và Premium' },
  { type:'character', category:'Advanced', title:'Character Carousel', desc:'Carousel nhân vật Safe Home' },
  { type:'video-gallery', category:'Advanced', title:'Video Gallery', desc:'Kho video tình huống' },
  { type:'hotspot', category:'Advanced', title:'Interactive Hotspot', desc:'Điểm tương tác trên ảnh' },
  { type:'mascot', category:'Advanced', title:'Floating Mascot', desc:'Mascot TIGORI hỗ trợ' },
  { type:'faq', category:'Advanced', title:'FAQ', desc:'Câu hỏi thường gặp' },
  { type:'contact', category:'Advanced', title:'Contact Form', desc:'Form liên hệ GORISE' },
  { type:'cta', category:'Advanced', title:'Call To Action', desc:'Khối kêu gọi hành động' },
  { type:'animated', category:'Advanced', title:'Animated Section', desc:'Section có scroll reveal' },
];
const categories = ['all', 'Layout', 'Content', 'Advanced'];
const categoryLabels = { all:'Tất cả', Layout:'Layout', Content:'Content', Advanced:'Nâng cao' };
const componentInfo = (type) => components.find((item) => item.type === type) || { title:'Section', desc:'' };

function setStatus(text, tone = '') { const node = $('#builder-status'); if (node) { node.textContent = text; node.dataset.tone = tone; } }
async function request(url, options = {}) {
  const response = await fetch(url, { credentials:'include', headers:{ 'Content-Type':'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401) location.href = data.loginUrl || '/api/auth/login'; throw new Error(data.error || 'Có lỗi xảy ra.'); }
  return data;
}
function currentSection() { return state.page?.draft?.sections.find((section) => section.id === state.selected) || null; }
function snapshot() { if (!state.page) return; state.undo.push(clone(state.page.draft)); if (state.undo.length > 50) state.undo.shift(); state.redo = []; }
function fieldValue(section, field) {
  if (!field) return '';
  if (field === 'heading') return section.content?.heading || '';
  if (field === 'text') return section.content?.text || '';
  if (field === 'button') return section.content?.buttonLabel || '';
  if (field === 'image') return section.content?.image || '';
  return '';
}
function sectionTemplate(type, beforeId = null) {
  const info = componentInfo(type); const id = `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  const content = { heading:type === 'comparison' ? 'Phiên bản nào phù hợp với bạn?' : info.title, text:type === 'comparison' ? 'Hai hành trình khám phá an toàn – lựa chọn trải nghiệm phù hợp cho gia đình bạn.' : (info.desc || 'Nội dung mới có thể chỉnh sửa tại bảng thuộc tính.'), image:type === 'comparison' ? '/product-safe-home.webp' : '', buttonLabel:['hero','cta','button','comparison'].includes(type) ? 'Khám phá ngay' : '' };
  return { id, type, label:info.title, visible:true, locked:false,
    content,
    style:{ background:'#ffffff', color:'#123b73', padding:'64px 6%', width:'100%', minHeight:'0', margin:'0', borderRadius:'0', opacity:'1', boxShadow:'none', backgroundImage:'' },
    responsive:{ desktop:{}, tablet:{}, mobile:{ padding:'40px 20px' } },
    animation:{ name:'none', duration:'400ms', delay:'0ms', easing:'ease', trigger:'scroll', repeat:'once' },
    interactions:{ buttonAction:'internal', target:'/' }, children:[
      { id:`${id}-heading`, type:'heading', label:'Tiêu đề', visible:true, locked:false, content:{ text:content.heading }, style:{}, children:[] },
      { id:`${id}-text`, type:'paragraph', label:'Nội dung', visible:true, locked:false, content:{ text:content.text }, style:{}, children:[] },
      ...(content.buttonLabel ? [{ id:`${id}-button`, type:'button', label:'Nút / liên kết', visible:true, locked:false, content:{ text:content.buttonLabel }, style:{}, interactions:{ buttonAction:'internal', target:'/' }, children:[] }] : []),
    ], beforeId,
  };
}
function renderCategoryFilters() {
  const host = $('#builder-category-filters'); if (!host) return;
  host.innerHTML = categories.map((category) => `<button type="button" class="builder-filter ${state.category === category ? 'is-active' : ''}" data-category="${category}">${categoryLabels[category]}</button>`).join('');
  host.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { state.category = button.dataset.category; renderLibrary(); }));
}
function renderLibrary() {
  renderCategoryFilters(); const query = state.query.toLowerCase();
  const filtered = components.filter((item) => (state.category === 'all' || item.category === state.category) && `${item.title} ${item.desc}`.toLowerCase().includes(query));
  const grouped = categories.slice(1).map((category) => [category, filtered.filter((item) => item.category === category)]).filter(([, items]) => items.length);
  $('#builder-component-list').innerHTML = grouped.map(([category, items]) => `<section class="builder-library-group"><h3>${categoryLabels[category]}</h3>${items.map((item) => `<button draggable="true" class="builder-component" data-add-type="${esc(item.type)}" title="${esc(item.desc)}"><span class="builder-component-icon">✦</span><span><b>${esc(item.title)}</b><small>${esc(item.desc)}</small></span><em>＋</em></button>`).join('')}</section>`).join('') || '<div class="builder-empty">Không tìm thấy component phù hợp.</div>';
  document.querySelectorAll('[data-add-type]').forEach((button) => { button.addEventListener('click', () => addSection(button.dataset.addType)); button.addEventListener('dragstart', (event) => { state.dragId = `library:${button.dataset.addType}`; event.dataTransfer.setData('text/plain', button.dataset.addType); }); });
}
function updateLiveFrame() {
  if (!state.page) return; const frame = $('#builder-live-frame'); const next = state.page.route || '/';
  if (frame.dataset.route !== next) { frame.dataset.route = next; state.frameReady = false; frame.src = `${next}${next.includes('?') ? '&' : '?'}builderPreview=1`; }
  $('#builder-canvas-frame').dataset.viewport = state.viewport; postDraftToFrame();
}
function postDraftToFrame() { const frame = $('#builder-live-frame'); if (frame?.contentWindow && state.page) frame.contentWindow.postMessage({ source:'gorise-studio', type:'draft-schema', schema:state.page.draft, viewport:state.viewport }, '*'); }
function layerRows(section) {
  const fields = [
    ['heading','Tiêu đề','Aa'], ['text','Nội dung','¶'], ...(section.content?.image ? [['image','Hình ảnh','▧']] : []), ...(section.content?.buttonLabel ? [['button','Nút / liên kết','↗']] : []),
  ];
  const childRows = (section.children || []).map((child) => `<div class="builder-layer-child-schema"><span>${child.type === 'button' ? '↗' : child.type === 'image' ? '▧' : '•'}</span><b>${esc(child.label || child.type || 'Component')}</b></div>`).join('');
  return `<div class="builder-layer-node is-section"><button type="button" data-layer-section="${esc(section.id)}">${section.locked ? '🔒' : '▾'} <b>${esc(section.label || 'Section')}</b></button><div class="builder-layer-children">${fields.map(([field,label,icon]) => `<button type="button" class="${state.selected === section.id && state.selectedField === field ? 'is-selected' : ''}" data-layer-field="${esc(field)}" data-layer-section="${esc(section.id)}"><span>${icon}</span>${esc(label)}</button>`).join('')}${childRows}</div></div>`;
}
function renderLayers() {
  const host = $('#builder-layers'); if (!host) return; const sections = state.page?.draft?.sections || [];
  host.innerHTML = sections.length ? sections.map(layerRows).join('') : '<div class="builder-empty">Chưa có layer.</div>';
  host.querySelectorAll('[data-layer-section]').forEach((button) => button.addEventListener('click', () => selectSection(button.dataset.layerSection, button.dataset.layerField || null)));
}
function renderCanvas() {
  if (!state.page) return; const canvas = $('#builder-canvas'); const sections = state.page.draft?.sections || [];
  $('#builder-canvas-title').textContent = state.page.title || ''; $('#builder-page-meta').textContent = `${sections.length} section · ${state.page.status === 'published' ? 'Đã publish' : 'Bản nháp'}`;
  canvas.innerHTML = sections.map((section, index) => `<div class="builder-drop-zone" data-drop-before="${esc(section.id)}"><button type="button" class="builder-add-between" data-add-before="${esc(section.id)}">＋ Thêm section</button></div><article class="builder-section-card ${section.id === state.selected ? 'is-selected' : ''} ${section.visible === false ? 'is-hidden' : ''}" draggable="${section.locked ? 'false' : 'true'}" data-section-id="${esc(section.id)}"><div class="builder-section-toolbar"><span class="builder-drag">⠿</span><b>${esc(section.label || 'Section')}</b><small>${esc(section.type || 'section')} · ${index + 1}</small><span class="builder-layer-state">${section.locked ? '🔒' : ''}${section.visible === false ? ' ◌' : ''}</span><button type="button" data-select="${esc(section.id)}">Chỉnh</button></div><div class="builder-section-preview" style="--builder-bg:${esc(section.style?.background || '#fff')};--builder-color:${esc(section.style?.color || '#123b73')};--builder-padding:${esc(section.style?.padding || '48px 6%')}"><span class="builder-preview-eyebrow">${esc(String(section.type || 'section').toUpperCase())}</span><h3>${esc(section.content?.heading || 'Chưa có tiêu đề')}</h3><p>${esc(section.content?.text || 'Thêm mô tả trong Properties Panel.')}</p>${section.content?.image ? `<img src="${esc(section.content.image)}" alt="" />` : ''}${section.content?.buttonLabel ? `<span class="builder-preview-button">${esc(section.content.buttonLabel)} ↗</span>` : ''}</div></article>`).join('') + `<div class="builder-drop-zone"><button type="button" class="builder-add-between" data-add-end="true">＋ Thêm section cuối trang</button></div>`;
  canvas.querySelectorAll('[data-select]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); selectSection(button.dataset.select); }));
  canvas.querySelectorAll('[data-section-id]').forEach((card) => { card.addEventListener('click', () => selectSection(card.dataset.sectionId)); card.addEventListener('dragstart', (event) => { if (currentSection()?.locked) { event.preventDefault(); return; } state.dragId = card.dataset.sectionId; event.dataTransfer.setData('text/plain', state.dragId); }); card.addEventListener('dragover', (event) => event.preventDefault()); card.addEventListener('drop', (event) => { event.preventDefault(); const type = event.dataTransfer.getData('text/plain'); if (type && type.startsWith('library:')) addSection(type.slice(8), card.dataset.sectionId); else reorder(state.dragId, card.dataset.sectionId); }); });
  canvas.querySelectorAll('[data-add-before]').forEach((button) => button.addEventListener('click', () => addSection('text-image', button.dataset.addBefore))); canvas.querySelectorAll('[data-add-end]').forEach((button) => button.addEventListener('click', () => addSection('text-image')));
  renderLayers(); updateLiveFrame();
}
function setInput(id, value) { const node = $(id); if (node) node.value = value ?? ''; }
function selectSection(id, field = null) {
  state.selected = id; state.selectedField = field; const section = currentSection(); if (!section) return;
  $('#builder-properties-form').hidden = false; $('#builder-empty').hidden = true; $('#builder-properties-title').textContent = section.label || 'Section'; $('#builder-properties-help').textContent = field ? `Đang chọn ${field} trong ${section.label}.` : `Đang chỉnh ${section.type}. Thay đổi chỉ nằm trong bản nháp tới khi Publish.`;
  setInput('#prop-label', section.label); setInput('#prop-type', section.type || 'text-image'); setInput('#prop-heading', section.content?.heading); setInput('#prop-text', section.content?.text); setInput('#prop-image', section.content?.image); setInput('#prop-button', section.content?.buttonLabel); setInput('#prop-action', section.interactions?.buttonAction || 'internal'); setInput('#prop-target', section.interactions?.target || '');
  setInput('#prop-background', section.style?.background?.startsWith('#') ? section.style.background : '#ffffff'); setInput('#prop-color', section.style?.color?.startsWith('#') ? section.style.color : '#123b73'); setInput('#prop-padding', section.style?.padding || ''); setInput('#prop-width', section.style?.width || '100%'); setInput('#prop-min-height', section.style?.minHeight || '0'); setInput('#prop-margin', section.style?.margin || '0'); setInput('#prop-radius', section.style?.borderRadius || '0'); setInput('#prop-opacity', section.style?.opacity || '1'); setInput('#prop-shadow', section.style?.boxShadow || 'none'); setInput('#prop-animation', section.animation?.name || 'none'); setInput('#prop-duration', section.animation?.duration || '400ms');
  const responsive = section.responsive?.[state.viewport] || {}; setInput('#prop-responsive-padding', responsive.padding || section.style?.padding || ''); setInput('#prop-responsive-columns', responsive.columns || ''); setInput('#prop-responsive-font', responsive.fontSize || ''); renderLayers();
}
function applyProperties(event) {
  event.preventDefault(); const section = currentSection(); if (!section || section.locked) return; snapshot();
  section.label = $('#prop-label').value.trim() || 'Section'; section.type = $('#prop-type').value; section.content = { ...(section.content || {}), heading:$('#prop-heading').value, text:$('#prop-text').value, image:$('#prop-image').value.trim(), buttonLabel:$('#prop-button').value };
  section.interactions = { ...(section.interactions || {}), buttonAction:$('#prop-action').value, target:$('#prop-target').value.trim() };
  section.style = { ...(section.style || {}), background:$('#prop-background').value, color:$('#prop-color').value, padding:$('#prop-padding').value.trim() || '64px 6%', width:$('#prop-width').value.trim() || '100%', minHeight:$('#prop-min-height').value.trim() || '0', margin:$('#prop-margin').value.trim() || '0', borderRadius:$('#prop-radius').value.trim() || '0', opacity:$('#prop-opacity').value.trim() || '1', boxShadow:$('#prop-shadow').value.trim() || 'none' };
  section.animation = { ...(section.animation || {}), name:$('#prop-animation').value, duration:$('#prop-duration').value.trim() || '400ms' }; section.responsive = { ...(section.responsive || {}), [state.viewport]: { ...(section.responsive?.[state.viewport] || {}), padding:$('#prop-responsive-padding').value.trim(), columns:$('#prop-responsive-columns').value.trim(), fontSize:$('#prop-responsive-font').value.trim() } };
  renderCanvas(); selectSection(section.id, state.selectedField); setStatus('Đã áp dụng vào bản nháp', 'ok');
}
function addSection(type, beforeId = null) { snapshot(); const section = sectionTemplate(type); const list = state.page.draft.sections; const index = beforeId ? list.findIndex((item) => item.id === beforeId) : -1; if (index >= 0) list.splice(index, 0, section); else list.push(section); state.selected = section.id; state.selectedField = null; renderCanvas(); selectSection(section.id); setStatus('Component đã thêm — nhớ Lưu Draft', 'warn'); }
function reorder(fromId, toId) { if (!fromId || fromId === toId || !state.page) return; const list = state.page.draft.sections; const from = list.findIndex((item) => item.id === fromId); const to = list.findIndex((item) => item.id === toId); if (from < 0 || to < 0) return; snapshot(); const [item] = list.splice(from, 1); list.splice(to, 0, item); renderCanvas(); setStatus('Đã đổi thứ tự — nhớ Lưu Draft', 'warn'); }
function duplicateSection() { const section = currentSection(); if (!section || section.locked) return; snapshot(); const copy = clone(section); copy.id = `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`; copy.label = `${copy.label} — bản sao`; const index = state.page.draft.sections.findIndex((item) => item.id === section.id); state.page.draft.sections.splice(index + 1, 0, copy); state.selected = copy.id; renderCanvas(); selectSection(copy.id); setStatus('Đã nhân bản component', 'warn'); }
function deleteSection() { if (!currentSection() || currentSection().locked || !confirm('Xóa component này khỏi bản nháp?')) return; snapshot(); state.page.draft.sections = state.page.draft.sections.filter((section) => section.id !== state.selected); state.selected = null; state.selectedField = null; $('#builder-properties-form').hidden = true; $('#builder-empty').hidden = false; renderCanvas(); setStatus('Đã xóa — nhớ Lưu Draft', 'warn'); }
function toggleVisibility() { const section = currentSection(); if (!section || section.locked) return; snapshot(); section.visible = section.visible === false; renderCanvas(); selectSection(section.id); setStatus(section.visible ? 'Đã hiện component' : 'Đã ẩn component', 'warn'); }
function toggleLock() { const section = currentSection(); if (!section) return; snapshot(); section.locked = !section.locked; renderCanvas(); selectSection(section.id); setStatus(section.locked ? 'Đã khóa component' : 'Đã mở khóa component', 'warn'); }
function copySection() { if (currentSection()) { state.clipboard = clone(currentSection()); setStatus('Đã copy component', 'ok'); } }
function pasteSection() { if (!state.clipboard || !state.page) return; snapshot(); const copy = clone(state.clipboard); copy.id = `section-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`; copy.label = `${copy.label} — bản sao`; state.page.draft.sections.push(copy); state.selected = copy.id; renderCanvas(); selectSection(copy.id); setStatus('Đã paste component', 'warn'); }
async function saveSelectedAsTemplate() { const section = currentSection(); if (!section) return; const name = window.prompt('Đặt tên Template cho section này:', section.label || 'GORISE Section'); if (!name?.trim()) return; try { await request('/api/admin/phase3/templates', { method:'POST', body:JSON.stringify({ name:name.trim(), category:'GORISE', schema:{ version:1, sections:[clone(section)] } }) }); setStatus('Đã lưu Template vào Phase 3', 'ok'); } catch (error) { setStatus(error.message, 'error'); } }
function historyUndo() { if (!state.undo.length || !state.page) return; state.redo.push(clone(state.page.draft)); state.page.draft = state.undo.pop(); state.selected = null; state.selectedField = null; renderCanvas(); setStatus('Đã hoàn tác', 'ok'); }
function historyRedo() { if (!state.redo.length || !state.page) return; state.undo.push(clone(state.page.draft)); state.page.draft = state.redo.pop(); state.selected = null; state.selectedField = null; renderCanvas(); setStatus('Đã làm lại', 'ok'); }
function updateFromInline(field, value) { const section = currentSection(); if (!section || section.locked || !field) return; snapshot(); section.content = { ...(section.content || {}), [field === 'button' ? 'buttonLabel' : field]: value }; renderCanvas(); selectSection(section.id, field); setStatus('Đã cập nhật nội dung trực tiếp — nhớ Lưu Draft', 'warn'); }
function receiveFrameMessage(event) { const data = event.data || {}; if (data.source !== 'gorise-runtime') return; if (data.type === 'frame-ready') { state.frameReady = true; postDraftToFrame(); } if (data.type === 'select') { selectSection(data.sectionId, data.field || null); setStatus(`Đã chọn ${data.label || data.field || 'component'}`, 'ok'); } if (data.type === 'inline-edit') updateFromInline(data.field, data.value); }
async function loadPage(slug) { if (!slug) return; try { setStatus('Đang tải trang…'); const data = await request(`/api/builder/pages/${encodeURIComponent(slug)}`); state.page = data.page; state.selected = null; state.selectedField = null; state.undo = []; state.redo = []; $('#builder-properties-form').hidden = true; $('#builder-empty').hidden = false; renderCanvas(); await loadVersions(); setStatus('Sẵn sàng', 'ok'); } catch (error) { setStatus(error.message, 'error'); $('#builder-canvas').innerHTML = `<div class="builder-empty"><b>Không thể tải trang.</b><br>${esc(error.message)}<br><button type="button" class="builder-button light" id="builder-retry">Thử lại</button></div>`; $('#builder-retry')?.addEventListener('click', () => loadPage(slug)); } }
async function loadVersions() { if (!state.page) return; const data = await request(`/api/builder/pages/${encodeURIComponent(state.page.slug)}/versions`); $('#builder-version-list').innerHTML = data.versions.length ? data.versions.map((version) => `<div class="builder-version"><span><b>${new Date(version.createdAt).toLocaleString('vi-VN')}</b><small>${esc(version.createdBy)} · ${esc(version.note || 'Bản publish')}</small></span><button type="button" data-rollback="${esc(version.id)}">Khôi phục</button></div>`).join('') : '<small class="builder-muted">Chưa có phiên bản publish.</small>'; document.querySelectorAll('[data-rollback]').forEach((button) => button.addEventListener('click', () => rollback(button.dataset.rollback))); }
async function saveDraft() { if (!state.page) return; try { setStatus('Đang lưu…'); const data = await request(`/api/builder/pages/${encodeURIComponent(state.page.slug)}`, { method:'PUT', body:JSON.stringify({ schema:state.page.draft }) }); state.page = data.page; renderCanvas(); setStatus('Đã lưu Draft', 'ok'); } catch (error) { setStatus(error.message, 'error'); } }
async function publish() { if (!state.page) return; try { await saveDraft(); const data = await request(`/api/builder/pages/${encodeURIComponent(state.page.slug)}/publish`, { method:'POST', body:JSON.stringify({ note:'Publish từ Website Builder Phase 2' }) }); state.page = data.page; await loadVersions(); renderCanvas(); setStatus('Đã Publish lên public', 'ok'); } catch (error) { setStatus(error.message, 'error'); } }
async function rollback(versionId) { if (!confirm('Khôi phục phiên bản này vào Draft? Public site chỉ đổi sau khi Publish.')) return; try { const data = await request(`/api/builder/pages/${encodeURIComponent(state.page.slug)}/rollback`, { method:'POST', body:JSON.stringify({ versionId }) }); state.page = data.page; renderCanvas(); setStatus('Đã đưa phiên bản vào Draft', 'warn'); } catch (error) { setStatus(error.message, 'error'); } }
function setViewport(viewport) { state.viewport = viewport; document.querySelectorAll('[data-viewport]').forEach((button) => button.classList.toggle('is-active', button.dataset.viewport === viewport)); $('#builder-canvas-frame').dataset.viewport = viewport; postDraftToFrame(); if (state.selected) selectSection(state.selected, state.selectedField); }
function init() {
  renderLibrary(); $('#builder-component-search').addEventListener('input', (event) => { state.query = event.target.value; renderLibrary(); }); document.querySelectorAll('[data-viewport]').forEach((button) => button.addEventListener('click', () => setViewport(button.dataset.viewport))); $('#builder-live-frame').addEventListener('load', () => { state.frameReady = true; postDraftToFrame(); }); window.addEventListener('message', receiveFrameMessage);
  const dataPromise = request('/api/builder/pages'); dataPromise.then(async (data) => { state.pages = data.pages; $('#builder-page-select').innerHTML = state.pages.map((page) => `<option value="${esc(page.slug)}">${esc(page.title)}</option>`).join(''); const requested = new URLSearchParams(location.search).get('page'); const initial = state.pages.find((page) => page.slug === requested)?.slug || state.pages[0]?.slug; $('#builder-page-select').value = initial; await loadPage(initial); }).catch((error) => setStatus(error.message, 'error'));
}
$('#builder-properties-form').addEventListener('submit', applyProperties); $('#builder-save').addEventListener('click', saveDraft); $('#builder-publish').addEventListener('click', publish); $('#builder-preview').addEventListener('click', () => state.page && window.open(`${state.page.route}?builderPreview=1`, '_blank', 'noopener')); $('#builder-delete').addEventListener('click', deleteSection); $('#builder-duplicate').addEventListener('click', duplicateSection); $('#builder-undo').addEventListener('click', historyUndo); $('#builder-redo').addEventListener('click', historyRedo); $('#builder-refresh-versions').addEventListener('click', loadVersions); $('#builder-copy').addEventListener('click', copySection); $('#builder-paste').addEventListener('click', pasteSection); $('#builder-toggle-lock').addEventListener('click', toggleLock); $('#builder-toggle-visibility').addEventListener('click', toggleVisibility); $('#builder-save-template').addEventListener('click', saveSelectedAsTemplate); $('#builder-page-select').addEventListener('change', (event) => loadPage(event.target.value));
window.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? historyRedo() : historyUndo(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c' && state.selected) { event.preventDefault(); copySection(); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v' && state.clipboard) { event.preventDefault(); pasteSection(); } });
init();
