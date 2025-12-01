// politica.js
document.addEventListener("DOMContentLoaded", () => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* --- Dark mode (persistente) --- */
  const darkToggle = $("#darkToggle");
  const setDark = (on) => {
    document.body.classList.toggle("dark", on);
    darkToggle.setAttribute("aria-pressed", on ? "true" : "false");
    localStorage.setItem("bm_dark", on ? "1" : "0");
  };
  setDark(localStorage.getItem("bm_dark") === "1");
  darkToggle.addEventListener("click", () => setDark(!document.body.classList.contains("dark")));

  /* --- Build TOC from sections [data-toc] --- */
  const tocList = $("#tocList");
  const sections = $$("[data-toc]");
  sections.forEach(sec => {
    const id = sec.id;
    const title = sec.dataset.toc || sec.querySelector("h3")?.innerText || id;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${id}`;
    a.textContent = title;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(()=> document.getElementById(id).focus(), 300);
    });
    li.appendChild(a);
    tocList.appendChild(li);
  });

  /* --- Scrollspy --- */
  const tocLinks = () => Array.from(tocList.querySelectorAll("a"));
  const spyObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = tocList.querySelector(`a[href="#${entry.target.id}"]`);
      if (!link) return;
      if (entry.isIntersecting) {
        tocLinks().forEach(a => a.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }, { root: null, rootMargin: "-30% 0px -60% 0px", threshold: 0 });
  sections.forEach(s => spyObserver.observe(s));

  /* --- Reveal on scroll --- */
  const revItems = $$(".reveal");
  const revObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visible"); revObs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  revItems.forEach(i => revObs.observe(i));

  /* --- Accordions --- */
  const accordions = $$(".accordion-toggle");
  accordions.forEach(btn => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", () => {
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
      panel.classList.toggle("open", !isOpen);
      // save state
      saveAccordionState();
      if (!isOpen) panel.scrollIntoView({behavior:"smooth", block:"nearest"});
    });
  });

  /* Expand / Collapse All */
  $("#expandAll").addEventListener("click", () => {
    accordions.forEach(btn => {
      btn.setAttribute("aria-expanded","true");
      document.getElementById(btn.getAttribute("aria-controls")).classList.add("open");
    });
    saveAccordionState();
  });
  $("#collapseAll").addEventListener("click", () => {
    accordions.forEach(btn => {
      btn.setAttribute("aria-expanded","false");
      document.getElementById(btn.getAttribute("aria-controls")).classList.remove("open");
    });
    saveAccordionState();
  });

  /* --- TOC Search --- */
  const tocSearch = $("#tocSearch");
  const clearSearch = $("#clearSearch");
  tocSearch.addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    Array.from(tocList.children).forEach(li => {
      const a = li.firstElementChild;
      li.style.display = a.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
  clearSearch.addEventListener("click", () => { tocSearch.value=""; tocSearch.dispatchEvent(new Event('input')); });

  /* --- Back to top --- */
  const backTop = $("#backTop");
  const toggleBack = () => window.scrollY > 360 ? backTop.classList.add("show") : backTop.classList.remove("show");
  window.addEventListener("scroll", toggleBack);
  backTop.addEventListener("click", () => window.scrollTo({ top:0, behavior:"smooth" }));

  /* --- Anchors smooth keyboard accessible --- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (ev) => {
      const hash = a.getAttribute("href");
      if (hash.length > 1) {
        ev.preventDefault();
        const target = document.querySelector(hash);
        if (target) target.scrollIntoView({behavior:"smooth", block:"start"});
      }
    });
  });

  /* --- Updated date dynamic --- */
  const dEl = $("#updatedDate");
  if (dEl) dEl.textContent = new Date().toISOString().slice(0,10);
  const fEl = $("#footerDate");
  if (fEl) fEl.textContent = new Date().toISOString().slice(0,10);

  /* --- Persist accordion open state (sessionStorage) --- */
  const saveAccordionState = () => {
    const state = accordions.map(b => b.getAttribute("aria-expanded") === "true");
    sessionStorage.setItem("pol_ac_state", JSON.stringify(state));
  };
  const restoreAccordionState = () => {
    try {
      const st = JSON.parse(sessionStorage.getItem("pol_ac_state") || "[]");
      if (st.length === accordions.length) {
        accordions.forEach((b,i) => {
          const panel = document.getElementById(b.getAttribute("aria-controls"));
          b.setAttribute("aria-expanded", st[i] ? "true" : "false");
          panel.classList.toggle("open", st[i]);
        });
      }
    } catch(e){}
  };
  restoreAccordionState();

  /* --- Accessibility: ESC to collapse all --- */
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#collapseAll").click(); });

  /* Focus main on load for screen readers */
  $("#mainContent").setAttribute("tabindex","-1");
});
