import { useEffect } from 'react';

const SOCIETY_ORDER = ['SAF', 'UCP', 'UPA', 'UMP', 'UPH', 'PASTOR'];

const SOCIETY_DESCRIPTIONS: Record<string, string> = {
  SAF: 'Sociedade Auxiliadora Feminina',
  UCP: 'União de Crianças Presbiterianas',
  UPA: 'União Presbiteriana de Adolescentes',
  UMP: 'União de Mocidade Presbiteriana',
  UPH: 'União Presbiteriana de Homens',
  PASTOR: 'Acesso pastoral',
};

const SOCIETY_ICONS: Record<string, string> = {
  SAF: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
      <circle cx="12" cy="10" r="2.1" />
      <path d="M8.5 16.2c.8-2 2-3 3.5-3s2.7 1 3.5 3" />
    </svg>`,
  UCP: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="9" r="3" />
      <circle cx="16" cy="9" r="3" />
      <path d="M3.8 19c.7-3.1 2.1-4.7 4.2-4.7s3.5 1.6 4.2 4.7" />
      <path d="M11.8 19c.7-3.1 2.1-4.7 4.2-4.7s3.5 1.6 4.2 4.7" />
      <path d="M6.8 9.7c.7.6 1.7.6 2.4 0M14.8 9.7c.7.6 1.7.6 2.4 0" />
    </svg>`,
  UPA: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.4 2.7c.6 3.1-.6 4.8-2 6.2-1.2 1.3-2.2 2.4-1.4 4.3.6 1.3 1.9 2 3.1 1.6 1.9-.6 2.8-3 2.1-5.1 3 2.1 4.6 5 4 7.8-.7 3-3.4 5-6.9 5-4.4 0-7.5-2.8-7.5-6.8 0-4.8 3.3-7.5 8.6-13Z" />
      <path d="M9.6 19c-.6-2.2.2-3.9 2.3-5.6.1 2 1 3 2.2 3.7.8.5 1.3 1 1.4 1.9" />
    </svg>`,
  UMP: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="7" r="3" />
      <circle cx="5.8" cy="9.2" r="2.2" />
      <circle cx="18.2" cy="9.2" r="2.2" />
      <path d="M6.6 20c.5-4.2 2.3-6.4 5.4-6.4s4.9 2.2 5.4 6.4" />
      <path d="M1.8 19c.3-2.8 1.5-4.3 3.7-4.3 1.3 0 2.3.6 3 1.7M22.2 19c-.3-2.8-1.5-4.3-3.7-4.3-1.3 0-2.3.6-3 1.7" />
    </svg>`,
  UPH: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 20 6v5.2c0 5-3.1 8.6-8 10.3-4.9-1.7-8-5.3-8-10.3V6l8-3.5Z" />
      <path d="M12 7v9M8.5 11.5h7" />
    </svg>`,
  PASTOR: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21V10.5L12 5l9 5.5V21" />
      <path d="M8 21v-6.5h8V21M12 5V1.8M9.8 3.2h4.4" />
      <path d="M6.5 11.8h2.2v2.2H6.5zM15.3 11.8h2.2v2.2h-2.2z" />
    </svg>`,
};

function getSocietyKey(card: Element) {
  const badge = card.querySelector<HTMLElement>('[style*="background-color"]');
  const badgeText = badge?.textContent?.trim().toUpperCase();

  if (badgeText && SOCIETY_ORDER.includes(badgeText)) return badgeText;
  if (card.textContent?.toLowerCase().includes('pastor')) return 'PASTOR';
  return '';
}

function enhanceSocietyScreen() {
  const heading = Array.from(document.querySelectorAll('h2')).find((item) => {
    const text = item.textContent?.trim();
    return text === 'Selecione a sociedade' || text === 'Escolha sua sociedade';
  });

  if (!heading) return;

  const section = heading.closest<HTMLElement>('.animate-fade-up');
  const grid = section?.querySelector<HTMLElement>('.grid');
  if (!section || !grid) return;

  section.classList.add('society-selector-enhanced');
  const screenRoot = section.parentElement;
  screenRoot?.classList.add('society-screen-root');
  screenRoot?.closest<HTMLElement>('.min-h-screen.relative')?.classList.add('society-page-active');

  const header = heading.parentElement;
  header?.classList.add('society-selector-header');
  heading.textContent = 'Escolha sua sociedade';

  if (header && !header.querySelector('.society-selector-subtitle')) {
    const subtitle = document.createElement('p');
    subtitle.className = 'society-selector-subtitle';
    subtitle.textContent = 'Selecione o grupo que deseja acessar';
    header.appendChild(subtitle);
  }

  grid.classList.add('society-selector-list');

  const cards = Array.from(grid.children) as HTMLElement[];
  const keyedCards = cards
    .map((card) => ({ card, key: getSocietyKey(card) }))
    .filter((item) => item.key);

  for (const { card, key } of keyedCards) {
    card.classList.add('society-selector-card');
    card.dataset.society = key.toLowerCase();

    const content = card.firstElementChild as HTMLElement | null;
    if (!content) continue;
    content.classList.add('society-selector-card-content');

    const badge = content.querySelector<HTMLElement>('[style*="background-color"]');
    if (badge) {
      badge.classList.add('society-selector-badge');
      if (!badge.querySelector('.society-selector-icon')) {
        badge.innerHTML = `
          <span class="society-selector-icon">${SOCIETY_ICONS[key]}</span>
          ${key === 'PASTOR' ? '' : `<span class="society-selector-badge-label">${key}</span>`}
        `;
      }
    }

    const title = Array.from(content.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'SPAN',
    );
    title?.classList.add('society-selector-title');

    if (!content.querySelector('.society-selector-description')) {
      const description = document.createElement('p');
      description.className = 'society-selector-description';
      description.textContent = SOCIETY_DESCRIPTIONS[key];
      content.appendChild(description);
    }

    if (!content.querySelector('.society-selector-chevron')) {
      const chevron = document.createElement('span');
      chevron.className = 'society-selector-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '›';
      content.appendChild(chevron);
    }
  }

  const currentOrder = keyedCards.map((item) => item.key).join('|');
  const desiredCards = [...keyedCards].sort(
    (a, b) => SOCIETY_ORDER.indexOf(a.key) - SOCIETY_ORDER.indexOf(b.key),
  );
  const desiredOrder = desiredCards.map((item) => item.key).join('|');

  if (currentOrder !== desiredOrder) {
    for (const { card } of desiredCards) grid.appendChild(card);
  }
}

export default function SocietyScreenEnhancer() {
  useEffect(() => {
    let frame = 0;

    const scheduleEnhancement = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(enhanceSocietyScreen);
    };

    scheduleEnhancement();
    const observer = new MutationObserver(scheduleEnhancement);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
