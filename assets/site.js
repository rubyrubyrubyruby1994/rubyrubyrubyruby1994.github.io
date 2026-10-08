(() => {
  // ---- Settings ----
  const NIGHT_STARTS = 22;           // 10 p.m.
  const NIGHT_ENDS = 6;              // 6 a.m.
  const TIME_ZONE = "America/Denver"; // Mountain Time, matching the Contact page
  const KEY = "pal-office-ext";      // must match the key in encoder.html

  if (document.body.dataset.page !== "home" || !window.NIGHT) return;

  const params = new URLSearchParams(location.search);
  if (params.has("day")) return; // ?day shows the daytime site at any hour

  // ---- Is it night in Roswell? ----
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" })
      .format(new Date()),
    10
  ) % 24;
  const isNightInRoswell = hour >= NIGHT_STARTS || hour < NIGHT_ENDS;

  // ---- Your private preview: ?night=YOURWORD ----
  // Only a scrambled fingerprint of the word is stored, so reading this file doesn't reveal it.
  const fingerprint = (text) => {
    let h = 0x811c9dc5;
    for (const byte of new TextEncoder().encode(text)) {
      h ^= byte;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };
  const word = params.get("night");
  const previewing = word !== null && fingerprint(word) === window.NIGHT.previewHash;

  if (!isNightInRoswell && !previewing) return;

  // ---- Unscramble the night text ----
  let lines;
  try {
    const bytes = Uint8Array.from(atob(window.NIGHT.data), (c) => c.charCodeAt(0));
    const key = new TextEncoder().encode(KEY);
    for (let i = 0; i < bytes.length; i++) bytes[i] ^= key[i % key.length];
    lines = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return; // if anything is wrong with night.js, quietly stay on the daytime site
  }

  // ---- Build the broadcast ----
  const set = document.createElement("main");
  set.className = "set";
  const screen = document.createElement("div");
  screen.className = "screen";
  const canvas = document.createElement("canvas");
  canvas.className = "static";
  canvas.setAttribute("aria-hidden", "true");
  const slate = document.createElement("section");
  slate.className = "slate";

  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const isPhone = (s) => /^[\d\s().+-]{7,}$/.test(s) && /\d{7,}/.test(s.replace(/\D/g, ""));

  lines.forEach((text, i) => {
    const p = document.createElement("p");
    if (i === 0) p.className = "big";
    if (isEmail(text) || isPhone(text)) {
      const a = document.createElement("a");
      a.href = isEmail(text) ? "mailto:" + text : "tel:+1" + text.replace(/\D/g, "").replace(/^1/, "");
      a.textContent = text;
      p.appendChild(a);
    } else {
      p.textContent = text;
    }
    slate.appendChild(p);
  });

  screen.append(canvas, slate);
  set.append(screen);
  document.body.appendChild(set);
  document.body.classList.add("night");

  // ---- Visual static ----
  canvas.width = 160;
  canvas.height = 120;
  const ctx = canvas.getContext("2d");
  const frame = ctx.createImageData(canvas.width, canvas.height);
  const px = frame.data;
  const draw = () => {
    for (let i = 0; i < px.length; i += 4) {
      const v = Math.random() * 255;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    ctx.putImageData(frame, 0, 0);
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    draw();
  } else {
    let last = 0;
    const loop = (t) => {
      if (t - last > 33) { draw(); last = t; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
})();
