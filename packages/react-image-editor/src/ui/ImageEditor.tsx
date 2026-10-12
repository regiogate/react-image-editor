import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactElement,
} from 'react';
import type { i18n as I18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';

import {
  createEditorI18n,
  getFallbackEditorI18n,
  registerEditorMessages,
  type AspMessageOverrides,
} from '../i18n';
import { useAspT } from '../i18n/use-asp-t';
import { type ArtboardSize } from '../engine/editor-engine';
import { type AspBackgroundRemovalLoader, type AspHeicDecoderLoader } from '../engine/loaders';
import { applyTheme } from '../theme/apply-theme';
import { deriveTheme, type AspThemeMode } from '../theme/derive-theme';
import { AspIcon } from '../icons/AspIcon';
import { FILTER_REGISTRY, TOOL_REGISTRY, type FilterMeta, type ToolMeta } from '../registry/tool-registry';
import { resolveGroups, type ResolvedGroup } from '../registry/toolbar-groups';
import type {
  AspAspectOption,
  AspAspectPreset,
  AspEditorError,
  AspExportFormat,
  AspExportTarget,
  AspFilter,
  AspMode,
  AspSize,
  AspTool,
} from '../types/editor.types';
import { DEFAULT_FONTS, GOOGLE_FONTS, type FontOption } from '../fonts/fonts';
import { useEditorController, type EditorBinding } from '../controller/use-editor-controller';
import { AspHistoryList } from './HistoryList';
import { AspLayerList } from './LayerList';
import { AspOptionsPanel, FRAME_OPTIONS } from './OptionsPanel';
import { AspToolRail } from './ToolRail';

const FALLBACK_BASE = '#f4f6f9';
const FALLBACK_ACCENT = '#1f6feb';

/**
 * Minimum host size per mode, so the chrome (rail, options panel, layers,
 * top bar) always has room to render no matter what size the host requests.
 * `advanced`/`full` carry the rail + canvas + options column; the simpler
 * modes need much less.
 */
const MODE_MIN: Record<AspMode, { width: string; height: string }> = {
  viewer: { width: '240px', height: '200px' },
  basic: { width: '300px', height: '360px' },
  advanced: { width: '640px', height: '460px' },
  full: { width: '640px', height: '460px' },
};

/**
 * Width the `basic` (dialog card) layout hugs by default. MUST stay in sync with
 * `.asp-basic { max-width }` in the stylesheet. `basic` is a self-contained card,
 * so the host sizes to this rather than stretching to fill (and paint) its
 * container — otherwise, mounted in a modal scrim, the host becomes a
 * full-viewport baseColor panel sitting behind the card.
 */
const BASIC_DIALOG_WIDTH = '520px';

/** Resolve a host-supplied size to a CSS length (number → px), or a fallback. */
function toCssSize(value: AspSize | null | undefined, fallback: string): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return typeof value === 'number' ? `${value}px` : value;
}

