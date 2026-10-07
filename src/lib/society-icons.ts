import { createImagePreloader, type ResponsiveImage } from './preload-images';
import saf96 from '@/assets/societies/optimized/saf-96.webp';
import saf192 from '@/assets/societies/optimized/saf-192.webp';
import saf256 from '@/assets/societies/optimized/saf-256.webp';
import saf384 from '@/assets/societies/optimized/saf-384.webp';
import ucp96 from '@/assets/societies/optimized/ucp-96.webp';
import ucp192 from '@/assets/societies/optimized/ucp-192.webp';
import ucp256 from '@/assets/societies/optimized/ucp-256.webp';
import ucp384 from '@/assets/societies/optimized/ucp-384.webp';
import ump96 from '@/assets/societies/optimized/ump-96.webp';
import ump192 from '@/assets/societies/optimized/ump-192.webp';
import ump256 from '@/assets/societies/optimized/ump-256.webp';
import ump384 from '@/assets/societies/optimized/ump-384.webp';
import upa96 from '@/assets/societies/optimized/upa-96.webp';
import upa192 from '@/assets/societies/optimized/upa-192.webp';
import upa256 from '@/assets/societies/optimized/upa-256.webp';
import upa384 from '@/assets/societies/optimized/upa-384.webp';
import uph96 from '@/assets/societies/optimized/uph-96.webp';
import uph192 from '@/assets/societies/optimized/uph-192.webp';
import uph256 from '@/assets/societies/optimized/uph-256.webp';
import uph384 from '@/assets/societies/optimized/uph-384.webp';
import pastor96 from '@/assets/societies/optimized/pastor-96.webp';
import pastor192 from '@/assets/societies/optimized/pastor-192.webp';
import pastor256 from '@/assets/societies/optimized/pastor-256.webp';
import pastor384 from '@/assets/societies/optimized/pastor-384.webp';

const sizes = '(max-width: 479px) 3.5rem, 4.75rem';
const responsive = (small: string, medium: string, large: string, original: string): ResponsiveImage => ({
  src: medium,
  srcSet: `${small} 96w, ${medium} 192w, ${large} 256w, ${original} 384w`,
  sizes,
});

export const SOCIETY_ICONS = {
  saf: responsive(saf96, saf192, saf256, saf384),
  ucp: responsive(ucp96, ucp192, ucp256, ucp384),
  ump: responsive(ump96, ump192, ump256, ump384),
  upa: responsive(upa96, upa192, upa256, upa384),
  uph: responsive(uph96, uph192, uph256, uph384),
  pastor: responsive(pastor96, pastor192, pastor256, pastor384),
};

const preload = createImagePreloader(() => new Image());
export function warmSocietyIcons() {
  if (typeof Image !== 'undefined') preload(Object.values(SOCIETY_ICONS));
}
