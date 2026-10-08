(() => {
  // ---- Settings you might change ----
  const NIGHT_STARTS = 22; // 22 = 10 p.m. on the visitor's own clock
  const NIGHT_ENDS = 6;    // 6 = 6 a.m.
  const STATIC_VOLUME = 0.12;

  const body = document.body;

  // ---- Day or night ----
  // Pages marked data-fixed (204, c1, 404) keep whatever data-time they were given.
  // On other pages, ?preview=day or ?preview=night lets you check both versions.
  if (!body.hasAttribute("data-fixed")) {
    const preview = new URLSearchParams(location.search).get("preview");
    const hour = new Date().getHours();
    const isNight = preview
      ? preview === "night"
      : hour >= NIGHT_STARTS || hour < NIGHT_ENDS;
    body.dataset.time = isNight ? "night" : "day";
  }

  const night = body.dataset.time === "night";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Visual static ----
  // Drawn at a tiny resolution and scaled up, so it looks chunky like an old set.
  const canvas = document.querySelector("canvas.static");
  if (canvas && night) {
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

    if (reduceMotion) {
      draw(); // one still frame
    } else {
      let last = 0;
      const loop = (t) => {
        if (t - last > 33) { draw(); last = t; } // about 30 frames a second
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  // ---- Audio static ----
  // Generated in the browser, so there's no audio file to host.
  // Browsers block sound until someone taps, which is what the button is for.
  const button = document.querySelector("button.sound");
  if (button && night) {
    let audio = null;
    let gain = null;
    let playing = false;

    button.addEventListener("click", () => {
      if (!audio) {
        audio = new (window.AudioContext || window.webkitAudioContext)();
        const seconds = 2;
        const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

        const noise = audio.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const hiss = audio.createBiquadFilter(); // softens it into TV hiss
        hiss.type = "lowpass";
        hiss.frequency.value = 5500;

        gain = audio.createGain();
        gain.gain.value = 0;

        noise.connect(hiss).connect(gain).connect(audio.destination);
        noise.start();
      }

      playing = !playing;
      gain.gain.setTargetAtTime(playing ? STATIC_VOLUME : 0, audio.currentTime, 0.05);
      button.textContent = playing ? "Sound off" : "Sound on";
    });
  }
})();
