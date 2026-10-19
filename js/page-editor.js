/* Page Editor Pro — professional live editor for CineAura
   - Fixes watch page: in edit mode all sections become visible (even without TMDB id)
   - Each section has a polished handle with drag + hide/show + duplicate
   - Hidden sections go to a "المخفي" list and can be restored via menu
   - Shortcuts from dashboard/profile/market/iptv via floating palette
   - Clean toolbar with save/undo/preview/exit
*/
(function(){
  "use strict";
  const EDIT_KEY="cineaura_edit_page";
  const HIDDEN_KEY="cineaura_hidden_sections";

  const PAGE_MAP={
    home:{label:"الصفحة الرئيسية",file:"index.html",container:"main.page-main",ids:()=>(window.CineAuraLayouts&&window.CineAuraLayouts.HOME_BASE)||[]},
    watch:{label:"المشاهدة",file:"watch.html",container:"#watch-root",ids:()=>(window.CineAuraLayouts&&window.CineAuraLayouts.WATCH_BASE)||[]},
    content:{label:"المحتوى",file:"content.html",container:"#vw-root",ids:()=>["vw-search","vw-main","vw-side"]},
    market:{label:"المتجر",file:"market.html",container:"#mkt-root",ids:()=>["mkt-hero","mkt-layout"]},
    dashboard:{label:"الداشبورد",file:"dashboard.html",container:"#dash-root",ids:()=>(window.CineAuraLayouts&&window.CineAuraLayouts.DASH_BASE)||[]},
    profile:{label:"البروفايل",file:"profile.html",container:"#prof-root",ids:()=>(window.CineAuraLayouts&&window.CineAuraLayouts.PROFILE_BASE)||[]},
  };
  const SHORTCUT_SOURCES={
    dashboard:{label:"الداشبورد",icon:"◫",ids:()=>(window.CineAuraLayouts&&window.CineAuraLayouts.DASH_BASE)||["overview","points","playlists","reports","settings"]},
    profile:{label:"البروفايل",icon:"👤",ids:()=>(window.CineAuraLayouts&&window.CineAuraLayouts.PROFILE_BASE)||["home","posts","messages","following","settings"]},
    market:{label:"المتجر",icon:"🛒",ids:()=>["mkt-hero","mkt-layout","mkt-acts","mkt-tools"]},
    iptv:{label:"الايبي تي في",icon:"📺",ids:()=>["iptv","home-market","iptv-top-track"]},
  };

  function getQueryEdit(){ try{ const u=new URL(location.href); return u.searchParams.get("cine_edit")||u.searchParams.get("edit")||u.searchParams.get("cineaura_edit"); }catch{return null;} }
  function currentPageKey(){
    if(document.getElementById("hero")) return "home";
    if(document.getElementById("watch-root")) return "watch";
    if(document.getElementById("vw-root")) return "content";
    if(document.getElementById("mkt-root")) return "market";
    if(document.getElementById("dash-root")) return "dashboard";
    if(document.getElementById("prof-root")) return "profile";
    const p=location.pathname.toLowerCase();
    if(p.includes("watch")) return "watch";
    if(p.includes("content")||p.includes("videos")) return "content";
    if(p.includes("market")) return "market";
    if(p.includes("dashboard")) return "dashboard";
    if(p.includes("profile")) return "profile";
    return "home";
  }
  function isEditMode(){ const q=getQueryEdit(); if(q) return q; try{ const v=localStorage.getItem(EDIT_KEY); if(v) return v; }catch{} return null; }

  let activePage=null, historyStack=[];
  function enableEdit(pageKey){
    if(!PAGE_MAP[pageKey]) pageKey=currentPageKey();
    activePage=pageKey;
    const info=PAGE_MAP[pageKey]; if(!info) return;
    document.documentElement.classList.add("ce-editing-root");
    injectStyles();
    buildToolbar(pageKey);
    revealWatchIfNeeded(pageKey);
    buildPalette(pageKey);
    makeDraggable(pageKey);
    restoreHiddenList(pageKey);
    snapshot();
  }

  function injectStyles(){
    if(document.getElementById("ce-style")) return;
    const s=document.createElement("style"); s.id="ce-style";
    s.textContent=`
      .ce-editing-root{ scroll-behavior:smooth; }
      .ce-editing-root #watch-root [hidden]{ display:block !important; opacity:1 !important; }
      .ce-toolbar{ position:fixed; top:0; inset-inline:0; z-index:10000; background:rgba(12,18,32,.94); backdrop-filter:blur(14px) saturate(140%); border-bottom:1px solid rgba(255,255,255,.12); display:flex; align-items:center; gap:10px; padding:10px 14px; flex-wrap:wrap; box-shadow:0 12px 36px rgba(0,0,0,.38); color:#e6f0ff; }
      .ce-toolbar b{ font-size:14px; letter-spacing:-.01em; }
      .ce-toolbar small{ opacity:.75; font-size:12px; }
      .ce-toolbar .ce-actions{ margin-inline-start:auto; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      .ce-btn{ padding:7px 12px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.08); color:#e6f0ff; font-weight:600; font-size:12.5px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
      .ce-btn.primary{ background:#01b4e4; color:#032541; border-color:#01b4e4; font-weight:700; }
      .ce-btn:hover{ filter:brightness(1.06); }
      body.ce-padded{ padding-top:64px; }
      .ce-item{ position:relative; border-radius:14px; outline:2px dashed transparent; outline-offset:2px; transition:outline .16s, box-shadow .16s, transform .12s; }
      .ce-item:hover{ outline-color:rgba(1,180,228,.45); box-shadow:0 8px 24px rgba(0,0,0,.12); }
      .ce-item.ce-dragging{ opacity:.42; outline-color:#01b4e4; transform:rotate(1deg) scale(.98); }
      .ce-item.ce-over{ outline-color:#01b4e4; outline-style:dashed; background:color-mix(in srgb, #01b4e4 6%, transparent); }
      .ce-item.ce-hidden{ opacity:.48; filter:grayscale(.15); outline-color:rgba(255,107,112,.35) !important; }
      .ce-item.ce-hidden::after{ content:"مخفي"; position:absolute; inset-inline-end:10px; top:10px; background:rgba(255,107,112,.9); color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; }
      .ce-handle{ position:absolute; inset-inline-start:8px; top:8px; z-index:6; display:inline-flex; align-items:center; gap:6px; padding:5px 10px; border-radius:999px; background:#0b1d33; color:#cfe8ff; font-size:11.5px; font-weight:700; letter-spacing:.02em; cursor:grab; box-shadow:0 6px 16px rgba(0,0,0,.28); border:1px solid rgba(255,255,255,.14); user-select:none; }
      .ce-handle svg{ opacity:.9 }
      .ce-handle:active{ cursor:grabbing; }
      .ce-controls{ position:absolute; inset-inline-end:8px; top:8px; z-index:6; display:flex; gap:6px; }
      .ce-ctl{ width:28px; height:28px; border-radius:999px; display:grid; place-items:center; background:rgba(255,255,255,.92); border:1px solid rgba(13,37,63,.12); color:#0d253f; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.18); font-size:12px; }
      .ce-ctl:hover{ background:#fff; transform:translateY(-1px); }
      .ce-ctl.danger{ background:rgba(255,107,112,.98); color:#fff; border-color:rgba(255,107,112,.9); }
      .ce-shortcut{ background:linear-gradient(135deg, rgba(1,180,228,.12), rgba(144,206,161,.14)) !important; border:1.5px dashed rgba(1,180,228,.45) !important; }
      .ce-palette{ position:fixed; inset-inline-end:12px; bottom:12px; width:min(380px, calc(100% - 24px)); max-height:52vh; overflow:auto; background:rgba(15,23,36,.96); backdrop-filter:blur(16px) saturate(140%); border:1px solid rgba(255,255,255,.12); border-radius:16px; box-shadow:0 18px 44px rgba(0,0,0,.48); padding:12px; z-index:9999; display:grid; gap:10px; color:#e6f0ff; }
      .ce-palette h4{ margin:0; font-size:13px; font-weight:800; letter-spacing:-.01em; display:flex; align-items:center; gap:8px; }
      .ce-palette .ce-group{ display:grid; gap:6px; border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:10px; background:rgba(255,255,255,.04); }
      .ce-chip{ display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.08); color:#e6f0ff; font-size:12px; font-weight:600; cursor:grab; transition:transform .12s, background .12s; }
      .ce-chip:hover{ background:rgba(1,180,228,.22); transform:translateY(-1px); }
      .ce-chip:active{ cursor:grabbing; }
      .ce-drop-hint{ text-align:center; padding:10px; border:1.5px dashed rgba(255,255,255,.14); border-radius:12px; color:#9bb0c2; font-size:12px; }
      .ce-hidden-bar{ position:fixed; inset-inline-start:12px; bottom:12px; width:min(320px, calc(100% - 24px)); max-height:40vh; overflow:auto; background:rgba(15,23,36,.92); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:10px; z-index:9999; color:#e6f0ff; display:grid; gap:8px; }
      .ce-hidden-bar h4{ margin:0; font-size:12px; display:flex; align-items:center; gap:6px; }
      .ce-empty{ padding:18px; text-align:center; border:1.5px dashed rgba(255,255,255,.14); border-radius:12px; color:#9bb0c2; background:rgba(255,255,255,.03); }
    `;
    document.head.appendChild(s);
  }

  function buildToolbar(pageKey){
    if(document.getElementById("ce-toolbar")) return;
    const bar=document.createElement("div"); bar.id="ce-toolbar"; bar.className="ce-toolbar";
    bar.innerHTML=`
      <span style="display:inline-flex;align-items:center;gap:10px"><span style="width:12px;height:12px;border-radius:50%;background:#01b4e4;box-shadow:0 0 0 6px rgba(1,180,228,.18)"></span><b>محرّر احترافي — ${PAGE_MAP[pageKey]?.label||pageKey}</b><small>اسحب الأقسام • أخفِ ما لا تريد • أضف اختصارات من اللوحة</small></span>
      <div class="ce-actions">
        <button class="ce-btn" id="ce-undo" type="button" title="تراجع">↩ تراجع</button>
        <button class="ce-btn" id="ce-preview" type="button">👁 معاينة</button>
        <button class="ce-btn" id="ce-hidden-toggle" type="button">👁‍🗨 المخفي (<span id="ce-hidden-count">0</span>)</button>
        <button class="ce-btn primary" id="ce-save" type="button">💾 حفظ الترتيب</button>
        <button class="ce-btn" id="ce-reset" type="button">↺ افتراضي</button>
        <button class="ce-btn" id="ce-exit" type="button">✕ خروج</button>
      </div>`;
    document.body.prepend(bar);
    document.body.classList.add("ce-padded");
    bar.querySelector("#ce-save").onclick=saveOrder;
    bar.querySelector("#ce-undo").onclick=undo;
    bar.querySelector("#ce-preview").onclick=togglePreview;
    bar.querySelector("#ce-hidden-toggle").onclick=toggleHiddenBar;
    bar.querySelector("#ce-reset").onclick=()=>{
      if(!confirm("إعادة هذه الصفحة إلى الترتيب الافتراضي؟")) return;
      const L=window.CineAuraLayouts; if(L){ const def=L.PRESETS.default[pageKey]; if(def){ const cfg=L.loadConfig(); cfg.pages[pageKey]=def.slice(); delete cfg.hidden?.[pageKey]; L.saveConfig(cfg); L.applyAll(cfg); toast("تمت الإعادة"); setTimeout(()=>location.reload(),400); } }
    };
    bar.querySelector("#ce-exit").onclick=exitEdit;
  }

  function revealWatchIfNeeded(pageKey){
    if(pageKey!=="watch") return;
    // Force all watch sections visible by removing hidden and injecting placeholders
    const ids = PAGE_MAP.watch.ids();
    ids.forEach(id=>{
      let el=document.getElementById(id);
      if(!el){
        // player-wrap is not by id but class
        if(id==="player-wrap") el=document.querySelector(".player-wrap");
        if(!el) return;
      }
      el.hidden=false;
      el.removeAttribute("hidden");
      el.style.display="";
      el.style.opacity="";
      // If empty, inject professional placeholder
      if(!el.innerHTML.trim() || el.innerHTML.includes("spinner") || el.querySelector("#page-loader")){
        injectWatchPlaceholder(el, id);
      }
      // Also handle related sections hidden due to no data
      if(el.hasAttribute && el.hasAttribute("hidden")) el.hidden=false;
    });
    // Also unhide any [hidden] inside watch-root via CSS already, but ensure container visible
    const root=document.getElementById("watch-root");
    if(root){ root.hidden=false; root.removeAttribute("hidden"); root.style.display=""; }
    // Hide error gate if present
    const err=document.querySelector(".page-error, .watch-error, #watch-root .empty-note");
    if(err && err.textContent.includes("TMDB")||err.textContent.includes("ID")) { /* keep but muted? */ }
  }

  function injectWatchPlaceholder(el, id){
    const placeholders={
      "title-info": `<div class="glass" style="padding:18px"><div style="display:flex;gap:14px;align-items:center"><div style="width:68px;height:96px;border-radius:10px;background:linear-gradient(135deg,#0d253f,#01b4e4)"></div><div style="flex:1"><h2 style="margin:0">عنوان الفيلم — معاينة محرّر</h2><p class="muted" style="margin:6px 0">قصة تجريبية تظهر فقط في وضع التعديل. يمكنك سحب هذا القسم لإعادة ترتيبه أو إخفاؤه.</p><div style="display:flex;gap:6px"><span class="chip">2024</span><span class="chip">PG</span><span class="chip score">8.4</span></div></div></div></div>`,
      "directors-section": `<div class="glass" style="padding:14px"><h3 style="margin:0 0 8px">المخرجون</h3><div style="display:flex;gap:10px"><div style="width:48px;height:48px;border-radius:50%;background:#3a506b"></div><div><b>مخرج تجريبي</b><div class="muted" style="font-size:12px">Director</div></div></div></div>`,
      "cast-section": `<div class="glass" style="padding:14px"><h3 style="margin:0 0 8px">طاقم التمثيل</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${[1,2,3,4].map(i=>`<div style="text-align:center"><div style="width:56px;height:56px;border-radius:50%;background:#3a506b;margin:0 auto"></div><div style="font-size:12px;margin-top:6px">ممثل ${i}</div></div>`).join("")}</div></div>`,
      "watch-providers": `<div class="glass" style="padding:14px"><h3 style="margin:0 0 8px">منصات المشاهدة الرسمية</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip">Netflix</span><span class="chip">Prime Video</span><span class="chip">Apple TV+</span></div></div>`,
      "player-wrap": el.innerHTML, // keep existing
      "link-detail": `<div class="glass" style="padding:14px"><h3>تفاصيل الرابط المحدّد</h3><p class="muted">يظهر هنا وصف الرابط عند الاختيار.</p></div>`,
      "watch-links": `<div class="glass" style="padding:14px"><h3 style="margin:0 0 8px">روابط المشاهدة</h3><div style="display:grid;gap:8px"><div class="link-row" style="justify-content:space-between"><span>سيرفر 1 — 1080p</span><button class="btn btn-sm btn-primary">مشاهدة</button></div><div class="link-row" style="justify-content:space-between"><span>سيرفر 2 — 720p</span><button class="btn btn-sm btn-ghost">مشاهدة</button></div></div></div>`,
      "watch-social": `<div class="glass" style="padding:14px"><h3 style="margin:0 0 8px">التعليقات والمراجعات</h3><div style="display:flex;gap:6px;margin-bottom:10px"><button class="chip score">التعليقات</button><button class="chip">التوصيات</button><button class="chip">المراجعات</button><button class="chip">قوائم التشغيل</button></div><div style="background:var(--sub-bg);border-radius:10px;padding:12px"><div style="display:flex;gap:10px"><div style="width:36px;height:36px;border-radius:50%;background:#01b4e4"></div><div><b>مستخدم</b><p class="muted" style="margin:4px 0">تعليق تجريبي في وضع التعديل.</p></div></div></div></div>`,
      "collection-section": `<div class="glass" style="padding:14px"><h3>المجموعة</h3><div class="marquee-wrap"><div class="marquee"><div class="poster-card" style="width:120px"><div style="height:170px;background:#1b2a3a;border-radius:8px"></div></div><div class="poster-card" style="width:120px"><div style="height:170px;background:#1b2a3a;border-radius:8px"></div></div></div></div></div>`,
      "similar-section": `<div class="glass" style="padding:14px"><h3>أعمال مشابهة</h3><p class="muted">صف أفقي تجريبي</p></div>`,
      "related-section": `<div class="glass" style="padding:14px"><h3>ذات صلة</h3><p class="muted">اقتراحات تجريبية</p></div>`,
    };
    if(placeholders[id]) el.innerHTML=placeholders[id];
  }

  function buildPalette(pageKey){
    if(document.getElementById("ce-palette")) return;
    const pal=document.createElement("div"); pal.id="ce-palette"; pal.className="ce-palette";
    pal.innerHTML=`<h4>✦ لوحة الاختصارات — اسحب إلى الصفحة</h4><p class="ce-drop-hint">اسحب أي اختصار وأفلته بين الأقسام. يمكنك أيضًا إضافته بالنقر.</p>`;
    Object.entries(SHORTCUT_SOURCES).forEach(([src, def])=>{
      const grp=document.createElement("div"); grp.className="ce-group";
      grp.innerHTML=`<b style="font-size:12px;display:flex;align-items:center;gap:6px"><span>${def.icon}</span> ${def.label}</b>`;
      const row=document.createElement("div"); row.style.display="flex"; row.style.flexWrap="wrap"; row.style.gap="6px";
      def.ids().forEach(id=>{
        const chip=document.createElement("div"); chip.className="ce-chip"; chip.draggable=true; chip.dataset.shortcut=`${src}:${id}`;
        chip.innerHTML=`<span>＋</span> ${id}`;
        chip.addEventListener("dragstart", e=>{ e.dataTransfer.setData("text/plain", `SHORTCUT:${src}:${id}`); e.dataTransfer.effectAllowed="copy"; });
        chip.addEventListener("click", ()=> insertShortcutAtEnd(src,id));
        row.appendChild(chip);
      });
      grp.appendChild(row); pal.appendChild(grp);
    });
    // add quick hide list toggle button inside palette
    const bar=document.createElement("div"); bar.style.display="flex"; bar.style.gap="8px";
    bar.innerHTML=`<button class="ce-btn" id="ce-show-hidden" type="button">إظهار المخفي</button><small style="opacity:.7">مرّر الأقسام لإخفائها عبر زر العين</small>`;
    pal.appendChild(bar);
    document.body.appendChild(pal);
    bar.querySelector("#ce-show-hidden").onclick=()=> document.getElementById("ce-hidden-bar")?.scrollIntoView({behavior:"smooth"});

    // hidden bar
    const hiddenBar=document.createElement("div"); hiddenBar.id="ce-hidden-bar"; hiddenBar.className="ce-hidden-bar"; hiddenBar.hidden=true;
    hiddenBar.innerHTML=`<h4>👁‍🗨 الأقسام المخفية <button class="ce-btn" id="ce-clear-hidden" style="margin-inline-start:auto;padding:4px 8px;font-size:11px">إظهار الكل</button></h4><div id="ce-hidden-list" style="display:grid;gap:6px"></div>`;
    document.body.appendChild(hiddenBar);
    hiddenBar.querySelector("#ce-clear-hidden").onclick=()=>{ const h=getHidden(); if(!h[pageKey]) return; delete h[pageKey]; setHidden(h); document.querySelectorAll(".ce-item.ce-hidden").forEach(el=>{ el.classList.remove("ce-hidden"); el.hidden=false; el.style.display=""; updateHandles(el,false); }); refreshHiddenCount(); };
  }

  function makeDraggable(pageKey){
    const info=PAGE_MAP[pageKey]; if(!info) return;
    const cont=document.querySelector(info.container); if(!cont) return;
    // Ensure watch sections are revealed before selecting items
    if(pageKey==="watch") revealWatchIfNeeded(pageKey);
    let items=[...cont.children].filter(el=> el.matches("section, .trust, .player-wrap, .vw-search, .vw-layout, .mkt-hero, .mkt-layout, .dash-layout, .prof-layout, aside, div") && el.id!=="ce-toolbar" && el.id!=="ce-palette" && el.id!=="ce-hidden-bar" && el.id!=="watch-demo-notice" && !el.hasAttribute("data-ce-ignore"));
    if(!items.length) items=[...cont.children].filter(el=> el.id!=="ce-toolbar" && el.id!=="watch-demo-notice" && !el.hasAttribute("data-ce-ignore"));
    // Apply hidden state
    const hidden=getHidden()[pageKey]||[];
    items.forEach(el=>{
      const id=el.id||el.className.split(" ")[0];
      if(hidden.includes(id)){
        el.classList.add("ce-hidden");
        el.hidden=true;
      }
      prepareItem(el, pageKey);
    });
    cont.addEventListener("dragover", e=> e.preventDefault());
    cont.addEventListener("drop", e=>{
      const data=e.dataTransfer.getData("text/plain");
      if(data && data.startsWith("SHORTCUT:")){
        e.preventDefault();
        const parts=data.split(":"); const src=parts[1], sid=parts[2];
        insertShortcutAtPosition(cont, src, sid, e.clientY);
      }
    });
    refreshHiddenCount();
  }

  function prepareItem(el, pageKey){
    if(el.dataset.cePrepared) return;
    el.dataset.cePrepared="1";
    el.classList.add("ce-item");
    el.draggable=true;
    const name=el.id || el.getAttribute("data-ce-name") || el.className.split(" ")[0] || "قسم";
    // handle
    let h=document.createElement("div"); h.className="ce-handle";
    h.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h8M8 12h8M8 18h8"/></svg> <span>${name}</span>`;
    el.prepend(h);
    // controls
    let ctrls=document.createElement("div"); ctrls.className="ce-controls";
    ctrls.innerHTML=`<button class="ce-ctl" data-act="hide" title="إخفاء"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="ce-ctl" data-act="dup" title="نسخ"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/></svg></button>`;
    el.appendChild(ctrls);
    ctrls.querySelector('[data-act="hide"]').onclick=(e)=>{
      e.stopPropagation();
      const hidden=getHidden(); hidden[pageKey]=hidden[pageKey]||[];
      const id=el.id||name;
      if(el.classList.contains("ce-hidden")){
        el.classList.remove("ce-hidden"); el.hidden=false; hidden[pageKey]=hidden[pageKey].filter(x=>x!==id);
      } else {
        el.classList.add("ce-hidden"); el.hidden=true; if(!hidden[pageKey].includes(id)) hidden[pageKey].push(id);
      }
      setHidden(hidden); refreshHiddenCount(); updateHiddenList();
    };
    ctrls.querySelector('[data-act="dup"]').onclick=(e)=>{
      e.stopPropagation();
      const clone=el.cloneNode(true);
      clone.id = el.id ? el.id+"-copy-"+Date.now().toString(36).slice(-3) : "copy-"+Date.now();
      clone.dataset.cePrepared=""; clone.classList.remove("ce-hidden"); clone.hidden=false;
      // clean old handles
      clone.querySelectorAll(".ce-handle,.ce-controls").forEach(n=> n.remove());
      el.after(clone);
      prepareItem(clone, pageKey);
      pulse(clone);
    };
    el.addEventListener("dragstart", onDragStart);
    el.addEventListener("dragend", onDragEnd);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("drop", onDrop);
    el.addEventListener("dragenter", e=> e.preventDefault());
  }

  function updateHandles(el, hidden){
    const btn=el.querySelector('[data-act="hide"]');
    if(btn) btn.innerHTML= hidden ? "👁" : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }

  function onDragStart(e){ const item=e.currentTarget; e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain","MOVE:"+ (item.id||"")); item.classList.add("ce-dragging"); window._ceDragSrc=item; }
  function onDragEnd(e){ e.currentTarget.classList.remove("ce-dragging"); document.querySelectorAll(".ce-over").forEach(el=> el.classList.remove("ce-over")); window._ceDragSrc=null; snapshot(); }
  function onDragOver(e){ e.preventDefault(); const over=e.currentTarget; if(window._ceDragSrc && over!==window._ceDragSrc) over.classList.add("ce-over"); }
  function onDrop(e){
    e.preventDefault(); e.stopPropagation();
    const target=e.currentTarget; target.classList.remove("ce-over");
    const data=e.dataTransfer.getData("text/plain");
    if(data && data.startsWith("SHORTCUT:")){ const parts=data.split(":"); insertShortcutAtPosition(target.parentElement, parts[1], parts[2], e.clientY, target); return; }
    const srcEl=window._ceDragSrc;
    if(srcEl && target!==srcEl){
      const cont=target.parentElement; const after=getAfter(cont, e.clientY);
      if(after==null) cont.appendChild(srcEl); else cont.insertBefore(srcEl, after);
      pulse(srcEl); snapshot();
    }
  }
  function getAfter(container, y){
    const els=[...container.children].filter(c=> !c.classList.contains("ce-dragging") && c.classList.contains("ce-item") && !c.hidden);
    return els.reduce((closest, child)=>{
      const box=child.getBoundingClientRect(); const offset=y - box.top - box.height/2;
      if(offset<0 && offset>closest.offset) return {offset, element:child};
      else return closest;
    },{offset:Number.NEGATIVE_INFINITY}).element;
  }

  function insertShortcutAtEnd(src,sid){ const cont=document.querySelector(PAGE_MAP[activePage]?.container); if(cont) insertShortcutAtPosition(cont, src, sid, Infinity); }
  function insertShortcutAtPosition(container, src, sid, y, targetRef){
    const existingId=`shortcut-${src}-${sid}-${Date.now().toString(36).slice(-4)}`;
    // avoid duplicate if same src/sid already exists? Allow multiple but warn
    const sec=document.createElement("section");
    sec.id=existingId; sec.className="section ce-item ce-shortcut"; sec.draggable=true;
    sec.innerHTML=`
      <div class="container">
        <div class="section-head">
          <div><div class="kicker"><span class="kicker-num">↗</span><span class="eyebrow">${src}</span></div><h2>اختصار ${sid}</h2></div>
          <p class="muted">من ${src} — اسحب لتغيير الموضع أو أخفِه</p>
        </div>
        <div class="glass" style="padding:16px;display:grid;gap:10px">
          <p style="margin:0">اختصار <b>${sid}</b> من <b>${src}</b></p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-sm btn-primary" href="./${src==='dashboard'?'dashboard.html': src==='profile'?'profile.html': src==='market'?'market.html':'iptv.html'}#${sid}">فتح المصدر</a><button class="btn btn-sm btn-ghost ce-remove" type="button">حذف</button></div>
        </div>
      </div>`;
    sec.dataset.shortcut=`${src}:${sid}`;
    const h=document.createElement("div"); h.className="ce-handle"; h.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h8M8 12h8M8 18h8"/></svg> <span>اختصار ${sid}</span>`;
    sec.prepend(h);
    const ctrls=document.createElement("div"); ctrls.className="ce-controls";
    ctrls.innerHTML=`<button class="ce-ctl" data-act="hide" title="إخفاء">👁‍🗨</button><button class="ce-ctl danger" data-act="del" title="حذف">✕</button>`;
    sec.appendChild(ctrls);
    // wire
    sec.addEventListener("dragstart", onDragStart); sec.addEventListener("dragend", onDragEnd); sec.addEventListener("dragover", onDragOver); sec.addEventListener("drop", onDrop);
    ctrls.querySelector('[data-act="hide"]').onclick=()=>{
      sec.classList.toggle("ce-hidden"); sec.hidden=sec.classList.contains("ce-hidden"); const h=getHidden(); const page=currentPageKey(); h[page]=h[page]||[]; const id=sec.id; if(sec.hidden){ if(!h[page].includes(id)) h[page].push(id);} else h[page]=h[page].filter(x=>x!==id); setHidden(h); refreshHiddenCount(); updateHiddenList();
    };
    ctrls.querySelector('[data-act="del"]').onclick=()=> sec.remove();
    sec.querySelector(".ce-remove").onclick=()=> sec.remove();
    // insert
    if(targetRef){ const after=getAfter(container, y); if(after) container.insertBefore(sec, after); else container.appendChild(sec); }
    else { const after=getAfter(container, y); if(after) container.insertBefore(sec, after); else container.appendChild(sec); }
    pulse(sec); snapshot(); toast(`أُضيف اختصار ${src}:${sid}`);
  }

  function pulse(el){ el.style.outline="2px solid #01b4e4"; setTimeout(()=> el.style.outline="", 900); }

  function getHidden(){ try{ return JSON.parse(localStorage.getItem(HIDDEN_KEY)||"{}"); }catch{return {}} }
  function setHidden(o){ try{ localStorage.setItem(HIDDEN_KEY, JSON.stringify(o)); }catch{} }
  function refreshHiddenCount(){
    const h=getHidden(); const page=currentPageKey(); const cnt=(h[page]||[]).length;
    const el=document.getElementById("ce-hidden-count"); if(el) el.textContent=cnt;
  }
  function restoreHiddenList(pageKey){
    updateHiddenList();
    refreshHiddenCount();
  }
  function updateHiddenList(){
    const cont=document.getElementById("ce-hidden-list"); if(!cont) return;
    const h=getHidden(); const page=currentPageKey(); const list=h[page]||[];
    if(!list.length) cont.innerHTML=`<p style="color:#9bb0c2;font-size:12px;margin:0">لا أقسام مخفية</p>`;
    else cont.innerHTML=list.map(id=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.04)"><span style="flex:1;font-size:12px">${id}</span><button class="ce-btn" data-show="${id}" style="padding:4px 8px;font-size:11px">إظهار</button></div>`).join("");
    cont.querySelectorAll("[data-show]").forEach(b=> b.onclick=()=>{
      const id=b.dataset.show;
      const h2=getHidden(); h2[page]=h2[page].filter(x=>x!==id); setHidden(h2);
      const el=document.getElementById(id); if(el){ el.classList.remove("ce-hidden"); el.hidden=false; el.style.display=""; }
      updateHiddenList(); refreshHiddenCount();
    });
  }
  function toggleHiddenBar(){
    const bar=document.getElementById("ce-hidden-bar"); if(!bar) return; bar.hidden=!bar.hidden;
    if(!bar.hidden) updateHiddenList();
  }

  function snapshot(){ try{ const cur=currentPageKey(); const cont=document.querySelector(PAGE_MAP[cur]?.container); if(!cont) return; const order=[...cont.children].filter(el=> el.classList.contains("ce-item")).map(el=> el.id||el.dataset.shortcut||""); historyStack.push({page:cur, order:order.slice(), html:cont.innerHTML}); if(historyStack.length>20) historyStack.shift(); }catch{} }
  function undo(){
    if(!historyStack.length){ toast("لا يوجد تراجع"); return; }
    const prev=historyStack.pop(); if(!prev) return;
    const cont=document.querySelector(PAGE_MAP[prev.page]?.container); if(!cont) return;
    // We stored html snapshot, but we push before change; so popping gives previous state? Simplify: just reload saved html from one step before
    if(historyStack.length){
      const target=historyStack[historyStack.length-1];
      cont.innerHTML=target.html;
      // re-prepare items
      makeDraggable(target.page);
    } else {
      toast("تراجع غير متاح");
    }
  }
  let preview=false;
  function togglePreview(){
    preview=!preview;
    document.querySelectorAll(".ce-handle,.ce-controls,.ce-palette,.ce-hidden-bar").forEach(el=> el.style.display= preview? "none": "");
    document.querySelectorAll(".ce-item").forEach(el=> el.style.outline= preview? "none": "");
    toast(preview ? "وضع المعاينة" : "وضع التعديل");
  }

  function saveOrder(){
    const page=currentPageKey();
    const info=PAGE_MAP[page]; const cont=document.querySelector(info.container);
    if(!cont){ toast("لا يمكن الحفظ"); return; }
    const order=[...cont.children].filter(el=> el.matches(".ce-item") && !el.hidden).map(el=> el.id||el.dataset.shortcut||"");
    const clean=order.filter(Boolean);
    const L=window.CineAuraLayouts; if(!L){ toast("محرك التخطيط غير متاح"); return; }
    const cfg=L.loadConfig(); cfg.pages[page]=clean;
    // save hidden
    cfg.hidden=getHidden();
    cfg.customized=true;
    L.saveConfig(cfg); L.applyAll(cfg);
    toast("✔ تم حفظ ترتيب الصفحة");
  }
  function exitEdit(){
    try{ localStorage.removeItem(EDIT_KEY); }catch{}
    const u=new URL(location.href); u.searchParams.delete("cine_edit"); u.searchParams.delete("edit"); u.searchParams.delete("cineaura_edit");
    history.replaceState(null,"",u.toString());
    document.documentElement.classList.remove("ce-editing-root");
    document.getElementById("ce-toolbar")?.remove();
    document.getElementById("ce-palette")?.remove();
    document.getElementById("ce-hidden-bar")?.remove();
    document.body.classList.remove("ce-padded");
    document.querySelectorAll(".ce-item").forEach(el=>{
      el.classList.remove("ce-item","ce-over","ce-dragging","ce-shortcut","ce-hidden");
      el.draggable=false;
      el.querySelectorAll(":scope > .ce-handle,:scope > .ce-controls").forEach(n=> n.remove());
      el.hidden=false; el.style.display="";
    });
    // restore watch hidden? keep visible as layout will apply
    toast("تم الخروج");
  }
  function toast(msg){
    const C=window.CineAura; if(C&&C.toast) C.toast(msg);
    let t=document.getElementById("ce-toast");
    if(!t){ t=document.createElement("div"); t.id="ce-toast"; t.style.cssText="position:fixed;bottom:18px;inset-inline-start:50%;transform:translateX(-50%);background:#0b1d33;color:#e6f0ff;border:1px solid rgba(255,255,255,.14);padding:10px 14px;border-radius:999px;box-shadow:0 8px 22px rgba(0,0,0,.35);z-index:10001;font-weight:600"; document.body.appendChild(t); }
    t.textContent=msg; t.hidden=false; clearTimeout(window._ceToastTimer); window._ceToastTimer=setTimeout(()=> t.hidden=true, 2400);
  }

  function init(){
    const edit=isEditMode();
    if(edit){
      const tryEnable=()=>{
        const cur=currentPageKey();
        enableEdit(cur);
      };
      if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ()=> setTimeout(tryEnable, 500));
      else setTimeout(tryEnable, 500);
      const obs=new MutationObserver(()=>{ const cur=currentPageKey(); // re-apply draggable to new nodes
        const cont=document.querySelector(PAGE_MAP[cur]?.container); if(!cont) return;
        [...cont.children].forEach(ch=>{
          if(ch.id==="ce-toolbar"||ch.id==="ce-palette"||ch.id==="ce-hidden-bar") return;
          if(!ch.classList.contains("ce-item")) prepareItem(ch, cur);
        });
      });
      obs.observe(document.body,{childList:true, subtree:true});
    }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.CineAuraPageEditor={ openPage:function(pageKey){ const info=PAGE_MAP[pageKey]; if(!info) return; try{ localStorage.setItem(EDIT_KEY, pageKey); }catch{} let extra=""; if(pageKey==="watch"){ // ensure watch editor always has a title to show / reorder — fallback demo TMDB 530 (movie) unless URL already carries an ID
      try{ const u=new URL(location.href); const hasId=u.searchParams.get("movie")||u.searchParams.get("tv")||u.searchParams.get("tmdb")||u.searchParams.get("id"); if(!hasId) extra="&movie=530"; }catch{ extra="&movie=530"; }
    } const url=info.file + (info.file.includes("?")?"&":"?") + "cine_edit="+encodeURIComponent(pageKey)+extra; location.href=url; }, isEditMode, currentPageKey, enableEdit, exitEdit };
})();
