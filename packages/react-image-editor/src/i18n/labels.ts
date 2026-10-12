import { FILTER_REGISTRY } from '../registry/tool-registry';
import type { AspTranslate } from './use-asp-t';

/** English history labels emitted by the engine → message keys under `history.*`. */
const HISTORY_KEYS: Readonly<Record<string, string>> = {
  'Opened image': 'openedImage',
  'Loaded template': 'loadedTemplate',
  'Add guide': 'addGuide',
  'Add shape': 'addShape',
  'Add text': 'addText',
  Adjust: 'adjust',
  Align: 'align',
  'Background image': 'backgroundImage',
  Background: 'background',
  'Clear guides': 'clearGuides',
  'Corner radius': 'cornerRadius',
  Crop: 'crop',
  'Delete layer': 'deleteLayer',
  Delete: 'delete',
  Draw: 'draw',
  Fill: 'fill',
  Frame: 'frame',
  Group: 'group',
  'Magic erase': 'magicErase',
  'Move guide': 'moveGuide',
  Opacity: 'opacity',
  'Paste image': 'pasteImage',
  Paste: 'paste',
  Duplicate: 'duplicate',
  Redact: 'redact',
  'Remove guide': 'removeGuide',
  'Rename layer': 'renameLayer',
  'Reorder layer': 'reorderLayer',
  'Reorder layers': 'reorderLayers',
  Restyle: 'restyle',
  Straighten: 'straighten',
  'Text style': 'textStyle',
  Text: 'text',
  'Toggle visibility': 'toggleVisibility',
  Ungroup: 'ungroup',
  'Rotate right': 'rotateRight',
  'Rotate left': 'rotateLeft',
  'Lock layer': 'lockLayer',
  'Unlock layer': 'unlockLayer',
  'Remove background': 'removeBackground',
  'Cut out subject': 'cutOutSubject',
  'Flip H': 'flipH',
  'Flip V': 'flipV',
};

/** Translate an engine history label (they are stored in English). */
export function translateHistoryLabel(t: AspTranslate, label: string): string {
  const key = HISTORY_KEYS[label];
  if (key) {
    return t(`history.${key}`, { defaultValue: label });
  }
  const filter = /^Filter: (.+)$/.exec(label);
  if (filter?.[1]) {
    const name = filter[1];
    const meta = Object.values(FILTER_REGISTRY).find((f) => f.label === name);
    const translated = meta ? t(`filters.${meta.key}`, { defaultValue: name }) : name;
    return t('history.filter', { name: translated, defaultValue: label });
  }
  return label;
}

/** English default layer names derived by the engine → message keys under `layerNames.*`. */
const LAYER_NAME_KEYS: Readonly<Record<string, string>> = {
  Frame: 'frame',
  Redaction: 'redaction',
  Background: 'background',
  Image: 'image',
  Text: 'text',
  Rectangle: 'rectangle',
  Ellipse: 'ellipse',
  Line: 'line',
  Group: 'group',
  Drawing: 'drawing',
  Object: 'object',
};

/** Translate a layer row label when it is one of the engine's default names. */
export function translateLayerName(t: AspTranslate, label: string): string {
  const key = LAYER_NAME_KEYS[label];
  return key ? t(`layerNames.${key}`, { defaultValue: label }) : label;
}
