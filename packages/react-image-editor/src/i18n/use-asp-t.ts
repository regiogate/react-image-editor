import { useContext } from 'react';
import { I18nContext, useTranslation } from 'react-i18next';

import { ASP_NAMESPACE, getFallbackEditorI18n } from './index';

/** Translate function bound to the editor namespace. */
export type AspTranslate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Translate hook for editor components. Uses the instance provided by the
 * surrounding `<ImageEditor>`; outside one (e.g. a standalone panel) it falls
 * back to a shared English instance instead of the host app's global i18next.
 */
export function useAspT(): AspTranslate {
  const context = useContext(I18nContext);
  const { t } = useTranslation(ASP_NAMESPACE, { i18n: context?.i18n ?? getFallbackEditorI18n() });
  return t as unknown as AspTranslate;
}
