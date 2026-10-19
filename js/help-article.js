(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const esc = (v) => (window.CineAura && window.CineAura.escapeHtml) ? window.CineAura.escapeHtml(v) : String(v||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const t = (k, vars) => window.CineAura && window.CineAura.t ? window.CineAura.t(k,vars) : k;
  const toast = (m) => window.CineAura && window.CineAura.toast ? window.CineAura.toast(m) : alert(m);
  const supabaseRequest = window.CineAura ? window.CineAura.supabaseRequest : null;
  const getSession = () => window.CineAura && window.CineAura.getSession ? window.CineAura.getSession() : null;

  const LANGS = ['en','ar','fr','de','es','nl','it'];
  const COUNTRIES = ['global','MA','FR','US','DE','ES','IT','NL','GB','SA','EG','DZ','TN','TR','IN','BR','CA','AE','QA','KW','LB','JO','IQ','YE','SD','LY','OM','BH'];

  let articleId = null;
  let autosaveTimer = null;
  let isDirty = false;
  let saveLock = false;

  function qId(){ return new URLSearchParams(location.search).get('id'); }

  function slugify(title){
    return String(title||'').toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06FF]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || 'article-'+Date.now().toString(36);
  }

  function readingMinutes(html){
    const text = html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    const words = text ? text.split(' ').length : 0;
    return Math.max(1, Math.ceil(words/200));
  }

  async function fetchCategories(){
    if(!supabaseRequest) return [];
    const res = await supabaseRequest('/rest/v1/help_categories?select=*&order=sort_order.asc');
    return res.ok && Array.isArray(res.data) ? res.data : [];
  }

  async function fetchArticle(id){
    if(!id || !supabaseRequest) return null;
    const res = await supabaseRequest(`/rest/v1/help_articles?id=eq.${id}&select=*`);
    if(res.ok && res.data && res.data[0]) return res.data[0];
    return null;
  }

  async function fetchArticleCats(id){
    if(!id || !supabaseRequest) return [];
    const res = await supabaseRequest(`/rest/v1/help_article_categories?article_id=eq.${id}&select=category_id`);
    return res.ok && Array.isArray(res.data) ? res.data.map(r=> r.category_id) : [];
  }

  function renderEditor(categories, data, extraCatIds){
    const isNew = !data;
    const cats = categories;
    const catTree = (()=> {
      const roots = cats.filter(c=> !c.parent_id);
      let html='';
      roots.forEach(root=>{
        const subs = cats.filter(c=> c.parent_id===root.id);
        html+= `<div style="margin-bottom:10px"><strong style="font-size:13px">${esc(root.name_ar|| root.name)}</strong><div class="editor-cats" style="margin-top:6px">`;
        if(!subs.length){
          const checked = extraCatIds.includes(root.id) || (data && data.category_id===root.id) ? 'checked' : '';
          html+= `<label class="editor-cat"><input type="checkbox" name="cats" value="${root.id}" ${checked}> ${esc(root.name_ar||root.name)}</label>`;
        } else {
          subs.forEach(s=>{
            const checked = extraCatIds.includes(s.id) || (data && data.category_id===s.id) ? 'checked' : '';
            html+= `<label class="editor-cat"><input type="checkbox" name="cats" value="${s.id}" ${checked}> ${esc(s.name_ar||s.name)}</label>`;
          });
        }
        html+= `</div></div>`;
      });
      return html;
    })();

    return `<div class="editor-top">
      <div class="editor-grid">
        <div class="editor-field"><label>${t('help.title')||'Title'}</label><input id="ed-title" type="text" placeholder="عنوان المقال / Title" value="${esc(data?.title||'')}" /></div>
        <div class="editor-field"><label>Slug (URL)</label><input id="ed-slug" type="text" placeholder="auto from title" value="${esc(data?.slug||'')}" /></div>
        <div class="editor-field"><label>${t('common.language')} / اللغة</label><select id="ed-lang">${LANGS.map(l=> `<option value="${l}" ${data?.language===l?'selected':''}>${l.toUpperCase()}</option>`).join('')}</select></div>
        <div class="editor-field"><label>${t('common.country')} / البلد</label><select id="ed-country">${COUNTRIES.map(c=> `<option value="${c}" ${ (data?.country||'global')===c ? 'selected':''}>${c==='global'? t('help.global')||'Global — لجميع البلدان': c}</option>`).join('')}</select></div>
        <div class="editor-field" style="grid-column:1/-1"><label>${t('help.summary')||'Summary / ملخص'}</label><textarea id="ed-summary" rows="2" placeholder="Short summary...">${esc(data?.summary||'')}</textarea></div>
        <div class="editor-field" style="grid-column:1/-1">
          <label>${t('help.categories')||'Categories / الأقسام'}</label>
          <div id="ed-cats" style="margin-top:6px">${catTree}</div>
          <small style="color:var(--muted)">اختر قسمًا أو أكثر ينتمي إليها المقال.</small>
        </div>
        <div class="editor-field"><label>Status</label><select id="ed-status"><option value="draft" ${data?.status==='draft'||!data?'selected':''}>${t('help.draft')||'Draft'}</option><option value="published" ${data?.status==='published'?'selected':''}>${t('help.published')||'Published'}</option></select></div>
        <div class="editor-field" style="display:flex;align-items:center;gap:10px">
          <label class="autosave" style="margin:0"><input type="checkbox" id="ed-autosave" checked /> ${t('help.autosave')||'Autosave as draft'} </label>
          <span id="ed-save-state" style="font-size:13px;color:var(--muted)"></span>
        </div>
      </div>
    </div>

    <div class="editor-toolbar" id="ed-toolbar">
      <div class="tool-group">
        <select id="tb-font" title="Font"><option value="">Font — الخط</option><option value="Outfit, sans-serif">Outfit</option><option value="Cairo, sans-serif">Cairo (عربي)</option><option value="'Cormorant Garamond', serif">Cormorant</option><option value="monospace">Monospace</option><option value="serif">Serif</option></select>
        <select id="tb-size" title="Size"><option value="">Size</option><option value="12px">12</option><option value="14px">14</option><option value="16px">16</option><option value="18px">18</option><option value="20px">20</option><option value="24px">24</option><option value="28px">28</option><option value="32px">32</option></select>
        <input type="color" id="tb-color" title="Text color" value="#f4fbff" />
        <input type="color" id="tb-hilite" title="Highlight" value="#01b4e4" />
      </div>
      <div class="tool-group">
        <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
        <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
        <button type="button" data-cmd="underline" title="Underline"><u>U</u></button>
        <button type="button" data-cmd="strikeThrough" title="Strike">S</button>
        <button type="button" data-cmd="removeFormat" title="Clear">✕</button>
      </div>
      <div class="tool-group">
        <button type="button" data-block="h2">H2</button>
        <button type="button" data-block="h3">H3</button>
        <button type="button" data-block="p">P</button>
        <button type="button" data-block="blockquote">❝ Quote</button>
        <button type="button" data-cmd="insertUnorderedList">• List</button>
        <button type="button" data-cmd="insertOrderedList">1. List</button>
      </div>
      <div class="tool-group">
        <button type="button" id="tb-link">🔗 Link</button>
        <button type="button" data-cmd="justifyLeft" title="Align left">⬅</button>
        <button type="button" data-cmd="justifyCenter" title="Center">≡</button>
        <button type="button" data-cmd="justifyRight" title="Right">➡</button>
        <button type="button" data-cmd="justifyFull" title="Justify">≣</button>
        <button type="button" id="tb-ltr">LTR</button>
        <button type="button" id="tb-rtl">RTL</button>
      </div>
      <div class="tool-group">
        <button type="button" id="tb-image">🖼 Image</button>
        <button type="button" id="tb-video">▶ Video embed</button>
        <button type="button" id="tb-hr">― HR</button>
        <button type="button" id="tb-code">Code</button>
      </div>
    </div>

    <div class="editor-tabs">
      <button type="button" data-tab="visual" class="active">✎ ${t('help.tabVisual')||'Writing — الكتابة'}</button>
      <button type="button" data-tab="code">${t('help.tabCode')||'Import HTML+CSS — استيراد الكود'}</button>
      <button type="button" data-tab="preview">👁 Preview</button>
    </div>

    <div id="tab-visual">
      <div id="ed-canvas" class="editor-canvas" contenteditable="true" data-placeholder="اكتب مقالك هنا... Write your article here...">${data?.content_html || '<p>ابدأ الكتابة هنا…</p>'}</div>
    </div>
    <div id="tab-code" hidden>
      <div class="code-area">
        <div><label style="font-size:13px;color:var(--muted)">HTML</label><textarea id="ed-html" placeholder="<h2>Title</h2><p>..."></textarea></div>
        <div><label style="font-size:13px;color:var(--muted)">CSS</label><textarea id="ed-css" placeholder=".my-class { color: ... }"></textarea></div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn btn-sm btn-ghost" id="btn-apply-code" type="button">↓ Apply to editor</button>
        <button class="btn btn-sm btn-ghost" id="btn-extract-code" type="button">↑ Extract from editor</button>
      </div>
    </div>
    <div id="tab-preview" hidden>
      <div class="preview-box"><div id="ed-preview" style="padding:18px"></div></div>
    </div>

    <div class="editor-actions">
      <button class="btn btn-lg btn-primary" id="btn-save" type="button">${t('common.save')||'Save'}</button>
      <button class="btn btn-lg btn-ghost" id="btn-publish" type="button">${t('help.publish')||'Publish'}</button>
      <button class="btn btn-lg btn-ghost" id="btn-preview" type="button">${t('help.preview')||'Preview'}</button>
      <a class="btn btn-lg btn-ghost" href="./help.html" id="btn-view">${t('help.viewHelp')||'View Help'}</a>
      <span id="ed-status-msg" style="margin-inline-start:10px;color:var(--muted);font-size:13px"></span>
    </div>`;
  }

  function exec(cmd, val=null){
    document.execCommand(cmd, false, val);
    $('#ed-canvas')?.focus();
  }

  function wrapSelection(html){
    const sel = window.getSelection();
    if(!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if(range.collapsed) return;
    const frag = range.extractContents();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.replace('{content}', '');
    // fallback: insert html
    const span = document.createElement('span');
    span.appendChild(frag);
    // simple insert
    document.execCommand('insertHTML', false, html.replace('{content}', span.innerHTML));
  }

  function bindToolbar(){
    const canvas = $('#ed-canvas');
    $$('#ed-toolbar [data-cmd]').forEach(b=> b.addEventListener('click', ()=> exec(b.dataset.cmd)));
    $$('#ed-toolbar [data-block]').forEach(b=> b.addEventListener('click', ()=> exec('formatBlock', `<${b.dataset.block}>`)));
    $('#tb-font')?.addEventListener('change', e=> { if(e.target.value) exec('fontName', e.target.value); });
    $('#tb-size')?.addEventListener('change', e=> {
      if(!e.target.value) return;
      // use style
      exec('fontSize', '7');
      const fonts = canvas.querySelectorAll('font[size="7"]');
      fonts.forEach(f=> { f.removeAttribute('size'); f.style.fontSize = e.target.value; });
    });
    $('#tb-color')?.addEventListener('input', e=> exec('foreColor', e.target.value));
    $('#tb-hilite')?.addEventListener('input', e=> exec('hiliteColor', e.target.value));
    $('#tb-ltr')?.addEventListener('click', ()=> { canvas.dir='ltr'; canvas.style.direction='ltr'; });
    $('#tb-rtl')?.addEventListener('click', ()=> { canvas.dir='rtl'; canvas.style.direction='rtl'; });
    $('#tb-link')?.addEventListener('click', ()=>{
      const url = prompt('Link URL (https://...):');
      if(!url) return;
      exec('createLink', url);
    });
    $('#tb-image')?.addEventListener('click', ()=>{
      const url = prompt('Image URL (https://...):');
      if(!url) return;
      const alt = prompt('Alt text (optional):') || '';
      exec('insertImage', url);
      // set alt after
      setTimeout(()=>{
        const imgs = canvas.querySelectorAll(`img[src="${CSS.escape(url)}"]`);
        imgs.forEach(img=> { img.alt = alt; img.style.maxWidth='100%'; img.style.borderRadius='12px'; });
      }, 100);
    });
    $('#tb-video')?.addEventListener('click', ()=>{
      const url = prompt('YouTube / Vimeo / video URL:');
      if(!url) return;
      let embed = '';
      if(url.includes('youtube.com') || url.includes('youtu.be')){
        let id = '';
        try{
          const u = new URL(url);
          id = u.searchParams.get('v') || u.pathname.slice(1);
          if(id.includes('/')) id = id.split('/').pop();
        }catch{ id=''; }
        if(id) embed = `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
      } else if(url.includes('vimeo.com')){
        const id = url.split('/').pop();
        embed = `<iframe src="https://player.vimeo.com/video/${id}" allowfullscreen></iframe>`;
      } else {
        embed = `<video controls src="${esc(url)}" style="max-width:100%;border-radius:12px"></video>`;
      }
      if(embed) exec('insertHTML', embed);
    });
    $('#tb-hr')?.addEventListener('click', ()=> exec('insertHorizontalRule'));
    $('#tb-code')?.addEventListener('click', ()=> exec('insertHTML', '<pre><code>code here</code></pre>'));
  }

  function bindTabs(){
    $$('.editor-tabs [data-tab]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('.editor-tabs [data-tab]').forEach(b=> b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        $('#tab-visual').hidden = tab!=='visual';
        $('#tab-code').hidden = tab!=='code';
        $('#tab-preview').hidden = tab!=='preview';
        if(tab==='preview'){
          const html = $('#ed-canvas').innerHTML;
          const css = $('#ed-css')?.value || '';
          $('#ed-preview').innerHTML = (css ? `<style>${css}</style>` : '') + html;
        }
        if(tab==='code'){
          // sync html/css to textareas if empty
          if(!$('#ed-html').value.trim()){
            $('#ed-html').value = $('#ed-canvas').innerHTML;
          }
        }
      });
    });
    $('#btn-apply-code')?.addEventListener('click', ()=>{
      const html = $('#ed-html').value;
      if(html.trim()) $('#ed-canvas').innerHTML = html;
      toast('Applied');
    });
    $('#btn-extract-code')?.addEventListener('click', ()=>{
      $('#ed-html').value = $('#ed-canvas').innerHTML;
      toast('Extracted');
    });
  }

  async function saveArticle(publish=false){
    if(saveLock) return;
    saveLock = true;
    const titleEl = $('#ed-title');
    const slugEl = $('#ed-slug');
    const langEl = $('#ed-lang');
    const countryEl = $('#ed-country');
    const sumEl = $('#ed-summary');
    const statusEl = $('#ed-status');
    const canvas = $('#ed-canvas');
    const htmlArea = $('#ed-html');
    const cssArea = $('#ed-css');

    let title = titleEl.value.trim();
    if(!title){ toast(t('help.needTitle')||'Title required'); titleEl.focus(); saveLock=false; return null; }
    let slug = slugEl.value.trim() || slugify(title);
    const language = langEl.value;
    const country = countryEl.value;
    let status = publish ? 'published' : statusEl.value;
    // if html tab has content, use it
    let content_html = canvas.innerHTML.trim();
    if(htmlArea && htmlArea.value.trim()){
      // if user edited code tab and it's different, prefer canvas unless code tab active?
      // We'll if code tab not hidden, use its html
      if(!$('#tab-code').hidden && htmlArea.value.trim()){
        content_html = htmlArea.value.trim();
        canvas.innerHTML = content_html;
      }
    }
    const content_css = cssArea ? cssArea.value.trim() : '';
    const summary = sumEl.value.trim();
    const checkedCats = [...document.querySelectorAll('#ed-cats input[name="cats"]:checked')].map(i=> Number(i.value));
    if(!checkedCats.length){ toast(t('help.needCategory')||'Pick at least one category'); saveLock=false; return null; }
    const primaryCat = checkedCats[0];

    const payload = {
      slug,
      title,
      summary,
      content_html,
      content_css,
      language,
      country,
      status,
      category_id: primaryCat,
      reading_minutes: readingMinutes(content_html),
    };
    if(status==='published' && !confirm) payload.published_at = new Date().toISOString();

    let res;
    try{
      if(articleId){
        res = await supabaseRequest(`/rest/v1/help_articles?id=eq.${articleId}`, {method:'PATCH', body: JSON.stringify(payload)});
        if(!res.ok) throw new Error(JSON.stringify(res.data));
      } else {
        res = await supabaseRequest('/rest/v1/help_articles', {method:'POST', body: JSON.stringify(payload)});
        if(!res.ok) throw new Error(JSON.stringify(res.data));
        const created = Array.isArray(res.data) ? res.data[0] : res.data;
        if(created && created.id) articleId = created.id;
        // update URL
        if(articleId) history.replaceState({}, '', `Article.html?id=${articleId}`);
      }
      // handle many-to-many
      if(articleId){
        // clear then insert
        await supabaseRequest(`/rest/v1/help_article_categories?article_id=eq.${articleId}`, {method:'DELETE'});
        for(const cid of checkedCats){
          await supabaseRequest('/rest/v1/help_article_categories', {method:'POST', body: JSON.stringify({article_id: articleId, category_id: cid})});
        }
      }
      $('#ed-save-state').textContent = publish ? 'Published ✓' : 'Saved ✓';
      $('#ed-status-msg').textContent = publish ? (t('help.published')||'Published') : (t('help.saved')||'Saved');
      toast(publish ? (t('help.published')||'Published') : (t('help.saved')||'Saved'));
      setTimeout(()=> $('#ed-status-msg').textContent='', 2000);
      isDirty = false;
      saveLock=false;
      return articleId;
    } catch(e){
      console.error(e);
      toast('Save failed. Run sql/help.sql');
      $('#ed-save-state').textContent = 'Error';
      saveLock=false;
      return null;
    }
  }

  function setupAutosave(){
    const autosaveEl = $('#ed-autosave');
    const canvas = $('#ed-canvas');
    if(!canvas || !autosaveEl) return;
    const markDirty = ()=> { isDirty=true; $('#ed-save-state').textContent = '• unsaved'; };
    ['input','keyup','paste','change'].forEach(ev=> canvas.addEventListener(ev, markDirty));
    $('#ed-title')?.addEventListener('input', markDirty);
    $('#ed-summary')?.addEventListener('input', markDirty);
    $('#ed-cats')?.addEventListener('change', markDirty);
    // title -> slug auto
    $('#ed-title')?.addEventListener('input', e=>{
      const slugEl = $('#ed-slug');
      if(!slugEl.value.trim() || slugEl.dataset.auto!=='0'){
        slugEl.value = slugify(e.target.value);
      }
    });
    $('#ed-slug')?.addEventListener('input', e=> { e.target.dataset.auto='0'; });
    autosaveTimer = setInterval(async()=>{
      if(autosaveEl.checked && isDirty && !saveLock){
        // autosave as draft regardless of publish status? spec: autosave as draft checkbox
        const prevStatus = $('#ed-status').value;
        $('#ed-status').value = 'draft';
        await saveArticle(false);
        // restore? keep draft if autosave
        if(prevStatus==='published'){
          // leave as draft for autosave; user can publish manually
        }
      }
    }, 4000);
  }

  async function init(){
    articleId = qId();
    // check panel auth: must be staff; else redirect? Allow but warn
    const cats = await fetchCategories();
    let data = null;
    let extra = [];
    if(articleId){
      data = await fetchArticle(articleId);
      if(data) extra = await fetchArticleCats(articleId);
      else {
        // id not found -> treat as new with that id? clear
        articleId = null;
      }
    }
    // render
    $('#editor-root').innerHTML = renderEditor(cats, data, extra);
    // fill code areas
    if(data){
      const htmlArea = $('#ed-html');
      const cssArea = $('#ed-css');
      if(htmlArea) htmlArea.value = data.content_html || '';
      if(cssArea) cssArea.value = data.content_css || '';
    }
    bindToolbar();
    bindTabs();
    setupAutosave();
    // buttons
    $('#btn-save')?.addEventListener('click', ()=> saveArticle(false));
    $('#btn-publish')?.addEventListener('click', ()=> saveArticle(true));
    $('#btn-preview')?.addEventListener('click', ()=>{
      $$('.editor-tabs [data-tab]').forEach(b=> b.classList.remove('active'));
      document.querySelector('[data-tab="preview"]').classList.add('active');
      $('#tab-visual').hidden=true; $('#tab-code').hidden=true; $('#tab-preview').hidden=false;
      const html = $('#ed-canvas').innerHTML;
      const css = $('#ed-css')?.value || '';
      $('#ed-preview').innerHTML = (css ? `<style>${css}</style>` : '') + html;
    });
    // if new, focus title
    if(!data) $('#ed-title')?.focus();
    if(window.CineAura && window.CineAura.translateDom) window.CineAura.translateDom(document);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
