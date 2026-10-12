/**
 * Internationalisation for the image editor, built on i18next / react-i18next.
 *
 * The editor owns an isolated i18next instance (never the host app's global
 * one), so it can be dropped into any app. Hosts can pick a `locale`, override
 * individual strings via `messages`, or hand over their own i18next instance
 * (the editor then registers its bundles under the `imageEditor` namespace).
 */

import i18next, { type i18n as I18n, type InitOptions } from 'i18next';

import { de } from './locales/de';
import { en, type AspMessages } from './locales/en';

export { en, de };
export type { AspMessages };

/** i18next namespace all editor messages live in. */
export const ASP_NAMESPACE = 'imageEditor';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

/** Per-language message overrides / additional languages supplied by the host. */
export type AspMessageOverrides = Record<string, DeepPartial<AspMessages>>;

/** The languages that ship with the editor. */
export const ASP_BUILTIN_MESSAGES: Readonly<Record<string, AspMessages>> = { en, de };

/** Register the built-in bundles plus host overrides on an i18next instance. */
export function registerEditorMessages(instance: I18n, overrides?: AspMessageOverrides): void {
  // Built-ins never clobber bundles the host may already have registered.
  for (const [lng, bundle] of Object.entries(ASP_BUILTIN_MESSAGES)) {
    instance.addResourceBundle(lng, ASP_NAMESPACE, bundle, true, false);
  }
  // Host overrides always win.
  for (const [lng, bundle] of Object.entries(overrides ?? {})) {
    instance.addResourceBundle(lng, ASP_NAMESPACE, bundle, true, true);
  }
}

/** Create an isolated i18next instance for one editor. */
export function createEditorI18n(locale = 'de', overrides?: AspMessageOverrides): I18n {
  const instance = i18next.createInstance();
  const options = {
    lng: locale,
    fallbackLng: 'de',
    ns: [ASP_NAMESPACE],
    defaultNS: ASP_NAMESPACE,
    resources: {},
    interpolation: { escapeValue: false },
    // Resources are bundled, so initialise synchronously (name differs across
    // i18next majors: `initImmediate` ≤ v23, `initAsync` ≥ v24).
    initImmediate: false,
    initAsync: false,
  } as InitOptions;
  void instance.init(options);
  registerEditorMessages(instance, overrides);
  return instance;
}

let fallbackInstance: I18n | null = null;

/** Shared English instance for editor parts rendered outside an `<ImageEditor>`. */
export function getFallbackEditorI18n(): I18n {
  if (!fallbackInstance) {
    fallbackInstance = createEditorI18n('en');
  }
  return fallbackInstance;
}
