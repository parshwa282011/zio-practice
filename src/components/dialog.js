// Accessible modal dialog built on <dialog>. Resolves with the chosen action id.
import { h } from '../app/dom.js';

/**
 * confirmDialog({ title, body (Node|string), actions: [{ id, label, kind: 'primary'|'secondary'|'danger' }] })
 * Esc or backdrop click resolves with the `cancelId` (default: first non-primary action or null).
 */
export function confirmDialog({ title, body, actions, cancelId = null }) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const titleId = `dlg-${Math.random().toString(36).slice(2, 8)}`;
    const dlg = h(
      'dialog',
      { class: 'dialog', 'aria-labelledby': titleId },
      h('form', { method: 'dialog', class: 'dialog-inner' }, [
        h('h2', { id: titleId, class: 'dialog-title' }, title),
        h('div', { class: 'dialog-body' }, body),
        h('div', { class: 'dialog-actions' }, actions.map((a) => h('button', { type: 'button', class: `btn btn-${a.kind || 'secondary'}`, dataset: { action: a.id }, onclick: () => close(a.id) }, a.label))),
      ]),
    );
    const close = (id) => {
      dlg.close();
      dlg.remove();
      prevFocus?.focus?.();
      resolve(id);
    };
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(cancelId);
    });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) close(cancelId);
    });
    document.body.append(dlg);
    dlg.showModal();
    (dlg.querySelector('.btn-primary, .btn-danger') || dlg.querySelector('button'))?.focus();
  });
}
