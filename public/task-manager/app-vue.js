(() => {
  // src/task-manager/api/tk-client.js
  var clientId = "";
  function setClientId(value) {
    clientId = String(value || "");
  }
  var ApiError = class extends Error {
    /**
     * @param {string} message Mensaje seguro para presentar al usuario.
     * @param {boolean} unavailable La capacidad TK no existe en este anfitrion.
     */
    constructor(message, unavailable = false) {
      super(message);
      this.name = "ApiError";
      this.unavailable = unavailable;
    }
  };
  async function apiRequest(path, options = {}) {
    let response;
    const requestOptions = { ...options };
    if (clientId) {
      requestOptions.headers = { ...options.headers || {}, "x-client-id": clientId };
    }
    try {
      response = await fetch(path, requestOptions);
    } catch (error) {
      throw new ApiError(error?.message || "No se pudo conectar con el servidor.");
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError("El servidor devolvi\xF3 una respuesta no v\xE1lida.");
    }
    if (!response.ok || data?.error) {
      const unavailable = response.status === 404 && String(data?.error || "").includes("capacidad de tareas no esta disponible");
      throw new ApiError(data?.error || `La operaci\xF3n fall\xF3 (${response.status}).`, unavailable);
    }
    return data;
  }
  function jsonRequest(path, method, body) {
    return apiRequest(path, {
      method,
      headers: body === void 0 ? void 0 : { "content-type": "application/json" },
      body: body === void 0 ? void 0 : JSON.stringify(body)
    });
  }
  var listTasks = () => apiRequest("/api/tk/list");
  var listTags = () => apiRequest("/api/tags");
  var showTask = (id) => apiRequest(`/api/tk/show/${encodeURIComponent(id)}`);
  var createTask = (task) => jsonRequest("/api/tk/create", "POST", task);
  var updateTask = (id, changes) => jsonRequest("/api/tk/update", "POST", { id, changes });
  var closeTask = (id) => jsonRequest("/api/tk/close", "POST", { id, reason: "done" });
  var addTaskDependency = (childId, parentId) => jsonRequest("/api/tk/dep", "POST", { child_id: childId, parent_id: parentId });
  var removeTaskDependency = (childId, parentId) => jsonRequest("/api/tk/dep-remove", "POST", { child_id: childId, parent_id: parentId });
  var addTaskComment = (id, body) => jsonRequest("/api/tk/comment", "POST", { id, body });
  var createTag = (tag) => jsonRequest("/api/tags", "POST", tag);
  var updateTag = (name, tag) => jsonRequest(`/api/tags/${encodeURIComponent(name)}`, "PUT", tag);
  var deleteTag = (name) => jsonRequest(`/api/tags/${encodeURIComponent(name)}`, "DELETE");

  // src/task-manager/state/inspector.js
  var inspectorState = {
    computed: {
      selectedBlockers() {
        return Array.isArray(this.detail?.blockers) ? this.detail.blockers : [];
      },
      selectedComments() {
        return Array.isArray(this.detail?.comments) ? this.detail.comments : [];
      },
      selectedDependents() {
        return Array.isArray(this.detail?.dependents) ? this.detail.dependents : [];
      },
      taskInspectorProps() {
        return {
          hasSelection: this.hasSelection,
          task: this.selectedTask,
          menuOpen: this.isInspectorMenuOpen,
          busy: this.isBusy,
          statusBadgeClass: this.statusBadgeClass,
          statusLabel: this.statusLabel,
          priorityLabel: this.priorityLabel,
          subtasks: this.selectedSubtasks,
          blockers: this.selectedBlockers,
          dependents: this.selectedDependents,
          comments: this.selectedComments,
          tagCatalog: this.tagCatalog,
          colors: this.colors
        };
      }
    },
    methods: {
      /**
       * Traduce el unico canal de eventos de dominio del inspector a metodos del
       * workspace. Los `v-model` del componente no pasan por este despachador.
       *
       * @param {InspectorAction} [action]
       * @returns {*}
       */
      handleInspectorAction(action = {}) {
        const payload = action.payload || {};
        switch (action.type) {
          case "menu.toggle":
            this.isInspectorMenuOpen = !this.isInspectorMenuOpen;
            return;
          case "edit.open":
            return this.openEditTask();
          case "edit.cancel":
            return this.cancelTaskEdit();
          case "edit.save":
            return this.saveSelectedTask();
          case "task.copy":
            return this.copyTaskId();
          case "task.close":
            return this.closeTask();
          case "task.select":
            return this.loadTaskDetail(payload.id);
          case "task.update-field":
            return this.updateTaskField(payload.id, payload.field, payload.value);
          case "subtask.open":
            return this.openSubtaskDialog();
          case "dependency.add":
            return this.addDependency();
          case "dependency.remove-blocker":
            return this.removeDependency(payload.id);
          case "dependency.remove-dependent":
            return this.removeDependent(payload.id);
          case "comment.add":
            return this.addComment();
          default:
            console.warn(`[Gestor de tareas] Accion de inspector desconocida: ${action.type}`);
            return;
        }
      }
    }
  };

  // node_modules/toast-anchor/dist/index.mjs
  if (typeof document < "u" && !document.getElementById("__tk_css")) {
    let i = document.createElement("style");
    i.id = "__tk_css", i.textContent = "@keyframes __tk_spin{to{transform:rotate(360deg)}}", document.head.appendChild(i);
  }
  var g = { success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>', error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>', warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>', info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>', loading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:__tk_spin 1s linear infinite"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>' };
  var m = { position: "bottom-right", duration: 4e3, sound: false, dismissOnClick: false, showProgress: false, maxToasts: 5, theme: { success: { bg: "#10b981", light: "#d1fae5" }, error: { bg: "#ef4444", light: "#fee2e2" }, warning: { bg: "#f59e0b", light: "#fef3c7" }, info: { bg: "#3b82f6", light: "#dbeafe" } }, toast: { bg: "#ffffff", color: "#1e293b", descColor: "#64748b", borderColor: "#f1f5f9", borderWidth: "1px", borderRadius: "14px", shadow: "0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04)", padding: "13px 14px", width: "316px", fontSize: "13.5px", fontWeight: "600", descFontSize: "12px", descFontWeight: "400", showIcon: true, showClose: true, closeColor: "#cbd5e1", closeHoverColor: "#94a3b8", progressH: "3px", progressRadius: "0 0 14px 14px", iconSize: "32px", iconRadius: "50%", actionColor: null, actionFontSize: "12px" }, anchored: { position: "top", bg: "#0f172a", color: "#ffffff", borderColor: "transparent", borderWidth: "0px", borderRadius: "10px", shadow: "0 8px 24px rgba(0,0,0,0.2)", padding: "8px 14px", fontSize: "13px", fontWeight: "600", showIcon: true, arrowSize: 10, showArrow: true, gap: 13 }, anchoredConfirm: { position: "top", bg: "#0f172a", color: "#f8fafc", borderColor: "transparent", borderWidth: "0px", borderRadius: "12px", shadow: "0 8px 28px rgba(0,0,0,0.22)", padding: "12px 14px", fontSize: "13px", minWidth: "160px", showIcon: true, confirmBg: "#ef4444", confirmColor: "#ffffff", confirmHoverBg: "#dc2626", cancelBg: "#1e293b", cancelColor: "#94a3b8", cancelHoverBg: "#334155", cancelBorder: "#334155", btnRadius: "8px", btnFontSize: "12px", btnFontWeight: "700", btnPadding: "6px 0", arrowSize: 10, showArrow: true, gap: 13 }, modal: { position: "center", overlayBg: "rgba(15,23,42,0.55)", overlayBlur: "5px", bg: "#ffffff", borderColor: "transparent", borderWidth: "0px", borderRadius: "20px", shadow: "0 25px 60px rgba(0,0,0,0.22)", maxWidth: "420px", padding: "24px", footerBg: "#f8fafc", footerBorder: "#f1f5f9", footerPaddingV: "14px", footerPaddingVB: "18px", titleColor: "#0f172a", titleSize: "17px", titleWeight: "700", titleMargin: "0 0 8px", messageColor: "#64748b", messageSize: "14px", iconSize: "48px", iconRadius: "50%", iconBg: null, iconColor: null, confirmBg: null, confirmColor: "#ffffff", confirmHoverBg: null, confirmRadius: "10px", confirmSize: "13.5px", confirmWeight: "600", confirmPadding: "9px 22px", cancelColor: "#475569", cancelHoverBg: "#f1f5f9", cancelRadius: "10px", cancelSize: "13.5px", cancelWeight: "500", cancelPadding: "9px 18px", cancelBg: "transparent", cancelBorder: "none" } };
  function Y(i = {}) {
    let n = ["toast", "anchored", "anchoredConfirm", "modal", "theme"];
    for (let [r, o] of Object.entries(i)) if (n.includes(r) && o && typeof o == "object") if (r === "theme") for (let [t, e] of Object.entries(o)) m.theme[t] = { ...m.theme[t], ...e };
    else Object.assign(m[r], o);
    else m[r] = o;
  }
  var k = null;
  var te = { success: { wave: "sine", sf: 600, ef: 900, gs: 0.15, ge: 0.01, dur: 0.15 }, error: { wave: "sawtooth", sf: 400, ef: 200, gs: 0.15, ge: 0.01, dur: 0.15 }, warning: { wave: "triangle", sf: 600, ef: 380, gs: 0.12, ge: 0.01, dur: 0.13 }, info: { wave: "sine", sf: 800, ef: 300, gs: 0.15, ge: 0.01, dur: 0.1 }, pop: { wave: "sine", sf: 700, ef: 350, gs: 0.12, ge: 0.01, dur: 0.1 } };
  function C(i = "success") {
    if (!(typeof window > "u")) try {
      k || (k = new (window.AudioContext || window.webkitAudioContext)()), k.state === "suspended" && k.resume();
      let n = te[i] || te.pop, r = k.createOscillator(), o = k.createGain(), t = k.currentTime;
      r.type = n.wave, r.frequency.setValueAtTime(n.sf, t), r.frequency.exponentialRampToValueAtTime(n.ef, t + n.dur), o.gain.setValueAtTime(n.gs, t), o.gain.exponentialRampToValueAtTime(n.ge, t + n.dur), r.connect(o), o.connect(k.destination), r.start(), r.stop(t + n.dur);
    } catch {
    }
  }
  var re = { "top-left": "top:1.5rem;left:1.5rem;flex-direction:column", "top-center": "top:1.5rem;left:50%;transform:translateX(-50%);flex-direction:column", "top-right": "top:1.5rem;right:1.5rem;flex-direction:column", "middle-left": "top:50%;left:1.5rem;transform:translateY(-50%);flex-direction:column", "middle-center": "top:50%;left:50%;transform:translate(-50%,-50%);flex-direction:column", "middle-right": "top:50%;right:1.5rem;transform:translateY(-50%);flex-direction:column", "bottom-left": "bottom:1.5rem;left:1.5rem;flex-direction:column-reverse", "bottom-center": "bottom:1.5rem;left:50%;transform:translateX(-50%);flex-direction:column-reverse", "bottom-right": "bottom:1.5rem;right:1.5rem;flex-direction:column-reverse" };
  var D = /* @__PURE__ */ new Map();
  var z = /* @__PURE__ */ new Map();
  var he = 0;
  function be(i) {
    if (typeof document > "u") return null;
    if (D.has(i)) return D.get(i);
    let n = document.createElement("div");
    return n.id = `__tk_c_${i.replace(/-/g, "_")}`, n.setAttribute("style", "position:fixed;z-index:9999;display:flex;gap:10px;pointer-events:none;" + (re[i] || re["bottom-right"])), document.body.appendChild(n), D.set(i, n), n;
  }
  function x(i) {
    let n = z.get(i);
    if (!n) return;
    clearTimeout(n.timer);
    let r = n.el;
    r.style.opacity = "0", r.style.transform = "scale(0.9) translateY(6px)", r.style.maxHeight = r.offsetHeight + "px", setTimeout(() => {
      r.style.transition = "all 0.32s ease-out", r.style.maxHeight = "0", r.style.padding = "0", r.style.margin = "0", r.style.overflow = "hidden";
    }, 60), setTimeout(() => {
      r.remove(), z.delete(i);
    }, 420);
  }
  function L() {
    [...z.keys()].forEach(x);
  }
  function xe() {
    return `__tk_${++he}`;
  }
  function u(i, n = {}) {
    var Z, ee;
    if (typeof document > "u") return () => {
    };
    let r = m, o = r.toast, t = { type: "success", position: r.position, duration: r.duration, sound: r.sound, dismissOnClick: r.dismissOnClick, showProgress: r.showProgress, description: null, icon: null, action: null, id: null, showIcon: void 0, showClose: void 0, ...n }, e = t.type, d = r.theme[e] || r.theme.success, a = (y) => t[y] !== void 0 ? t[y] : o[y], c = a("bg"), s = a("color"), l = a("descColor"), f = a("borderColor"), p = a("borderWidth"), P = a("borderRadius"), H = a("shadow"), F = a("padding"), O = a("width"), h = a("fontSize"), M = a("fontWeight"), $ = a("descFontSize"), S = a("descFontWeight"), w = a("closeColor"), B = a("closeHoverColor"), v = a("progressH"), ne = a("progressRadius"), ie = t.progressColor || d.bg, se = t.iconBg || d.light, ae = t.iconColor || d.bg, q = a("iconSize"), de = a("iconRadius"), ce = t.actionColor || d.bg, le = a("actionFontSize"), fe = t.icon || g[e] || g.success, j = t.id || xe(), pe = t.showIcon !== void 0 ? t.showIcon : o.showIcon !== void 0 ? o.showIcon : true, me = t.showClose !== void 0 ? t.showClose : o.showClose !== void 0 ? o.showClose : true, J = !!(t.description || t.action), ue = J ? "align-items:flex-start" : "align-items:center", ge = J ? "padding-top:2px" : "";
    t.sound && C(e);
    let Q = be(t.position);
    if (!Q) return () => {
    };
    z.size >= r.maxToasts && x(z.keys().next().value);
    let b = document.createElement("div");
    b.id = j, b.setAttribute("style", ["pointer-events:auto", "position:relative", "overflow:hidden", "display:flex", ue, "gap:12px", `width:${O}`, `background:${c}`, `border:${p} solid ${f}`, `padding:${F}`, `border-radius:${P}`, `box-shadow:${H}`, "transition:all 0.38s cubic-bezier(0.34,1.56,0.64,1)", "opacity:0", "transform:scale(0.9) translateY(10px)", `cursor:${t.dismissOnClick ? "pointer" : "default"}`, "box-sizing:border-box"].join(";")), b.innerHTML = `
    ${pe ? `<div style="display:flex;align-items:center;justify-content:center;width:${q};height:${q};min-width:${q};border-radius:${de};background:${se};color:${ae};flex-shrink:0">
      <div style="width:16px;height:16px;display:flex">${fe}</div>
    </div>` : ""}
    <div style="flex:1;min-width:0;${ge}">
      <p style="font-size:${h};font-weight:${M};color:${s};line-height:1.4;margin:0">${i}</p>
      ${t.description ? `<p style="font-size:${$};font-weight:${S};color:${l};margin:3px 0 0;line-height:1.5">${t.description}</p>` : ""}
      ${t.action ? `<button data-tk-action style="margin-top:7px;font-size:${le};font-weight:700;color:${ce};background:none;border:none;cursor:pointer;padding:0;display:block;line-height:1">${t.action.label}</button>` : ""}
    </div>
    ${me ? `<button data-tk-close
      style="flex-shrink:0;background:none;border:none;cursor:pointer;color:${w};padding:2px;line-height:0;border-radius:4px;transition:color 0.15s"
      title="Dismiss"
      onmouseenter="this.style.color='${B}'"
      onmouseleave="this.style.color='${w}'"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>` : ""}
    ${t.showProgress && t.duration > 0 ? `<div data-tk-bar style="position:absolute;bottom:0;left:0;height:${v};border-radius:${ne};background:${ie};width:100%;transition:width ${t.duration}ms linear"></div>` : ""}
  `.trim(), Q.appendChild(b), requestAnimationFrame(() => requestAnimationFrame(() => {
      if (b.style.opacity = "1", b.style.transform = "scale(1) translateY(0)", t.showProgress && t.duration > 0) {
        let y = b.querySelector("[data-tk-bar]");
        y && (y.style.width = "0%");
      }
    }));
    let T = () => x(j), I = null;
    return t.duration > 0 && (I = setTimeout(T, t.duration)), b.addEventListener("mouseenter", () => clearTimeout(I)), b.addEventListener("mouseleave", () => {
      t.duration > 0 && (I = setTimeout(T, Math.min(t.duration, 1500)));
    }), (Z = b.querySelector("[data-tk-close]")) == null || Z.addEventListener("click", (y) => {
      y.stopPropagation(), T();
    }), t.dismissOnClick && b.addEventListener("click", T), (ee = b.querySelector("[data-tk-action]")) == null || ee.addEventListener("click", (y) => {
      var R, oe;
      y.stopPropagation(), (oe = (R = t.action) == null ? void 0 : R.onClick) == null || oe.call(R), T();
    }), z.set(j, { el: b, timer: I }), T;
  }
  var ye = 0;
  function E(i, n = {}, r = {}) {
    let { loading: o = "Loading\u2026", success: t = "Done!", error: e = "Something went wrong" } = n, d = `__tk_p${++ye}`;
    return u(o, { type: "info", duration: 0, icon: g.loading, sound: false, id: d, ...r }), Promise.resolve(i).then((a) => {
      x(d);
      let c = typeof t == "function" ? t(a) : t;
      u(c, { type: "success", ...r });
    }).catch((a) => {
      x(d);
      let c = typeof e == "function" ? e(a) : e;
      u(c, { type: "error", ...r });
    }), () => x(d);
  }
  function V(i, n, r, o) {
    let t = n.getBoundingClientRect(), e = i.getBoundingClientRect(), d = window.scrollX, a = window.scrollY, c, s;
    switch (r) {
      case "bottom":
        c = t.bottom + a + o, s = t.left + d + t.width / 2 - e.width / 2;
        break;
      case "left":
        c = t.top + a + t.height / 2 - e.height / 2, s = t.left + d - e.width - o;
        break;
      case "right":
        c = t.top + a + t.height / 2 - e.height / 2, s = t.right + d + o;
        break;
      default:
        c = t.top + a - e.height - o, s = t.left + d + t.width / 2 - e.width / 2;
    }
    i.style.top = `${c}px`, i.style.left = `${s}px`;
  }
  function U(i, n, r, o, t) {
    let e = n / 2, d = t && t !== "0px" ? t : "0px", a = o || "transparent", c = d !== "0px", s = "";
    if (c) {
      let f = `${d} solid ${a}`, p = `${d} solid transparent`;
      switch (i) {
        case "top":
          s = `border-top:${p};border-right:${f};border-bottom:${f};border-left:${p};`;
          break;
        case "bottom":
          s = `border-top:${f};border-right:${p};border-bottom:${p};border-left:${f};`;
          break;
        case "left":
          s = `border-top:${f};border-right:${f};border-bottom:${p};border-left:${p};`;
          break;
        case "right":
          s = `border-top:${p};border-right:${p};border-bottom:${f};border-left:${f};`;
          break;
      }
    }
    let l = `${s}position:absolute;width:${n}px;height:${n}px;background:${r};transform:rotate(45deg);`;
    switch (i) {
      case "bottom":
        return `${l}top:${-e}px;left:50%;margin-left:${-e}px`;
      case "left":
        return `${l}top:50%;right:${-e}px;margin-top:${-e}px`;
      case "right":
        return `${l}top:50%;left:${-e}px;margin-top:${-e}px`;
      default:
        return `${l}bottom:${-e}px;left:50%;margin-left:${-e}px`;
    }
  }
  function X(i) {
    switch (i) {
      case "bottom":
        return "scale(0.88) translateY(-8px)";
      case "left":
        return "scale(0.88) translateX(8px)";
      case "right":
        return "scale(0.88) translateX(-8px)";
      default:
        return "scale(0.88) translateY(8px)";
    }
  }
  function K(i) {
    switch (i) {
      case "bottom":
        return "scale(0.9) translateY(-4px)";
      case "left":
        return "scale(0.9) translateX(4px)";
      case "right":
        return "scale(0.9) translateX(-4px)";
      default:
        return "scale(0.9) translateY(4px)";
    }
  }
  var N = /* @__PURE__ */ new WeakMap();
  function A(i, n, r = {}) {
    if (typeof document > "u" || !n) return () => {
    };
    let o = { type: "success", duration: 2500, sound: m.sound, icon: null, ...m.anchored, ...r }, t = m.theme[o.type] || m.theme.success, e = o.icon || g[o.type], d = o.position;
    o.sound && C(o.type);
    let a = N.get(n);
    a && a();
    let c = o.showIcon !== void 0 ? o.showIcon : true, s = document.createElement("div");
    s.setAttribute("style", ["position:absolute", "z-index:9998", `padding:${o.padding}`, `background:${o.bg}`, `color:${o.color}`, `font-size:${o.fontSize}`, `font-weight:${o.fontWeight}`, `border-radius:${o.borderRadius}`, `border:${o.borderWidth} solid ${o.borderColor}`, `box-shadow:${o.shadow}`, "pointer-events:none", "white-space:nowrap", "transition:opacity 0.3s ease,transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", "opacity:0", `transform:${X(d)}`].join(";")), s.innerHTML = `
    <div style="display:flex;align-items:center;gap:7px">
      ${c ? `<div style="width:15px;height:15px;display:flex;flex-shrink:0;color:${t.bg}">${e}</div>` : ""}
      <span>${i}</span>
    </div>
    ${o.showArrow ? `<div style="${U(d, o.arrowSize, o.bg, o.borderColor, o.borderWidth)}"></div>` : ""}
  `.trim(), document.body.appendChild(s), V(s, n, d, o.gap), requestAnimationFrame(() => requestAnimationFrame(() => {
      s.style.opacity = "1", s.style.transform = "scale(1) translate(0,0)";
    }));
    let l = () => {
      N.delete(n), s.style.opacity = "0", s.style.transform = K(d), setTimeout(() => s.remove(), 300);
    };
    return N.set(n, l), o.duration > 0 && setTimeout(l, o.duration), l;
  }
  var G = /* @__PURE__ */ new WeakMap();
  function _(i, n, r, o, t = {}) {
    if (typeof document > "u" || !n) return;
    let e = { confirmLabel: "Yes", cancelLabel: "No", sound: m.sound, ...m.anchoredConfirm, ...t }, d = e.position;
    e.sound && C("warning");
    let a = G.get(n);
    a && a();
    let c = e.showIcon !== void 0 ? e.showIcon : true, s = document.createElement("div");
    s.setAttribute("style", ["position:absolute", "z-index:9998", `padding:${e.padding}`, `background:${e.bg}`, `color:${e.color}`, `font-size:${e.fontSize}`, `border-radius:${e.borderRadius}`, `border:${e.borderWidth} solid ${e.borderColor}`, `box-shadow:${e.shadow}`, `min-width:${e.minWidth}`, "pointer-events:auto", "transition:opacity 0.3s ease,transform 0.3s cubic-bezier(0.34,1.56,0.64,1)", "opacity:0", `transform:${X(d)}`].join(";")), s.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      ${c ? `<div style="width:15px;height:15px;flex-shrink:0;color:#fca5a5">${g.warning}</div>` : ""}
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
    ${e.showArrow ? `<div style="${U(d, e.arrowSize, e.bg, e.borderColor, e.borderWidth)}"></div>` : ""}
  `.trim(), document.body.appendChild(s), V(s, n, d, e.gap), requestAnimationFrame(() => requestAnimationFrame(() => {
      s.style.opacity = "1", s.style.transform = "scale(1) translate(0,0)";
    }));
    let l = () => {
      G.delete(n), s.style.opacity = "0", s.style.transform = K(d), setTimeout(() => s.remove(), 280);
    };
    G.set(n, l);
    let f = s.querySelector("[data-confirm]"), p = s.querySelector("[data-cancel]");
    f.addEventListener("mouseenter", () => {
      f.style.background = e.confirmHoverBg;
    }), f.addEventListener("mouseleave", () => {
      f.style.background = e.confirmBg;
    }), p.addEventListener("mouseenter", () => {
      p.style.background = e.cancelHoverBg;
    }), p.addEventListener("mouseleave", () => {
      p.style.background = e.cancelBg;
    }), f.onclick = () => {
      l(), r == null || r();
    }, p.onclick = () => {
      l(), o == null || o();
    };
  }
  function W(i, n, r = {}) {
    return new Promise((o) => {
      if (typeof document > "u") return o(false);
      let e = { ...m.modal, confirmLabel: "Confirm", cancelLabel: "Cancel", confirmVariant: "danger", icon: null, sound: m.sound, ...r }, d = e.position === "top", a = d ? "flex-start" : "center", c = d ? "padding:5vh 16px 16px" : "padding:16px";
      e.sound && C("warning");
      let s = e.confirmVariant !== "primary", l = e.confirmBg || (s ? "#ef4444" : "#3b82f6"), f = e.confirmHoverBg || (s ? "#dc2626" : "#2563eb"), p = e.iconColor || (s ? "#ef4444" : "#3b82f6"), P = e.iconBg || (s ? "#fee2e2" : "#dbeafe"), H = e.icon || g.warning, F = e.padding.trim().split(/\s+/), O = F[1] || F[0], h = document.createElement("div");
      h.setAttribute("style", ["position:fixed", "inset:0", "z-index:99999", "display:flex", `align-items:${a}`, "justify-content:center", c, `background:${e.overlayBg}`, `backdrop-filter:blur(${e.overlayBlur})`, "-webkit-backdrop-filter:blur(" + e.overlayBlur + ")", "transition:opacity 0.25s ease", "opacity:0"].join(";")), h.innerHTML = `
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
    `.trim(), document.body.appendChild(h);
      let M = h.querySelector("[data-mb]"), $ = h.querySelector("[data-mok]"), S = h.querySelector("[data-mc]");
      $.addEventListener("mouseenter", () => {
        $.style.background = f, $.style.transform = "translateY(-1px)";
      }), $.addEventListener("mouseleave", () => {
        $.style.background = l, $.style.transform = "";
      }), S.addEventListener("mouseenter", () => {
        S.style.background = e.cancelHoverBg;
      }), S.addEventListener("mouseleave", () => {
        S.style.background = e.cancelBg;
      }), requestAnimationFrame(() => {
        h.style.opacity = "1", M.style.transform = "scale(1) translateY(0)";
      });
      let w = (v) => {
        h.style.opacity = "0", M.style.transform = "scale(0.9) translateY(16px)", setTimeout(() => {
          h.remove(), o(v);
        }, 280);
      };
      S.onclick = () => w(false), $.onclick = () => w(true), h.addEventListener("click", (v) => {
        v.target === h && w(false);
      });
      let B = (v) => {
        v.key === "Escape" && (w(false), document.removeEventListener("keydown", B)), v.key === "Enter" && (w(true), document.removeEventListener("keydown", B));
      };
      document.addEventListener("keydown", B);
    });
  }
  var we = { success: (i, n) => u(i, { type: "success", ...n }), error: (i, n) => u(i, { type: "error", ...n }), warning: (i, n) => u(i, { type: "warning", ...n }), info: (i, n) => u(i, { type: "info", ...n }), notify: u, promise: E, anchored: A, anchoredConfirm: _, modal: W, dismiss: x, dismissAll: L, configure: Y, ICONS: g };
  var ao = we;

  // src/task-manager/notifications/toast-anchor.js
  var DARK_STUDIO = {
    position: "bottom-right",
    toast: {
      bg: "#121c27",
      color: "#f3f6f8",
      descColor: "#bac4ce",
      borderColor: "#344657",
      borderWidth: "1px",
      borderRadius: "8px",
      shadow: "0 30px 90px rgba(0, 0, 0, 0.52)",
      width: "min(400px, calc(100vw - 36px))"
    },
    modal: {
      overlayBg: "rgba(10, 16, 23, 0.78)",
      overlayBlur: "5px",
      bg: "#182431",
      borderColor: "#344657",
      borderWidth: "1px",
      borderRadius: "8px",
      shadow: "0 30px 90px rgba(0, 0, 0, 0.62)",
      titleColor: "#f3f6f8",
      messageColor: "#bac4ce",
      footerBg: "#121c27",
      footerBorder: "#253342",
      cancelColor: "#bac4ce",
      cancelHoverBg: "#1b2937"
    },
    theme: {
      success: { bg: "#58d392", light: "rgba(88, 211, 146, 0.16)" },
      error: { bg: "#ff7373", light: "rgba(255, 115, 115, 0.16)" },
      warning: { bg: "#f2bf59", light: "rgba(242, 191, 89, 0.16)" },
      info: { bg: "#62a7ff", light: "rgba(98, 167, 255, 0.16)" }
    }
  };
  ao.configure(DARK_STUDIO);
  function notifySuccess(message) {
    return ao.success(message);
  }
  function notifyError(message) {
    return ao.error(message);
  }
  function notifyInfo(message) {
    return ao.info(message);
  }
  function confirmAction(title, message, options = {}) {
    return ao.modal(title, message, {
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      confirmVariant: "danger",
      ...options
    });
  }

  // src/task-manager/state/tag-actions.js
  var tagActions = {
    computed: {
      tagCatalog() {
        return [...this.tags].sort((a, b) => a.name.localeCompare(b.name, "es"));
      },
      visibleTags() {
        const query = this.normalizeSearchText(this.tagSearchQuery);
        return this.tagCatalog.filter((tag) => !query || this.normalizeSearchText(`${tag.name} ${tag.description}`).includes(query));
      }
    },
    methods: {
      tagColor(name) {
        const colorId = this.tags.find((tag) => tag.name === name)?.color || "blue";
        return this.colors.find((color) => color.id === colorId)?.hex || this.colors[0].hex;
      },
      colorHex(color) {
        return this.colors.find((item) => item.id === color)?.hex || this.colors[0].hex;
      },
      openCreateTag() {
        this.tagFormMode = "create";
        this.editingTagName = "";
        this.tagDraft = this.emptyTagDraft();
        this.tagFormError = "";
      },
      openEditTag(tag) {
        this.tagFormMode = "edit";
        this.editingTagName = tag.name;
        this.tagDraft = { name: tag.name, description: tag.description || "", color: tag.color || "blue" };
        this.tagFormError = "";
      },
      closeTagForm() {
        this.tagFormMode = "";
        this.editingTagName = "";
        this.tagFormError = "";
      },
      async saveTag() {
        const name = this.tagDraft.name.trim().replace(/\s+/g, " ");
        if (!name) {
          this.tagFormError = "El nombre es obligatorio.";
          return;
        }
        const original = this.editingTagName;
        const key = `tag-save:${original || name}`;
        const tag = {
          name,
          description: this.tagDraft.description.trim(),
          color: this.tagDraft.color
        };
        const result = await this.mutate(key, () => original ? updateTag(original, tag) : createTag(tag), original ? "Etiqueta actualizada." : "Etiqueta creada.");
        if (result) {
          if (original && original !== name) {
            this.advancedTags = this.advancedTags.map((tag2) => tag2 === original ? name : tag2);
            if (this.quickTagFilter === original) this.quickTagFilter = name;
          }
          this.closeTagForm();
        }
      },
      async requestDeleteTag(tag) {
        if (!tag) return;
        const affectedCount = this.mappedTasks.filter((task) => task.chips.some((name) => this.sameTagName(name, tag.name))).length;
        const confirmed = await confirmAction(
          "Eliminar etiqueta",
          `Vas a eliminar \u201C${tag.name}\u201D de ${affectedCount} ${affectedCount === 1 ? "tarea" : "tareas"}.`
        );
        if (confirmed) await this.deleteTag(tag);
      },
      async deleteTag(tag) {
        if (!tag) return;
        const result = await this.mutate(`tag-delete:${tag.name}`, () => deleteTag(tag.name), "Etiqueta eliminada.");
        if (result) {
          this.advancedTags = this.advancedTags.filter((name) => name !== tag.name);
          if (this.quickTagFilter === tag.name) this.quickTagFilter = "";
        }
      }
    }
  };

  // src/shared/tasks/task-model.js
  var STATUS_LABELS = {
    open: "Pendiente",
    in_progress: "En curso",
    done: "Hecha",
    blocked: "Bloqueada"
  };
  var PRIORITY_LABELS = ["Cr\xEDtica", "Alta", "Media", "Baja"];
  var statusLabel = (status) => STATUS_LABELS[status] || status || "Sin estado";
  var priorityLabel = (priority) => PRIORITY_LABELS[Number(priority)] || "Sin prioridad";
  var statusBadgeClass = (status) => ({
    open: "tk-badge--warning",
    in_progress: "tk-badge--info",
    done: "tk-badge--success",
    blocked: "tk-badge--danger"
  })[status] || "tk-badge--neutral";
  function mapTask(task = {}) {
    const chips = Array.isArray(task.tags) ? task.tags : Array.isArray(task.chips) ? task.chips : [];
    const parentId = task.parent_id || task.parentId || null;
    const epic = chips.some((tag) => tag.toLocaleLowerCase("es") === "epic");
    const { parent_id: _parentId, tags: _tags, blockers = [], dependents = [], comments = [], ...rest } = task;
    return {
      ...rest,
      id: task.id || "",
      title: task.title || "",
      description: task.description || "",
      priority: String(task.priority ?? 2),
      status: task.status || "open",
      parentId,
      chips,
      kind: epic ? "epic" : parentId ? "subtask" : "task",
      type: epic ? "\xC9pica" : parentId ? "Subtarea" : "Tarea",
      icon: epic ? "E" : parentId ? "S" : "T",
      blockers: blockers.map((blocker) => mapRelation(blocker, "parent_id")),
      dependents: dependents.map((dependent) => mapRelation(dependent, "child_id")),
      comments: comments.map(mapComment)
    };
  }
  function mapRelation(relation, fallbackId) {
    if (typeof relation === "string") return { id: relation, title: "" };
    return { id: relation?.id || relation?.[fallbackId] || "", title: relation?.title || "" };
  }
  function mapComment(comment) {
    if (typeof comment === "string") return { body: comment, author: "", createdAt: "" };
    return {
      body: comment?.body || comment?.text || "",
      author: comment?.author || "",
      createdAt: comment?.created_at || comment?.createdAt || ""
    };
  }

  // src/task-manager/state/task-actions.js
  var taskActions = {
    methods: {
      /**
       * Sustituye el workspace solo si esta sigue siendo la recarga mas reciente.
       *
       * @param {string} [preferredId] Seleccion que se intenta conservar.
       * @returns {Promise<boolean|null>} `true` si confirma, `false` si falla y
       * `null` si una recarga posterior vuelve obsoleta esta respuesta.
       */
      async reloadWorkspace(preferredId = this.selectedTaskId) {
        const requestSequence = ++this.reloadRequestSequence;
        const initial = this.loading;
        if (!initial) this.refreshing = true;
        this.errorMessage = "";
        try {
          const [rawTasks, tags] = await Promise.all([
            listTasks(),
            listTags()
          ]);
          if (!Array.isArray(rawTasks) || !Array.isArray(tags)) throw new ApiError("El servidor devolvi\xF3 datos de tareas no v\xE1lidos.");
          if (requestSequence !== this.reloadRequestSequence) return null;
          const tasks = rawTasks.map(mapTask);
          const selectedId = preferredId && tasks.some((task) => task.id === preferredId) ? preferredId : tasks[0]?.id || "";
          this.tasks = tasks;
          this.tags = tags;
          this.selectedTaskId = selectedId;
          if (this.detail?.id !== selectedId) this.detail = null;
          this.unavailable = false;
          const parentIds = [...new Set(tasks.map((task) => task.parentId).filter(Boolean))];
          const hadTreeState = this.expandedIds.length > 0 || this.collapsedIds.length > 0;
          this.expandedIds = hadTreeState ? this.expandedIds.filter((id) => parentIds.includes(id)) : parentIds;
          this.collapsedIds = this.collapsedIds.filter((id) => parentIds.includes(id));
          if (selectedId) await this.loadTaskDetail(selectedId, false);
          else this.syncEditDraft();
          return true;
        } catch (error) {
          if (requestSequence !== this.reloadRequestSequence) return null;
          this.handleError(error);
          return false;
        } finally {
          if (requestSequence === this.reloadRequestSequence) {
            this.loading = false;
            this.refreshing = false;
          }
        }
      },
      async loadTaskDetail(id, openOnMobile = true) {
        if (!id || this.isBusy(`detail:${id}`)) return;
        const requestSequence = ++this.detailRequestSequence;
        this.selectedTaskId = id;
        if (this.detail?.id !== id) this.detail = null;
        this.setBusy(`detail:${id}`, true);
        this.errorMessage = "";
        try {
          const detail = await showTask(id);
          if (requestSequence !== this.detailRequestSequence || this.selectedTaskId !== id) return;
          this.detail = mapTask(detail);
          this.syncEditDraft();
          this.isMobileInspectorOpen = openOnMobile;
        } catch (error) {
          if (requestSequence !== this.detailRequestSequence || this.selectedTaskId !== id) return;
          this.handleError(error);
        } finally {
          this.setBusy(`detail:${id}`, false);
        }
      },
      /**
       * Ejecuta una escritura sin optimismo y recarga el estado confirmado. Una
       * escritura puede estar confirmada aunque la recarga posterior falle; ese
       * caso se conserva como error explicito para evitar reintentos a ciegas.
       *
       * @param {string} key Clave compartida con los controles que consultan busy.
       * @param {() => Promise<*>} request Escritura HTTP diferida.
       * @param {string} message Confirmacion que se muestra tras recargar.
       * @param {string} [preferredId] Seleccion deseada despues de la escritura.
       * @param {{ useResultId?: boolean }} [options]
       * @returns {Promise<*|null>} Respuesta de escritura o `null` si no se ejecuto.
       */
      async mutate(key, request, message, preferredId = this.selectedTaskId, options = {}) {
        if (this.isBusy(key)) return null;
        this.setBusy(key, true);
        this.errorMessage = "";
        try {
          const result = await request();
          const nextId = options.useResultId && result?.id ? result.id : preferredId;
          const reloaded = await this.reloadWorkspace(nextId);
          if ((reloaded === true || reloaded === null) && !this.errorMessage && !this.unavailable) {
            this.showToast(message);
          }
          if (reloaded === false) {
            const reason = this.errorMessage || "No se pudo recuperar el estado actualizado.";
            this.errorMessage = `${message} La operaci\xF3n fue confirmada, pero no se pudieron actualizar los datos. ${reason}`;
          }
          return result;
        } catch (error) {
          this.handleError(error);
          return null;
        } finally {
          this.setBusy(key, false);
        }
      },
      async createTask() {
        const title = this.newTaskDraft.title.trim();
        if (!title) return;
        const result = await this.mutate("create", () => createTask({
          title,
          priority: Number(this.newTaskDraft.priority),
          description: this.newTaskDraft.description.trim(),
          tags: [...this.newTaskDraft.tags],
          parent: this.newTaskDraft.parent || void 0
        }), "Tarea creada.", "", { useResultId: true });
        if (result) {
          this.isNewTaskOpen = false;
          this.newTaskDraft = this.emptyTaskDraft();
          this.activeInspectorTab = "detail";
        }
      },
      openSubtaskDialog(parentId = this.selectedTaskId) {
        this.newTaskDraft = this.emptyTaskDraft(parentId);
        this.isNewTaskOpen = true;
        this.isInspectorMenuOpen = false;
      },
      syncEditDraft() {
        const task = this.detail;
        if (!task) {
          this.editDraft = this.emptyEditDraft();
          return;
        }
        this.editDraft = {
          title: task.title || "",
          description: task.description || "",
          notes: task.notes || "",
          assignee: task.assignee || "",
          tags: Array.isArray(task.chips) ? [...task.chips] : []
        };
      },
      openEditTask() {
        if (!this.hasSelection) return;
        this.syncEditDraft();
        this.activeInspectorTab = "edit";
        this.isInspectorMenuOpen = false;
      },
      cancelTaskEdit() {
        this.syncEditDraft();
        this.activeInspectorTab = "detail";
      },
      async saveSelectedTask() {
        const title = this.editDraft.title.trim();
        if (!title || !this.hasSelection) return;
        const result = await this.mutate(`edit:${this.selectedTaskId}`, () => updateTask(this.selectedTaskId, {
          title,
          description: this.editDraft.description.trim(),
          notes: this.editDraft.notes.trim(),
          assignee: this.editDraft.assignee.trim(),
          tags: [...this.editDraft.tags]
        }), "Cambios guardados.");
        if (result) this.activeInspectorTab = "detail";
      },
      async updateTaskField(id, field, value) {
        if (!id) return;
        if (field === "status" && value === "done") {
          await this.closeTask(id);
          return;
        }
        await this.mutate(`${field}:${id}`, () => updateTask(id, {
          [field]: field === "priority" ? Number(value) : value
        }), field === "priority" ? "Prioridad actualizada." : "Estado actualizado.", this.selectedTaskId);
      },
      async closeTask(id = this.selectedTaskId) {
        if (!id) return;
        await this.mutate(`close:${id}`, () => closeTask(id), "Tarea cerrada.", id);
        this.isInspectorMenuOpen = false;
      },
      async addDependency() {
        const parentId = this.dependencyDraft.trim();
        if (!parentId || !this.hasSelection) return;
        const result = await this.mutate(`dep-add:${this.selectedTaskId}`, () => addTaskDependency(this.selectedTaskId, parentId), "Dependencia a\xF1adida.");
        if (result) this.dependencyDraft = "";
      },
      async removeDependency(parentId) {
        if (!parentId || !this.hasSelection) return;
        await this.mutate(`dep-remove:${parentId}`, () => removeTaskDependency(this.selectedTaskId, parentId), "Dependencia retirada.");
      },
      async removeDependent(childId) {
        if (!childId || !this.hasSelection) return;
        await this.mutate(`dep-remove:${childId}`, () => removeTaskDependency(childId, this.selectedTaskId), "Dependencia retirada.");
      },
      async addComment() {
        const body = this.commentDraft.trim();
        if (!body || !this.hasSelection) return;
        const result = await this.mutate(`comment:${this.selectedTaskId}`, () => addTaskComment(this.selectedTaskId, body), "Comentario a\xF1adido.");
        if (result) this.commentDraft = "";
      },
      async copyTaskId(id = this.selectedTaskId) {
        this.isInspectorMenuOpen = false;
        try {
          await navigator.clipboard.writeText(id);
          this.showToast(`ID ${id} copiado.`);
        } catch {
          this.errorMessage = "No se pudo copiar el identificador al portapapeles.";
        }
      },
      async runTaskMenuAction(action, id) {
        this.openTaskMenuId = "";
        if (action === "copy") await this.copyTaskId(id);
        if (action === "close") await this.closeTask(id);
        if (action === "edit") {
          if (this.selectedTaskId !== id || this.detail?.id !== id) await this.loadTaskDetail(id);
          if (this.selectedTaskId === id && this.detail?.id === id) this.openEditTask();
        }
      }
    }
  };

  // src/task-manager/state/task-tree.js
  var taskTree = {
    computed: {
      mappedTasks() {
        const source = this.tasks.map((task) => ({ ...task }));
        const byId = new Map(source.map((task) => [task.id, task]));
        const childrenByParent = /* @__PURE__ */ new Map();
        for (const task of source) {
          if (!task.parentId || !byId.has(task.parentId)) continue;
          const children = childrenByParent.get(task.parentId) || [];
          children.push(task);
          childrenByParent.set(task.parentId, children);
        }
        const levelFor = (task, seen = /* @__PURE__ */ new Set()) => {
          if (!task.parentId || !byId.has(task.parentId) || seen.has(task.id)) return 1;
          seen.add(task.id);
          return levelFor(byId.get(task.parentId), seen) + 1;
        };
        return source.map((task) => ({
          ...task,
          level: levelFor(task),
          children: childrenByParent.has(task.id)
        }));
      },
      filteredTaskIds() {
        const query = this.normalizeSearchText(this.taskSearchQuery);
        return new Set(this.mappedTasks.filter(
          (task) => (this.activeTaskFilter === "all" || task.status === this.activeTaskFilter) && (!this.advancedStatuses.length || this.advancedStatuses.includes(task.status)) && (!this.advancedPriorities.length || this.advancedPriorities.includes(task.priority)) && (!this.advancedTags.length || task.chips.some((tag) => this.advancedTags.includes(tag))) && (!this.quickTagFilter || task.chips.includes(this.quickTagFilter)) && (!query || this.normalizeSearchText(`${task.id} ${task.title} ${task.chips.join(" ")}`).includes(query))
        ).map((task) => task.id));
      },
      visibleTasks() {
        const byId = new Map(this.mappedTasks.map((task) => [task.id, task]));
        const childrenByParent = /* @__PURE__ */ new Map();
        const roots = [];
        for (const task of this.mappedTasks) {
          if (task.parentId && byId.has(task.parentId)) {
            const children = childrenByParent.get(task.parentId) || [];
            children.push(task);
            childrenByParent.set(task.parentId, children);
          } else {
            roots.push(task);
          }
        }
        const hasFilter = this.activeTaskFilter !== "all" || this.advancedStatuses.length || this.advancedPriorities.length || this.advancedTags.length || this.quickTagFilter || this.taskSearchQuery.trim();
        const reachable = /* @__PURE__ */ new Set();
        const markReachable = (task) => {
          if (reachable.has(task.id)) return;
          reachable.add(task.id);
          for (const child of childrenByParent.get(task.id) || []) markReachable(child);
        };
        for (const root of roots) markReachable(root);
        for (const task of this.mappedTasks) {
          if (!reachable.has(task.id)) roots.push(task);
        }
        const rows = [];
        const visited = /* @__PURE__ */ new Set();
        const visit = (task) => {
          if (visited.has(task.id)) return;
          visited.add(task.id);
          if (this.filteredTaskIds.has(task.id)) rows.push(task);
          const canTraverse = this.expandedIds.includes(task.id) || hasFilter && !this.collapsedIds.includes(task.id);
          if (canTraverse) {
            for (const child of childrenByParent.get(task.id) || []) visit(child);
          }
        };
        for (const root of roots) visit(root);
        return rows;
      },
      selectedTask() {
        const listed = this.mappedTasks.find((task2) => task2.id === this.selectedTaskId);
        const task = this.detail || listed || {};
        return { ...mapTask(task), status: listed?.status || task.status || "open" };
      },
      hasSelection() {
        return Boolean(this.selectedTaskId && this.selectedTask.id);
      },
      activeTaskCount() {
        return this.tasks.filter((task) => task.status !== "done").length;
      },
      selectedSubtasks() {
        return this.mappedTasks.filter((task) => task.parentId === this.selectedTaskId);
      },
      hasAdvancedFilters() {
        return Boolean(this.advancedStatuses.length || this.advancedPriorities.length || this.advancedTags.length);
      },
      taskFilterProps() {
        return {
          unavailable: this.unavailable,
          errorMessage: this.errorMessage,
          refreshing: this.refreshing,
          taskSearchQuery: this.taskSearchQuery,
          advancedFiltersOpen: this.isAdvancedFiltersOpen,
          hasAdvancedFilters: this.hasAdvancedFilters,
          advancedStatuses: this.advancedStatuses,
          advancedPriorities: this.advancedPriorities,
          advancedTags: this.advancedTags,
          tagCatalog: this.tagCatalog,
          activeTaskFilter: this.activeTaskFilter,
          quickTagFilter: this.quickTagFilter,
          taskChipsVisible: this.areTaskChipsVisible,
          visibleCount: this.visibleTasks.length,
          listMenuOpen: this.isListMenuOpen,
          tagColor: this.tagColor
        };
      }
    },
    methods: {
      toggleExpanded(id) {
        if (this.expandedIds.includes(id)) {
          this.expandedIds = this.expandedIds.filter((item) => item !== id);
          if (!this.collapsedIds.includes(id)) this.collapsedIds = [...this.collapsedIds, id];
          return;
        }
        this.expandedIds = [...this.expandedIds, id];
        this.collapsedIds = this.collapsedIds.filter((item) => item !== id);
      },
      setAllExpanded(expanded) {
        const parentIds = this.mappedTasks.filter((task) => task.children).map((task) => task.id);
        this.expandedIds = expanded ? parentIds : [];
        this.collapsedIds = expanded ? [] : parentIds;
        this.isListMenuOpen = false;
      },
      clearAdvancedFilters() {
        this.advancedStatuses = [];
        this.advancedPriorities = [];
        this.advancedTags = [];
      }
    }
  };

  // src/task-manager/state/workspace-data.js
  function createClientId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  var COLORS = [
    { id: "blue", hex: "#62a7ff" },
    { id: "purple", hex: "#b58bff" },
    { id: "green", hex: "#58d392" },
    { id: "yellow", hex: "#f2bf59" },
    { id: "orange", hex: "#ff9a55" },
    { id: "red", hex: "#ff7373" }
  ];
  var workspaceData = {
    data() {
      return {
        clientId: createClientId(),
        tasks: [],
        tags: [],
        detail: null,
        selectedTaskId: "",
        colors: COLORS,
        loading: true,
        refreshing: false,
        unavailable: false,
        errorMessage: "",
        busy: {},
        activeInspectorTab: "detail",
        activeTaskFilter: "all",
        taskSearchQuery: "",
        quickTagFilter: "",
        advancedStatuses: [],
        advancedPriorities: [],
        advancedTags: [],
        isAdvancedFiltersOpen: false,
        areTaskChipsVisible: true,
        expandedIds: [],
        collapsedIds: [],
        isListMenuOpen: false,
        openTaskMenuId: "",
        isInspectorMenuOpen: false,
        isMobileInspectorOpen: false,
        isNewTaskOpen: false,
        isTagManagerOpen: false,
        newTaskDraft: { title: "", description: "", priority: "2", parent: "", tags: [] },
        editDraft: { title: "", description: "", notes: "", assignee: "", tags: [] },
        dependencyDraft: "",
        commentDraft: "",
        tagSearchQuery: "",
        tagFormMode: "",
        editingTagName: "",
        tagDraft: { name: "", description: "", color: "blue" },
        tagFormError: "",
        detailRequestSequence: 0,
        reloadRequestSequence: 0,
        workspaceEventSource: null
      };
    },
    methods: {
      emptyTaskDraft(parent = "") {
        return { title: "", description: "", priority: "2", parent, tags: [] };
      },
      emptyEditDraft() {
        return { title: "", description: "", notes: "", assignee: "", tags: [] };
      },
      emptyTagDraft() {
        return { name: "", description: "", color: "blue" };
      }
    }
  };

  // src/task-manager/state/ui.js
  var workspaceUi = {
    methods: {
      handleError(error) {
        if (error?.unavailable) {
          this.unavailable = true;
          this.errorMessage = "";
        } else {
          this.errorMessage = error?.message || "No se pudo completar la operaci\xF3n.";
          notifyError(this.errorMessage);
        }
      },
      setBusy(key, value) {
        const next = { ...this.busy };
        if (value) next[key] = true;
        else delete next[key];
        this.busy = next;
      },
      isBusy(key) {
        return Boolean(this.busy[key]);
      },
      showToast(message) {
        notifySuccess(message);
      },
      showWorkspaceChangeToast(changes = []) {
        if (!Array.isArray(changes) || !changes.length) {
          notifyInfo("Cambios externos detectados. No se pudo identificar la tarea. La lista se ha recargado.");
          return;
        }
        changes.forEach((change) => {
          notifyInfo(`Tarea ${change.id} ${change.action}: \u201C${change.title}\u201D. La lista se ha recargado.`);
        });
      },
      normalizeSearchText(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
      },
      sameTagName(left, right) {
        return String(left || "").normalize("NFC").trim().localeCompare(String(right || "").normalize("NFC").trim(), "es", { sensitivity: "accent" }) === 0;
      },
      statusLabel(status) {
        return statusLabel(status);
      },
      priorityLabel(priority) {
        return priorityLabel(priority);
      },
      statusBadgeClass(status) {
        return statusBadgeClass(status);
      },
      toggleTaskMenu(id) {
        this.openTaskMenuId = this.openTaskMenuId === id ? "" : id;
        this.isListMenuOpen = false;
        this.isInspectorMenuOpen = false;
      },
      handleWorkspaceClick() {
        this.isListMenuOpen = false;
        this.openTaskMenuId = "";
        this.isInspectorMenuOpen = false;
      },
      handleEscape(event) {
        if (event.key !== "Escape") return;
        this.isListMenuOpen = false;
        this.openTaskMenuId = "";
        this.isInspectorMenuOpen = false;
        this.isAdvancedFiltersOpen = false;
        this.isNewTaskOpen = false;
        this.isTagManagerOpen = false;
      }
    }
  };

  // src/task-manager/state/workspace.js
  var workspaceOptions = {
    name: "AppShell",
    mixins: [
      workspaceData,
      workspaceUi,
      taskTree,
      taskActions,
      tagActions,
      inspectorState
    ],
    mounted() {
      window.addEventListener("keydown", this.handleEscape);
      setClientId(this.clientId);
      this.connectWorkspaceEvents();
      this.reloadWorkspace();
    },
    beforeUnmount() {
      window.removeEventListener("keydown", this.handleEscape);
      this.disconnectWorkspaceEvents();
    },
    methods: {
      connectWorkspaceEvents() {
        if (typeof EventSource === "undefined") return;
        this.disconnectWorkspaceEvents();
        const source = new EventSource(`/api/events?clientId=${encodeURIComponent(this.clientId)}`);
        source.addEventListener("workspace.changed", (event) => {
          let change;
          try {
            change = JSON.parse(event.data);
          } catch {
            return;
          }
          this.reloadWorkspace();
          const isExternal = change.resource === "tasks" && change.source === "external";
          const isRemoteHttp = change.resource === "tasks" && change.source === "http" && change.originClientId && change.originClientId !== this.clientId;
          if (isExternal || isRemoteHttp) {
            this.showWorkspaceChangeToast?.(change.changes || []);
          }
        });
        this.workspaceEventSource = source;
      },
      disconnectWorkspaceEvents() {
        this.workspaceEventSource?.close();
        this.workspaceEventSource = null;
      }
    }
  };

  // src/task-manager/components/dialog-focus.js
  var FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    'input:not([disabled]):not([type="hidden"])',
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");
  function isVisible(element) {
    return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }
  var dialogFocus = {
    data() {
      return { focusReturnTarget: null };
    },
    watch: {
      open(value) {
        if (value) this.enterDialog();
        else this.exitDialog();
      }
    },
    mounted() {
      if (this.open) this.enterDialog();
    },
    beforeUnmount() {
      this.exitDialog();
    },
    methods: {
      /**
       * Elemento que actua como raiz del dialogo. Los componentes marcan su
       * elemento modal con `ref="dialogRoot"`; si no lo hacen, se usa la raiz
       * del propio componente.
       */
      dialogElement() {
        return this.$refs.dialogRoot || this.$el;
      },
      focusableElements(scope = this.dialogElement()) {
        if (!scope?.querySelectorAll) return [];
        return [...scope.querySelectorAll(FOCUSABLE_SELECTOR)].filter(isVisible);
      },
      /** Entra en el dialogo guardando de donde venimos para poder volver. */
      enterDialog(scope) {
        const active = document.activeElement;
        this.focusReturnTarget = active && active !== document.body ? active : null;
        this.$nextTick(() => this.focusInside(scope));
      },
      /** Devuelve el foco al control que abrio el dialogo, si sigue en la pagina. */
      exitDialog() {
        const target = this.focusReturnTarget;
        this.focusReturnTarget = null;
        if (target?.isConnected && typeof target.focus === "function") target.focus();
      },
      /**
       * El foco entra en el contenedor del dialogo, no en su primer control.
       * Asi el lector de pantalla anuncia el dialogo por su nombre y no se abre
       * directamente sobre la "x" de cerrar.
       */
      focusInside(scope = this.dialogElement()) {
        const root = scope || this.dialogElement();
        if (root?.focus) return root.focus();
        const [first] = this.focusableElements(root);
        if (first) first.focus();
      },
      /** Mantiene el tabulador dentro del dialogo: del ultimo vuelve al primero. */
      trapDialogTab(event) {
        const scope = this.dialogElement();
        const focusables = this.focusableElements(scope);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === scope)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  };

  // src/task-manager/components/tag-manager-drawer.js
  var TagManagerDrawer = {
    name: "TagManagerDrawer",
    mixins: [dialogFocus],
    props: {
      open: { type: Boolean, required: true },
      tags: { type: Array, required: true },
      visibleTags: { type: Array, required: true },
      colors: { type: Array, required: true },
      searchQuery: { type: String, required: true },
      formMode: { type: String, required: true },
      draft: { type: Object, required: true },
      editingName: { type: String, required: true },
      formError: { type: String, required: true },
      busy: { type: Function, required: true },
      colorHex: { type: Function, required: true }
    },
    emits: ["close", "update-search", "open-create", "open-edit", "request-delete", "update-draft", "close-form", "save"],
    methods: {
      update(field, value) {
        this.$emit("update-draft", { ...this.draft, [field]: value });
      }
    },
    template: `
    <section v-show="open" class="tag-manager-layer is-open" @click.self="$emit('close')">
  <aside class="tag-manager-drawer" ref="dialogRoot" tabindex="-1" @keydown.tab="trapDialogTab" role="dialog" aria-modal="true" aria-labelledby="tag-manager-title">
    <header class="tag-manager-header">
      <div>
        <h2 id="tag-manager-title">Gestor de etiquetas</h2>
        <p>Cat\xE1logo compartido de Tacks</p>
      </div><button class="tk-icon-button" type="button" aria-label="Cerrar gestor" title="Cerrar gestor" @click="$emit('close')">\xD7</button>
    </header>
    <div class="tag-manager-body">
      <div class="tag-manager-toolbar"><input :value="searchQuery" class="tk-input" type="search"
          placeholder="Buscar etiquetas" @input="$emit('update-search', $event.target.value)" /><button
          class="tk-button tk-button--secondary" type="button" @click="$emit('open-create')">Nueva</button></div>
      <div class="tag-manager-summary"><span>{{ tags.length }}
          {{ tags.length === 1 ? 'etiqueta' : 'etiquetas' }}</span><span>A\u2013Z</span></div>
      <div class="tag-manager-list">
        <article v-for="tag in visibleTags" :key="tag.name" class="tag-manager-row"><span class="tag-manager-dot"
            :style="{ '--tag-color': colorHex(tag.color) }"></span>
          <div class="tag-manager-copy">
            <div class="tag-manager-name">{{ tag.name }}</div>
            <div v-show="tag.description" class="tag-manager-description">{{ tag.description }}</div>
          </div><span class="tag-manager-uses">{{ tag.uses || 0 }} usos</span>
          <div class="tag-manager-actions"><button class="tk-icon-button tk-icon-button--compact" type="button"
              :aria-label="'Editar ' + tag.name" :title="'Editar ' + tag.name" @click="$emit('open-edit', tag)">\u270E</button><button
              class="tk-icon-button tk-icon-button--compact" type="button" :aria-label="'Eliminar ' + tag.name"
              :title="'Eliminar ' + tag.name"
              @click="$emit('request-delete', tag)">\xD7</button></div>
        </article>
        <div v-show="!visibleTags.length" class="tag-manager-empty">No hay etiquetas que coincidan.</div>
      </div>
      <form v-show="formMode" class="tag-manager-form" @submit.prevent="$emit('save')">
        <div class="tag-manager-form-header">
          <strong>{{ formMode === 'edit' ? 'Editar etiqueta' : 'Nueva etiqueta' }}</strong><button
            class="tk-icon-button" type="button" aria-label="Cerrar formulario" title="Cerrar formulario" @click="$emit('close-form')">\xD7</button>
        </div><label class="tag-manager-field"><span class="tag-manager-label">Nombre</span><input :value="draft.name"
            class="tk-input" maxlength="40" required @input="update('name', $event.target.value)" /></label><label
          class="tag-manager-field"><span class="tag-manager-label">Descripci\xF3n</span><input :value="draft.description"
            class="tk-input" maxlength="90" @input="update('description', $event.target.value)" /></label>
        <fieldset class="tag-manager-field">
          <legend class="tag-manager-label">Color</legend>
          <div class="tag-manager-colors" role="radiogroup"><button v-for="color in colors" :key="color.id"
              class="tag-manager-color" type="button" role="radio" :aria-label="'Color ' + color.id"
              :title="'Seleccionar color ' + color.id"
              :aria-checked="draft.color === color.id" :style="{ '--tag-color': color.hex }"
              @click="update('color', color.id)"></button></div>
        </fieldset>
        <p v-show="formError" class="tag-manager-error">{{ formError }}</p>
        <div class="tag-manager-form-actions"><button class="tk-button tk-button--ghost" type="button"
            @click="$emit('close-form')">Cancelar</button><button class="tk-button tk-button--primary" type="submit"
            :disabled="busy('tag-save:' + (editingName || draft.name))">Guardar</button></div>
      </form>
    </div>
    <footer class="tag-manager-footer">Los usos proceden de las tareas reales.</footer>
  </aside>
</section>`
  };

  // src/task-manager/components/tag-picker-field.js
  var TagPickerField = {
    name: "TagPickerField",
    props: {
      modelValue: { type: Array, required: true },
      tags: { type: Array, required: true },
      colors: { type: Array, required: true },
      busy: { type: Boolean, default: false },
      wide: { type: Boolean, default: false },
      resetKey: { type: [String, Number, Boolean], default: "" }
    },
    emits: ["update:modelValue"],
    data() {
      return { open: false, search: "" };
    },
    computed: {
      availableTags() {
        const query = this.normalize(this.search);
        return this.tags.filter((tag) => !this.modelValue.includes(tag.name) && (!query || this.normalize(tag.name).includes(query)));
      }
    },
    watch: {
      resetKey() {
        this.open = false;
        this.search = "";
      }
    },
    methods: {
      normalize(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
      },
      tagColor(name) {
        const colorId = this.tags.find((tag) => tag.name === name)?.color || "blue";
        return this.colors.find((color) => color.id === colorId)?.hex || this.colors[0]?.hex;
      },
      add(name) {
        if (name && !this.modelValue.includes(name)) this.$emit("update:modelValue", [...this.modelValue, name]);
        this.search = "";
      },
      remove(name) {
        this.$emit("update:modelValue", this.modelValue.filter((tag) => tag !== name));
      },
      handleEscape(event) {
        if (event.key !== "Escape" || !this.open) return;
        this.open = false;
        event.stopPropagation();
      }
    },
    mounted() {
      window.addEventListener("keydown", this.handleEscape, true);
    },
    beforeUnmount() {
      window.removeEventListener("keydown", this.handleEscape, true);
    },
    template: `
    <label :class="['tk-field', { 'span-2': wide }]">
  <span class="tk-field__label">Etiquetas</span>
  <input class="tk-input tag-manager-source" data-tag-manager-bound="true" readonly>
  <div class="tag-manager-chip-input">
    <span v-for="tag in modelValue" :key="tag" class="tag-manager-chip"><span class="tag-manager-chip-dot"
        :style="{ '--tag-color': tagColor(tag) }"></span>{{ tag }}<button type="button" :aria-label="'Retirar ' + tag"
        :disabled="busy" @click="remove(tag)">\xD7</button></span>
    <span v-show="!modelValue.length">Sin etiquetas</span>
    <button class="tk-icon-button tk-icon-button--compact tag-manager-add" type="button" aria-label="A\xF1adir etiqueta"
      :disabled="busy" @click.stop="open = !open">+</button>
    <div v-show="open" class="tag-manager-picker" role="dialog" aria-label="Seleccionar etiqueta existente" @click.stop>
      <input v-model="search" class="tk-input tag-manager-picker-search" type="search" placeholder="Buscar etiquetas"
        aria-label="Buscar etiquetas existentes">
      <div class="tag-manager-picker-results">
        <button v-for="tag in availableTags" :key="tag.name" class="tag-manager-picker-option" type="button"
          :aria-label="'A\xF1adir ' + tag.name" @click="add(tag.name)"><span class="tag-manager-chip-dot"
            :style="{ '--tag-color': tagColor(tag.name) }"></span>{{ tag.name }}</button>
        <div v-show="!availableTags.length" class="tag-manager-picker-empty">No hay etiquetas disponibles.</div>
      </div>
    </div>
  </div>
</label>`
  };

  // src/task-manager/components/new-task-dialog.js
  var NewTaskDialog = {
    name: "NewTaskDialog",
    components: { TagPickerField },
    mixins: [dialogFocus],
    props: {
      open: { type: Boolean, required: true },
      draft: { type: Object, required: true },
      tasks: { type: Array, required: true },
      tags: { type: Array, required: true },
      colors: { type: Array, required: true },
      busy: { type: Boolean, required: true }
    },
    emits: ["close", "update-draft", "submit"],
    methods: {
      update(field, value) {
        this.$emit("update-draft", { ...this.draft, [field]: value });
      }
    },
    template: `
    <div v-show="open" class="modal-layer" role="dialog" aria-modal="true" aria-labelledby="new-task-title"
  @click.self="$emit('close')">
  <form class="tk-modal tk-modal--wide" ref="dialogRoot" tabindex="-1" @keydown.tab="trapDialogTab"
    @submit.prevent="$emit('submit')">
    <header class="tk-modal__header">
      <h2 id="new-task-title">{{ draft.parent ? 'Nueva subtarea' : 'Nueva tarea' }}</h2><button class="tk-icon-button"
        type="button" aria-label="Cerrar" @click="$emit('close')">\xD7</button>
    </header>
    <div class="tk-modal__body">
      <div class="form-grid"><label class="tk-field span-2"><span class="tk-field__label">T\xEDtulo</span><input
            :value="draft.title" class="tk-input" required
            @input="update('title', $event.target.value)" /></label><label class="tk-field"><span
            class="tk-field__label">Prioridad</span><select :value="draft.priority" class="tk-select"
            @change="update('priority', $event.target.value)">
            <option value="0">Cr\xEDtica</option>
            <option value="1">Alta</option>
            <option value="2">Media</option>
            <option value="3">Baja</option>
          </select></label><label class="tk-field"><span class="tk-field__label">Tarea padre</span><select
            :value="draft.parent" class="tk-select" @change="update('parent', $event.target.value)">
            <option value="">Sin padre</option>
            <option v-for="task in tasks" :key="task.id" :value="task.id">{{ task.id }} \xB7 {{ task.title }}</option>
          </select></label><label class="tk-field span-2"><span class="tk-field__label">Descripci\xF3n</span><textarea
            :value="draft.description" class="tk-textarea"
            @input="update('description', $event.target.value)"></textarea></label>
        <tag-picker-field :model-value="draft.tags" :tags="tags" :colors="colors" :busy="busy" :reset-key="open" wide
          @update:model-value="update('tags', $event)"></tag-picker-field>
      </div>
    </div>
    <footer class="tk-modal__footer"><button class="tk-button tk-button--ghost" type="button" :disabled="busy"
        @click="$emit('close')">Cancelar</button><button class="tk-button tk-button--primary" type="submit"
        :disabled="busy">{{ busy ? 'Creando\u2026' : 'Crear tarea' }}</button></footer>
  </form>
</div>`
  };

  // src/task-manager/components/task-filters.js
  var TaskFilters = {
    name: "TaskFilters",
    props: {
      unavailable: { type: Boolean, required: true },
      errorMessage: { type: String, required: true },
      refreshing: { type: Boolean, required: true },
      taskSearchQuery: { type: String, required: true },
      advancedFiltersOpen: { type: Boolean, required: true },
      hasAdvancedFilters: { type: Boolean, required: true },
      advancedStatuses: { type: Array, required: true },
      advancedPriorities: { type: Array, required: true },
      advancedTags: { type: Array, required: true },
      tagCatalog: { type: Array, required: true },
      activeTaskFilter: { type: String, required: true },
      quickTagFilter: { type: String, required: true },
      taskChipsVisible: { type: Boolean, required: true },
      visibleCount: { type: Number, required: true },
      listMenuOpen: { type: Boolean, required: true },
      tagColor: { type: Function, required: true }
    },
    emits: ["refresh", "dismiss-error", "update-search", "toggle-filters", "close-filters", "clear-filters", "update-statuses", "update-priorities", "update-tags", "update-quick-filter", "update-active-filter", "toggle-chips", "toggle-list-menu", "set-expanded"],
    methods: {
      toggleValue(values, value, checked, eventName) {
        this.$emit(eventName, checked ? [...values, value] : values.filter((item) => item !== value));
      }
    },
    template: `
    <div class="task-explorer__toolbar">
  <div v-show="unavailable" class="workspace-notice workspace-notice--unavailable" role="status"><strong>TK no est\xE1
      disponible</strong><span>La capacidad de tareas no est\xE1 habilitada en este anfitri\xF3n.</span><button
      class="tk-button tk-button--small tk-button--secondary" type="button"
      @click="$emit('refresh')">Reintentar</button></div>
  <div v-show="errorMessage" class="workspace-notice workspace-notice--error" role="alert"><strong>No se pudo completar
      la operaci\xF3n</strong><span>{{ errorMessage }}</span><button class="tk-icon-button tk-icon-button--compact"
      type="button" aria-label="Cerrar error" title="Cerrar error" @click="$emit('dismiss-error')">\xD7</button></div>
  <div v-show="refreshing" class="workspace-notice workspace-notice--loading" role="status"><strong>Actualizando
      datos</strong><span>Se mantiene visible el \xFAltimo estado confirmado.</span></div>
  <div class="task-search-row">
    <label><span class="sr-only">Buscar tareas</span><input :value="taskSearchQuery" class="tk-input" type="search"
        placeholder="Buscar por t\xEDtulo, ID o etiqueta" @input="$emit('update-search', $event.target.value)" /></label>
    <button class="tk-icon-button" type="button" aria-label="Filtros" title="Mostrar filtros avanzados" :aria-expanded="advancedFiltersOpen"
      @click.stop="$emit('toggle-filters')"><span class="tk-icon">\u2637</span></button>
    <div class="menu-anchor"><button class="tk-icon-button" type="button" aria-label="Opciones del listado"
        title="Opciones del listado" aria-haspopup="menu" :aria-expanded="listMenuOpen" @click.stop="$emit('toggle-list-menu')"><span
          class="tk-icon">\u22EE</span></button>
      <div v-show="listMenuOpen" class="tk-dropdown tk-dropdown--anchored is-open" role="menu" @click.stop><button
          class="tk-dropdown__item" type="button" title="Expandir todas las tareas" @click="$emit('set-expanded', true)">Expandir todo</button><button
          class="tk-dropdown__item" type="button" title="Plegar todas las tareas" @click="$emit('set-expanded', false)">Plegar todo</button></div>
    </div>
  </div>
  <section v-show="advancedFiltersOpen" class="task-filter-popover" aria-label="Filtros avanzados" @click.stop>
    <div class="task-filter-popover__header"><strong>Filtros</strong>
      <div class="task-filter-popover__actions"><button v-show="hasAdvancedFilters" class="task-filter-clear"
          type="button" title="Limpiar filtros" @click="$emit('clear-filters')"><span class="tk-icon">\u21BB</span><span>Limpiar
            filtros</span></button><button class="tk-icon-button tk-icon-button--compact" type="button"
          aria-label="Cerrar filtros" title="Cerrar filtros" @click="$emit('close-filters')">\xD7</button></div>
    </div>
    <fieldset>
      <legend>Estado</legend><label
        v-for="item in [['open', 'Pendiente'], ['in_progress', 'En curso'], ['done', 'Hecha'], ['blocked', 'Bloqueada']]"
        :key="item[0]"><input type="checkbox" :value="item[0]" :checked="advancedStatuses.includes(item[0])"
          @change="toggleValue(advancedStatuses, item[0], $event.target.checked, 'update-statuses')" />
        {{ item[1] }}</label>
    </fieldset>
    <fieldset>
      <legend>Prioridad</legend><label v-for="item in [['0', 'Cr\xEDtica'], ['1', 'Alta'], ['2', 'Media'], ['3', 'Baja']]"
        :key="item[0]"><input type="checkbox" :value="item[0]" :checked="advancedPriorities.includes(item[0])"
          @change="toggleValue(advancedPriorities, item[0], $event.target.checked, 'update-priorities')" />
        {{ item[1] }}</label>
    </fieldset>
    <fieldset>
      <legend>Etiquetas</legend><label v-for="tag in tagCatalog" :key="tag.name"
        :style="{ '--filter-option-color': tagColor(tag.name) }"><input type="checkbox" :value="tag.name"
          :checked="advancedTags.includes(tag.name)"
          @change="toggleValue(advancedTags, tag.name, $event.target.checked, 'update-tags')" /> {{ tag.name }}</label>
    </fieldset>
    <p class="task-filter-popover__summary">{{ visibleCount }} {{ visibleCount === 1 ? 'resultado' : 'resultados' }}</p>
  </section>
  <nav class="tk-tabs task-filter-tabs" aria-label="Filtros r\xE1pidos"><button
      v-for="item in [['all', 'Todas'], ['open', 'Pendientes'], ['in_progress', 'En curso'], ['blocked', 'Bloqueadas'], ['done', 'Hechas']]"
      :key="item[0]" class="tk-tab" type="button" :title="item[1]" :aria-selected="activeTaskFilter === item[0]"
      @click="$emit('update-active-filter', item[0])">{{ item[1] }}</button></nav>
  <div class="tag-manager-filter-controls"><select :value="quickTagFilter" class="tk-select tag-manager-filter"
      aria-label="Filtrar por etiqueta" @change="$emit('update-quick-filter', $event.target.value)">
      <option value="">Todas las etiquetas</option>
      <option v-for="tag in tagCatalog" :key="tag.name" :value="tag.name">{{ tag.name }}</option>
    </select><button class="tk-icon-button tk-icon-button--compact tag-manager-visibility" type="button"
      aria-label="Mostrar u ocultar etiquetas" title="Mostrar u ocultar etiquetas" :aria-pressed="taskChipsVisible"
      @click="$emit('toggle-chips')">\u25C9</button></div>
</div>`
  };

  // src/task-manager/components/overflow-menu.js
  var OverflowMenu = {
    name: "OverflowMenu",
    props: {
      open: { type: Boolean, required: true },
      items: { type: Array, required: true },
      label: { type: String, default: "M\xE1s opciones" },
      menuClass: { type: String, default: "tk-dropdown--anchored" },
      compact: { type: Boolean, default: true }
    },
    emits: ["toggle", "select"],
    template: `
    <div class="menu-anchor">
  <button :class="['tk-icon-button', { 'tk-icon-button--compact': compact }]" type="button" :aria-label="label"
    aria-haspopup="menu" :aria-expanded="open" @click.stop="$emit('toggle')">\u22EE</button>
  <div v-show="open" :class="['tk-dropdown', menuClass, 'is-open']" role="menu" @click.stop>
    <template v-for="item in items" :key="item.id">
      <div v-if="item.separatorBefore" class="tk-dropdown__separator"></div>
      <button :class="['tk-dropdown__item', { 'tk-dropdown__item--danger': item.danger }]" type="button"
        :disabled="item.disabled" @click="$emit('select', item.id)">{{ item.label }}</button>
    </template>
  </div>
</div>`
  };

  // src/task-manager/components/task-row.js
  var TaskRow = {
    name: "TaskRow",
    components: { OverflowMenu },
    props: {
      task: { type: Object, required: true },
      selected: { type: Boolean, required: true },
      expanded: { type: Boolean, required: true },
      chipsVisible: { type: Boolean, required: true },
      menuOpen: { type: Boolean, required: true },
      busy: { type: Function, required: true },
      tagColor: { type: Function, required: true }
    },
    emits: ["select", "toggle-expanded", "update-field", "toggle-menu", "menu-action"],
    computed: {
      menuItems() {
        return [
          { id: "edit", label: "Editar" },
          { id: "copy", label: "Copiar ID" },
          { id: "close", label: "Cerrar tarea", danger: true, disabled: this.task.status === "done" || this.busy(`close:${this.task.id}`) }
        ];
      }
    },
    template: `
    <article :class="['task-row', 'task-row--level-' + Math.min(task.level, 3), { 'is-selected': selected }]"
  role="treeitem" tabindex="0" :aria-level="task.level" :aria-selected="selected" @click="$emit('select', task.id)"
  @keydown.enter.self.prevent="$emit('select', task.id)" @keydown.space.self.prevent="$emit('select', task.id)">
  <button v-show="task.children" class="tree-expander" type="button" :aria-expanded="expanded"
    :aria-label="expanded ? 'Contraer subtareas' : 'Expandir subtareas'"
    @click.stop="$emit('toggle-expanded', task.id)"><span class="tk-icon"><svg viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6"></path>
      </svg></span></button>
  <button v-show="!task.children" class="tree-expander tree-expander--placeholder" type="button" disabled tabindex="-1"
    aria-hidden="true"><span class="tk-icon"><svg viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6"></path>
      </svg></span></button>
  <div :class="['task-type-icon', 'task-type-icon--' + task.kind]">{{ task.icon }}</div>
  <div class="task-row__copy">
    <div class="task-row__title">{{ task.title }}</div>
    <div class="task-row__meta"><span>{{ task.id }}</span><span>{{ task.type }}</span></div>
    <div v-show="chipsVisible" class="tag-manager-task-chips"><span v-for="tag in task.chips" :key="tag"
        class="tag-manager-chip"><span class="tag-manager-chip-dot"
          :style="{ '--tag-color': tagColor(tag) }"></span>{{ tag }}</span></div>
  </div>
  <select class="tk-select tk-select--compact tk-priority-select task-row__priority" aria-label="Prioridad"
    :value="task.priority" :disabled="busy('priority:' + task.id)" @click.stop
    @change="$emit('update-field', task.id, 'priority', $event.target.value)">
    <option value="0">Cr\xEDtica</option>
    <option value="1">Alta</option>
    <option value="2">Media</option>
    <option value="3">Baja</option>
  </select>
  <div class="task-row__meta-column"><select class="tk-select tk-select--compact" :aria-label="'Estado de ' + task.id"
      :title="task.status === 'blocked' ? 'Retira las dependencias para cambiar el estado' : ''" :value="task.status"
      :disabled="task.status === 'blocked' || busy('status:' + task.id) || busy('close:' + task.id)" @click.stop
      @change="$emit('update-field', task.id, 'status', $event.target.value)">
      <option value="open">Pendiente</option>
      <option value="in_progress">En curso</option>
      <option value="done">Hecha</option>
      <option v-show="task.status === 'blocked'" value="blocked" disabled>Bloqueada</option>
    </select></div>
  <overflow-menu class="task-row__menu" :open="menuOpen" :items="menuItems" @toggle="$emit('toggle-menu', task.id)"
    @select="$emit('menu-action', $event, task.id)"></overflow-menu>
</article>`
  };

  // src/task-manager/components/task-list.js
  var TaskList = {
    name: "TaskList",
    components: { TaskFilters, TaskRow },
    props: {
      loading: { type: Boolean, required: true },
      hasTasks: { type: Boolean, required: true },
      tasks: { type: Array, required: true },
      activeCount: { type: Number, required: true },
      selectedId: { type: String, required: true },
      expandedIds: { type: Array, required: true },
      chipsVisible: { type: Boolean, required: true },
      openMenuId: { type: String, required: true },
      busy: { type: Function, required: true },
      tagColor: { type: Function, required: true },
      filterProps: { type: Object, required: true }
    },
    emits: ["refresh", "dismiss-error", "update-search", "toggle-filters", "close-filters", "clear-filters", "update-statuses", "update-priorities", "update-tags", "update-quick-filter", "update-active-filter", "toggle-chips", "toggle-list-menu", "set-expanded", "select", "toggle-expanded", "update-field", "toggle-menu", "menu-action"],
    template: `
    <aside class="task-explorer" aria-label="Explorador de tareas">
  <task-filters v-bind="filterProps" @refresh="$emit('refresh')" @dismiss-error="$emit('dismiss-error')"
    @update-search="$emit('update-search', $event)" @toggle-filters="$emit('toggle-filters')"
    @close-filters="$emit('close-filters')" @clear-filters="$emit('clear-filters')"
    @update-statuses="$emit('update-statuses', $event)" @update-priorities="$emit('update-priorities', $event)"
    @update-tags="$emit('update-tags', $event)" @update-quick-filter="$emit('update-quick-filter', $event)"
    @update-active-filter="$emit('update-active-filter', $event)" @toggle-chips="$emit('toggle-chips')"
    @toggle-list-menu="$emit('toggle-list-menu')" @set-expanded="$emit('set-expanded', $event)"></task-filters>
  <div class="task-tree-scroll">
    <div v-show="loading" class="skeleton-stack" aria-label="Cargando tareas">
      <div class="skeleton"></div>
      <div class="skeleton skeleton--short"></div>
      <div class="skeleton"></div>
    </div>
    <div v-show="!loading" class="task-tree" role="tree">
      <task-row v-for="task in tasks" :key="task.id" :task="task" :selected="selectedId === task.id"
        :expanded="expandedIds.includes(task.id)" :chips-visible="chipsVisible" :menu-open="openMenuId === task.id"
        :busy="busy" :tag-color="tagColor" @select="$emit('select', $event)"
        @toggle-expanded="$emit('toggle-expanded', $event)"
        @update-field="(id, field, value) => $emit('update-field', id, field, value)"
        @toggle-menu="$emit('toggle-menu', $event)" @menu-action="(action, id) => $emit('menu-action', action, id)">
      </task-row>
      <div v-show="!tasks.length && !loading" class="empty-state">
        <div>
          <div class="empty-state__icon">\u2315</div>
          <h3>{{ hasTasks ? 'Sin resultados' : 'No hay tareas' }}</h3>
          <p>{{ hasTasks ? 'No hay tareas que coincidan con los filtros activos.' : 'Crea una tarea para comenzar.' }}
          </p>
        </div>
      </div>
    </div>
  </div>
  <footer class="task-explorer__footer"><span>{{ tasks.length }} elementos visibles</span><span>{{ activeCount }}
      activas</span></footer>
</aside>`
  };

  // src/shared/tasks/task-badge.js
  var TaskBadge = {
    name: "TaskBadge",
    props: {
      kind: { type: String, required: true },
      value: { type: [String, Number], required: true }
    },
    computed: {
      label() {
        return this.kind === "status" ? statusLabel(this.value) : priorityLabel(this.value);
      },
      badgeClass() {
        return this.kind === "status" ? statusBadgeClass(this.value) : `tk-priority--${this.value}`;
      }
    },
    template: `<span :class="['tk-badge', badgeClass]">{{ label }}</span>`
  };

  // src/task-manager/components/task-inspector.js
  var TaskInspector = {
    name: "TaskInspector",
    components: { OverflowMenu, TagPickerField, TaskBadge },
    props: {
      mobileOpen: { type: Boolean, required: true },
      hasSelection: { type: Boolean, required: true },
      task: { type: Object, required: true },
      activeTab: { type: String, required: true },
      menuOpen: { type: Boolean, required: true },
      busy: { type: Function, required: true },
      statusBadgeClass: { type: Function, required: true },
      statusLabel: { type: Function, required: true },
      priorityLabel: { type: Function, required: true },
      subtasks: { type: Array, required: true },
      blockers: { type: Array, required: true },
      dependents: { type: Array, required: true },
      comments: { type: Array, required: true },
      editDraft: { type: Object, required: true },
      tagCatalog: { type: Array, required: true },
      colors: { type: Array, required: true },
      dependencyDraft: { type: String, required: true },
      commentDraft: { type: String, required: true }
    },
    emits: ["update:mobileOpen", "update:activeTab", "update:editDraft", "update:dependencyDraft", "update:commentDraft", "action"],
    computed: {
      menuItems() {
        return [
          { id: "copy", label: "Copiar ID" },
          { id: "subtask", label: "Crear subtarea" },
          { id: "close", label: "Cerrar tarea", separatorBefore: true, danger: true, disabled: this.task.status === "done" || this.busy(`close:${this.task.id}`) }
        ];
      }
    },
    methods: {
      updateDraft(field, value) {
        this.$emit("update:editDraft", { ...this.editDraft, [field]: value });
      },
      emitAction(type, payload = {}) {
        this.$emit("action", { type, payload });
      },
      selectMenuAction(action) {
        if (action === "copy") this.emitAction("task.copy");
        if (action === "subtask") this.emitAction("subtask.open");
        if (action === "close") this.emitAction("task.close");
      },
      selectTab(tab) {
        if (tab === "edit") this.emitAction("edit.open");
        else this.$emit("update:activeTab", tab);
      },
      commentMeta(comment) {
        return [comment.author, comment.createdAt].filter(Boolean).join(" \xB7 ");
      }
    },
    template: `
    <section :class="['task-inspector', { 'is-mobile-open': mobileOpen }]">
  <div v-show="!hasSelection" class="empty-state inspector-empty">
    <div>
      <div class="empty-state__icon">T</div>
      <h3>Selecciona una tarea</h3>
      <p>El detalle confirmado por TK aparecer\xE1 aqu\xED.</p>
    </div>
  </div>
  <div v-show="hasSelection" class="task-inspector-content">
    <header class="task-inspector__header">
      <div class="task-inspector__heading-row">
        <div class="task-inspector__heading"><button class="task-mobile-back tk-button tk-button--ghost" type="button"
            @click="$emit('update:mobileOpen', false)">Volver a tareas</button>
          <div class="task-inspector__kicker">{{ task.id }} \xB7 {{ task.type }}</div>
          <h1 class="task-inspector__title">{{ task.title }}</h1>
          <p class="task-inspector__description">{{ task.description || 'Sin descripci\xF3n.' }}</p>
        </div>
        <div class="task-inspector__actions"><button class="tk-icon-button" type="button" title="Editar"
            aria-label="Editar tarea" @click="emitAction('edit.open')">\u270E</button>
          <overflow-menu :open="menuOpen" :items="menuItems" label="M\xE1s opciones de la tarea"
            menu-class="tk-dropdown--inspector" :compact="false" @toggle="emitAction('menu.toggle')"
            @select="selectMenuAction"></overflow-menu><task-badge kind="status" :value="task.status"></task-badge>
        </div>
      </div>
      <div class="task-property-bar"><label class="task-property-control"><span
            class="task-property-control__label">Prioridad</span><select class="tk-select" :value="task.priority"
            :disabled="busy('priority:' + task.id)"
            @change="emitAction('task.update-field', { id: task.id, field: 'priority', value: $event.target.value })">
            <option value="0">Cr\xEDtica</option>
            <option value="1">Alta</option>
            <option value="2">Media</option>
            <option value="3">Baja</option>
          </select></label><label class="task-property-control"><span
            class="task-property-control__label">Estado</span><select class="tk-select"
            :title="task.status === 'blocked' ? 'Retira las dependencias para cambiar el estado' : ''"
            :value="task.status"
            :disabled="task.status === 'blocked' || busy('status:' + task.id) || busy('close:' + task.id)"
            @change="emitAction('task.update-field', { id: task.id, field: 'status', value: $event.target.value })">
            <option value="open">Pendiente</option>
            <option value="in_progress">En curso</option>
            <option value="done">Hecha</option>
            <option v-show="task.status === 'blocked'" value="blocked" disabled>Bloqueada</option>
          </select></label>
        <div class="task-property-control"><span class="task-property-control__label">Responsable</span><span
            class="task-property-control__value">{{ task.assignee || 'Sin asignar' }}</span></div>
      </div>
    </header>
    <nav class="tk-tabs task-inspector__tabs" aria-label="Detalles de la tarea"><button
        v-for="item in [['detail', 'Detalle'], ['edit', 'Editar'], ['subtasks', 'Subtareas'], ['dependencies', 'Dependencias'], ['comments', 'Comentarios']]"
        :key="item[0]" class="tk-tab" type="button" :aria-selected="activeTab === item[0]"
        @click="selectTab(item[0])">{{ item[1] }}</button></nav>
    <div class="task-inspector__scroll">
      <div v-show="activeTab === 'detail'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Propiedades</h3>
          </header>
          <div class="tk-panel__content">
            <div class="property-grid">
              <div class="property-card">
                <div class="property-card__label">Tipo</div>
                <div class="property-card__value">{{ task.type }}</div>
              </div>
              <div class="property-card">
                <div class="property-card__label">Etiquetas</div>
                <div class="property-card__value">{{ task.chips.join(', ') || 'Sin etiquetas' }}</div>
              </div>
              <div class="property-card">
                <div class="property-card__label">Bloqueos</div>
                <div class="property-card__value">{{ blockers.length }}</div>
              </div>
              <div class="property-card">
                <div class="property-card__label">Subtareas</div>
                <div class="property-card__value">{{ subtasks.length }}</div>
              </div>
            </div>
          </div>
        </section>
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Notas</h3>
          </header>
          <div class="tk-panel__content pre-wrap">{{ task.notes || 'Sin notas.' }}</div>
        </section>
      </div>
      <div v-show="activeTab === 'edit'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Editar tarea</h3>
          </header>
          <form class="tk-panel__content form-grid" @submit.prevent="emitAction('edit.save')"><label
              class="tk-field span-2"><span class="tk-field__label">T\xEDtulo</span><input :value="editDraft.title"
                class="tk-input" required @input="updateDraft('title', $event.target.value)" /></label><label
              class="tk-field span-2"><span class="tk-field__label">Descripci\xF3n</span><textarea
                :value="editDraft.description" class="tk-textarea"
                @input="updateDraft('description', $event.target.value)"></textarea></label><label
              class="tk-field span-2"><span class="tk-field__label">Notas</span><textarea :value="editDraft.notes"
                class="tk-textarea" @input="updateDraft('notes', $event.target.value)"></textarea></label><label
              class="tk-field"><span class="tk-field__label">Responsable</span><input :value="editDraft.assignee"
                class="tk-input" placeholder="Sin asignar"
                @input="updateDraft('assignee', $event.target.value)" /></label>
            <tag-picker-field :model-value="editDraft.tags" :tags="tagCatalog" :colors="colors"
              :busy="busy('edit:' + task.id)" :reset-key="task.id + ':' + activeTab"
              @update:model-value="updateDraft('tags', $event)"></tag-picker-field>
            <div class="span-2 task-form-actions"><button class="tk-button tk-button--ghost" type="button"
                :disabled="busy('edit:' + task.id)" @click="emitAction('edit.cancel')">Cancelar</button><button
                class="tk-button tk-button--primary" type="submit"
                :disabled="busy('edit:' + task.id)">{{ busy('edit:' + task.id) ? 'Guardando\u2026' : 'Guardar cambios' }}</button>
            </div>
          </form>
        </section>
      </div>
      <div v-show="activeTab === 'subtasks'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Subtareas</h3><span></span><button class="tk-button tk-button--small tk-button--secondary" type="button"
              @click="emitAction('subtask.open')">Nueva subtarea</button>
          </header>
          <div class="tk-panel__content">
            <div class="subtask-list"><button v-for="subtask in subtasks" :key="subtask.id" class="subtask-list__item"
                type="button" @click="emitAction('task.select', { id: subtask.id })"><span
                  class="subtask-list__type">{{ subtask.icon }}</span><span class="subtask-list__copy"><span
                    class="subtask-list__title">{{ subtask.title }}</span><span
                    class="subtask-list__meta">{{ subtask.id }}</span></span><span
                  class="subtask-list__priority">{{ priorityLabel(subtask.priority) }}</span><span
                  class="subtask-list__status">{{ statusLabel(subtask.status) }}</span></button>
              <p v-show="!subtasks.length">Esta tarea no tiene subtareas.</p>
            </div>
          </div>
        </section>
      </div>
      <div v-show="activeTab === 'dependencies'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Dependencias</h3>
          </header>
          <div class="tk-panel__content">
            <form class="task-search-row" @submit.prevent="emitAction('dependency.add')"><input :value="dependencyDraft"
                class="tk-input" placeholder="ID de tarea bloqueante" required
                @input="$emit('update:dependencyDraft', $event.target.value)" /><button
                class="tk-button tk-button--secondary" type="submit"
                :disabled="busy('dep-add:' + task.id)">{{ busy('dep-add:' + task.id) ? 'A\xF1adiendo\u2026' : 'A\xF1adir' }}</button>
            </form>
            <div class="task-panel-stack">
              <h4>Bloqueada por</h4>
              <article v-for="blocker in blockers" :key="blocker.id" class="relation-row">
                <div><strong>{{ blocker.id }}</strong><span>{{ blocker.title }}</span></div><button
                  class="tk-button tk-button--small tk-button--danger" type="button"
                  :disabled="busy('dep-remove:' + blocker.id)"
                  @click="emitAction('dependency.remove-blocker', { id: blocker.id })">Retirar</button>
              </article>
              <p v-show="!blockers.length">Sin tareas bloqueantes.</p>
              <h4>Bloquea a</h4>
              <article v-for="dependent in dependents" :key="dependent.id" class="relation-row">
                <div><strong>{{ dependent.id }}</strong><span>{{ dependent.title }}</span></div><button
                  class="tk-button tk-button--small tk-button--danger" type="button"
                  :disabled="busy('dep-remove:' + dependent.id)"
                  @click="emitAction('dependency.remove-dependent', { id: dependent.id })">Retirar</button>
              </article>
              <p v-show="!dependents.length">No bloquea otras tareas.</p>
            </div>
          </div>
        </section>
      </div>
      <div v-show="activeTab === 'comments'" class="tk-panel-stack">
        <section class="tk-panel">
          <header class="tk-panel__header">
            <h3>Comentarios</h3>
          </header>
          <div class="tk-panel__content">
            <div class="comment-list">
              <article v-for="(comment, index) in comments" :key="index" class="comment-card">
                <p>{{ comment.body }}</p><span v-show="commentMeta(comment)">{{ commentMeta(comment) }}</span>
              </article>
              <p v-show="!comments.length">Sin comentarios.</p>
            </div>
            <form class="comment-form" @submit.prevent="emitAction('comment.add')"><textarea :value="commentDraft"
                class="tk-textarea" placeholder="A\xF1adir comentario" required
                @input="$emit('update:commentDraft', $event.target.value)"></textarea><button
                class="tk-button tk-button--primary" type="submit"
                :disabled="busy('comment:' + task.id)">{{ busy('comment:' + task.id) ? 'A\xF1adiendo\u2026' : 'A\xF1adir comentario' }}</button>
            </form>
          </div>
        </section>
      </div>
    </div>
  </div>
</section>`
  };

  // src/task-manager/app-shell.js
  var AppShell = {
    ...workspaceOptions,
    name: "AppShell",
    components: { NewTaskDialog, TagManagerDrawer, TaskInspector, TaskList },
    template: `
    <main class="workspace-frame" @click="handleWorkspaceClick">
  <div class="workspace-app">
    <header class="workspace-header">
      <div class="workspace-header__brand">
        <div class="brand-mark">G</div>
        <div><strong>Gestor de tareas</strong><span>Local</span></div>
      </div>
      <div class="workspace-header__actions">
        <button class="tk-icon-button" type="button" aria-label="Actualizar datos" title="Actualizar datos"
          :disabled="refreshing || loading" @click.stop="reloadWorkspace()"><span class="tk-icon"
            :class="{ 'is-spinning': refreshing }">\u21BB</span></button>
        <button class="tk-button tk-button--danger" type="button"
          :disabled="!hasSelection || selectedTask.status === 'done' || isBusy('close:' + selectedTaskId)"
          @click.stop="closeTask()">Cerrar tarea</button>
        <button class="tk-button tk-button--secondary" type="button" data-tag-manager-open=""
          :disabled="unavailable || loading" @click.stop="isTagManagerOpen = true">Etiquetas</button>
        <button class="tk-button tk-button--primary" type="button" :disabled="unavailable || loading"
          @click.stop="newTaskDraft = emptyTaskDraft(); isNewTaskOpen = true">Nueva tarea</button>
      </div>
    </header>
    <section class="workspace-body">
      <task-list :loading="loading" :has-tasks="Boolean(tasks.length)" :tasks="visibleTasks"
        :active-count="activeTaskCount" :selected-id="selectedTaskId" :expanded-ids="expandedIds"
        :chips-visible="areTaskChipsVisible" :open-menu-id="openTaskMenuId" :busy="isBusy" :tag-color="tagColor"
        :filter-props="taskFilterProps" @refresh="reloadWorkspace()" @dismiss-error="errorMessage = ''"
        @update-search="taskSearchQuery = $event" @toggle-filters="isAdvancedFiltersOpen = !isAdvancedFiltersOpen"
        @close-filters="isAdvancedFiltersOpen = false" @clear-filters="clearAdvancedFilters"
        @update-statuses="advancedStatuses = $event" @update-priorities="advancedPriorities = $event"
        @update-tags="advancedTags = $event" @update-quick-filter="quickTagFilter = $event"
        @update-active-filter="activeTaskFilter = $event" @toggle-chips="areTaskChipsVisible = !areTaskChipsVisible"
        @toggle-list-menu="isListMenuOpen = !isListMenuOpen" @set-expanded="setAllExpanded" @select="loadTaskDetail"
        @toggle-expanded="toggleExpanded" @update-field="updateTaskField" @toggle-menu="toggleTaskMenu"
        @menu-action="runTaskMenuAction"></task-list>
      <task-inspector v-bind="taskInspectorProps" v-model:mobile-open="isMobileInspectorOpen"
        v-model:active-tab="activeInspectorTab" v-model:edit-draft="editDraft"
        v-model:dependency-draft="dependencyDraft" v-model:comment-draft="commentDraft"
        @action="handleInspectorAction"></task-inspector>
    </section>
  </div>
</main>
<new-task-dialog :open="isNewTaskOpen" :draft="newTaskDraft" :tasks="mappedTasks" :tags="tagCatalog" :colors="colors"
  :busy="isBusy('create')" @close="isNewTaskOpen = false" @update-draft="newTaskDraft = $event" @submit="createTask">
</new-task-dialog>
<tag-manager-drawer :open="isTagManagerOpen" :tags="tagCatalog" :visible-tags="visibleTags" :colors="colors"
  :search-query="tagSearchQuery" :form-mode="tagFormMode" :draft="tagDraft" :editing-name="editingTagName"
  :form-error="tagFormError" :busy="isBusy" :color-hex="colorHex"
  @close="isTagManagerOpen = false" @update-search="tagSearchQuery = $event"
  @open-create="openCreateTag" @open-edit="openEditTag" @request-delete="requestDeleteTag"
  @update-draft="tagDraft = $event" @close-form="closeTagForm" @save="saveTag"></tag-manager-drawer>
`
  };

  // src/task-manager/main.js
  globalThis.Vue.createApp(AppShell).mount("#app");
})();
