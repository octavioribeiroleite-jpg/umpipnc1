import { useEffect } from 'react';

const SOCIETY_COLORS: Record<string, string> = {
  SAF: '#ec4899',
  UCP: '#8b5cf6',
  UPA: '#f97316',
  UMP: '#3b82f6',
  UPH: '#10b981',
  PASTOR: '#173a63',
};

function normalizeSociety(text: string) {
  const normalized = text.trim().toUpperCase();
  const known = Object.keys(SOCIETY_COLORS).find((key) => normalized.includes(key));
  return known ?? normalized;
}

function replaceButtonText(button: HTMLButtonElement, from: string, to: string) {
  for (const node of Array.from(button.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes(from)) {
      node.textContent = node.textContent.replace(from, to);
    }
  }
}

function enhanceConfirmationCards() {
  const headings = Array.from(document.querySelectorAll<HTMLHeadingElement>('h2')).filter(
    (heading) => heading.textContent?.trim() === 'Você é',
  );

  for (const heading of headings) {
    const card = heading.closest<HTMLElement>('[class*="shadow-2xl"]');
    const wrapper = card?.parentElement;
    const content = card?.firstElementChild as HTMLElement | null;
    const intro = heading.parentElement;

    if (!card || !wrapper || !content || !intro) continue;

    wrapper.classList.add('identity-confirmation-root');
    card.classList.add('identity-confirmation-card');
    content.classList.add('identity-confirmation-content');
    intro.classList.add('identity-confirmation-intro');

    const iconWrapper = intro.firstElementChild as HTMLElement | null;
    iconWrapper?.classList.add('identity-confirmation-icon');

    if (!intro.querySelector('.identity-confirmation-kicker')) {
      const kicker = document.createElement('p');
      kicker.className = 'identity-confirmation-kicker';
      kicker.textContent = 'CONFIRMAÇÃO DE ACESSO';
      heading.before(kicker);
    }

    heading.classList.add('identity-confirmation-question');

    const name = heading.nextElementSibling as HTMLElement | null;
    name?.classList.add('identity-confirmation-name');

    const meta = name?.nextElementSibling as HTMLElement | null;
    meta?.classList.add('identity-confirmation-meta');

    const metaText = meta?.textContent?.trim() ?? '';
    const society = normalizeSociety(metaText.split(/[—•]/).pop() ?? metaText);
    wrapper.dataset.society = society.toLowerCase();

    if (meta && !intro.querySelector('.identity-confirmation-badge')) {
      const badge = document.createElement('span');
      badge.className = 'identity-confirmation-badge';
      badge.textContent = society;
      badge.style.setProperty('--society-color', SOCIETY_COLORS[society] ?? '#239561');
      meta.after(badge);
    }

    const actionGroup = Array.from(content.children).find((child) => {
      const element = child as HTMLElement;
      return element.querySelectorAll(':scope > button').length === 2;
    }) as HTMLElement | undefined;

    if (actionGroup) {
      actionGroup.classList.add('identity-confirmation-actions');

      const buttons = Array.from(actionGroup.querySelectorAll<HTMLButtonElement>(':scope > button'));
      const secondary = buttons.find((button) => button.textContent?.includes('Não sou eu'));
      const primary = buttons.find((button) => button.textContent?.includes('Sim, sou eu'));

      secondary?.classList.add('identity-confirmation-secondary');
      if (primary) {
        primary.classList.add('identity-confirmation-primary');
        replaceButtonText(primary, 'Sim, sou eu!', 'Sim, sou eu');
        if (!primary.querySelector('.identity-confirmation-arrow')) {
          const arrow = document.createElement('span');
          arrow.className = 'identity-confirmation-arrow';
          arrow.setAttribute('aria-hidden', 'true');
          arrow.textContent = '→';
          primary.appendChild(arrow);
        }
      }
    }

    const backButton = Array.from(content.querySelectorAll<HTMLButtonElement>(':scope > button')).find(
      (button) => button.textContent?.includes('Voltar'),
    );
    backButton?.classList.add('identity-confirmation-back');
  }
}

export default function IdentityConfirmationEnhancer() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(enhanceConfirmationCards);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
