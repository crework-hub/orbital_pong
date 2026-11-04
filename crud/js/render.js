// Мини-превью поля 800x600 в масштабе 320x240
export function renderPreview(canvas, list) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, k = W / 800;
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, W, H);
  // звёзды (детерминированно)
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 60; i++) ctx.fillRect((i * 97) % W, (i * 53 + i * i) % H, 1, 1);
  // ракетки
  ctx.fillStyle = '#7aa2ff';
  ctx.fillRect(6, H / 2 - 20, 4, 40);
  ctx.fillRect(W - 10, H / 2 - 20, 4, 40);
  for (const a of list) {
    const x = a.x * k, y = a.y * k;
    const r = Math.max(3, Math.min(30, 3 + Math.sqrt(a.mass) * 1.6));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    if (a.type === 'white') {
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(160,220,255,0.6)'); g.addColorStop(1, 'rgba(160,220,255,0)');
    } else {
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(170,80,255,0.7)'); g.addColorStop(1, 'rgba(170,80,255,0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = a.type === 'white' ? '#fff' : '#000';
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
}
