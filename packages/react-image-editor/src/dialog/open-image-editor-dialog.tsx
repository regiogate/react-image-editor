import { createRoot } from 'react-dom/client';

import { type AspMessageOverrides } from '../i18n';
import { type AspThemeMode } from '../theme/derive-theme';
import { type AspAspectPreset, type AspExportFormat } from '../types/editor.types';
import { ImageEditor } from '../ui/ImageEditor';

/** Options for {@link openImageEditorDialog}. */
export interface OpenImageEditorConfig {
  readonly src?: string | Blob | null;
  readonly heading?: string;
  /** UI language (`'en'` or `'de'` built in). */
  readonly locale?: string;
  /** Extra languages or per-string overrides, keyed by language code. */
  readonly messages?: AspMessageOverrides;
  readonly baseColor?: string;
  readonly accentColor?: string;
  readonly themeMode?: AspThemeMode;
  readonly aspectPresets?: readonly AspAspectPreset[];
  /** Aspect the crop opens constrained to (e.g. `'1:1'` for an avatar). */
  readonly initialAspect?: AspAspectPreset;
  readonly exportFormats?: readonly AspExportFormat[];
}

/**
 * Opens the editor's `basic` layout in a modal overlay and resolves with the
 * saved image Blob, or `null` if the user cancels (close button, scrim click,
 * or Escape). Implemented with a dedicated React root on a detached scrim so
 * it works from any event handler without a host component.
 */
export function openImageEditorDialog(config: OpenImageEditorConfig = {}): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    const scrim = document.createElement('div');
    scrim.setAttribute('role', 'dialog');
    scrim.setAttribute('aria-modal', 'true');
    Object.assign(scrim.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(2px)',
    } satisfies Partial<CSSStyleDeclaration>);

    const card = document.createElement('div');
    card.style.width = '520px';
    card.style.maxWidth = '100%';
    card.style.maxHeight = 'calc(100vh - 48px)';
    card.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.4)';
    card.style.borderRadius = '14px';
    card.style.overflow = 'hidden';
    scrim.appendChild(card);
    document.body.appendChild(scrim);

    const root = createRoot(card);

    let settled = false;
    const finish = (result: Blob | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      document.removeEventListener('keydown', onKeydown);
      // Defer unmount out of the React event that triggered finish() —
      // unmounting synchronously from inside a render/event is not allowed.
      queueMicrotask(() => {
        root.unmount();
        scrim.remove();
      });
      resolve(result);
    };

    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        finish(null);
      }
    };
    scrim.addEventListener('mousedown', (event) => {
      if (event.target === scrim) {
        finish(null);
      }
    });
    document.addEventListener('keydown', onKeydown);

    root.render(
      <ImageEditor
        mode="basic"
        src={config.src ?? null}
        {...(config.heading ? { heading: config.heading } : {})}
        {...(config.locale ? { locale: config.locale } : {})}
        {...(config.messages ? { messages: config.messages } : {})}
        baseColor={config.baseColor ?? '#f4f6f9'}
        accentColor={config.accentColor ?? '#1f6feb'}
        themeMode={config.themeMode ?? 'light'}
        {...(config.aspectPresets ? { aspectPresets: config.aspectPresets } : {})}
        {...(config.initialAspect ? { initialAspect: config.initialAspect } : {})}
        {...(config.exportFormats ? { exportFormats: config.exportFormats } : {})}
        onSaved={(blob) => finish(blob)}
        onCanceled={() => finish(null)}
      />,
    );
  });
}
