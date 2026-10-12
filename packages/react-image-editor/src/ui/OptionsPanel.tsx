import { type ChangeEvent, type ReactElement, useId, useState } from 'react';

import { AspIcon } from '../icons/AspIcon';
import { useAspT } from '../i18n/use-asp-t';
import { AspColorField } from './ColorField';
import { type ArtboardSize, type RedactMode, type ShapeKind } from '../engine/editor-engine';
import { type FilterMeta } from '../registry/tool-registry';
import {
  type AspAspectOption,
  type AspAspectPreset,
  type AspFilter,
  type AspTool,
} from '../types/editor.types';
import { type FontOption } from '../fonts/fonts';

export type { RedactMode } from '../engine/editor-engine';

/** Frame styles offered in the frame panel. */
export interface FrameOption {
  readonly key: string;
  readonly label: string;
}

export const FRAME_OPTIONS: readonly FrameOption[] = [
  { key: 'none', label: 'None' },
  { key: 'mat', label: 'Mat' },
  { key: 'line', label: 'Line' },
  { key: 'inset', label: 'Inset' },
  { key: 'hook', label: 'Hook' },
  { key: 'bead', label: 'Bead' },
];

export type PanelKind =
  | 'color'
  | 'transform'
  | 'annotate'
  | 'frame'
  | 'background'
  | 'magic'
  | 'ai'
  | 'select'
  | 'none';

/** Background color swatches (`transparent` clears to the checkerboard). */
export const BACKGROUND_COLORS: readonly string[] = [
  'transparent',
  '#ffffff',
  '#000000',
  '#f4f6f9',
  '#1f6feb',
  '#0b0f1a',
];

/** A named artboard / output-size preset. */
export interface ArtboardPreset {
  /** Stable id used to look up the translated label. */
  readonly key?: string;
  readonly label: string;
  readonly size: ArtboardSize;
}

/** Common social / CMS output sizes offered in the Canvas panel. */
export const ARTBOARD_PRESETS: readonly ArtboardPreset[] = [
  { key: 'square', label: 'Square 1080', size: { width: 1080, height: 1080 } },
  { key: 'portrait', label: 'Portrait 4:5', size: { width: 1080, height: 1350 } },
  { key: 'story', label: 'Story 9:16', size: { width: 1080, height: 1920 } },
  { key: 'hd', label: 'HD 16:9', size: { width: 1920, height: 1080 } },
  { key: 'og', label: 'OG 1200×630', size: { width: 1200, height: 630 } },
];

/** Named linear-gradient background presets. */
export const BACKGROUND_GRADIENTS: readonly { key?: string; label: string; colors: string[] }[] = [
  { key: 'sunset', label: 'Sunset', colors: ['#f59e0b', '#ec4899', '#7c3aed'] },
  { key: 'ocean', label: 'Ocean', colors: ['#0ea5e9', '#2563eb', '#1e3a8a'] },
  { key: 'forest', label: 'Forest', colors: ['#84cc16', '#15803d', '#064e3b'] },
];

export interface AdjustChange {
  readonly key: AspFilter;
  readonly value: number;
}

/** Preset swatch colors offered for annotations (matches the design reference). */
export const ANNOTATION_COLORS: readonly string[] = [
  '#f1416c',
  '#009ef6',
  '#50cd89',
  '#181c32',
  '#ffffff',
];

/** Shape-fill swatches — includes transparent (no fill). */
const FILL_COLORS: readonly string[] = ['transparent', ...ANNOTATION_COLORS];

export interface AspOptionsPanelProps {
  readonly activeTool: AspTool | null;
  readonly toolTitle?: string;

  // adjust
  readonly adjustmentDefs?: readonly FilterMeta[];
  readonly adjustments?: Readonly<Record<string, number>>;

  // filters (looks)
  readonly lookDefs?: readonly FilterMeta[];
  readonly activeLook?: AspFilter | null;

  // crop
  readonly aspectPresets?: readonly AspAspectPreset[];
  readonly activeCrop?: AspAspectPreset;
  readonly aspectRatios?: readonly AspAspectOption[];
  readonly activeAspectLabel?: string;

  // transform
  readonly straighten?: number;

