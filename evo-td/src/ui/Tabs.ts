/** Reiter der Seitenleiste. Merkt sich den aktiven Reiter pro Browser. */
export class Tabs {
  private readonly buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('#tabs .tab'));
  private readonly panels = Array.from(document.querySelectorAll<HTMLElement>('#sidebar [data-panel]'));
  active = 'tower';

  constructor() {
    for (const button of this.buttons) {
      button.addEventListener('click', () => this.show(button.dataset['tab'] ?? 'tower'));
    }
    try {
      const stored = localStorage.getItem('evo-td-tab');
      if (stored) this.show(stored);
    } catch {
      /* ignorieren */
    }
  }

  show(name: string): void {
    this.active = name;
    for (const button of this.buttons) button.classList.toggle('active', button.dataset['tab'] === name);
    for (const panel of this.panels) panel.classList.toggle('hidden', panel.dataset['panel'] !== name);
    try {
      localStorage.setItem('evo-td-tab', name);
    } catch {
      /* ignorieren */
    }
  }
}
