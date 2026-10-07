/**
 * Fixed-Timestep-Loop: Simulation läuft in festen Schritten (deterministisch,
 * unabhängig von der Framerate), Rendering so oft wie der Browser will.
 * `speed` ist der Idle-Zeitraffer (1x, 2x, 4x), `paused` hält die Simulation an.
 */
export class GameLoop {
  private rafId = 0;
  private last = 0;
  private accumulator = 0;
  speed = 1;
  paused = false;

  constructor(
    private readonly stepSeconds: number,
    private readonly update: (dt: number) => void,
    private readonly render: () => void,
    private readonly maxStepsPerFrame = 60,
  ) {}

  start(): void {
    this.last = performance.now();
    const frame = (now: number): void => {
      const elapsed = Math.min((now - this.last) / 1000, 0.25); // Tab-Wechsel abfedern
      this.last = now;
      if (!this.paused) {
        this.accumulator += elapsed * this.speed;
        let steps = 0;
        while (this.accumulator >= this.stepSeconds && steps < this.maxStepsPerFrame) {
          this.update(this.stepSeconds);
          this.accumulator -= this.stepSeconds;
          steps++;
        }
        if (steps >= this.maxStepsPerFrame) this.accumulator = 0;
      }
      this.render();
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }
}