  // annotate
  readonly annotationColor?: string;
  readonly annotationWidth?: number;
  readonly fontSize?: number;
  readonly fonts?: readonly FontOption[];
  readonly activeFont?: string;
  /** Google font family names offered as autocomplete in the "add font" box. */
  readonly googleFonts?: readonly string[];
  /** True while the chosen web font is still loading (shows a spinner). */
  readonly fontLoading?: boolean;
  /**
   * Kind of the current canvas selection (`null` when nothing is selected). When
   * the neutral Select tool is active, the panel reflects this so a selected text
   * shows its type controls and a selected shape shows fill/stroke.
   */
  readonly selectionKind?: 'text' | 'stroke' | null;
  readonly textBold?: boolean;
  readonly textItalic?: boolean;
  readonly textUnderline?: boolean;
  readonly textStrike?: boolean;
  readonly textAlign?: string;
  readonly lineHeight?: number;
  readonly letterSpacing?: number;
  /** Current rectangle corner radius (px) — drives the sharp → pill slider. */
  readonly cornerRadius?: number;
  /** Pill-cap radius: the slider's maximum for the current rectangle. */
  readonly cornerRadiusMax?: number;
  /** Show the corner-radius slider (new rectangle, or a selected rectangle). */
  readonly showCornerRadius?: boolean;
  readonly redactMode?: RedactMode;
  readonly magicTolerance?: number;
  /** True while an in-browser AI op is running (disables the button, shows progress). */
  readonly aiBusy?: boolean;
  /** AI stage label + 0–1 progress for the status line. */
  readonly aiStage?: string;
  readonly aiProgress?: number;

  readonly frameOptions?: readonly FrameOption[];
  readonly activeFrame?: string;

  /** True once a crop region is applied — enables the Reset control. */
  readonly hasCropRegion?: boolean;
  /** Current artboard size (null = full canvas), and changes to it. */
  readonly artboard?: ArtboardSize | null;

  readonly onResetRequested?: () => void;
  readonly onAdjustInput?: (change: AdjustChange) => void;
  readonly onAdjustCommit?: (change: AdjustChange) => void;
  readonly onSelectLook?: (look: AspFilter | null) => void;
  readonly onSelectCrop?: (preset: AspAspectPreset) => void;
  readonly onSelectCustomCrop?: (option: AspAspectOption) => void;
  readonly onApplyCrop?: () => void;
  readonly onCancelCrop?: () => void;
  readonly onResetCrop?: () => void;
  readonly onRotate?: (degrees: number) => void;
  readonly onFlip?: (axis: 'h' | 'v') => void;
  readonly onStraightenInput?: (value: number) => void;
  readonly onStraightenCommit?: (value: number) => void;
  readonly onAddShape?: (kind: ShapeKind) => void;
  readonly onAddText?: (text: string) => void;
  readonly onFontChange?: (font: string) => void;
  /** Add + apply a custom Google font family by name. */
  readonly onAddFont?: (name: string) => void;
  readonly onToggleBold?: () => void;
  readonly onToggleItalic?: () => void;
  readonly onToggleUnderline?: () => void;
  readonly onToggleStrike?: () => void;
  readonly onTextAlignChange?: (align: string) => void;
  readonly onLineHeightChange?: (value: number) => void;
  readonly onLetterSpacingChange?: (value: number) => void;
  readonly onTextBgChange?: (color: string) => void;
  readonly onRedactModeChange?: (mode: RedactMode) => void;
  readonly onApplyRedaction?: () => void;
  readonly onMagicToleranceChange?: (value: number) => void;
  readonly onRunAi?: () => void;
  readonly onAnnotationColorChange?: (color: string) => void;
  /** Live size change (slider drag) — apply without committing history. */
  readonly onSizeInput?: (value: number) => void;
  /** Final size change (slider release) — commit to history. */
  readonly onSizeCommit?: (value: number) => void;
  /** Live corner-radius change (slider drag). */
  readonly onCornerRadiusInput?: (value: number) => void;
  /** Final corner-radius change (slider release) — commit to history. */
  readonly onCornerRadiusCommit?: (value: number) => void;
  readonly onSelectFrame?: (key: string) => void;
  /** Switch the Color panel sub-tool (Adjust ⟷ Filters tabs). */
  readonly onRequestTool?: (tool: AspTool) => void;
  /** Fill color for the selected shape. */
  readonly onFillChange?: (color: string) => void;
  readonly onSetBackgroundColor?: (color: string) => void;
  readonly onSetBackgroundGradient?: (colors: string[]) => void;
  readonly onSetBackgroundImageFile?: (file: File) => void;
  readonly onArtboardChange?: (size: ArtboardSize | null) => void;
}

/**
 * The right-hand contextual options panel. Presentational: it renders the
 * controls for the active tool and emits intent; the container applies changes
 * to the engine. Live slider drags emit `adjustInput`; the final value emits
 * `adjustCommit` (so a drag is one undo step, not dozens).
 */
