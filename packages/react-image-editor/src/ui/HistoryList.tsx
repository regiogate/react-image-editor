import { useState, type ReactElement } from 'react';

import { type HistoryStep } from '../engine/delta-history';
import { AspIcon } from '../icons/AspIcon';
import { translateHistoryLabel } from '../i18n/labels';
import { useAspT } from '../i18n/use-asp-t';

export interface AspHistoryListProps {
  readonly entries: readonly HistoryStep[];
  readonly currentIndex: number;
}

/**
 * The History panel (bottom of the options column). Presentational: shows the
 * engine's edit entries, highlighting the current one and dimming any redo
 * branch ahead of the cursor. The user can collapse it via the header chevron.
 */
export function AspHistoryList({ entries, currentIndex }: AspHistoryListProps): ReactElement {
  const t = useAspT();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="asp-history-list">
      <button
        type="button"
        className="asp-history__head"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="asp-history__title">{t('history.title')}</span>
        <AspIcon name={collapsed ? 'plus' : 'minus'} size={14} />
      </button>
      {!collapsed && (
        <div className="asp-history__scroll">
          {entries.map((entry, index) => (
            <div
              key={index}
              className={[
                'asp-history__row',
                index === currentIndex ? 'asp-history__row--current' : '',
                index > currentIndex ? 'asp-history__row--future' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <AspIcon name="dot" size={16} />
              <span className="asp-history__label">{translateHistoryLabel(t, entry.label)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
