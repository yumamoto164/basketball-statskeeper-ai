export const CANVAS_HEIGHT = 100;
export const BAR_COLOR_ACTIVE = "#2563eb";
export const BAR_COLOR_IDLE = "#d1d5db";
export const BAR_WIDTH = 4;
export const BAR_GAP = 2;

export function drawBars(
  canvas: HTMLCanvasElement,
  data: Uint8Array | null,
  active: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const totalBarWidth = BAR_WIDTH + BAR_GAP;
  const barCount = Math.floor(width / totalBarWidth);

  for (let i = 0; i < barCount; i++) {
    const value = data ? data[Math.floor((i / barCount) * data.length)] : 0;
    const barHeight = active ? Math.max(4, (value / 255) * height) : 4;
    const x = i * totalBarWidth;
    const y = (height - barHeight) / 2;
    ctx.fillStyle = active ? BAR_COLOR_ACTIVE : BAR_COLOR_IDLE;
    ctx.beginPath();
    ctx.roundRect(x, y, BAR_WIDTH, barHeight, 2);
    ctx.fill();
  }
}
