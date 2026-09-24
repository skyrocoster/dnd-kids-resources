import { useRef, useState } from "react";
import type { Condition } from "../../api/types";
import { MultiSelectField } from "../../components/form/MultiSelectField";
import { ChevronDownIcon, ChevronUpIcon } from "../../components/icons";
import { Popover } from "../../components/Popover";
import { isConditionSelected, mergeConditionOptions, toggleCondition } from "./encounterForm";
import "./ConditionPicker.css";

interface ConditionPickerProps {
  conditions: Condition[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function summaryText(selected: string[]): string {
  if (selected.length === 0) return "No conditions";
  if (selected.length <= 2) return selected.join(", ");
  return `${selected.slice(0, 2).join(", ")} +${selected.length - 2}`;
}

export function ConditionPicker({ conditions, selected, onChange }: ConditionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const options = mergeConditionOptions(conditions, selected);
  const selectedOptions = options
    .filter((option) => isConditionSelected(selected, option.value))
    .map((option) => option.value);

  const handleOptionsChange = (nextOptions: string[]) => {
    const changedOption = options.find(
      (option) => selectedOptions.includes(option.value) !== nextOptions.includes(option.value),
    );
    if (changedOption) onChange(toggleCondition(selected, changedOption.value));
  };

  return (
    <div className="condition-picker">
      <span className="form-label">Conditions</span>
      <Popover.Root open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <Popover.Trigger ref={triggerRef} className="condition-picker-trigger">
          <span className="condition-picker-summary">{summaryText(selected)}</span>
          {isOpen ? (
            <ChevronUpIcon size={18} aria-hidden />
          ) : (
            <ChevronDownIcon size={18} aria-hidden />
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            className="condition-picker-positioner"
            side="bottom"
            align="start"
            sideOffset={6}
          >
            <Popover.Popup
              className="condition-picker-panel"
              aria-label="Condition options"
              finalFocus={(closeType) =>
                closeType === "keyboard" ? triggerRef.current : undefined
              }
            >
              {options.length === 0 ? (
                <p className="encounter-editor-empty">No conditions available.</p>
              ) : (
                <MultiSelectField
                  label="Condition options"
                  options={options}
                  selected={selectedOptions}
                  onChange={handleOptionsChange}
                />
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
