/* Page Editor — live drag & shortcut palette for customization
   Activates when ?cine_edit=PAGE or localStorage cineaura_edit_page == current page
   Allows reordering sections directly on the page and inserting shortcuts
   from dashboard/profile/market/iptv into any page.
*/
(function(){
  "use strict";
  const EDIT_KEY = "cineaura_edit_page";
  const LS_LAYOUT = "cineaura_layout";

  const PAGE_MAP = {
    home: { label:"الصفحة الرئيسية", file:"index.html", container:"main.page-main", ids:()=> (window.CineAuraLayouts&&window.CineAuraLayouts.HOME_BASE)||[] },
    watch:{ label:"المشاهدة", file:"watch.html", container:"#watch-root", ids:()=> (window.CineAuraLayouts&&window.CineAuraLayouts.WATCH_BASE)||[] },
    content:{ label:"المحتوى", file:"content.html", container:"#vw-root", ids:()=> ["vw-search","vw-main","vw-side"] },
    market:{ label:"المتجر", file:"market.html", container:"#mkt-root", ids:()=> ["mkt-hero","mkt-layout"] },
    dashboard:{ label:"الداشبورد", file:"dashboard.html", container:"#dash-root", ids:()=> (window.CineAuraLayouts&&window.CineAuraLayouts.DASH_BASE)||[] },
    profile:{ label:"البروفايل", file:"profile.html", container:"#prof-root", ids:()=> (window.CineAuraLayouts&&window.CineAuraLayouts.PROFILE_BASE)||[] },
  };

  const SHORTCUT_SOURCES = {
    dashboard: { label:"الداشبورد", ids:()=> (window.CineAuraLayouts&&window.CineAuraLayouts.DASH_BASE)||["overview","points","playlists","reports","settings"] },
    profile:   { label:"البروفايل", ids:()=> (window.CineAuraLayouts&&window.CineAuraLayouts.PROFILE_BASE)||["home","posts","messages","following","settings"] },
    market:    { label:"المتجر", ids:()=> ["mkt-hero","mkt-layout","mkt-acts","mkt-tools"] },
    iptv:      { label:"الايبي تي في", ids:()=> ["iptv","home-market","iptv-top-track"] },
  };

  function getQueryEdit(){
    try{ const u=new URL(location.href); return u.searchParams.get("cine_edit")||u.searchParams.get("edit")||u.searchParams.get("cineaura_edit"); }catch{return null;}
  }
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

  function isEditMode(){
    const q=getQueryEdit();
    if(q) return q;
    try{ const v=localStorage.getItem(EDIT_KEY); if(v) return v; }catch{}
    return null;
  }

  function enableEdit(pageKey){
    if(!PAGE_MAP[pageKey]) pageKey=currentPageKey();
    const info=PAGE_MAP[pageKey];
    if(!info) return;
    document.documentElement.classList.add("ce-editing-root");
    injectStyles();
    buildToolbar(pageKey);
    buildPalette(pageKey);
    makeDraggable(pageKey);
    highlightShortcuts(pageKey);
  }

  function injectStyles(){
    if(document.getElementById("ce-style")) return;
    const s=document.createElement("style"); s.id="ce-style";
    s.textContent=`
      .ce-editing-root{ scroll-behavior:smooth; }
      .ce-toolbar{ position:fixed; top:0; inset-inline:0; z-index:10000; background:var(--surface,rgba(9,22,36,.96)); border-bottom:2px solid var(--cyan,#01b4e4); display:flex; align-items:center; gap:10px; padding:8px 14px; flex-wrap:wrap; box-shadow:0 6px 22px rgba(0,0,0,.35); }
      .ce-toolbar b{ font-size:14px; }
      .ce-toolbar .ce-actions{ margin-inline-start:auto; display:flex; gap:8px; flex-wrap:wrap; }
      body.ce-padded{ padding-top:62px; }
      .ce-item{ position:relative; outline:1px dashed transparent; transition:outline .15s; }
      .ce-item.ce-dragging{ opacity:.45; outline-color:var(--cyan); }
      .ce-item.ce-over{ outline:1.5px dashed var(--cyan); }
      .ce-handle{ position:absolute; inset-inline-start:6px; top:6px; z-index:5; display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:999px; background:var(--cyan,#01b4e4); color:#032541; font-size:12px; font-weight:700; cursor:grab; box-shadow:0 4px 12px rgba(0,0,0,.25); user-select:none; }
      .ce-handle span{ opacity:.95 }
      .ce-shortcut{ background:linear-gradient(135deg, var(--cyan, #01b4e4), var(--green,#90cea1)) !important; color:#032541 !important; border:2px dashed rgba(255,255,255,.6); }
      .ce-palette{ position:fixed; inset-inline-end:12px; bottom:12px; width:min(340px, calc(100% - 24px)); max-height:46vh; overflow:auto; background:var(--surface,rgba(9,22,36,.96)); border:1px solid var(--line,rgba(255,255,255,.14)); border-radius:14px; box-shadow:0 12px 32px rgba(0,0,0,.45); padding:10px; z-index:9999; display:grid; gap:8px; }
      .ce-palette h4{ margin:0; font-size:13px; }
      .ce-palette .ce-group{ display:grid; gap:6px; border:1px solid var(--line); border-radius:10px; padding:8px; background:var(--card-bg,rgba(255,255,255,.05)); }
      .ce-chip{ display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; border:1px solid var(--line); background:var(--sub-bg,rgba(255,255,255,.08)); font-size:12px; font-weight:600; cursor:grab; }
      .ce-chip:active{ cursor:grabbing; }
      .ce-drop-hint{ text-align:center; padding:10px; border:1.5px dashed var(--line); border-radius:10px; color:var(--muted); font-size:12px; }
      .ce-item-hidden{ opacity:.45; filter:grayscale(.2); }
    `;
    document.head.appendChild(s);
  }

  function buildToolbar(pageKey){
    if(document.getElementById("ce-toolbar")) return;
    const bar=document.createElement("div"); bar.id="ce-toolbar"; bar.className="ce-toolbar";
    bar.innerHTML=`
      <span style="display:inline-flex;align-items:center;gap:8px"><span style="width:10px;height:10px;border-radius:50%;background:var(--cyan)"></span><b>وضع التعديل — ${PAGE_MAP[pageKey]?.label||pageKey}</b><small style="opacity:.7">اسحب الأقسام لإعادة ترتيبها • اسحب اختصارات من اللوحة بالأسفل</small></span>
      <div class="ce-actions">
        <button class="btn btn-sm btn-ghost" id="ce-add-shortcut" type="button">➕ إضافة اختصار</button>
        <button class="btn btn-sm btn-primary" id="ce-save" type="button">حفظ الترتيب</button>
        <button class="btn btn-sm btn-ghost" id="ce-reset" type="button">إعادة الافتراضي</button>
        <button class="btn btn-sm btn-ghost" id="ce-exit" type="button">خروج</button>
      </div>`;
    document.body.prepend(bar);
    document.body.classList.add("ce-padded");
    bar.querySelector("#ce-save").onclick=saveOrder;
    bar.querySelector("#ce-reset").onclick=()=>{
      if(!confirm("إعادة ترتيب هذه الصفحة إلى الافتراضي؟")) return;
      const L=window.CineAuraLayouts; if(L){ const c=L.resetToPreset("default"); // reset only this page to default?
        // reset selected page only
        const def = L.PRESETS.default[pageKey];
        if(def){ const cfg=L.loadConfig(); cfg.pages[pageKey]=def.slice(); L.saveConfig(cfg); L.applyAll(cfg); toast("تمت الإعادة"); setTimeout(()=>location.reload(),400); }
      }
    };
    bar.querySelector("#ce-exit").onclick=exitEdit;
    bar.querySelector("#ce-add-shortcut").onclick=()=>{ const pal=document.getElementById("ce-palette"); if(pal) pal.scrollIntoView({behavior:"smooth"}); pal.style.outline="2px solid var(--cyan)"; setTimeout(()=>pal.style.outline="",1200); };
  }

  function buildPalette(pageKey){
    if(document.getElementById("ce-palette")) return;
    const pal=document.createElement("div"); pal.id="ce-palette"; pal.className="ce-palette";
    pal.innerHTML=`<h4>لوحة الاختصارات — اسحب إلى الصفحة</h4><p class="ce-drop-hint">اسحب أي اختصار من هنا وأفلته بين أقسام الصفحة لإضافته</p>`;
    Object.entries(SHORTCUT_SOURCES).forEach(([src, def])=>{
      const grp=document.createElement("div"); grp.className="ce-group";
      grp.innerHTML=`<b style="font-size:12px">${def.label}</b>`;
      const row=document.createElement("div"); row.style.display="flex"; row.style.flexWrap="wrap"; row.style.gap="6px";
      const ids=def.ids();
      ids.forEach(id=>{
        const chip=document.createElement("div"); chip.className="ce-chip"; chip.draggable=true; chip.dataset.shortcut=`${src}:${id}`;
        chip.innerHTML=`<span>↗</span> ${id}`;
        chip.addEventListener("dragstart", e=>{
          e.dataTransfer.setData("text/plain", `SHORTCUT:${src}:${id}`);
          e.dataTransfer.effectAllowed="copy";
          chip.style.opacity=".5";
        });
        chip.addEventListener("dragend", ()=> chip.style.opacity="");
        row.appendChild(chip);
      });
      grp.appendChild(row);
      pal.appendChild(grp);
    });
    document.body.appendChild(pal);
  }

  function makeDraggable(pageKey){
    const info=PAGE_MAP[pageKey]; if(!info) return;
    const cont=document.querySelector(info.container);
    if(!cont) return;
    // For home, container is main, but trust is a div not section — include all direct children that are sections/div.trust
    let items=[...cont.children].filter(el=> el.matches("section, .trust, .player-wrap, .vw-search, .vw-layout, .mkt-hero, .mkt-layout, .dash-layout, .prof-layout, aside, div"));
    // Fallback: if container is like #watch-root, its children already
    if(!items.length) items=[...cont.children];
    items.forEach(el=>{
      if(el.id==="ce-toolbar"||el.id==="ce-palette") return;
      if(el.classList.contains("ce-item")) return;
      el.classList.add("ce-item");
      el.draggable=true;
      // handle
      let h=el.querySelector(":scope > .ce-handle");
      if(!h){
        h=document.createElement("div"); h.className="ce-handle";
        const name=el.id || el.className.split(" ")[0] || "قسم";
        h.innerHTML=`<span>↕</span> ${name}`;
        el.prepend(h);
        h.addEventListener("mousedown", e=> e.stopPropagation());
      }
      el.addEventListener("dragstart", onDragStart);
      el.addEventListener("dragend", onDragEnd);
      el.addEventListener("dragover", onDragOver);
      el.addEventListener("drop", onDrop);
      el.addEventListener("dragenter", e=> e.preventDefault());
    });
    // also allow drops on container itself (for shortcuts)
    cont.addEventListener("dragover", e=>{ e.preventDefault(); });
    cont.addEventListener("drop", e=>{
      const data=e.dataTransfer.getData("text/plain");
      if(data && data.startsWith("SHORTCUT:")){
        e.preventDefault();
        const parts=data.split(":"); // SHORTCUT:src:id
        const src=parts[1], sid=parts[2];
        insertShortcut(cont, src, sid, e.clientY);
      }
    });
  }

  function onDragStart(e){
    const item=e.currentTarget;
    e.dataTransfer.effectAllowed="move";
    e.dataTransfer.setData("text/plain", item.id||item.dataset.shortcut||"MOVE:"+ (item.id||""));
    item.classList.add("ce-dragging");
    // store source page for reordering
    window._ceDragSrc = item;
  }
  function onDragEnd(e){
    e.currentTarget.classList.remove("ce-dragging");
    document.querySelectorAll(".ce-over").forEach(el=> el.classList.remove("ce-over"));
    window._ceDragSrc=null;
  }
  function onDragOver(e){
    e.preventDefault();
    const over=e.currentTarget;
    if(window._ceDragSrc && over!==window._ceDragSrc){
      over.classList.add("ce-over");
    }
  }
  function onDrop(e){
    e.preventDefault();
    e.stopPropagation();
    const target=e.currentTarget;
    target.classList.remove("ce-over");
    const data=e.dataTransfer.getData("text/plain");
    const srcEl=window._ceDragSrc;
    if(data && data.startsWith("SHORTCUT:")){
      // handled by container drop, but also handle item drop
      const parts=data.split(":"); const src=parts[1], sid=parts[2];
      const cont=target.parentElement; insertShortcut(cont, src, sid, e.clientY, target);
      return;
    }
    if(srcEl && target!==srcEl){
      const cont=target.parentElement;
      const after=getAfter(cont, e.clientY);
      if(after==null) cont.appendChild(srcEl);
      else cont.insertBefore(srcEl, after);
      // visual feedback
      pulse(srcEl);
    }
  }

  function getAfter(container, y){
    const els=[...container.children].filter(c=> !c.classList.contains("ce-dragging") && c.classList.contains("ce-item"));
    return els.reduce((closest, child)=>{
      const box=child.getBoundingClientRect(); const offset=y - box.top - box.height/2;
      if(offset<0 && offset>closest.offset) return {offset, element:child};
      else return closest;
    },{offset:Number.NEGATIVE_INFINITY}).element;
  }

  function insertShortcut(container, src, sid, y, targetRef){
    // check duplicate
    const existingId=`shortcut-${src}-${sid}`;
    if(document.getElementById(existingId)) { toast("الاختصار موجود بالفعل"); return; }
    const sec=document.createElement("section");
    sec.id=existingId;
    sec.className="section ce-item ce-shortcut";
    sec.draggable=true;
    sec.innerHTML=`
      <div class="container">
        <div class="section-head">
          <div><div class="kicker"><span class="kicker-num">↗</span><span class="eyebrow">${src}</span></div><h2>اختصار ${sid}</h2></div>
          <p class="muted">اختصار مضاف من ${src} — يمكنك سحبه أو حذفه</p>
        </div>
        <div class="glass" style="padding:16px;display:grid;gap:8px">
          <p>اختصار: <b>${sid}</b> من <b>${src}</b></p>
          <div style="display:flex;gap:8px"><a class="btn btn-sm btn-primary" href="./${src==='dashboard'?'dashboard.html': src==='profile'?'profile.html': src==='market'?'market.html':'iptv.html'}#${sid}">فتح المصدر</a><button class="btn btn-sm btn-ghost ce-remove" type="button">حذف</button></div>
        </div>
      </div>`;
    const h=document.createElement("div"); h.className="ce-handle"; h.innerHTML=`<span>↕</span> اختصار ${sid}`;
    sec.prepend(h);
    sec.addEventListener("dragstart", onDragStart);
    sec.addEventListener("dragend", onDragEnd);
    sec.addEventListener("dragover", onDragOver);
    sec.addEventListener("drop", onDrop);
    sec.addEventListener("dragenter", e=> e.preventDefault());
    sec.querySelector(".ce-remove").onclick=()=> sec.remove();
    // insert at position near drop
    if(targetRef){
      const after=getAfter(container, y);
      if(after) container.insertBefore(sec, after);
      else container.appendChild(sec);
    } else {
      const after=getAfter(container, y);
      if(after) container.insertBefore(sec, after);
      else container.appendChild(sec);
    }
    pulse(sec);
    toast(`أُضيف اختصار ${src}:${sid}`);
  }

  function pulse(el){
    el.style.outline="2px solid var(--cyan)";
    setTimeout(()=> el.style.outline="", 900);
  }

  function saveOrder(){
    const page=currentPageKey();
    const info=PAGE_MAP[page]; const cont=document.querySelector(info.container);
    if(!cont){ toast("لا يمكن حفظ هذه الصفحة"); return; }
    const order=[...cont.children].filter(el=> el.matches(".ce-item")).map(el=> el.id||el.dataset.shortcut||el.className);
    // Filter only ids that are known or shortcut-*
    const clean=order.filter(id=> id && id!=="ce-toolbar" && id!=="ce-palette");
    const L=window.CineAuraLayouts; if(!L){ toast("محرك التخطيط غير متاح"); return; }
    const cfg=L.loadConfig();
    cfg.pages[page]=clean;
    cfg.customized=true;
    // store shortcuts separately: any shortcut-* ids are also in order, but also keep as part of pages
    // Keep pins etc intact
    L.saveConfig(cfg);
    L.applyAll(cfg);
    toast("تم حفظ ترتيب الصفحة");
  }

  function exitEdit(){
    try{ localStorage.removeItem(EDIT_KEY); }catch{}
    const u=new URL(location.href); u.searchParams.delete("cine_edit"); u.searchParams.delete("edit"); u.searchParams.delete("cineaura_edit");
    history.replaceState(null,"",u.toString());
    document.documentElement.classList.remove("ce-editing-root");
    document.getElementById("ce-toolbar")?.remove();
    document.getElementById("ce-palette")?.remove();
    document.body.classList.remove("ce-padded");
    document.querySelectorAll(".ce-item").forEach(el=>{
      el.classList.remove("ce-item","ce-over","ce-dragging","ce-shortcut");
      el.draggable=false;
      const h=el.querySelector(":scope > .ce-handle"); if(h) h.remove();
    });
    toast("تم الخروج من وضع التعديل");
  }

  function toast(msg){
    const C=window.CineAura; if(C&&C.toast) C.toast(msg); else console.log(msg);
    // also show simple toast fallback
    let t=document.getElementById("ce-toast");
    if(!t){ t=document.createElement("div"); t.id="ce-toast"; t.style.cssText="position:fixed;bottom:18px;inset-inline-start:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--line);padding:10px 14px;border-radius:999px;box-shadow:0 8px 22px rgba(0,0,0,.35);z-index:10001;font-weight:600"; document.body.appendChild(t); }
    t.textContent=msg; t.hidden=false; clearTimeout(window._ceToastTimer); window._ceToastTimer=setTimeout(()=> t.hidden=true, 2200);
  }

  function highlightShortcuts(pageKey){
    // maybe mark existing shortcuts
  }

  function init(){
    const edit=isEditMode();
    if(edit){
      // delay until DOM is ready and layout applied
      const tryEnable=()=>{
        const cur=currentPageKey();
        // if edit param specifies a page, but current page mismatched, redirect
        if(edit && edit!==cur && PAGE_MAP[edit]){
          // if we are not on requested page, offer navigation prompt? But we already navigated via customizer
          // If edit mode flag is for different page, just enable for current anyway?
        }
        enableEdit(cur);
      };
      if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ()=> setTimeout(tryEnable, 600));
      else setTimeout(tryEnable, 600);
      // also observe for dynamic dashboard/profile renders that inject side nav later
      const obs=new MutationObserver(()=>{ const cur=currentPageKey(); makeDraggable(cur); });
      obs.observe(document.body,{childList:true, subtree:true});
    }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Expose helper for customizer to trigger navigation
  window.CineAuraPageEditor={
    openPage: function(pageKey){
      const info=PAGE_MAP[pageKey]; if(!info) return;
      try{ localStorage.setItem(EDIT_KEY, pageKey); }catch{}
      const url=info.file + (info.file.includes("?")?"&":"?") + "cine_edit="+encodeURIComponent(pageKey);
      location.href=url;
    },
    isEditMode, currentPageKey, enableEdit, exitEdit
  };
})();
