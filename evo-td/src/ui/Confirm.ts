/**
 * Bestätigungsdialog im Spiel statt `window.confirm()`.
 * Eingebettete Seiten (z.B. als claude.ai-Artefakt) zeigen native Dialoge
 * nicht an; dieser Dialog funktioniert überall.
 */
import { el } from './dom';

let open: HTMLElement | undefined;

export function askConfirm(message: string, confirmLabel = 'Ja', cancelLabel = 'Abbrechen'): Promise<boolean> {
  open?.remove();
  return new Promise((resolve) => {
    const yes = el('button', { className: 'btn active', type: 'button' }, [confirmLabel]);
    const no = el('button', { className: 'btn', type: 'button' }, [cancelLabel]);
    const box = el('div', { className: 'confirm-overlay', role: 'dialog' }, [
      el('div', { className: 'card confirm-box' }, [el('p', {}, [message]), el('div', { className: 'actions' }, [yes, no])]),
    ]);
    const close = (answer: boolean): void => {
      box.remove();
      document.removeEventListener('keydown', onKey, true);
      if (open === box) open = undefined;
      resolve(answer);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        close(true);
      }
    };
    yes.addEventListener('click', () => close(true));
    no.addEventListener('click', () => close(false));
    box.addEventListener('click', (e) => {
      if (e.target === box) close(false);
    });
    document.addEventListener('keydown', onKey, true);
    document.body.append(box);
    open = box;
    yes.focus();
  });
}
