/**
 * Pluie de confettis dans un canvas (victoire du mode jeu). Aucune dépendance ; ne fait rien si
 * l'utilisateur a demandé moins d'animations. Renvoie une fonction qui arrête et efface tout.
 */
export function launchConfetti(canvas: HTMLCanvasElement, colors: string[], durationMs = 5000): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => undefined;
  }
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // deux salves partant des coins bas, comme des canons à confettis
  const count = Math.min(220, Math.round(width / 5));
  const pieces = Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.8;
    const speed = height * (0.026 + Math.random() * 0.016);
    return {
      x: fromLeft ? 0 : width,
      y: height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      sway: Math.random() * Math.PI * 2,
      color: colors[i % colors.length],
    };
  });

  const start = performance.now();
  let frame = 0;
  const tick = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    // fondu sur la dernière seconde
    ctx.globalAlpha = Math.max(0, Math.min(1, (durationMs - elapsed) / 1000));
    for (const p of pieces) {
      // gravité, puis chute freinée par l'air : les confettis flottent en redescendant
      p.vy = Math.min(p.vy + height * 0.0006, height * 0.0035);
      p.vx *= 0.97;
      p.sway += 0.05;
      p.x += p.vx + Math.sin(p.sway) * 0.8;
      p.y += p.vy;
      p.rotation += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      // l'écrasement vertical imite une feuille qui tourne sur elle-même
      ctx.fillRect(-p.size / 2, (-p.size / 4) * Math.cos(p.rotation * 2), p.size, (p.size / 2) * Math.cos(p.rotation * 2));
      ctx.restore();
    }
    if (elapsed < durationMs) {
      frame = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, width, height);
  };
}
