import { type ReactElement } from 'react';

import { useAspT } from '../i18n/use-asp-t';

export interface AspColorFieldProps {
  /** Preset swatches. `'transparent'` renders a checker swatch. */
  readonly colors: readonly string[];
  /** Currently selected color. */
  readonly value?: string;
  readonly onColorChange: (color: string) => void;
}

/**
 * A color chooser: preset swatches plus a custom-color control (the native OS
 * picker). Used everywhere a color is set — draw, shapes (stroke + fill), text,
 * arrows, frame, background. Emits the chosen color string on selection.
 */
export function AspColorField({ colors, value = '', onColorChange }: AspColorFieldProps): ReactElement {
  const t = useAspT();
  /** A valid `#rrggbb` for the native picker (falls back to black for non-hex values). */
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';

  return (
    <div className="asp-color-field">
      <div className="asp-cf">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={[
              'asp-cf__swatch',
              value === color ? 'asp-cf__swatch--active' : '',
              color === '#ffffff' ? 'asp-cf__swatch--white' : '',
              color === 'transparent' ? 'asp-cf__swatch--transparent' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={color === 'transparent' ? undefined : { background: color }}
            aria-label={color === 'transparent' ? t('common.transparent') : t('colorField.color', { color })}
            title={color === 'transparent' ? t('common.transparent') : color}
            aria-pressed={value === color}
            onClick={() => onColorChange(color)}
          ></button>
        ))}
        <label className="asp-cf__custom" title={t('colorField.custom')}>
          <input
            type="color"
            value={pickerValue}
            onChange={(event) => onColorChange(event.currentTarget.value)}
            aria-label={t('colorField.custom')}
          />
        </label>
      </div>
    </div>
  );
}
