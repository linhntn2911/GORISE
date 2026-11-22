(() => {
  const routeMap = { '/':'home', '/ve-gorise/':'about', '/kham-pha-tro-choi/':'shop', '/video-tinh-huong/':'situations', '/tin-tuc/':'news', '/lien-he/':'contact', '/thu-thach/':'challenge', '/gio-hang/':'cart', '/gorise-play/':'play' };
  const slug = routeMap[location.pathname] || routeMap[`${location.pathname}/`];
  if (!slug) return;
  const isBuilderPreview = new URLSearchParams(location.search).get('builderPreview') === '1';
  // Public pages remain fully authored by their existing HTML/CSS. Builder
  // overrides are intentionally restricted to the Admin/Preview iframe.
  if (!isBuilderPreview) return;
  const send = (type, payload = {}) => { if (isBuilderPreview && window.parent !== window) window.parent.postMessage({ source:'gorise-runtime', type, ...payload }, '*'); };
  const safeColor = (value, fallback = '') => /^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? value : fallback;
  const safeCss = (value, fallback = '') => { const text = String(value || '').trim(); return text.length <= 180 && !/[<>;{}]/.test(text) ? text : fallback; };
  const applyStyle = (root, section, viewport = 'desktop') => {
    const style = section.style || {}; const responsive = section.responsive?.[viewport] || {};
    const values = { background:safeColor(style.background, ''), color:safeColor(style.color, ''), padding:safeCss(responsive.padding || style.padding, ''), width:safeCss(style.width, ''), minHeight:safeCss(style.minHeight, ''), margin:safeCss(style.margin, ''), borderRadius:safeCss(style.borderRadius, ''), opacity:safeCss(style.opacity, ''), boxShadow:safeCss(style.boxShadow, '') };
    for (const [key, value] of Object.entries(values)) if (value) root.style[key] = value;
    if (responsive.fontSize) root.style.setProperty('--builder-font-size', safeCss(responsive.fontSize));
    if (responsive.columns) root.style.setProperty('--builder-columns', safeCss(responsive.columns));
    if (section.animation?.name && section.animation.name !== 'none') { root.dataset.builderAnimation = section.animation.name; root.style.setProperty('--builder-animation-duration', safeCss(section.animation.duration, '400ms')); }
  };
  const applyButton = (button, section) => {
    const target = String(section.interactions?.target || button.getAttribute('href') || '/'); const action = section.interactions?.buttonAction || 'internal';
    if (action === 'external' && /^https?:\/\//i.test(target)) { button.href = target; button.target = '_blank'; button.rel = 'noreferrer'; }
    else button.href = target || '/';
    if (action === 'scroll' || target.startsWith('#')) button.addEventListener('click', (event) => { const targetNode = document.querySelector(target); if (targetNode) { event.preventDefault(); targetNode.scrollIntoView({ behavior:'smooth', block:'start' }); } });
  };
  const fieldNode = (root, field) => root.querySelector(`[data-builder-field="${CSS.escape(field)}"]`);
  const markEditorNodes = (root, section, editor) => {
    if (!editor) return;
    root.dataset.builderLocked = section.locked ? 'true' : 'false';
    if (root.dataset.builderBound === 'true') return;
    root.dataset.builderBound = 'true';
    root.dataset.builderEditor = 'true'; root.querySelectorAll('[data-builder-field]').forEach((node) => {
      node.setAttribute('data-builder-section-id', section.id); node.title = `Double-click để sửa ${node.dataset.builderField}`;
      node.addEventListener('click', (event) => { event.stopPropagation(); send('select', { sectionId:section.id, field:node.dataset.builderField, label:node.dataset.builderField }); });
      node.addEventListener('dblclick', (event) => {
        event.preventDefault(); event.stopPropagation(); if (root.dataset.builderLocked === 'true') return; node.contentEditable = 'true'; node.focus(); document.execCommand('selectAll', false, null);
        const finish = () => { node.contentEditable = 'false'; send('inline-edit', { sectionId:section.id, field:node.dataset.builderField, value:node.textContent }); node.removeEventListener('blur', finish); };
        node.addEventListener('blur', finish, { once:true });
      });
    });
    root.addEventListener('click', () => send('select', { sectionId:section.id, label:section.label || section.type }));
  };
  function render(schema, viewport = 'desktop') {
    const sections = schema?.sections || [];
    for (const section of sections) {
      const root = document.querySelector(`[data-builder-section="${CSS.escape(section.id)}"]`); if (!root) continue;
      root.hidden = section.visible === false; applyStyle(root, section, viewport);
      const heading = fieldNode(root, 'heading'); if (heading && section.content?.heading != null) heading.textContent = section.content.heading;
      const text = fieldNode(root, 'text'); if (text && section.content?.text != null) text.textContent = section.content.text;
      const image = fieldNode(root, 'image'); if (image && section.content?.image) { image.src = section.content.image; image.alt = section.content.heading || image.alt || ''; }
      const button = fieldNode(root, 'button'); if (button && section.content?.buttonLabel != null) { button.textContent = section.content.buttonLabel; applyButton(button, section); }
      markEditorNodes(root, section, isBuilderPreview);
    }
    if (isBuilderPreview) send('frame-ready');
  }
  window.addEventListener('message', (event) => { const data = event.data || {}; if (data.source !== 'gorise-studio' || data.type !== 'draft-schema') return; render(data.schema, data.viewport || 'desktop'); });
  fetch(`/api/builder/published/${encodeURIComponent(slug)}`, { credentials:'same-origin' }).then((response) => response.ok ? response.json() : null).then((payload) => render(payload?.schema, 'desktop')).catch(() => {});
})();
