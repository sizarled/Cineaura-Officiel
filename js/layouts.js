/* CineAura layouts engine — per-style presets + per-member custom ordering
   Pages: home, watch, content, market, dashboard, profile
   Presets mimic each appearance style's native section order.
   Persists: localStorage cineaura_layout (+ profiles.layout_config via supabase if logged in)
   Also handles: homepage pins (TMDB ids) and dashboard/profile shortcuts.
*/
(function(){
  "use strict";
  const LS_KEY = "cineaura_layout";
  const PIN_KEY = "cineaura_home_pins";
  const SHORT_KEY = "cineaura_shortcuts";
  const VALID_STYLES = ["default","facebook","youtube","instagram","netflix","prime","appletv","win7","win8","win10","win11","macos","android","ios"];

  // Canonical section IDs per page (order = site default)
  const HOME_BASE = ["hero","trust","whats-new","features","prizes","search","movies","series","videos","home-market","iptv","points-levels","prizes-strip","app","plans","support"];
  const WATCH_BASE = ["title-info","directors-section","cast-section","watch-providers","player-wrap","link-detail","episode-bar","watch-share","watch-links","watch-social","collection-section","similar-section","related-section"];
  // content page (videos.html) : vw-search, vw-main, vw-side (with vw-offers, vw-sugg)
  const CONTENT_BASE = ["vw-search","vw-main","vw-side"];
  // market: mkt-hero, mkt-layout (contains mkt-side + mkt-main)
  const MARKET_BASE = ["mkt-hero","mkt-layout"];
  const DASH_BASE = ["overview","points","withdraw","playlists","links","reports","codes","iptv","views","analytics","prizes","history","settings"];
  const PROFILE_BASE = ["home","create","posts","content","messages","search","following","blocked","settings"];

  // Presets per style — each "mimics" that platform/system's section priority
  const PRESETS = {
    default:{ home:HOME_BASE.slice(), watch:WATCH_BASE.slice(), content:CONTENT_BASE.slice(), market:MARKET_BASE.slice(), dashboard:DASH_BASE.slice(), profile:PROFILE_BASE.slice(), label:"الافتراضي — ترتيب CineAura المعتمد", desc:"الترتيب الأصلي للموقع" },
    facebook:{ home:["hero","whats-new","movies","series","features","videos","search","trust","home-market","iptv","prizes","points-levels","prizes-strip","app","plans","support"], watch:["title-info","watch-providers","player-wrap","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","reports","messages","points","playlists","links","codes","iptv","views","analytics","prizes","withdraw","history","settings"], profile:["home","posts","messages","following","search","content","create","blocked","settings"], label:"فيسبوك — نفس ترتيب الأقسام في فيسبوك", desc:"الخلاصة أولاً ثم المجموعات" },
    youtube:{ home:["hero","search","movies","series","videos","iptv","whats-new","features","home-market","trust","points-levels","prizes-strip","prizes","app","plans","support"], watch:["player-wrap","title-info","watch-providers","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["views","analytics","points","playlists","links","overview","reports","codes","iptv","prizes","withdraw","history","settings"], profile:["content","posts","home","create","search","messages","following","blocked","settings"], label:"يوتيوب — نفس ترتيب يوتيوب", desc:"الفيديو والاقتراحات أولاً" },
    instagram:{ home:["hero","movies","series","videos","whats-new","home-market","search","features","trust","iptv","points-levels","prizes","app","plans","support","prizes-strip"], watch:["player-wrap","title-info","watch-social","watch-links","directors-section","cast-section","watch-providers","collection-section","similar-section","related-section"], dashboard:["overview","points","prizes","playlists","views","analytics","links","reports","codes","iptv","withdraw","history","settings"], profile:["home","posts","create","search","following","messages","content","blocked","settings"], label:"انستغرام — شبكة مربعة", desc:"الصور/الفيديو ثم الاستكشاف" },
    netflix:{ home:["hero","movies","series","iptv","videos","whats-new","home-market","features","search","trust","points-levels","prizes-strip","prizes","app","plans","support"], watch:["player-wrap","title-info","watch-links","watch-providers","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","prizes","history","playlists","links","views","analytics","reports","codes","iptv","withdraw","settings"], profile:["home","posts","content","messages","following","search","create","blocked","settings"], label:"نتفليكس — صفوف سينمائية", desc:"صفوف أفلام أفقية أولاً" },
    prime:{ home:["trust","search","hero","movies","series","videos","iptv","home-market","whats-new","features","points-levels","prizes-strip","prizes","app","plans","support"], watch:["watch-providers","player-wrap","title-info","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","prizes","playlists","links","views","analytics","iptv","codes","reports","withdraw","history","settings"], profile:["home","posts","content","messages","create","search","following","blocked","settings"], label:"أمازون برايم — متجر ومشاهدة", desc:"البحث والعروض أولاً" },
    appletv:{ home:["hero","search","whats-new","movies","series","videos","iptv","app","home-market","trust","points-levels","features","prizes","prizes-strip","plans","support"], watch:["player-wrap","title-info","watch-providers","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","views","analytics","playlists","links","prizes","reports","codes","iptv","withdraw","history","settings"], profile:["home","content","posts","create","messages","search","following","blocked","settings"], label:"آبل تيفي — داكن بسيط", desc:"المحتوى المميز في الوسط" },
    win7:{ home:["search","trust","hero","whats-new","features","movies","series","videos","iptv","home-market","points-levels","prizes","prizes-strip","app","plans","support"], watch:["title-info","player-wrap","watch-providers","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","views","analytics","playlists","links","reports","codes","iptv","prizes","withdraw","history","settings"], profile:["home","posts","content","create","search","messages","following","blocked","settings"], label:"ويندوز 7 — إيرو", desc:"شريط البحث ثم النافذة الوسطية" },
    win8:{ home:["hero","features","whats-new","movies","series","videos","search","iptv","home-market","trust","points-levels","prizes","prizes-strip","app","plans","support"], watch:["player-wrap","title-info","watch-providers","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","playlists","links","reports","codes","iptv","views","analytics","prizes","withdraw","history","settings"], profile:["home","posts","content","messages","search","following","blocked","create","settings"], label:"ويندوز 8 — ميترو بلاطات", desc:"بلاطات مسطحة أولاً" },
    win10:{ home:["hero","trust","search","whats-new","features","movies","series","videos","iptv","home-market","points-levels","prizes","prizes-strip","app","plans","support"], watch:["title-info","player-wrap","watch-links","watch-social","watch-providers","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","views","analytics","prizes","playlists","links","reports","codes","iptv","withdraw","history","settings"], profile:["home","posts","content","messages","search","following","create","blocked","settings"], label:"ويندوز 10 — فلوينت", desc:"القائمة الجانبية مع بحث" },
    win11:{ home:["hero","search","trust","whats-new","features","movies","series","videos","home-market","iptv","points-levels","prizes-strip","prizes","app","plans","support"], watch:["title-info","player-wrap","watch-providers","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","views","analytics","playlists","links","reports","codes","iptv","prizes","withdraw","history","settings"], profile:["home","create","posts","content","search","messages","following","blocked","settings"], label:"ويندوز 11 — ميكا متوسط", desc:"موسّط ومستدير" },
    macos:{ home:["hero","trust","search","whats-new","features","movies","series","videos","iptv","home-market","points-levels","prizes","prizes-strip","app","plans","support"], watch:["title-info","player-wrap","watch-providers","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","analytics","views","points","playlists","links","reports","codes","iptv","prizes","withdraw","history","settings"], profile:["home","posts","content","create","messages","search","following","blocked","settings"], label:"ماك أو إس — شفاف", desc:"شريط علوي شفاف" },
    android:{ home:["hero","search","movies","series","videos","whats-new","features","iptv","home-market","trust","points-levels","prizes","prizes-strip","app","plans","support"], watch:["player-wrap","title-info","watch-links","watch-social","watch-providers","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","playlists","links","reports","codes","iptv","views","analytics","prizes","withdraw","history","settings"], profile:["home","posts","content","create","search","messages","following","blocked","settings"], label:"أندرويد — ماتريال", desc:"درج جانبي" },
    ios:{ home:["hero","search","movies","series","videos","trust","whats-new","features","home-market","iptv","points-levels","prizes","prizes-strip","app","plans","support"], watch:["player-wrap","title-info","watch-providers","watch-links","watch-social","directors-section","cast-section","collection-section","similar-section","related-section"], dashboard:["overview","points","views","playlists","links","prizes","reports","codes","iptv","analytics","withdraw","history","settings"], profile:["home","posts","create","content","search","messages","following","blocked","settings"], label:"آي أو إس — بلور سفلي", desc:"تبويب سفلي" },
  };

  function getStyle(){ try{const s=localStorage.getItem("cineaura_style"); if(VALID_STYLES.includes(s)) return s;}catch{} return "default"; }
  function loadConfig(){
    try{ const raw=localStorage.getItem(LS_KEY); if(raw){ const j=JSON.parse(raw); if(j&&j.pages) return j; } }catch{}
    // fallback to preset for current style
    const st=getStyle();
    const preset=PRESETS[st]||PRESETS.default;
    return { preset:st, pages:{ home:preset.home.slice(), watch:preset.watch.slice(), content:preset.content.slice(), market:preset.market.slice(), dashboard:preset.dashboard.slice(), profile:preset.profile.slice() }, shortcuts:{}, pins:[] };
  }
  function saveConfig(cfg){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(cfg)); }catch{}
    // also push to profiles.layout_config if logged in (best-effort)
    try{
      const C=window.CineAura; const s=C&&C.getSession&&C.getSession(); if(s&&s.member_id && C.supabaseRequest && C.restValue){
        C.supabaseRequest(`/rest/v1/profiles?member_id=eq.${C.restValue(s.member_id)}`,{method:"PATCH", body:JSON.stringify({ layout_config:cfg }) }).catch(()=>{});
      }
    }catch{}
  }
  function resetToPreset(styleId){
    styleId = VALID_STYLES.includes(styleId)? styleId : getStyle();
    const p=PRESETS[styleId]||PRESETS.default;
    const cfg={ preset:styleId, pages:{ home:p.home.slice(), watch:p.watch.slice(), content:p.content.slice(), market:p.market.slice(), dashboard:p.dashboard.slice(), profile:p.profile.slice() }, shortcuts:{}, pins:[] };
    saveConfig(cfg);
    return cfg;
  }
  function resetToDefault(){ return resetToPreset("default"); }

  // Apply ordering to DOM
  function ensureShortcutElements(container, order){
    order.forEach(id=>{
      if(!id || !id.startsWith("shortcut-")) return;
      if(document.getElementById(id)) return;
      // parse shortcut-source-sid
      const parts=id.split("-");
      // shortcut-dashboard-overview-xyz -> source=parts[1], sid=parts[2]
      const source=parts[1]||"dashboard", sid=parts[2]||"shortcut";
      const sec=document.createElement("section");
      sec.id=id;
      sec.className="section";
      sec.innerHTML=`
        <div class="container">
          <div class="section-head">
            <div><div class="kicker"><span class="kicker-num">↗</span><span class="eyebrow">${source}</span></div><h2>اختصار ${sid}</h2></div>
          </div>
          <div class="glass" style="padding:16px">
            <p>اختصار من <b>${source}</b> • <b>${sid}</b></p>
            <a class="btn btn-sm btn-primary" href="./${source==="dashboard"?"dashboard.html": source==="profile"?"profile.html": source==="market"?"market.html": source==="iptv"?"index.html#iptv": source+".html"}#${sid}">فتح</a>
          </div>
        </div>`;
      container.appendChild(sec);
    });
  }
  function applyHomeOrder(order){
    const main=document.querySelector("main.page-main");
    if(!main) return;
    ensureShortcutElements(main, order);
    // Collect direct section/div children that contain known IDs
    const byId={};
    const others=[];
    [...main.children].forEach(ch=>{
      const id=ch.id;
      if(id && order.includes(id)) byId[id]=ch;
      else if(ch.classList.contains("trust") && order.includes("trust")) byId["trust"]=ch;
      else others.push(ch);
    });
    // Also handle #hero section special (id hero)
    // Re-append in order
    order.forEach(id=>{
      const el=byId[id];
      if(el) main.appendChild(el);
    });
    // Ensure trust handled (it is a div not section, class trust)
    // If order contains trust but not found as id, find .trust
    if(order.includes("trust")){
      const trustEl=document.querySelector(".trust");
      if(trustEl) {
        // place after hero if hero exists
        const hero=document.getElementById("hero");
        // Move according to order: we already appended via byId if trust was identified
      }
    }
  }
  function applyWatchOrder(order){
    const root=document.getElementById("watch-root");
    if(!root) return;
    ensureShortcutElements(root, order);
    const map={};
    [...root.children].forEach(ch=>{ if(ch.id) map[ch.id]=ch; });
    // player-wrap is a div without id, containing #player
    const playerWrap=document.querySelector(".player-wrap");
    if(playerWrap) map["player-wrap"]=playerWrap;
    // also handle shortcut ids
    [...root.children].forEach(ch=>{ if(ch.id && ch.id.startsWith("shortcut-")) map[ch.id]=ch; });
    order.forEach(id=>{
      const el=map[id];
      if(el) root.appendChild(el);
    });
  }
  function applyGenericOrder(containerSel, order, idAttr){
    const cont=document.querySelector(containerSel);
    if(!cont) return;
    ensureShortcutElements(cont, order);
    const map={};
    [...cont.children].forEach(ch=>{
      const key=ch.id || ch.getAttribute(idAttr)||"";
      if(key && order.includes(key)) map[key]=ch;
      if(ch.id && ch.id.startsWith("shortcut-")) map[ch.id]=ch;
    });
    order.forEach(id=>{
      const el=map[id];
      if(el) cont.appendChild(el);
    });
  }

  function injectSideShortcuts(page, cfg){
    if(!cfg || !cfg.shortcuts) return;
    // Generic: key = source_in_target  (e.g. dashboard_in_profile)
    Object.entries(cfg.shortcuts).forEach(([key, ids])=>{
      if(!Array.isArray(ids) || !ids.length) return;
      const m=key.match(/^(.+)_in_(.+)$/);
      if(!m) return;
      const source=m[1], target=m[2];
      if(target!==page) return;
      // target is current page, inject ids from source
      let nav=null;
      if(target==="dashboard") nav=document.querySelector("#dash-root .side-nav");
      else if(target==="profile") nav=document.querySelector("#prof-root .prof-side nav, #prof-root nav");
      else if(target==="home") nav=null; // home has no side nav, skip side injection (handled as section shortcuts)
      if(!nav) return;
      // clear previous injected shortcuts for this source
      nav.querySelectorAll(`[data-shortcut-source="${source}"]`).forEach(el=> el.remove());
      const C=window.CineAura;
      // helper to get username for profile links
      let username="";
      try{
        if(C&&C.getSession){
          const s=C.getSession(); if(s&&s.username) username=s.username;
          if(!username){ const st=localStorage.getItem("cineaura_session"); if(st){ const j=JSON.parse(st); username=j.username||j.user||""; } }
        }
      }catch{}
      ids.forEach(sid=>{
        // avoid duplicating if target already has this id as normal item (order already contains it)
        // create shortcut element
        let el;
        if(target==="dashboard"){
          // profile/market/iptv shortcut in dashboard → link to that page
          let href="#";
          if(source==="profile") href = username ? `./profile.html?@${encodeURIComponent(username)}#${sid}` : `./profile.html#${sid}`;
          else if(source==="market") href = `./market.html#${sid}`;
          else if(source==="iptv") href = `./index.html#${sid}`;
          else href = `./${source}.html#${sid}`;
          el=document.createElement("a");
          el.href=href;
          el.className="shortcut-link";
          el.setAttribute("data-shortcut-source", source);
          el.setAttribute("data-shortcut-id", sid);
          el.style.cssText="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;border:1px dashed rgba(1,180,228,.35);background:rgba(1,180,228,.08);font-size:13px;font-weight:600;color:inherit;text-decoration:none;";
          const icon = C&&C.navIcon ? C.navIcon(sid) : "↗";
          const label = C&&C.t ? C.t(`dash.nav.${sid}`) : sid;
          el.innerHTML=`${icon}<span style="flex:1">${label !== `dash.nav.${sid}` ? label : sid} <small style="opacity:.6;font-size:10px">↗ ${source}</small></span>`;
        } else if(target==="profile"){
          // dashboard/market/iptv shortcut in profile → link to dashboard etc
          let href="#";
          if(source==="dashboard") href=`./dashboard.html#${sid}`;
          else if(source==="market") href=`./market.html#${sid}`;
          else if(source==="iptv") href=`./index.html#${sid}`;
          else href=`./${source}.html#${sid}`;
          el=document.createElement("a");
          el.href=href;
          el.className="shortcut-link";
          el.setAttribute("data-shortcut-source", source);
          el.setAttribute("data-shortcut-id", sid);
          el.style.cssText="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;border:1px dashed rgba(144,206,161,.45);background:rgba(144,206,161,.08);font-size:13px;font-weight:600;color:inherit;text-decoration:none;";
          const icon = C&&C.navIcon ? C.navIcon(sid) : "↗";
          const label = C&&C.t ? C.t(`prof.${sid}`) : sid;
          // profile uses button style: we adapt to <a> but keep similar
          const lbl = label !== `prof.${sid}` ? label : sid;
          el.innerHTML=`${icon}<span style="flex:1">${lbl} <small style="opacity:.6;font-size:10px">↗ ${source}</small></span>`;
        }
        if(el) nav.appendChild(el);
      });
    });
  }
  function applyDashboardOrder(order){
    const nav=document.querySelector("#dash-root .side-nav");
    if(!nav) return;
    const byKey={};
    [...nav.children].forEach(btn=>{
      const k=btn.getAttribute("data-section")||btn.getAttribute("data-sec")||btn.dataset.sec||btn.dataset.section||"";
      if(k) byKey[k]=btn;
    });
    if(Object.keys(byKey).length===0){
      [...nav.querySelectorAll("button")].forEach(b=>{
        const t=b.textContent.trim().toLowerCase();
        order.forEach(k=>{ if(t.includes(k)) byKey[k]=b; });
      });
    }
    order.forEach(k=>{ const el=byKey[k]; if(el) nav.appendChild(el); });
    // inject shortcuts after reordering
    try{ const cfg=loadConfig(); injectSideShortcuts("dashboard", cfg); }catch{}
  }

  function applyProfileOrder(order){
    const nav=document.querySelector("#prof-root .prof-side nav, #prof-root nav");
    if(!nav) return;
    const map={};
    [...nav.querySelectorAll("button[data-sec]")].forEach(b=> map[b.dataset.sec]=b);
    order.forEach(k=>{ const el=map[k]; if(el) nav.appendChild(el); });
    try{ const cfg=loadConfig(); injectSideShortcuts("profile", cfg); }catch{}
  }

  function applyHidden(cfg, page){
    // Respect hidden sections saved via editor: hide them outside edit mode
    try{
      const hidden = (cfg.hidden && cfg.hidden[page]) || JSON.parse(localStorage.getItem("cineaura_hidden_sections")||"{}")[page] || [];
      if(!hidden || !hidden.length) return;
      hidden.forEach(id=>{
        const el=document.getElementById(id);
        if(el) { el.hidden=true; el.style.display="none"; }
      });
    }catch{}
  }
  function applyAll(cfg){
    cfg=cfg||loadConfig();
    const page = detectPage();
    if(page==="home") applyHomeOrder(cfg.pages.home||PRESETS.default.home);
    if(page==="watch") applyWatchOrder(cfg.pages.watch||PRESETS.default.watch);
    if(page==="content") applyGenericOrder("#vw-root .vw-layout", cfg.pages.content||PRESETS.default.content, "id");
    if(page==="market") applyGenericOrder("#mkt-root", cfg.pages.market||PRESETS.default.market, "id");
    if(page==="dashboard") applyDashboardOrder(cfg.pages.dashboard||PRESETS.default.dashboard);
    if(page==="profile") applyProfileOrder(cfg.pages.profile||PRESETS.default.profile);
    // Apply hidden (skip when in edit mode — editor handles its own visibility)
    if(!document.documentElement.classList.contains("ce-editing-root")){
      applyHidden(cfg, page);
    }
    // Apply homepage pins (add extra rail)
    applyPins(cfg.pins||[]);
    // Shortcuts: handled inside profile/dashboard render via event
    document.dispatchEvent(new CustomEvent("cineaura:layout-applied",{detail:{cfg,page}}));
  }

  function detectPage(){
    if(document.getElementById("hero")) return "home";
    if(document.getElementById("watch-root")) return "watch";
    if(document.getElementById("vw-root")) return "content";
    if(document.getElementById("mkt-root")) return "market";
    if(document.getElementById("dash-root")) return "dashboard";
    if(document.getElementById("prof-root")) return "profile";
    return "unknown";
  }

  function getPins(){ try{ const r=localStorage.getItem(PIN_KEY); return r?JSON.parse(r):[] }catch{return []} }
  function setPins(arr){ try{ localStorage.setItem(PIN_KEY, JSON.stringify(arr)); }catch{} 
    const cfg=loadConfig(); cfg.pins=arr; saveConfig(cfg);
  }
  function addPin(tmdbId){ const a=getPins(); if(!a.includes(tmdbId)){ a.push(tmdbId); setPins(a); } }
  function removePin(tmdbId){ let a=getPins().filter(x=>x!==tmdbId); setPins(a); }

  function applyPins(pins){
    const main=document.querySelector("main.page-main");
    if(!main || !pins || !pins.length) return;
    let rail=document.getElementById("home-pins-rail");
    if(!rail){
      rail=document.createElement("section");
      rail.id="home-pins-rail";
      rail.className="section";
      rail.innerHTML=`<div class="container"><div class="section-head"><div><div class="kicker"><span class="kicker-num">★</span><span class="eyebrow">مخصص</span></div><h2>أفلامك المثبتة</h2></div></div><div class="marquee-wrap"><div class="marquee" id="home-pins-track"></div></div></div>`;
      // Insert after hero
      const hero=document.getElementById("hero");
      if(hero && hero.nextSibling) main.insertBefore(rail, hero.nextSibling.nextSibling);
      else main.prepend(rail);
    }
    const track=document.getElementById("home-pins-track");
    if(!track) return;
    // Render pins as simple poster placeholders; real TMDB fetch will be done if js/main.js provides helper
    // We attempt to fetch via TMDB if window.CineAura.tmdb available
    (async()=>{
      const C=window.CineAura;
      if(!C||!C.tmdb) {
        track.innerHTML=pins.map(id=>`<a class="poster-card" href="./watch.html?tmdb=${id}"><div class="poster-media"><img alt="" src="" /></div><div class="poster-info"><h3>#${id}</h3></div></a>`).join("");
        return;
      }
      track.innerHTML="";
      for(const id of pins){
        try{
          const res=await C.tmdb(`/movie/${id}`);
          const m=res.data||{};
          const img=m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : "";
          const a=document.createElement("a");
          a.className="poster-card";
          a.href=`./watch.html?tmdb=${id}`;
          a.innerHTML=`<div class="poster-media"><img alt="${(m.title||"").replace(/"/g,'&quot;')}" src="${img}" loading="lazy"></div><div class="poster-info"><h3>${(m.title||"Film #"+id)}</h3><div class="poster-sub">${(m.release_date||"").slice(0,4)}</div></div>`;
          track.appendChild(a);
        }catch{}
      }
    })();
  }

  // hydrate from supabase profile if available
  async function hydrateFromProfile(){
    try{
      const C=window.CineAura; const s=C&&C.getSession&&C.getSession(); if(!s||!s.member_id) return;
      const res=await C.supabaseRequest(`/rest/v1/profiles?member_id=eq.${C.restValue(s.member_id)}&select=layout_config`);
      const p=res.data&&res.data[0];
      if(p&&p.layout_config && p.layout_config.pages){
        // don't override if local is newer (local has preset+timestamp?) For now if profile has config and local is default preset, adopt profile
        const local=loadConfig();
        // if local is default preset for current style and profile preset differs, adopt profile
        localStorage.setItem(LS_KEY, JSON.stringify(p.layout_config));
      }
    }catch{}
  }

  // Init
  function init(){
    // Try hydrate then apply
    hydrateFromProfile().finally(()=> applyAll());
    // Re-apply on style change
    document.addEventListener("cineaura:prefs", (e)=>{
      if(e.detail && e.detail.style){
        // if user hasn't customized (local preset equals default for old style), migrate to new preset
        const cfg=loadConfig();
        // if cfg preset still old, we could auto-switch to new preset's ordering unless user has custom pins/shortcuts
        // For now, if no custom flag, adopt new preset
        if(cfg && !cfg.customized){
          const np=PRESETS[e.detail.style];
          if(np){
            cfg.preset=e.detail.style;
            cfg.pages.home=np.home.slice();
            cfg.pages.watch=np.watch.slice();
            // keep others
            saveConfig(cfg);
          }
        }
        applyAll(cfg);
      }
    });
    // Also observe DOM ready for dashboard/profile which render async
    const obs=new MutationObserver(()=>{
      // debounce apply
      clearTimeout(window._lzApplyTimer);
      window._lzApplyTimer=setTimeout(()=>applyAll(), 300);
    });
    obs.observe(document.documentElement,{childList:true, subtree:true});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.CineAuraLayouts={ PRESETS, HOME_BASE, WATCH_BASE, DASH_BASE, PROFILE_BASE, getStyle, loadConfig, saveConfig, resetToPreset, resetToDefault, applyAll, detectPage, getPins, setPins, addPin, removePin, VALID_STYLES };

})();
