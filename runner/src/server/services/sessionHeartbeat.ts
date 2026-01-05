export class SessionHeartbeat {
  private lastPing = 0;
  private readonly intervalMs: number;
  private readonly endpoint: string;

  constructor(intervalMinutes = 2, endpoint = "/session/keep-alive") {
    this.intervalMs = intervalMinutes * 60 * 1000;
    this.endpoint = endpoint;
    this.initListeners();
  }

  private initListeners() {
    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach((e) =>
      document.addEventListener(e, () => this.handleActivity(), {
        passive: true,
      })
    );
  }

  private handleActivity() {
    const now = Date.now();
    if (now - this.lastPing < this.intervalMs) return;

    this.lastPing = now;
    this.pingBackend();
  }

  private async pingBackend() {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken(),
        },
      });
    } catch {
      // Fail silently; backend will enforce expiry anyway
    }
  }

  private getCsrfToken(): string {
    const el = document.querySelector(
      'meta[name="csrf-token"]'
    ) as HTMLMetaElement;
    return el?.content ?? "";
  }
}