export interface ImageEditorProps {
  readonly src?: string | Blob | null;
  readonly mode?: AspMode;
  /**
   * Editor width — a number (px) or any CSS length (`'70%'`, `'80vh'`,
   * `'calc(100vw - 320px)'`). Defaults to filling the host's container. A
   * per-mode minimum is always enforced so the chrome stays usable.
   */
  readonly width?: AspSize | null;
  /** Editor height — same shape as {@link ImageEditorProps.width}. */
  readonly height?: AspSize | null;
  readonly tools?: readonly AspTool[] | null;
  readonly disabledTools?: readonly AspTool[];
  readonly filters?: readonly AspFilter[] | 'all' | null;
  readonly aspectPresets?: readonly AspAspectPreset[];
  /**
   * Aspect the crop starts at. When set, the editor opens already constrained to
   * it (in basic mode the crop frame is live immediately; in advanced/full it is
   * the crop tool's starting aspect). When unset, a sole non-`free` preset is
   * auto-selected, otherwise the crop opens unconstrained (`free`).
   */
  readonly initialAspect?: AspAspectPreset | null;
  /** Host-defined crop aspect targets (e.g. CMS sizes); shown after the presets. */
  readonly aspectRatios?: readonly AspAspectOption[];
  readonly exportFormats?: readonly AspExportFormat[];
  readonly exportQuality?: number;
  /**
   * Pixel size a cropped export should be rendered at, e.g. `{width: 1000,
   * height: 1000}` for a profile photo. Without it a crop exports at the source
   * image's own resolution; with it the export is that size, capped at the
   * source's real pixels (the editor never upscales). An {@link aspectRatios}
   * option carrying `width`/`height` overrides this while it is selected.
   */
  readonly exportTarget?: AspExportTarget | null;
  readonly baseColor?: string;
  readonly accentColor?: string;
  readonly themeMode?: AspThemeMode;
  /** Heading shown by the `basic` modal layout (defaults to the translated "Edit image"). */
  readonly heading?: string;
  /**
   * UI language (BCP 47, e.g. `'de'`, `'en'`). Ships with `en` and `de`; add or
   * adjust languages via `messages`. Ignored when `i18n` is provided (the host
   * instance decides the language). Defaults to `'en'`.
   */
  readonly locale?: string;
  /** Extra languages or per-string overrides, keyed by language code. */
  readonly messages?: AspMessageOverrides;
  /**
   * Use the host app's i18next instance instead of the editor's own. The
   * editor registers its bundles under the `imageEditor` namespace.
   */
  readonly i18n?: I18n;
  /** Show the edit-history panel in the workspace (hosts that don't want it set false). */
  readonly showHistory?: boolean;
  /** Enable keyboard shortcuts while the pointer is over the editor. */
  readonly keyboardEnabled?: boolean;
  /** Available text fonts (host-overridable). */
  readonly fonts?: readonly FontOption[];
  /**
   * Enable AI background removal / subject cut-out. Install
   * `@imgly/background-removal` in the consuming app and pass its dynamic import:
   * `backgroundRemovalLoader={() => import('@imgly/background-removal')}`.
   * The heavy WASM/worker `import()` then lives in the consumer's bundle, not the
   * library's. Without it the Remove-background / Cut-out tools are hidden.
   */
  readonly backgroundRemovalLoader?: AspBackgroundRemovalLoader | null;
  /**
   * Enable HEIC/HEIF image import. Install `heic2any` in the consuming app and
   * pass its dynamic import: `heicDecoderLoader={() => import('heic2any')}`.
   * Without it, importing a HEIC/HEIF file throws a descriptive error.
   */
  readonly heicDecoderLoader?: AspHeicDecoderLoader | null;
  readonly onSaved?: (blob: Blob) => void;
  readonly onCanceled?: () => void;
  /** Fired after an image successfully loads (initial, picker, or upload). */
  readonly onImageLoaded?: () => void;
  /** Fired with the exported Blob when the user downloads from the Export menu. */
  readonly onExported?: (blob: Blob) => void;
  /** Fired on a recoverable error (load/export/engine init) instead of throwing. */
  readonly onError?: (error: AspEditorError) => void;
}

/**
 * `<ImageEditor>` — the editor's root/container component.
 *
 * Owns the {@link EditorController} (and through it the Fabric engine), the
 * resolved tool/filter sets, theming, and all workspace state. Presentational
 * children (rail, options panel, history, layers) render data and emit intent;
 * this container is the only place that drives the engine.
 */
