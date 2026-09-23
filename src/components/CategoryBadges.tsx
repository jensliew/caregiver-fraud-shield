import { Icon } from './icons/Icon';
import { CATEGORY_ICON, CATEGORY_LABEL_KEY } from '../lib/categoryPresentation';
import { useT } from '../i18n/useT';
import type { Category } from '../lib/types';

export function CategoryBadges({ categories }: { categories: Category[] }) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {categories.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-white border border-warn text-warn"
        >
          <Icon name={CATEGORY_ICON[c.id]} size={15} />
          {t(CATEGORY_LABEL_KEY[c.id])}
        </span>
      ))}
    </div>
  );
}
