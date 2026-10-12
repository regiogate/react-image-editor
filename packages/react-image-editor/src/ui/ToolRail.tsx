import { useState, type MouseEvent, type ReactElement } from 'react';

import { AspIcon } from '../icons/AspIcon';
import { useAspT } from '../i18n/use-asp-t';
import { TOOL_REGISTRY } from '../registry/tool-registry';
import { type ResolvedGroup } from '../registry/toolbar-groups';
import { type AspTool } from '../types/editor.types';

export interface AspToolRailProps {
  readonly groups: readonly ResolvedGroup[];
  readonly activeTool: AspTool | null;
  /** Per-group last-selected member, so a flyout slot shows the right icon. */
  readonly activeMembers?: Record<string, AspTool>;
  readonly onToolSelect: (tool: AspTool) => void;
}

/**
 * The tool rail: one slot per resolved toolbar group. A group with several
 * members and `flyout: true` shows a ▸ that opens a flyout to switch sub-tools
 * (Photoshop-style). The slot shows the group's currently active member's icon.
 */
export function AspToolRail({
  groups,
  activeTool,
  activeMembers = {},
  onToolSelect,
}: AspToolRailProps): ReactElement {
  const t = useAspT();
  const groupLabel = (group: ResolvedGroup): string =>
    t(`groups.${group.id}`, { defaultValue: group.label });
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  /** Fixed-position coords for the open flyout (the rail clips overflow). */
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const activeMemberOf = (group: ResolvedGroup): AspTool => {
    if (activeTool !== null && group.members.includes(activeTool)) {
      return activeTool;
    }
    const remembered = activeMembers[group.id];
    if (remembered !== undefined && group.members.includes(remembered)) {
      return remembered;
    }
    return group.members[0];
  };

  const isActive = (group: ResolvedGroup): boolean =>
    activeTool !== null && group.members.includes(activeTool);

  const hasFlyout = (group: ResolvedGroup): boolean => group.flyout && group.members.length > 1;

  const toggleFlyout = (id: string, event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    const slot = event.currentTarget.closest('.asp-rail__slot');
    if (slot) {
      const rect = slot.getBoundingClientRect();
      setFlyoutPos({ top: rect.top, left: rect.right + 6 });
    }
    setOpenGroup((open) => (open === id ? null : id));
  };

  const pick = (tool: AspTool): void => {
    onToolSelect(tool);
    setOpenGroup(null);
  };

  return (
    <div className="asp-tool-rail asp-workspace__rail">
      {groups.map((group) => (
        <div key={group.id} className="asp-rail__slot">
          <button
            type="button"
            className={
              isActive(group) ? 'asp-rail__tool asp-rail__tool--active' : 'asp-rail__tool'
            }
            aria-pressed={isActive(group)}
            title={groupLabel(group)}
            onClick={() => pick(activeMemberOf(group))}
          >
            <AspIcon name={TOOL_REGISTRY[activeMemberOf(group)].icon} size={21} />
            <span className="asp-rail__label">{groupLabel(group)}</span>
          </button>

          {hasFlyout(group) && (
            <>
              <button
                type="button"
                className={
                  openGroup === group.id
                    ? 'asp-rail__flyout-toggle asp-rail__flyout-toggle--open'
                    : 'asp-rail__flyout-toggle'
                }
                aria-label={t('rail.moreToolsOf', { group: groupLabel(group) })}
                aria-expanded={openGroup === group.id}
                title={t('rail.moreTools')}
                onClick={(event) => toggleFlyout(group.id, event)}
              ></button>

              {openGroup === group.id && (
                <>
                  <button
                    type="button"
                    className="asp-rail__scrim"
                    aria-label={t('common.close')}
                    onClick={() => setOpenGroup(null)}
                  ></button>
                  <div
                    className="asp-rail__flyout"
                    role="menu"
                    style={{ top: `${flyoutPos.top}px`, left: `${flyoutPos.left}px` }}
                  >
                    {group.members.map((member) => (
                      <button
                        key={member}
                        type="button"
                        className={
                          member === activeTool
                            ? 'asp-rail__flyout-item asp-rail__flyout-item--active'
                            : 'asp-rail__flyout-item'
                        }
                        role="menuitem"
                        onClick={() => pick(member)}
                      >
                        <AspIcon name={TOOL_REGISTRY[member].icon} size={17} />
                        {t(`tools.${member}`, { defaultValue: TOOL_REGISTRY[member].label })}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