function ImageEditorInner({
  src = null,
  mode = 'advanced',
  width = null,
  height = null,
  tools = null,
  disabledTools = [],
  filters = null,
  aspectPresets = ['free', '1:1', '4:3', '16:9'],
  initialAspect = null,
  aspectRatios = [],
  exportFormats = ['png', 'jpeg', 'webp'],
  exportQuality = 90,
  exportTarget = null,
  baseColor = FALLBACK_BASE,
  accentColor = FALLBACK_ACCENT,
  themeMode = 'light',
  heading,
  showHistory = true,
  keyboardEnabled = true,
  fonts = DEFAULT_FONTS,
  backgroundRemovalLoader = null,
  heicDecoderLoader = null,
  onSaved,
  onCanceled,
  onImageLoaded,
  onExported,
  onError,
}: ImageEditorProps): ReactElement {
  const t = useAspT();
  const hostRef = useRef<HTMLDivElement>(null);

  const binding = useEditorController({
    src,
    mode,
    tools,
    disabledTools,
    filters,
    aspectPresets,
    initialAspect,
    exportFormats,
    exportQuality,
    exportTarget,
    keyboardEnabled,
    fonts,
    backgroundRemovalLoader,
    heicDecoderLoader,
    onSaved,
    onCanceled,
    onImageLoaded,
    onExported,
    onError,
  });
  const { controller, state, resolvedToolKeys, resolvedFilters, allFonts, setCanvasEl, setStageEl } =
    binding;

  // Ruler/guides canvases are swapped in and out with the rulers toggle; their
  // element instances live in state so the paint effects re-run on swap.
  const [rulerTopEl, setRulerTopEl] = useState<HTMLCanvasElement | null>(null);
  const [rulerLeftEl, setRulerLeftEl] = useState<HTMLCanvasElement | null>(null);
  const [guidesOverlayEl, setGuidesOverlayEl] = useState<HTMLCanvasElement | null>(null);

  // Apply the derived theme to the host element whenever the inputs change.
  // Invalid hex inputs are a developer error; rather than throwing and breaking
  // the host app, fall back to the default palette (keeping the requested mode)
  // and warn.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let theme;
    try {
      theme = deriveTheme(baseColor, accentColor, themeMode);
    } catch (error) {
      console.warn('[asp-image-editor] invalid theme color, using defaults:', error);
      theme = deriveTheme(FALLBACK_BASE, FALLBACK_ACCENT, themeMode);
    }
    applyTheme(host, theme);
  }, [baseColor, accentColor, themeMode]);

  // Re-render the rulers whenever they are toggled on, their canvases appear,
  // or the viewport changes (rulerVersion is bumped by the engine listener).
  useEffect(() => {
    const host = hostRef.current;
    if (state.rulersEnabled && state.engineReady && host && rulerTopEl && rulerLeftEl) {
      controller.renderRulers(host, rulerTopEl, rulerLeftEl);
    }
  }, [
    controller,
    state.rulersEnabled,
    state.engineReady,
    state.rulerVersion,
    rulerTopEl,
    rulerLeftEl,
  ]);

  // Repaint the guides overlay on guide changes or viewport changes.
  useEffect(() => {
    if (state.rulersEnabled && state.engineReady && guidesOverlayEl) {
      controller.renderGuidesOverlay(guidesOverlayEl);
    }
  }, [
    controller,
    state.rulersEnabled,
    state.engineReady,
    state.guidesVersion,
    state.rulerVersion,
    guidesOverlayEl,
  ]);

  // ---- resolved configuration (derived per render) ---------------------------
  const resolvedGroups: readonly ResolvedGroup[] = resolveGroups([...resolvedToolKeys]);
  const adjustmentDefs: readonly FilterMeta[] = resolvedFilters
    .map((f) => FILTER_REGISTRY[f])
    .filter((m) => m.kind === 'adjustment');
  const lookDefs: readonly FilterMeta[] = resolvedFilters
    .map((f) => FILTER_REGISTRY[f])
    .filter((m) => m.kind === 'look');

  const activeToolMeta: ToolMeta | null = state.activeTool ? TOOL_REGISTRY[state.activeTool] : null;
  // Under the neutral Select tool, title the panel by what's selected.
  const toolTitle =
    state.activeTool === 'select' && state.selectionKind === 'text'
      ? t('editor.selectionText')
      : state.activeTool === 'select' && state.selectionKind === 'stroke'
        ? t('editor.selectionObject')
        : (activeToolMeta ? t(`tools.${activeToolMeta.key}`, { defaultValue: activeToolMeta.label }) : '');
  const zoomLabel = `${state.zoomPct}%`;
  const layout: 'workspace' | 'basic' | 'viewer' =
    mode === 'basic' ? 'basic' : mode === 'viewer' ? 'viewer' : 'workspace';
  /**
   * Show the corner-radius slider when defining the next rectangle (Shapes tool,
   * nothing selected) or when a rectangle is selected.
   */
  const showCornerRadius =
    (state.activeTool === 'shapes' && !state.hasSelection) || state.selectedIsRect;

  // ---- host sizing (per-mode minimum; basic hugs its dialog-card width) -------
  const isBasic = mode === 'basic';
  const min = MODE_MIN[mode];
  const hostStyle: CSSProperties = {
    width: toCssSize(width, isBasic ? `min(${BASIC_DIALOG_WIDTH}, 100%)` : '100%'),
    height: toCssSize(height, isBasic ? 'auto' : '100%'),
    // Cap the min-width to the available space so the editor never forces
    // horizontal overflow on a narrow screen; the layout reflows instead.
    minWidth: `min(${min.width}, 100%)`,
    // No min-height in `basic`, or a dialog scrim would show a baseColor strip
    // below the card (the host's background extending past the card's content).
    minHeight: isBasic ? '0px' : min.height,
    // Show a progress cursor over the editor while a web font is fetching.
    cursor: state.fontLoading ? 'progress' : undefined,
  };

  const onUploadInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file) {
      void controller.uploadFile(file);
    }
    input.value = '';
  };

  return (
    <div
      ref={hostRef}
      className="asp-image-editor"
      style={hostStyle}
      onMouseEnter={() => controller.setPointerInside(true)}
      onMouseLeave={() => controller.setPointerInside(false)}
    >
      {state.errorToast !== null && (
        <div className="asp-toast" role="alert">
          <AspIcon name="info" size={16} />
          <span className="asp-toast__msg">{state.errorToast}</span>
          <button
            type="button"
            className="asp-toast__close"
            aria-label={t('common.dismiss')}
            onClick={() => controller.dismissErrorToast()}
          >
            <AspIcon name="x" size={15} />
          </button>
        </div>
      )}

      {layout === 'workspace' && (
        <div className="asp-workspace">
          <AspToolRail
            groups={resolvedGroups}
            activeTool={state.activeTool}
            activeMembers={{ ...state.activeMembers }}
            onToolSelect={(tool) => controller.selectTool(tool)}
          />

          <div className="asp-workspace__canvas asp-card">
            <div className="asp-topbar">
              <button
                type="button"
                className="asp-iconbtn"
                disabled={!state.canUndo}
                title={t('editor.undo')}
                aria-label={t('editor.undo')}
                onClick={() => void controller.undo()}
              >
                <AspIcon name="undo-2" size={17} />
              </button>
              <button
                type="button"
                className="asp-iconbtn"
                disabled={!state.canRedo}
                title={t('editor.redo')}
                aria-label={t('editor.redo')}
                onClick={() => void controller.redo()}
              >
                <AspIcon name="redo-2" size={17} />
              </button>
              <span className="asp-divider"></span>
              <ZoomControl binding={binding} zoomLabel={zoomLabel} />
              <button
                type="button"
                className="asp-iconbtn"
                title={t('editor.fitToScreen')}
                aria-label={t('editor.fitToScreen')}
                onClick={() => controller.fitToScreen()}
              >
                <AspIcon name="scaling" size={16} />
              </button>
              <button
                type="button"
                className={state.snapEnabled ? 'asp-iconbtn asp-iconbtn--on' : 'asp-iconbtn'}
                aria-pressed={state.snapEnabled}
                title={state.snapEnabled ? t('editor.snappingOn') : t('editor.snappingOff')}
                aria-label={t('editor.toggleSnapping')}
                onClick={() => controller.toggleSnap()}
              >
                <AspIcon name="magnet" size={16} />
              </button>
              <button
                type="button"
                className={state.rulersEnabled ? 'asp-iconbtn asp-iconbtn--on' : 'asp-iconbtn'}
                aria-pressed={state.rulersEnabled}
                title={state.rulersEnabled ? t('editor.rulersOn') : t('editor.rulersOff')}
                aria-label={t('editor.toggleRulers')}
                onClick={() => controller.toggleRulers()}
              >
                <AspIcon name="ruler" size={16} />
              </button>
              {showHistory && (
                <div className="asp-pop">
                  <button
                    type="button"
                    className="asp-iconbtn"
                    title={t('editor.history')}
                    aria-label={t('editor.editHistory')}
                    onClick={() => controller.toggleHistory()}
                  >
                    <AspIcon name="history" size={17} />
                  </button>
                  {state.historyOpen && (
                    <>
                      <button
                        type="button"
                        className="asp-pop__scrim"
                        aria-label={t('editor.closeHistory')}
                        onClick={() => controller.toggleHistory()}
                      ></button>
                      <div className="asp-menu asp-menu--history">
                        <AspHistoryList
                          entries={state.historyEntries}
                          currentIndex={state.historyIndex}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              <span className="asp-spacer"></span>
              <ImageMenu binding={binding} onUploadInput={onUploadInput} />
              <ExportMenu binding={binding} exportFormats={exportFormats} />
            </div>

            <div
              className={
                state.rulersEnabled ? 'asp-stagewrap asp-stagewrap--rulers' : 'asp-stagewrap'
              }
            >
              {state.rulersEnabled && (
                <>
                  <button
                    type="button"
                    className="asp-ruler-corner"
                    title={t('editor.clearGuides')}
                    aria-label={t('editor.clearGuides')}
                    onClick={() => controller.clearGuides()}
                  ></button>
                  <canvas
                    ref={setRulerTopEl}
                    className="asp-ruler asp-ruler--h"
                    aria-hidden="true"
                    onPointerDown={(event) => controller.startGuideDraft('h', event.nativeEvent)}
                  ></canvas>
                  <canvas
                    ref={setRulerLeftEl}
                    className="asp-ruler asp-ruler--v"
                    aria-hidden="true"
                    onPointerDown={(event) => controller.startGuideDraft('v', event.nativeEvent)}
                  ></canvas>
                </>
              )}
              <div ref={setStageEl} className="asp-stage">
                <canvas ref={setCanvasEl}></canvas>
                {state.rulersEnabled && (
                  <canvas
                    ref={setGuidesOverlayEl}
                    className="asp-guides-overlay"
                    aria-hidden="true"
                  ></canvas>
                )}
                {state.activeTool === 'crop' && (
                  <div className="asp-crop-overlay" aria-hidden="true">
                    <span className="asp-crop-overlay__v" style={{ left: '33.33%' }}></span>
                    <span className="asp-crop-overlay__v" style={{ left: '66.66%' }}></span>
                    <span className="asp-crop-overlay__h" style={{ top: '33.33%' }}></span>
                    <span className="asp-crop-overlay__h" style={{ top: '66.66%' }}></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="asp-workspace__panel asp-card">
            <AspOptionsPanel
              activeTool={state.activeTool}
              toolTitle={toolTitle}
              adjustmentDefs={adjustmentDefs}
              adjustments={state.adjustments}
              lookDefs={lookDefs}
              activeLook={state.activeLook}
              aspectPresets={aspectPresets}
              activeCrop={state.activeCrop}
              aspectRatios={aspectRatios}
              activeAspectLabel={state.activeAspectLabel}
              straighten={state.straighten}
              annotationColor={state.annotationColor}
              annotationWidth={state.annotationWidth}
              fontSize={state.fontSize}
              fonts={allFonts}
              activeFont={state.fontFamily}
              googleFonts={GOOGLE_FONTS}
              selectionKind={state.selectionKind}
              fontLoading={state.fontLoading}
              magicTolerance={state.magicTolerance}
              onMagicToleranceChange={(value) => controller.onMagicTolerance(value)}
              aiBusy={state.aiBusy}
              aiStage={state.aiStage}
              aiProgress={state.aiProgress}
              onRunAi={() => controller.runAi()}
              textBold={state.textBold}
              textItalic={state.textItalic}
              textUnderline={state.textUnderline}
              textStrike={state.textStrike}
              textAlign={state.textAlign}
              lineHeight={state.lineHeight}
              letterSpacing={state.letterSpacing}
              frameOptions={FRAME_OPTIONS}
              activeFrame={state.activeFrame}
              redactMode={state.redactMode}
              cornerRadius={state.shapeRadius}
              cornerRadiusMax={state.shapeRadiusMax}
              showCornerRadius={showCornerRadius}
              onCornerRadiusInput={(radius) => controller.onCornerRadiusInput(radius)}
              onCornerRadiusCommit={(radius) => controller.onCornerRadiusCommit(radius)}
              onResetRequested={() => controller.reset()}
              onAdjustInput={(change) => controller.onAdjustInput(change)}
              onAdjustCommit={(change) => controller.onAdjustCommit(change)}
              onSelectLook={(look) => controller.selectLook(look)}
              onRequestTool={(tool) => controller.selectTool(tool)}
              onFillChange={(color) => controller.setFill(color)}
              hasCropRegion={state.hasCropRegion}
              onSelectCrop={(preset) => controller.selectCrop(preset)}
              onSelectCustomCrop={(option) => controller.selectCustomCrop(option)}
              onApplyCrop={() => controller.applyCrop()}
              onCancelCrop={() => controller.cancelCrop()}
              onResetCrop={() => controller.resetCrop()}
              onRotate={(deg) => controller.rotate(deg)}
              onFlip={(axis) => controller.flip(axis)}
              onStraightenInput={(value) => controller.onStraightenInput(value)}
              onStraightenCommit={(value) => controller.onStraightenCommit(value)}
              onAddShape={(kind) => controller.addShape(kind)}
              onAddText={(text) => controller.addText(text)}
              onFontChange={(value) => controller.onFontChange(value)}
              onAddFont={(name) => controller.onAddCustomFont(name)}
              onToggleBold={() => controller.toggleBold()}
              onToggleItalic={() => controller.toggleItalic()}
              onToggleUnderline={() => controller.toggleUnderline()}
              onToggleStrike={() => controller.toggleStrike()}
              onTextAlignChange={(align) => controller.setTextAlign(align)}
              onLineHeightChange={(value) => controller.setLineHeight(value)}
              onLetterSpacingChange={(value) => controller.setLetterSpacing(value)}
              onTextBgChange={(color) => controller.setTextBg(color)}
              onRedactModeChange={(redactMode) => controller.setRedactMode(redactMode)}
              onApplyRedaction={() => controller.applyRedaction()}
              onAnnotationColorChange={(color) => controller.setAnnotationColor(color)}
              onSizeInput={(size) => controller.onSizeInput(size)}
              onSizeCommit={(size) => controller.onSizeCommit(size)}
              onSelectFrame={(frame) => controller.selectFrame(frame)}
              onSetBackgroundColor={(color) => controller.setBackgroundColor(color)}
              onSetBackgroundGradient={(colors) => controller.setBackgroundGradient(colors)}
              onSetBackgroundImageFile={(file) => controller.setBackgroundImageFromFile(file)}
              artboard={state.artboard}
              onArtboardChange={(size: ArtboardSize | null) => controller.onArtboardChange(size)}
            />
            <AspLayerList
              layers={state.layers}
              onSelectLayer={(event) => controller.onSelectLayer(event)}
              onToggleLock={(id) => controller.onToggleLayerLock(id)}
              onToggleVisible={(id) => controller.onToggleLayerVisible(id)}
              onMoveUp={(id) => controller.onMoveLayer(id, 'up')}
              onMoveDown={(id) => controller.onMoveLayer(id, 'down')}
              onRemoveLayer={(id) => controller.onDeleteLayer(id)}
              onGroupSelection={() => controller.groupSelection()}
              onUngroupSelection={() => controller.ungroupSelection()}
              onDuplicateSelection={() => controller.duplicate()}
              onDeleteSelection={() => controller.deleteSelection()}
              onAlignSelection={(alignMode) => controller.alignSelection(alignMode)}
              onOpacityInput={(change) => controller.onLayerOpacityInput(change)}
              onOpacityCommit={(change) => controller.onLayerOpacityCommit(change)}
              onReorderLayers={(orderedIds) => controller.onReorderLayers(orderedIds)}
              onRenameLayer={(event) => controller.onRenameLayer(event)}
            />
          </div>
        </div>
      )}

      {layout === 'viewer' && (
        <div className="asp-viewer asp-card">
          <div className="asp-topbar">
            <ZoomControl binding={binding} zoomLabel={zoomLabel} />
            <span className="asp-spacer"></span>
            <ExportMenu binding={binding} exportFormats={exportFormats} />
          </div>
          <div ref={setStageEl} className="asp-stage">
            <canvas ref={setCanvasEl}></canvas>
          </div>
        </div>
      )}

      {layout === 'basic' && (
        <div className="asp-basic asp-card">
          <div className="asp-basic__head">
            <div className="asp-basic__title">{heading ?? t('editor.heading')}</div>
            <button
              type="button"
              className="asp-iconbtn-plain"
              aria-label={t('common.close')}
              onClick={() => controller.cancel()}
            >
              <AspIcon name="x" size={19} />
            </button>
          </div>

          <div className="asp-basic__body">
            <div ref={setStageEl} className="asp-stage asp-stage--rounded">
              <canvas ref={setCanvasEl}></canvas>
            </div>

            {state.cropActive && (
              <p className="asp-basic__hint">
                {t('editor.basicHint')}
              </p>
            )}

            <div>
              <div className="asp-section-label">{t('editor.aspectRatio')}</div>
              <div className="asp-chip-row">
                {aspectPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={
                      state.activeCrop === preset && !state.activeAspectLabel
                        ? 'asp-chip asp-chip--active'
                        : 'asp-chip'
                    }
                    onClick={() => controller.selectCrop(preset)}
                  >
                    {preset === 'free' ? t('common.free') : preset === 'original' ? t('common.original') : preset}
                  </button>
                ))}
                {aspectRatios.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className={
                      state.activeAspectLabel === option.label
                        ? 'asp-chip asp-chip--active'
                        : 'asp-chip'
                    }
                    onClick={() => controller.selectCustomCrop(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="asp-basic__controls">
              <button
                type="button"
                className="asp-iconbtn"
                title={t('editor.rotateLeft')}
                onClick={() => controller.rotate(-90)}
              >
                <AspIcon name="rotate-ccw" size={17} />
              </button>
              <button
                type="button"
                className="asp-iconbtn"
                title={t('editor.rotateRight')}
                onClick={() => controller.rotate(90)}
              >
                <AspIcon name="rotate-cw" size={17} />
              </button>
              <button
                type="button"
                className="asp-iconbtn"
                title={t('editor.flip')}
                onClick={() => controller.flip('h')}
              >
                <AspIcon name="flip-horizontal-2" size={17} />
              </button>
              <div className="asp-zoomslider">
                <AspIcon name="plus" size={16} />
                <input
                  type="range"
                  className="asp-range"
                  min={100}
                  max={300}
                  value={state.zoomPct}
                  onChange={(event) => controller.onZoomSlider(Number(event.currentTarget.value))}
                  aria-label={t('editor.zoom')}
                />
              </div>
              <label className="asp-upload asp-upload--inline">
                <AspIcon name="upload" size={15} /> {t('common.replace')}
                <input type="file" accept="image/*" onChange={onUploadInput} />
              </label>
            </div>
          </div>

          <div className="asp-basic__foot">
            <button type="button" className="asp-btn-line" onClick={() => controller.cancel()}>
              {t('common.cancel')}
            </button>
            <button type="button" className="asp-btn-accent" onClick={() => void controller.save()}>
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- shared sub-templates ----------------------------------------------------

function ZoomControl({
  binding,
  zoomLabel,
}: {
  binding: EditorBinding;
  zoomLabel: string;
}): ReactElement {
  const t = useAspT();
  const { controller } = binding;
  return (
    <div className="asp-zoom">
      <button
        type="button"
        className="asp-zoom__btn"
        aria-label={t('editor.zoomOut')}
        onClick={() => controller.zoomOut()}
      >
        <AspIcon name="minus" size={15} />
      </button>
      <span className="asp-zoom__label">{zoomLabel}</span>
      <button
        type="button"
        className="asp-zoom__btn"
        aria-label={t('editor.zoomIn')}
        onClick={() => controller.zoomIn()}
      >
        <AspIcon name="plus" size={15} />
      </button>
    </div>
  );
}

function ImageMenu({
  binding,
  onUploadInput,
}: {
  binding: EditorBinding;
  onUploadInput: (event: ChangeEvent<HTMLInputElement>) => void;
}): ReactElement {
  const t = useAspT();
  const { controller, state } = binding;

  const onAddImageLayer = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      void controller.addImageLayerFile(file);
    }
  };

  const onLoadTemplate = (event: ChangeEvent<HTMLInputElement>): void => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      void controller.loadTemplateFile(file);
    }
  };

  return (
    <div className="asp-pop">
      <button
        type="button"
        className="asp-btn-line asp-topbtn"
        onClick={() => controller.togglePicker()}
      >
        <AspIcon name="image-plus" size={16} /> {t('editor.image')}
      </button>
      {state.pickerOpen && (
        <>
          <button
            type="button"
            className="asp-pop__scrim"
            aria-label={t('editor.closeImageMenu')}
            onClick={() => controller.togglePicker()}
          ></button>
          <div className="asp-menu asp-menu--right">
            <div className="asp-menu__title">{t('editor.sampleImages')}</div>
            <div className="asp-sample-grid">
              {state.samples.map((sample) => (
                <button
                  key={sample.key}
                  type="button"
                  className="asp-sample"
                  style={{ backgroundImage: `url(${sample.dataUrl})` }}
                  title={t(`gradients.${sample.key}`, { defaultValue: sample.label })}
                  aria-label={t(`gradients.${sample.key}`, { defaultValue: sample.label })}
                  onClick={() => void controller.pickSample(sample)}
                ></button>
              ))}
            </div>
            <label className="asp-upload">
              <AspIcon name="upload" size={15} /> {t('editor.replaceCanvasImage')}
              <input type="file" accept="image/*" onChange={onUploadInput} />
            </label>
            <label className="asp-upload asp-mt-sm">
              <AspIcon name="image-plus" size={15} /> {t('editor.addImageLayer')}
              <input type="file" accept="image/*" onChange={onAddImageLayer} />
            </label>
            <div className="asp-menu__divider"></div>
            <div className="asp-menu__title">{t('editor.template')}</div>
            <button
              type="button"
              className="asp-upload asp-upload--btn"
              onClick={() => controller.saveTemplate()}
            >
              <AspIcon name="download" size={15} /> {t('editor.saveTemplate')}
            </button>
            <label className="asp-upload">
              <AspIcon name="upload" size={15} /> {t('editor.loadTemplate')}
              <input type="file" accept="application/json,.json" onChange={onLoadTemplate} />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function ExportMenu({
  binding,
                    }: {
  binding: EditorBinding;
  exportFormats: readonly AspExportFormat[];
}): ReactElement {
  const t = useAspT();
  const { controller } = binding;
  return (
      <>
        <button type="button" className="asp-btn-line" onClick={() => controller.cancel()}>
          {t('common.cancel')}
        </button>
        <button type="button" className="asp-btn-accent" onClick={() => void controller.save()}>
            {t('common.save')}
        </button>
      </>
  );
}

/**
 * The image editor. Provides an isolated i18next instance (see the `locale`,
 * `messages` and `i18n` props) and renders the workspace inside it.
 */
export function ImageEditor(props: ImageEditorProps): ReactElement {
  const { locale = 'en', messages, i18n: hostI18n } = props;
  const [ownI18n] = useState<I18n | null>(() =>
    hostI18n ? null : createEditorI18n(locale, messages),
  );
  const instance = hostI18n ?? ownI18n ?? getFallbackEditorI18n();

  // Bundles must exist before the first render of a host-provided instance.
  const registeredRef = useRef<I18n | null>(null);
  if (hostI18n && registeredRef.current !== hostI18n) {
    registerEditorMessages(hostI18n, messages);
    registeredRef.current = hostI18n;
  }

  useEffect(() => {
    registerEditorMessages(instance, messages);
  }, [instance, messages]);

  useEffect(() => {
    // A host-provided instance owns its language; only drive our own.
    if (!hostI18n && instance.language !== locale) {
      void instance.changeLanguage(locale);
    }
  }, [hostI18n, instance, locale]);

  return (
    <I18nextProvider i18n={instance}>
      <ImageEditorInner {...props} />
    </I18nextProvider>
  );
}
