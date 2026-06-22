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
    badge?.classList.add('society-selector-badge');

    const title = Array.from(content.querySelectorAll<HTMLElement>('span')).find((span) =>
      span.textContent?.trim(),
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
