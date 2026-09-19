(function(){
"use strict";
const K="madarasati_theme_preset", CK="madarasati_custom_theme";
let themes={};
function hexToRgb(h){
 h=(h||"").trim().replace("#","");
 if(!h)return null;
 if(h.length===3)h=h.split("").map(function(c){return c+c}).join("");
 if(!/^[0-9a-fA-F]{6}$/.test(h))return null;
 const n=parseInt(h,16);
 return [n>>16&255,n>>8&255,n&255];
}
function parseCssColor(v){
 const s=(v||"").trim();
 if(/^#/.test(s))return hexToRgb(s);
 const m=s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
 return m?[+m[1],+m[2],+m[3]]:null;
}
function shade(hex,p){
 const c=parseCssColor(hex);
 if(!c)return hex;
 const amt=Math.max(-100,Math.min(100,p||0));
 const f=Math.abs(amt)/100;
 const out=c.map(function(v){return amt<0?Math.round(v*(1-f)):Math.round(v+(255-v)*f)});
 return "rgb("+out.join(",")+")";
}
async function init(){try{const r=await fetch("theme-presets.json",{cache:"no-store"});themes=await r.json()}catch(e){themes={}}apply(localStorage.getItem(K)||"education-green",false)}
function setv(t){
 const r=document.documentElement;
 const dark=r.dataset.theme==="dark";
 const defs={
  "--theme-primary":t.primary,
  "--theme-primary-dark":t.primary_dark,
  "--theme-accent":t.accent,
  "--theme-bg": dark?shade(t.background,-86):t.background,
  "--theme-surface": dark?shade(t.background,-76):t.surface,
  "--theme-text": dark?shade(t.text,88):t.text,
  "--theme-muted": dark?shade(t.text,45):t.muted,
  "--theme-border": dark?shade(t.background,-70):t.border
 };
 Object.keys(defs).forEach(function(k){const v=defs[k];if(v!=null)r.style.setProperty(k,v)});
}
function hero(t){
 const el=document.querySelector("[data-theme-hero]");
 if(!el||!t.hero)return;
 if(el.hasAttribute("data-hero-slider"))return; // dynamic hero slider owns its image
 const i=new Image();
 i.onload=function(){if(el.tagName==="IMG")el.src=t.hero;else el.style.backgroundImage='url("'+t.hero+'")'};
 i.src=t.hero;
}
function custom(){try{return JSON.parse(localStorage.getItem(CK)||"null")}catch(e){return null}}
function apply(id,persist){
 const t=id==="custom"?custom():themes[id];
 if(!t)return null;
 setv(t);
 hero(t);
 document.documentElement.dataset.themePreset=id;
 if(persist)localStorage.setItem(K,id);
 return t;
}
function applyMode(){return apply(document.documentElement.dataset.themePreset||getCurrentThemeId(),false)}
function themeName(id,lang){
 if(id==="custom")return lang==="ar"?"الثيم المخصص":"Custom Theme";
 const t=themes[id];
 if(t)return lang==="ar"?(t.name_ar||id):(t.name_en||id);
 return id;
}
function saveCustom(t){localStorage.setItem(CK,JSON.stringify(t));return apply("custom",true)}
function getCurrentThemeId(){return localStorage.getItem(K)||"education-green"}
window.MadarasatiTheme={applyTheme:apply,applyMode:applyMode,themeName:themeName,listThemes:function(){return JSON.parse(JSON.stringify(themes))},saveCustomTheme:saveCustom,getCurrentThemeId:getCurrentThemeId};
init();
})();