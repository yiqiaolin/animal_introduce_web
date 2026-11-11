// One FIFO queue for discoveries, badges and promotions; no historical replay.
export function createNotificationQueue({ show, hide, duration = 2800, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const pending = [];
  let active = false;
  let timer = null;
  function next() {
    if (active || !pending.length) return;
    active = true;
    show(pending.shift());
    timer = setTimer(() => {
      hide();
      active = false;
      timer = null;
      next();
    }, duration);
  }
  return {
    enqueue(items) { pending.push(...items); next(); },
    clear() { pending.length = 0; clearTimer(timer); timer = null; active = false; hide(); }
  };
}

const escapeText = text => String(text).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);

export function createToastNotifications(element) {
  return createNotificationQueue({
    show(notice) {
      // Icons are trusted local SVG definitions, never user or remote content.
      element.innerHTML = `${notice.icon ? `<span class="outcome-toast-icon" aria-hidden="true">${notice.icon}</span>` : ''}
        <span class="outcome-toast-copy"><strong>${escapeText(notice.title)}</strong><span>${escapeText(notice.message)}</span></span>`;
      element.classList.add('visible');
    },
    hide() { element.classList.remove('visible'); }
  });
}
