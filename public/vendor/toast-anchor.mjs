/**
 * toast-anchor v1.0.9
 * (c) 2026 Akash Prajapati
 * @license MIT
 * Vendorizado desde node_modules/toast-anchor/dist/index.mjs (build ESM) para no
 * declarar dependencias de ejecución, según RNF-01 del PRD. La licencia completa
 * acompaña al fichero en toast-anchor.LICENSE.
 */
if(typeof document<"u"&&!document.getElementById("__tk_css")){let i=document.createElement("style");i.id="__tk_css",i.textContent="@keyframes __tk_spin{to{transform:rotate(360deg)}}",document.head.appendChild(i)}var g={success:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',error:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',warning:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',loading:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:__tk_spin 1s linear infinite"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>'};var m={position:"bottom-right",duration:4e3,sound:!1,dismissOnClick:!1,showProgress:!1,maxToasts:5,theme:{success:{bg:"#10b981",light:"#d1fae5"},error:{bg:"#ef4444",light:"#fee2e2"},warning:{bg:"#f59e0b",light:"#fef3c7"},info:{bg:"#3b82f6",light:"#dbeafe"}},toast:{bg:"#ffffff",color:"#1e293b",descColor:"#64748b",borderColor:"#f1f5f9",borderWidth:"1px",borderRadius:"14px",shadow:"0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04)",padding:"13px 14px",width:"316px",fontSize:"13.5px",fontWeight:"600",descFontSize:"12px",descFontWeight:"400",showIcon:!0,showClose:!0,closeColor:"#cbd5e1",closeHoverColor:"#94a3b8",progressH:"3px",progressRadius:"0 0 14px 14px",iconSize:"32px",iconRadius:"50%",actionColor:null,actionFontSize:"12px"},anchored:{position:"top",bg:"#0f172a",color:"#ffffff",borderColor:"transparent",borderWidth:"0px",borderRadius:"10px",shadow:"0 8px 24px rgba(0,0,0,0.2)",padding:"8px 14px",fontSize:"13px",fontWeight:"600",showIcon:!0,arrowSize:10,showArrow:!0,gap:13},anchoredConfirm:{position:"top",bg:"#0f172a",color:"#f8fafc",borderColor:"transparent",borderWidth:"0px",borderRadius:"12px",shadow:"0 8px 28px rgba(0,0,0,0.22)",padding:"12px 14px",fontSize:"13px",minWidth:"160px",showIcon:!0,confirmBg:"#ef4444",confirmColor:"#ffffff",confirmHoverBg:"#dc2626",cancelBg:"#1e293b",cancelColor:"#94a3b8",cancelHoverBg:"#334155",cancelBorder:"#334155",btnRadius:"8px",btnFontSize:"12px",btnFontWeight:"700",btnPadding:"6px 0",arrowSize:10,showArrow:!0,gap:13},modal:{position:"center",overlayBg:"rgba(15,23,42,0.55)",overlayBlur:"5px",bg:"#ffffff",borderColor:"transparent",borderWidth:"0px",borderRadius:"20px",shadow:"0 25px 60px rgba(0,0,0,0.22)",maxWidth:"420px",padding:"24px",footerBg:"#f8fafc",footerBorder:"#f1f5f9",footerPaddingV:"14px",footerPaddingVB:"18px",titleColor:"#0f172a",titleSize:"17px",titleWeight:"700",titleMargin:"0 0 8px",messageColor:"#64748b",messageSize:"14px",iconSize:"48px",iconRadius:"50%",iconBg:null,iconColor:null,confirmBg:null,confirmColor:"#ffffff",confirmHoverBg:null,confirmRadius:"10px",confirmSize:"13.5px",confirmWeight:"600",confirmPadding:"9px 22px",cancelColor:"#475569",cancelHoverBg:"#f1f5f9",cancelRadius:"10px",cancelSize:"13.5px",cancelWeight:"500",cancelPadding:"9px 18px",cancelBg:"transparent",cancelBorder:"none"}};function Y(i={}){let n=["toast","anchored","anchoredConfirm","modal","theme"];for(let[r,o]of Object.entries(i))if(n.includes(r)&&o&&typeof o=="object")if(r==="theme")for(let[t,e]of Object.entries(o))m.theme[t]={...m.theme[t],...e};else Object.assign(m[r],o);else m[r]=o}var k=null,te={success:{wave:"sine",sf:600,ef:900,gs:.15,ge:.01,dur:.15},error:{wave:"sawtooth",sf:400,ef:200,gs:.15,ge:.01,dur:.15},warning:{wave:"triangle",sf:600,ef:380,gs:.12,ge:.01,dur:.13},info:{wave:"sine",sf:800,ef:300,gs:.15,ge:.01,dur:.1},pop:{wave:"sine",sf:700,ef:350,gs:.12,ge:.01,dur:.1}};function C(i="success"){if(!(typeof window>"u"))try{k||(k=new(window.AudioContext||window.webkitAudioContext)),k.state==="suspended"&&k.resume();let n=te[i]||te.pop,r=k.createOscillator(),o=k.createGain(),t=k.currentTime;r.type=n.wave,r.frequency.setValueAtTime(n.sf,t),r.frequency.exponentialRampToValueAtTime(n.ef,t+n.dur),o.gain.setValueAtTime(n.gs,t),o.gain.exponentialRampToValueAtTime(n.ge,t+n.dur),r.connect(o),o.connect(k.destination),r.start(),r.stop(t+n.dur)}catch{}}var re={"top-left":"top:1.5rem;left:1.5rem;flex-direction:column","top-center":"top:1.5rem;left:50%;transform:translateX(-50%);flex-direction:column","top-right":"top:1.5rem;right:1.5rem;flex-direction:column","middle-left":"top:50%;left:1.5rem;transform:translateY(-50%);flex-direction:column","middle-center":"top:50%;left:50%;transform:translate(-50%,-50%);flex-direction:column","middle-right":"top:50%;right:1.5rem;transform:translateY(-50%);flex-direction:column","bottom-left":"bottom:1.5rem;left:1.5rem;flex-direction:column-reverse","bottom-center":"bottom:1.5rem;left:50%;transform:translateX(-50%);flex-direction:column-reverse","bottom-right":"bottom:1.5rem;right:1.5rem;flex-direction:column-reverse"},D=new Map,z=new Map,he=0;function be(i){if(typeof document>"u")return null;if(D.has(i))return D.get(i);let n=document.createElement("div");return n.id=`__tk_c_${i.replace(/-/g,"_")}`,n.setAttribute("style","position:fixed;z-index:9999;display:flex;gap:10px;pointer-events:none;"+(re[i]||re["bottom-right"])),document.body.appendChild(n),D.set(i,n),n}function x(i){let n=z.get(i);if(!n)return;clearTimeout(n.timer);let r=n.el;r.style.opacity="0",r.style.transform="scale(0.9) translateY(6px)",r.style.maxHeight=r.offsetHeight+"px",setTimeout(()=>{r.style.transition="all 0.32s ease-out",r.style.maxHeight="0",r.style.padding="0",r.style.margin="0",r.style.overflow="hidden"},60),setTimeout(()=>{r.remove(),z.delete(i)},420)}function L(){[...z.keys()].forEach(x)}function xe(){return`__tk_${++he}`}function u(i,n={}){var Z,ee;if(typeof document>"u")return()=>{};let r=m,o=r.toast,t={type:"success",position:r.position,duration:r.duration,sound:r.sound,dismissOnClick:r.dismissOnClick,showProgress:r.showProgress,description:null,icon:null,action:null,id:null,showIcon:void 0,showClose:void 0,...n},e=t.type,d=r.theme[e]||r.theme.success,a=y=>t[y]!==void 0?t[y]:o[y],c=a("bg"),s=a("color"),l=a("descColor"),f=a("borderColor"),p=a("borderWidth"),P=a("borderRadius"),H=a("shadow"),F=a("padding"),O=a("width"),h=a("fontSize"),M=a("fontWeight"),$=a("descFontSize"),S=a("descFontWeight"),w=a("closeColor"),B=a("closeHoverColor"),v=a("progressH"),ne=a("progressRadius"),ie=t.progressColor||d.bg,se=t.iconBg||d.light,ae=t.iconColor||d.bg,q=a("iconSize"),de=a("iconRadius"),ce=t.actionColor||d.bg,le=a("actionFontSize"),fe=t.icon||g[e]||g.success,j=t.id||xe(),pe=t.showIcon!==void 0?t.showIcon:o.showIcon!==void 0?o.showIcon:!0,me=t.showClose!==void 0?t.showClose:o.showClose!==void 0?o.showClose:!0,J=!!(t.description||t.action),ue=J?"align-items:flex-start":"align-items:center",ge=J?"padding-top:2px":"";t.sound&&C(e);let Q=be(t.position);if(!Q)return()=>{};z.size>=r.maxToasts&&x(z.keys().next().value);let b=document.createElement("div");b.id=j,b.setAttribute("style",["pointer-events:auto","position:relative","overflow:hidden","display:flex",ue,"gap:12px",`width:${O}`,`background:${c}`,`border:${p} solid ${f}`,`padding:${F}`,`border-radius:${P}`,`box-shadow:${H}`,"transition:all 0.38s cubic-bezier(0.34,1.56,0.64,1)","opacity:0","transform:scale(0.9) translateY(10px)",`cursor:${t.dismissOnClick?"pointer":"default"}`,"box-sizing:border-box"].join(";")),b.innerHTML=`
    ${pe?`<div style="display:flex;align-items:center;justify-content:center;width:${q};height:${q};min-width:${q};border-radius:${de};background:${se};color:${ae};flex-shrink:0">
      <div style="width:16px;height:16px;display:flex">${fe}</div>
    </div>`:""}
    <div style="flex:1;min-width:0;${ge}">
      <p style="font-size:${h};font-weight:${M};color:${s};line-height:1.4;margin:0">${i}</p>
      ${t.description?`<p style="font-size:${$};font-weight:${S};color:${l};margin:3px 0 0;line-height:1.5">${t.description}</p>`:""}
      ${t.action?`<button data-tk-action style="margin-top:7px;font-size:${le};font-weight:700;color:${ce};background:none;border:none;cursor:pointer;padding:0;display:block;line-height:1">${t.action.label}</button>`:""}
    </div>
    ${me?`<button data-tk-close
      style="flex-shrink:0;background:none;border:none;cursor:pointer;color:${w};padding:2px;line-height:0;border-radius:4px;transition:color 0.15s"
      title="Dismiss"
      onmouseenter="this.style.color='${B}'"
      onmouseleave="this.style.color='${w}'"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>`:""}
    ${t.showProgress&&t.duration>0?`<div data-tk-bar style="position:absolute;bottom:0;left:0;height:${v};border-radius:${ne};background:${ie};width:100%;transition:width ${t.duration}ms linear"></div>`:""}
  `.trim(),Q.appendChild(b),requestAnimationFrame(()=>requestAnimationFrame(()=>{if(b.style.opacity="1",b.style.transform="scale(1) translateY(0)",t.showProgress&&t.duration>0){let y=b.querySelector("[data-tk-bar]");y&&(y.style.width="0%")}}));let T=()=>x(j),I=null;return t.duration>0&&(I=setTimeout(T,t.duration)),b.addEventListener("mouseenter",()=>clearTimeout(I)),b.addEventListener("mouseleave",()=>{t.duration>0&&(I=setTimeout(T,Math.min(t.duration,1500)))}),(Z=b.querySelector("[data-tk-close]"))==null||Z.addEventListener("click",y=>{y.stopPropagation(),T()}),t.dismissOnClick&&b.addEventListener("click",T),(ee=b.querySelector("[data-tk-action]"))==null||ee.addEventListener("click",y=>{var R,oe;y.stopPropagation(),(oe=(R=t.action)==null?void 0:R.onClick)==null||oe.call(R),T()}),z.set(j,{el:b,timer:I}),T}var ye=0;function E(i,n={},r={}){let{loading:o="Loading\u2026",success:t="Done!",error:e="Something went wrong"}=n,d=`__tk_p${++ye}`;return u(o,{type:"info",duration:0,icon:g.loading,sound:!1,id:d,...r}),Promise.resolve(i).then(a=>{x(d);let c=typeof t=="function"?t(a):t;u(c,{type:"success",...r})}).catch(a=>{x(d);let c=typeof e=="function"?e(a):e;u(c,{type:"error",...r})}),()=>x(d)}function V(i,n,r,o){let t=n.getBoundingClientRect(),e=i.getBoundingClientRect(),d=window.scrollX,a=window.scrollY,c,s;switch(r){case"bottom":c=t.bottom+a+o,s=t.left+d+t.width/2-e.width/2;break;case"left":c=t.top+a+t.height/2-e.height/2,s=t.left+d-e.width-o;break;case"right":c=t.top+a+t.height/2-e.height/2,s=t.right+d+o;break;default:c=t.top+a-e.height-o,s=t.left+d+t.width/2-e.width/2}i.style.top=`${c}px`,i.style.left=`${s}px`}function U(i,n,r,o,t){let e=n/2,d=t&&t!=="0px"?t:"0px",a=o||"transparent",c=d!=="0px",s="";if(c){let f=`${d} solid ${a}`,p=`${d} solid transparent`;switch(i){case"top":s=`border-top:${p};border-right:${f};border-bottom:${f};border-left:${p};`;break;case"bottom":s=`border-top:${f};border-right:${p};border-bottom:${p};border-left:${f};`;break;case"left":s=`border-top:${f};border-right:${f};border-bottom:${p};border-left:${p};`;break;case"right":s=`border-top:${p};border-right:${p};border-bottom:${f};border-left:${f};`;break}}let l=`${s}position:absolute;width:${n}px;height:${n}px;background:${r};transform:rotate(45deg);`;switch(i){case"bottom":return`${l}top:${-e}px;left:50%;margin-left:${-e}px`;case"left":return`${l}top:50%;right:${-e}px;margin-top:${-e}px`;case"right":return`${l}top:50%;left:${-e}px;margin-top:${-e}px`;default:return`${l}bottom:${-e}px;left:50%;margin-left:${-e}px`}}function X(i){switch(i){case"bottom":return"scale(0.88) translateY(-8px)";case"left":return"scale(0.88) translateX(8px)";case"right":return"scale(0.88) translateX(-8px)";default:return"scale(0.88) translateY(8px)"}}function K(i){switch(i){case"bottom":return"scale(0.9) translateY(-4px)";case"left":return"scale(0.9) translateX(4px)";case"right":return"scale(0.9) translateX(-4px)";default:return"scale(0.9) translateY(4px)"}}var N=new WeakMap;function A(i,n,r={}){if(typeof document>"u"||!n)return()=>{};let o={type:"success",duration:2500,sound:m.sound,icon:null,...m.anchored,...r},t=m.theme[o.type]||m.theme.success,e=o.icon||g[o.type],d=o.position;o.sound&&C(o.type);let a=N.get(n);a&&a();let c=o.showIcon!==void 0?o.showIcon:!0,s=document.createElement("div");s.setAttribute("style",["position:absolute","z-index:9998",`padding:${o.padding}`,`background:${o.bg}`,`color:${o.color}`,`font-size:${o.fontSize}`,`font-weight:${o.fontWeight}`,`border-radius:${o.borderRadius}`,`border:${o.borderWidth} solid ${o.borderColor}`,`box-shadow:${o.shadow}`,"pointer-events:none","white-space:nowrap","transition:opacity 0.3s ease,transform 0.3s cubic-bezier(0.34,1.56,0.64,1)","opacity:0",`transform:${X(d)}`].join(";")),s.innerHTML=`
    <div style="display:flex;align-items:center;gap:7px">
      ${c?`<div style="width:15px;height:15px;display:flex;flex-shrink:0;color:${t.bg}">${e}</div>`:""}
      <span>${i}</span>
    </div>
    ${o.showArrow?`<div style="${U(d,o.arrowSize,o.bg,o.borderColor,o.borderWidth)}"></div>`:""}
  `.trim(),document.body.appendChild(s),V(s,n,d,o.gap),requestAnimationFrame(()=>requestAnimationFrame(()=>{s.style.opacity="1",s.style.transform="scale(1) translate(0,0)"}));let l=()=>{N.delete(n),s.style.opacity="0",s.style.transform=K(d),setTimeout(()=>s.remove(),300)};return N.set(n,l),o.duration>0&&setTimeout(l,o.duration),l}var G=new WeakMap;function _(i,n,r,o,t={}){if(typeof document>"u"||!n)return;let e={confirmLabel:"Yes",cancelLabel:"No",sound:m.sound,...m.anchoredConfirm,...t},d=e.position;e.sound&&C("warning");let a=G.get(n);a&&a();let c=e.showIcon!==void 0?e.showIcon:!0,s=document.createElement("div");s.setAttribute("style",["position:absolute","z-index:9998",`padding:${e.padding}`,`background:${e.bg}`,`color:${e.color}`,`font-size:${e.fontSize}`,`border-radius:${e.borderRadius}`,`border:${e.borderWidth} solid ${e.borderColor}`,`box-shadow:${e.shadow}`,`min-width:${e.minWidth}`,"pointer-events:auto","transition:opacity 0.3s ease,transform 0.3s cubic-bezier(0.34,1.56,0.64,1)","opacity:0",`transform:${X(d)}`].join(";")),s.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      ${c?`<div style="width:15px;height:15px;flex-shrink:0;color:#fca5a5">${g.warning}</div>`:""}
      <span>${i}</span>
    </div>
    <div style="display:flex;gap:7px">
      <button data-cancel style="
        flex:1;padding:${e.btnPadding};
        background:${e.cancelBg};
        border:1px solid ${e.cancelBorder};
        color:${e.cancelColor};
        border-radius:${e.btnRadius};
        cursor:pointer;
        font-weight:${e.btnFontWeight};
        font-size:${e.btnFontSize};
        transition:background 0.15s,color 0.15s;
      ">${e.cancelLabel}</button>
      <button data-confirm style="
        flex:1;padding:${e.btnPadding};
        background:${e.confirmBg};
        border:none;
        color:${e.confirmColor};
        border-radius:${e.btnRadius};
        cursor:pointer;
        font-weight:${e.btnFontWeight};
        font-size:${e.btnFontSize};
        transition:background 0.15s;
      ">${e.confirmLabel}</button>
    </div>
    ${e.showArrow?`<div style="${U(d,e.arrowSize,e.bg,e.borderColor,e.borderWidth)}"></div>`:""}
  `.trim(),document.body.appendChild(s),V(s,n,d,e.gap),requestAnimationFrame(()=>requestAnimationFrame(()=>{s.style.opacity="1",s.style.transform="scale(1) translate(0,0)"}));let l=()=>{G.delete(n),s.style.opacity="0",s.style.transform=K(d),setTimeout(()=>s.remove(),280)};G.set(n,l);let f=s.querySelector("[data-confirm]"),p=s.querySelector("[data-cancel]");f.addEventListener("mouseenter",()=>{f.style.background=e.confirmHoverBg}),f.addEventListener("mouseleave",()=>{f.style.background=e.confirmBg}),p.addEventListener("mouseenter",()=>{p.style.background=e.cancelHoverBg}),p.addEventListener("mouseleave",()=>{p.style.background=e.cancelBg}),f.onclick=()=>{l(),r==null||r()},p.onclick=()=>{l(),o==null||o()}}function W(i,n,r={}){return new Promise(o=>{if(typeof document>"u")return o(!1);let e={...m.modal,confirmLabel:"Confirm",cancelLabel:"Cancel",confirmVariant:"danger",icon:null,sound:m.sound,...r},d=e.position==="top",a=d?"flex-start":"center",c=d?"padding:5vh 16px 16px":"padding:16px";e.sound&&C("warning");let s=e.confirmVariant!=="primary",l=e.confirmBg||(s?"#ef4444":"#3b82f6"),f=e.confirmHoverBg||(s?"#dc2626":"#2563eb"),p=e.iconColor||(s?"#ef4444":"#3b82f6"),P=e.iconBg||(s?"#fee2e2":"#dbeafe"),H=e.icon||g.warning,F=e.padding.trim().split(/\s+/),O=F[1]||F[0],h=document.createElement("div");h.setAttribute("style",["position:fixed","inset:0","z-index:99999","display:flex",`align-items:${a}`,"justify-content:center",c,`background:${e.overlayBg}`,`backdrop-filter:blur(${e.overlayBlur})`,"-webkit-backdrop-filter:blur("+e.overlayBlur+")","transition:opacity 0.25s ease","opacity:0"].join(";")),h.innerHTML=`
      <div data-mb style="
        width:100%;max-width:${e.maxWidth};
        background:${e.bg};
        border-radius:${e.borderRadius};
        border:${e.borderWidth} solid ${e.borderColor};
        box-shadow:${e.shadow};
        overflow:hidden;
        transition:all 0.32s cubic-bezier(0.34,1.56,0.64,1);
        transform:scale(0.9) translateY(18px);
      ">
        <!-- Body -->
        <div style="padding:${e.padding}">
          <div style="
            width:${e.iconSize};height:${e.iconSize};
            border-radius:${e.iconRadius};
            background:${P};
            display:flex;align-items:center;justify-content:center;
            margin-bottom:16px;
            color:${p};
          ">
            <div style="width:24px;height:24px">${H}</div>
          </div>
          <h3 style="
            font-size:${e.titleSize};
            font-weight:${e.titleWeight};
            color:${e.titleColor};
            margin:${e.titleMargin};
            line-height:1.3;
          ">${i}</h3>
          <p style="
            font-size:${e.messageSize};
            color:${e.messageColor};
            margin:0;
            line-height:1.65;
          ">${n}</p>
        </div>

        <!-- Footer -->
        <div style="
          background:${e.footerBg};
          padding:${e.footerPaddingV} ${O} ${e.footerPaddingVB};
          display:flex;gap:10px;justify-content:flex-end;
          border-top:1px solid ${e.footerBorder};
        ">
          <button data-mc style="
            padding:${e.cancelPadding};
            font-size:${e.cancelSize};
            font-weight:${e.cancelWeight};
            color:${e.cancelColor};
            background:${e.cancelBg};
            border:${e.cancelBorder};
            border-radius:${e.cancelRadius};
            cursor:pointer;
            transition:background 0.15s, color 0.15s;
          ">${e.cancelLabel}</button>
          <button data-mok style="
            padding:${e.confirmPadding};
            font-size:${e.confirmSize};
            font-weight:${e.confirmWeight};
            color:${e.confirmColor};
            background:${l};
            border:none;
            border-radius:${e.confirmRadius};
            cursor:pointer;
            box-shadow:0 2px 8px ${l}55;
            transition:background 0.15s, transform 0.1s;
          ">${e.confirmLabel}</button>
        </div>
      </div>
    `.trim(),document.body.appendChild(h);let M=h.querySelector("[data-mb]"),$=h.querySelector("[data-mok]"),S=h.querySelector("[data-mc]");$.addEventListener("mouseenter",()=>{$.style.background=f,$.style.transform="translateY(-1px)"}),$.addEventListener("mouseleave",()=>{$.style.background=l,$.style.transform=""}),S.addEventListener("mouseenter",()=>{S.style.background=e.cancelHoverBg}),S.addEventListener("mouseleave",()=>{S.style.background=e.cancelBg}),requestAnimationFrame(()=>{h.style.opacity="1",M.style.transform="scale(1) translateY(0)"});let w=v=>{h.style.opacity="0",M.style.transform="scale(0.9) translateY(16px)",setTimeout(()=>{h.remove(),o(v)},280)};S.onclick=()=>w(!1),$.onclick=()=>w(!0),h.addEventListener("click",v=>{v.target===h&&w(!1)});let B=v=>{v.key==="Escape"&&(w(!1),document.removeEventListener("keydown",B)),v.key==="Enter"&&(w(!0),document.removeEventListener("keydown",B))};document.addEventListener("keydown",B)})}function $e(i={}){let n=r=>({...i,...r});return{success:(r,o)=>u(r,n({type:"success",...o})),error:(r,o)=>u(r,n({type:"error",...o})),warning:(r,o)=>u(r,n({type:"warning",...o})),info:(r,o)=>u(r,n({type:"info",...o})),notify:(r,o)=>u(r,n(o)),promise:(r,o,t)=>E(r,o,n(t)),anchored:(r,o,t)=>A(r,o,n(t)),anchoredConfirm:_,modal:W,dismiss:x,dismissAll:L}}var we={success:(i,n)=>u(i,{type:"success",...n}),error:(i,n)=>u(i,{type:"error",...n}),warning:(i,n)=>u(i,{type:"warning",...n}),info:(i,n)=>u(i,{type:"info",...n}),notify:u,promise:E,anchored:A,anchoredConfirm:_,modal:W,dismiss:x,dismissAll:L,configure:Y,ICONS:g},ao=we;export{m as DEFAULTS,g as ICONS,_ as anchoredConfirm,A as anchoredToast,Y as configure,u as createToast,ao as default,L as dismissAll,x as dismissToast,W as modalConfirm,E as promiseToast,we as toast,$e as useToast};