export function AspOptionsPanel({
  activeTool,
  toolTitle = '',
  adjustmentDefs = [],
  adjustments = {},
  lookDefs = [],
  activeLook = null,
  aspectPresets = [],
  activeCrop = 'free',
  aspectRatios = [],
  activeAspectLabel = '',
  straighten = 0,
  annotationColor = ANNOTATION_COLORS[0],
  annotationWidth = 4,
  fontSize = 28,
  fonts = [],
  activeFont = '',
  googleFonts = [],
  fontLoading = false,
  selectionKind = null,
  textBold = false,
  textItalic = false,
  textUnderline = false,
  textStrike = false,
  textAlign = 'left',
  lineHeight = 1.16,
  letterSpacing = 0,
  cornerRadius = 0,
  cornerRadiusMax = 55,
  showCornerRadius = false,
  redactMode = 'pixelate',
  magicTolerance = 32,
  aiBusy = false,
  aiStage = '',
  aiProgress = 0,
  frameOptions = FRAME_OPTIONS,
  activeFrame = 'none',
  hasCropRegion = false,
  artboard = null,
  onResetRequested,
  onAdjustInput,
  onAdjustCommit,
  onSelectLook,
  onSelectCrop,
  onSelectCustomCrop,
  onApplyCrop,
  onCancelCrop,
  onResetCrop,
  onRotate,
  onFlip,
  onStraightenInput,
  onStraightenCommit,
  onAddShape,
  onAddText,
  onFontChange,
  onAddFont,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onToggleStrike,
  onTextAlignChange,
  onLineHeightChange,
  onLetterSpacingChange,
  onTextBgChange,
  onRedactModeChange,
  onApplyRedaction,
  onMagicToleranceChange,
  onRunAi,
  onAnnotationColorChange,
  onSizeInput,
  onSizeCommit,
  onCornerRadiusInput,
  onCornerRadiusCommit,
  onSelectFrame,
  onRequestTool,
  onFillChange,
  onSetBackgroundColor,
  onSetBackgroundGradient,
  onSetBackgroundImageFile,
  onArtboardChange,
}: AspOptionsPanelProps): ReactElement {
  const t = useAspT();
  const filterLabel = (def: FilterMeta): string =>
    t(`filters.${def.key}`, { defaultValue: def.label });
  const [textValue, setTextValue] = useState(() => t('panel.text.defaultValue'));
  const [customFontValue, setCustomFontValue] = useState('');
  const [customW, setCustomW] = useState('1080');
  const [customH, setCustomH] = useState('1080');

  /** Unique per-instance id for the Google-fonts autocomplete datalist. */
  const googleFontsListId = useId();

  const kind: PanelKind = (() => {
    const tool = activeTool;
    if (tool === null) {
      return 'none';
    }
    // With the neutral Select tool, reflect the selection: a selected text or
    // shape shows its editing controls instead of the bare "select" hint.
    if (tool === 'select') {
      return selectionKind === 'text' || selectionKind === 'stroke' ? 'annotate' : 'select';
    }
    switch (tool) {
      case 'adjust':
      case 'filters':
        return 'color';
      case 'crop':
      case 'rotate':
      case 'straighten':
      case 'flip':
      case 'resize':
        return 'transform';
      case 'frame':
        return 'frame';
      case 'background':
        return 'background';
      case 'magicwand':
        return 'magic';
      case 'removebg':
      case 'selectsubject':
        return 'ai';
      case 'pen':
      case 'highlighter':
      case 'eraser':
      case 'shapes':
      case 'arrow':
      case 'line':
      case 'text':
      case 'sticker':
      case 'redact':
        return 'annotate';
      default:
        return 'none';
    }
  })();

  const isColorFilters = activeTool === 'filters';

  /** True for the Text tool, or a selected text under the Select tool. */
  const isText = activeTool === 'text' || (activeTool === 'select' && selectionKind === 'text');
  /** True for the Shapes tool, or a selected shape under the Select tool. */
  const isShape =
    activeTool === 'shapes' || (activeTool === 'select' && selectionKind === 'stroke');
  const isRedact = activeTool === 'redact';
  /** Label for the AI action button, by which AI tool is active. */
  const aiActionLabel = activeTool === 'selectsubject' ? t('tools.selectsubject') : t('tools.removebg');
  const aiPercent = Math.round(aiProgress * 100);
  /** Whether the panel is reflecting a selection rather than an active tool. */
  const fromSelection = activeTool === 'select';

  const strokeLabel = isText ? t('panel.draw.fontSize') : t('panel.draw.thickness');
  const sizeValue = isText ? fontSize : annotationWidth;
  const sizeMin = isText ? 8 : 1;
  const sizeMax = isText ? 120 : 48;

  const displayValue = (def: FilterMeta): string => {
    const value = adjustments[def.key] ?? def.defaultValue ?? 0;
    if (def.unit) {
      return `${value}${def.unit}`;
    }
    return String(value);
  };

  const valueOf = (def: FilterMeta): number => adjustments[def.key] ?? def.defaultValue ?? 0;

  /** True when the given preset is the active artboard (exact W×H match). */
  const isArtboardActive = (size: ArtboardSize): boolean =>
    artboard !== null && artboard.width === size.width && artboard.height === size.height;

  /** Apply the custom width/height, clamped to a sane 1–10000px range. */
  const applyCustomArtboard = (): void => {
    const w = Math.round(Number(customW));
    const h = Math.round(Number(customH));
    if (Number.isFinite(w) && Number.isFinite(h) && w >= 1 && h >= 1 && w <= 10000 && h <= 10000) {
      onArtboardChange?.({ width: w, height: h });
    }
  };

  const handleAddFont = (): void => {
    const name = customFontValue.trim();
    if (name.length > 0) {
      onAddFont?.(name);
      setCustomFontValue('');
    }
  };

  const handleAddText = (): void => {
    const text = textValue.trim();
    onAddText?.(text.length > 0 ? text : t('panel.text.fallback'));
  };

  const handleBackgroundImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file) {
      onSetBackgroundImageFile?.(file);
    }
    input.value = '';
  };

  return (
    <div className="asp-options-panel">
      <div className="asp-panel__head">
        <div className="asp-panel__title">{toolTitle}</div>
        <button type="button" className="asp-panel__reset" onClick={() => onResetRequested?.()}>
          <AspIcon name="rotate-ccw" size={13} /> {t('common.reset')}
        </button>
      </div>

      <div className="asp-panel__body">
        {kind === 'color' && (
          <>
            <div className="asp-tabs">
              <button
                type="button"
                className={`asp-tab${!isColorFilters ? ' asp-tab--active' : ''}`}
                onClick={() => onRequestTool?.('adjust')}
              >
                {t('tools.adjust')}
              </button>
              <button
                type="button"
                className={`asp-tab${isColorFilters ? ' asp-tab--active' : ''}`}
                onClick={() => onRequestTool?.('filters')}
              >
                {t('tools.filters')}
              </button>
            </div>

            {!isColorFilters ? (
              <div className="asp-stack">
                {adjustmentDefs.map((def) => (
                  <div key={def.key}>
                    <div className="asp-field-row">
                      <span className="asp-field-label">{filterLabel(def)}</span>
                      <span className="asp-field-value">{displayValue(def)}</span>
                    </div>
                    <input
                      type="range"
                      className="asp-range"
                      min={def.min ?? 0}
                      max={def.max ?? 100}
                      value={valueOf(def)}
                      onChange={(event) =>
                        onAdjustInput?.({ key: def.key, value: Number(event.currentTarget.value) })
                      }
                      onPointerUp={(event) =>
                        onAdjustCommit?.({ key: def.key, value: Number(event.currentTarget.value) })
                      }
                      onKeyUp={(event) =>
                        onAdjustCommit?.({ key: def.key, value: Number(event.currentTarget.value) })
                      }
                      onBlur={(event) =>
                        onAdjustCommit?.({ key: def.key, value: Number(event.currentTarget.value) })
                      }
                      aria-label={filterLabel(def)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="asp-filter-grid">
                <button
                  type="button"
                  className={`asp-filter${activeLook === null ? ' asp-filter--active' : ''}`}
                  onClick={() => onSelectLook?.(null)}
                >
                  <span className="asp-filter__thumb asp-filter__thumb--none"></span>
                  <span className="asp-filter__label">{t('common.original')}</span>
                </button>
                {lookDefs.map((def) => (
                  <button
                    key={def.key}
                    type="button"
                    className={`asp-filter${activeLook === def.key ? ' asp-filter--active' : ''}`}
                    onClick={() => onSelectLook?.(def.key)}
                  >
                    <span className="asp-filter__thumb" data-look={def.key}></span>
                    <span className="asp-filter__label">{filterLabel(def)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {kind === 'transform' && (
          <div className="asp-stack">
            <div>
              <div className="asp-section-label">{t('editor.aspectRatio')}</div>
              <div className="asp-chip-row">
                {aspectPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`asp-chip${
                      activeCrop === preset && !activeAspectLabel ? ' asp-chip--active' : ''
                    }`}
                    onClick={() => onSelectCrop?.(preset)}
                  >
                    {preset === 'free' ? t('common.free') : preset === 'original' ? t('common.original') : preset}
                  </button>
                ))}
                {aspectRatios.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className={`asp-chip${
                      activeAspectLabel === option.label ? ' asp-chip--active' : ''
                    }`}
                    onClick={() => onSelectCustomCrop?.(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="asp-hint">
              <AspIcon name="info" size={13} /> {t('panel.crop.hint')}
            </p>
            <div className="asp-btn-row">
              <button type="button" className="asp-btn-accent" onClick={() => onApplyCrop?.()}>
                {t('panel.crop.apply')}
              </button>
              <button type="button" className="asp-btn-line" onClick={() => onCancelCrop?.()}>
                {t('common.cancel')}
              </button>
            </div>
            {hasCropRegion && (
              <button type="button" className="asp-btn-line" onClick={() => onResetCrop?.()}>
                {t('panel.crop.reset')}
              </button>
            )}

            <div className="asp-section-label asp-mt">{t('panel.crop.rotateFlip')}</div>
            <div className="asp-btn-row">
              <button type="button" className="asp-btn-line" onClick={() => onRotate?.(-90)}>
                <AspIcon name="rotate-ccw" size={16} /> 90°
              </button>
              <button type="button" className="asp-btn-line" onClick={() => onRotate?.(90)}>
                <AspIcon name="rotate-cw" size={16} /> 90°
              </button>
            </div>
            <div className="asp-btn-row">
              <button type="button" className="asp-btn-line" onClick={() => onFlip?.('h')}>
                <AspIcon name="flip-horizontal-2" size={16} /> {t('panel.crop.flipH')}
              </button>
              <button type="button" className="asp-btn-line" onClick={() => onFlip?.('v')}>
                <AspIcon name="flip-vertical-2" size={16} /> {t('panel.crop.flipV')}
              </button>
            </div>
            <div>
              <div className="asp-field-row">
                <span className="asp-field-label">{t('panel.crop.straighten')}</span>
                <span className="asp-field-value">{straighten}°</span>
              </div>
              <input
                type="range"
                className="asp-range"
                min={-45}
                max={45}
                value={straighten}
                onChange={(event) => onStraightenInput?.(Number(event.currentTarget.value))}
                onPointerUp={(event) => onStraightenCommit?.(Number(event.currentTarget.value))}
                onKeyUp={(event) => onStraightenCommit?.(Number(event.currentTarget.value))}
                onBlur={(event) => onStraightenCommit?.(Number(event.currentTarget.value))}
                aria-label={t('panel.crop.straightenAngle')}
              />
            </div>
          </div>
        )}

        {kind === 'annotate' && (
          <div className="asp-stack">
            {isText && (
              <>
                {!fromSelection && (
                  <>
                    <p className="asp-hint">
                      <AspIcon name="info" size={13} /> {t('panel.text.hint')}
                    </p>
                    <div>
                      <label className="asp-field-label" htmlFor="asp-text-input">
                        {t('panel.text.label')}
                      </label>
                      <div className="asp-text-add">
                        <input
                          id="asp-text-input"
                          className="asp-input"
                          value={textValue}
                          onChange={(event) => setTextValue(event.currentTarget.value)}
                        />
                        <button type="button" className="asp-btn-accent" onClick={handleAddText}>
                          {t('common.add')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {fonts.length > 0 && (
                  <div>
                    <div className="asp-field-row">
                      <label className="asp-field-label" htmlFor="asp-font-select">
                        {t('panel.text.font')}
                      </label>
                      {fontLoading && (
                        <span className="asp-font-loading">
                          <span className="asp-spinner" aria-hidden="true"></span> {t('common.loading')}
                        </span>
                      )}
                    </div>
                    <select
                      id="asp-font-select"
                      className="asp-input asp-select"
                      value={activeFont}
                      onChange={(event) => onFontChange?.(event.currentTarget.value)}
                    >
                      {fonts.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                    <div className="asp-text-add asp-mt">
                      <input
                        className="asp-input"
                        list={googleFontsListId}
                        placeholder={t('panel.text.searchFonts')}
                        value={customFontValue}
                        onChange={(event) => setCustomFontValue(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            handleAddFont();
                          }
                        }}
                        aria-label={t('panel.text.searchFontsAria')}
                      />
                      <datalist id={googleFontsListId}>
                        {googleFonts.map((name) => (
                          <option key={name} value={name}></option>
                        ))}
                      </datalist>
                      <button type="button" className="asp-btn-line" onClick={handleAddFont}>
                        {t('common.add')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="asp-btn-row">
                  <button
                    type="button"
                    className={`asp-icon-btn${textBold ? ' asp-icon-btn--on' : ''}`}
                    title={t('panel.text.bold')}
                    onClick={() => onToggleBold?.()}
                  >
                    <AspIcon name="bold" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`asp-icon-btn${textItalic ? ' asp-icon-btn--on' : ''}`}
                    title={t('panel.text.italic')}
                    onClick={() => onToggleItalic?.()}
                  >
                    <AspIcon name="italic" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`asp-icon-btn${textUnderline ? ' asp-icon-btn--on' : ''}`}
                    title={t('panel.text.underline')}
                    onClick={() => onToggleUnderline?.()}
                  >
                    <AspIcon name="underline" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`asp-icon-btn${textStrike ? ' asp-icon-btn--on' : ''}`}
                    title={t('panel.text.strikethrough')}
                    onClick={() => onToggleStrike?.()}
                  >
                    <AspIcon name="strikethrough" size={16} />
                  </button>
                </div>
                <div className="asp-btn-row">
                  <button
                    type="button"
                    className={`asp-icon-btn${textAlign === 'left' ? ' asp-icon-btn--on' : ''}`}
                    title={t('panel.text.alignLeft')}
                    onClick={() => onTextAlignChange?.('left')}
                  >
                    <AspIcon name="align-left" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`asp-icon-btn${textAlign === 'center' ? ' asp-icon-btn--on' : ''}`}
                    title={t('panel.text.alignCenter')}
                    onClick={() => onTextAlignChange?.('center')}
                  >
                    <AspIcon name="align-center" size={16} />
                  </button>
                  <button
                    type="button"
                    className={`asp-icon-btn${textAlign === 'right' ? ' asp-icon-btn--on' : ''}`}
                    title={t('panel.text.alignRight')}
                    onClick={() => onTextAlignChange?.('right')}
                  >
                    <AspIcon name="align-right" size={16} />
                  </button>
                </div>
                <div>
                  <div className="asp-field-row">
                    <span className="asp-field-label">{t('panel.text.lineHeight')}</span>
                    <span className="asp-field-value">{lineHeight.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="asp-range"
                    min={80}
                    max={300}
                    value={lineHeight * 100}
                    onChange={(event) =>
                      onLineHeightChange?.(Number(event.currentTarget.value) / 100)
                    }
                    aria-label={t('panel.text.lineHeight')}
                  />
                </div>
                <div>
                  <div className="asp-field-row">
                    <span className="asp-field-label">{t('panel.text.letterSpacing')}</span>
                    <span className="asp-field-value">{letterSpacing}</span>
                  </div>
                  <input
                    type="range"
                    className="asp-range"
                    min={-50}
                    max={800}
                    value={letterSpacing}
                    onChange={(event) => onLetterSpacingChange?.(Number(event.currentTarget.value))}
                    aria-label={t('panel.text.letterSpacing')}
                  />
                </div>
                <div>
                  <span className="asp-field-label">{t('panel.text.background')}</span>
                  <div className="asp-mt">
                    <AspColorField
                      colors={FILL_COLORS}
                      value=""
                      onColorChange={(color) => onTextBgChange?.(color)}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <span className="asp-field-label">{isText ? t('panel.draw.textColor') : t('panel.draw.color')}</span>
              <div className="asp-mt">
                <AspColorField
                  colors={ANNOTATION_COLORS}
                  value={annotationColor}
                  onColorChange={(color) => onAnnotationColorChange?.(color)}
                />
              </div>
            </div>

            {isShape && (
              <div>
                <span className="asp-field-label">{t('panel.draw.fill')}</span>
                <div className="asp-mt">
                  <AspColorField
                    colors={FILL_COLORS}
                    value=""
                    onColorChange={(color) => onFillChange?.(color)}
                  />
                </div>
              </div>
            )}

            <div>
              <div className="asp-field-row">
                <span className="asp-field-label">{strokeLabel}</span>
                <span className="asp-field-value">{sizeValue} px</span>
              </div>
              <input
                type="range"
                className="asp-range"
                min={sizeMin}
                max={sizeMax}
                value={sizeValue}
                onChange={(event) => onSizeInput?.(Number(event.currentTarget.value))}
                onPointerUp={(event) => onSizeCommit?.(Number(event.currentTarget.value))}
                onKeyUp={(event) => onSizeCommit?.(Number(event.currentTarget.value))}
                onBlur={(event) => onSizeCommit?.(Number(event.currentTarget.value))}
                aria-label={strokeLabel}
              />
            </div>

            {showCornerRadius && (
              <div>
                <div className="asp-field-row">
                  <span className="asp-field-label">{t('panel.draw.cornerRadius')}</span>
                  <span className="asp-field-value">{cornerRadius} px</span>
                </div>
                <input
                  type="range"
                  className="asp-range"
                  min={0}
                  max={cornerRadiusMax}
                  value={cornerRadius}
                  onChange={(event) => onCornerRadiusInput?.(Number(event.currentTarget.value))}
                  onPointerUp={(event) => onCornerRadiusCommit?.(Number(event.currentTarget.value))}
                  onKeyUp={(event) => onCornerRadiusCommit?.(Number(event.currentTarget.value))}
                  onBlur={(event) => onCornerRadiusCommit?.(Number(event.currentTarget.value))}
                  aria-label={t('panel.draw.cornerRadius')}
                />
              </div>
            )}

            {isShape && !fromSelection && (
              <div className="asp-shape-grid">
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.rectangle')}
                  onClick={() => onAddShape?.('rect')}
                >
                  <AspIcon name="square" size={17} />
                </button>
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.ellipse')}
                  onClick={() => onAddShape?.('ellipse')}
                >
                  <AspIcon name="circle" size={17} />
                </button>
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.triangle')}
                  onClick={() => onAddShape?.('triangle')}
                >
                  <AspIcon name="triangle" size={17} />
                </button>
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.diamond')}
                  onClick={() => onAddShape?.('diamond')}
                >
                  <AspIcon name="diamond" size={17} />
                </button>
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.pentagon')}
                  onClick={() => onAddShape?.('pentagon')}
                >
                  <AspIcon name="pentagon" size={17} />
                </button>
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.hexagon')}
                  onClick={() => onAddShape?.('hexagon')}
                >
                  <AspIcon name="hexagon" size={17} />
                </button>
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.star')}
                  onClick={() => onAddShape?.('star')}
                >
                  <AspIcon name="star" size={17} />
                </button>
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.line')}
                  onClick={() => onAddShape?.('line')}
                >
                  <AspIcon name="minus" size={17} />
                </button>
                <button
                  type="button"
                  className="asp-icon-btn"
                  title={t('panel.shape.arrow')}
                  onClick={() => onAddShape?.('arrow')}
                >
                  <AspIcon name="arrow-up-right" size={17} />
                </button>
              </div>
            )}

            {isRedact && (
              <>
                <div className="asp-chip-row">
                  <button
                    type="button"
                    className={`asp-chip${redactMode === 'blur' ? ' asp-chip--active' : ''}`}
                    onClick={() => onRedactModeChange?.('blur')}
                  >
                    {t('panel.redact.blur')}
                  </button>
                  <button
                    type="button"
                    className={`asp-chip${redactMode === 'pixelate' ? ' asp-chip--active' : ''}`}
                    onClick={() => onRedactModeChange?.('pixelate')}
                  >
                    {t('panel.redact.pixelate')}
                  </button>
                  <button
                    type="button"
                    className={`asp-chip${redactMode === 'solid' ? ' asp-chip--active' : ''}`}
                    onClick={() => onRedactModeChange?.('solid')}
                  >
                    {t('panel.redact.solid')}
                  </button>
                </div>
                <button
                  type="button"
                  className="asp-btn-accent asp-redact-apply"
                  onClick={() => onApplyRedaction?.()}
                >
                  {t('panel.redact.apply')}
                </button>
              </>
            )}

            <p className="asp-hint">
              <AspIcon name="info" size={13} />{' '}
              {fromSelection ? (
                <>
                  {isText ? t('panel.hint.editingText') : t('panel.hint.editingObject')}
                </>
              ) : isShape ? (
                <>{t('panel.hint.shape')}</>
              ) : isRedact ? (
                <>
                  {t('panel.hint.redact')}
                </>
              ) : isText ? (
                <>{t('panel.hint.text')}</>
              ) : (
                <>{t('panel.hint.draw')}</>
              )}
            </p>
          </div>
        )}

        {kind === 'frame' && (
          <div className="asp-stack">
            <div className="asp-frame-grid">
              {frameOptions.map((frame) => (
                <button
                  key={frame.key}
                  type="button"
                  className={`asp-chip asp-frame${
                    activeFrame === frame.key ? ' asp-chip--active' : ''
                  }`}
                  onClick={() => onSelectFrame?.(frame.key)}
                >
                  {t(`frames.${frame.key}`, { defaultValue: frame.label })}
                </button>
              ))}
            </div>
            <div>
              <span className="asp-field-label">{t('panel.frame.color')}</span>
              <div className="asp-mt">
                <AspColorField
                  colors={ANNOTATION_COLORS}
                  value={annotationColor}
                  onColorChange={(color) => onAnnotationColorChange?.(color)}
                />
              </div>
            </div>
          </div>
        )}

        {kind === 'background' && (
          <div className="asp-stack">
            <div>
              <div className="asp-section-label">{t('panel.canvas.outputSize')}</div>
              <div className="asp-chip-row">
                <button
                  type="button"
                  className={`asp-chip${artboard === null ? ' asp-chip--active' : ''}`}
                  onClick={() => onArtboardChange?.(null)}
                >
                  {t('panel.canvas.fullCanvas')}
                </button>
                {ARTBOARD_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={`asp-chip${isArtboardActive(preset.size) ? ' asp-chip--active' : ''}`}
                    onClick={() => onArtboardChange?.(preset.size)}
                  >
                    {preset.key ? t(`presets.${preset.key}`, { defaultValue: preset.label }) : preset.label}
                  </button>
                ))}
              </div>
              <div className="asp-dim-row">
                <input
                  type="number"
                  className="asp-dim-input"
                  min={1}
                  max={10000}
                  aria-label={t('panel.canvas.widthAria')}
                  value={customW}
                  onChange={(event) => setCustomW(event.currentTarget.value)}
                />
                <span className="asp-dim-x">×</span>
                <input
                  type="number"
                  className="asp-dim-input"
                  min={1}
                  max={10000}
                  aria-label={t('panel.canvas.heightAria')}
                  value={customH}
                  onChange={(event) => setCustomH(event.currentTarget.value)}
                />
                <button type="button" className="asp-btn-line" onClick={applyCustomArtboard}>
                  {t('common.set')}
                </button>
              </div>
            </div>
            <div>
              <div className="asp-section-label">{t('panel.canvas.color')}</div>
              <AspColorField
                colors={BACKGROUND_COLORS}
                value=""
                onColorChange={(color) => onSetBackgroundColor?.(color)}
              />
            </div>
            <div>
              <div className="asp-section-label">{t('panel.canvas.gradient')}</div>
              <div className="asp-chip-row">
                {BACKGROUND_GRADIENTS.map((gradient) => (
                  <button
                    key={gradient.label}
                    type="button"
                    className="asp-chip"
                    onClick={() => onSetBackgroundGradient?.(gradient.colors)}
                  >
                    {gradient.key ? t(`gradients.${gradient.key}`, { defaultValue: gradient.label }) : gradient.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="asp-section-label">{t('panel.canvas.image')}</div>
              <label className="asp-upload">
                <AspIcon name="image-plus" size={15} /> {t('panel.canvas.uploadImage')}
                <input type="file" accept="image/*" onChange={handleBackgroundImage} />
              </label>
            </div>
          </div>
        )}

        {kind === 'ai' && (
          <div className="asp-stack">
            <p className="asp-hint">
              <AspIcon name="info" size={13} /> {t('panel.ai.hint', { action: aiActionLabel })}
            </p>
            <button
              type="button"
              className="asp-btn-accent asp-redact-apply"
              disabled={aiBusy}
              onClick={() => onRunAi?.()}
            >
              {aiBusy ? t('panel.ai.working') : aiActionLabel}
            </button>
            {aiBusy && (
              <div>
                <div className="asp-field-row">
                  <span className="asp-field-label">
                    {aiStage === 'loading' ? t('panel.ai.downloading') : t('panel.ai.processing')}
                  </span>
                  <span className="asp-field-value">{aiPercent}%</span>
                </div>
                <div className="asp-ai-bar">
                  <span style={{ width: `${aiProgress * 100}%` }}></span>
                </div>
              </div>
            )}
          </div>
        )}

        {kind === 'magic' && (
          <div className="asp-stack">
            <p className="asp-hint">
              <AspIcon name="info" size={13} /> {t('panel.magic.hint')}
            </p>
            <div>
              <div className="asp-field-row">
                <span className="asp-field-label">{t('panel.magic.tolerance')}</span>
                <span className="asp-field-value">{magicTolerance}</span>
              </div>
              <input
                type="range"
                className="asp-range"
                min={1}
                max={100}
                value={magicTolerance}
                onChange={(event) => onMagicToleranceChange?.(Number(event.currentTarget.value))}
                aria-label={t('panel.magic.toleranceAria')}
              />
            </div>
          </div>
        )}

        {kind === 'select' && (
          <p className="asp-hint">
            <AspIcon name="info" size={13} /> {t('panel.select.hint')}
          </p>
        )}

        {kind === 'none' && <p className="asp-hint">{t('panel.none.hint')}</p>}
      </div>
    </div>
  );
}
