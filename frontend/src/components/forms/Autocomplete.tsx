import { Autocomplete as BaseAutocomplete } from "@base-ui/react/autocomplete";
import { ChevronDown } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import "./form-controls.css";
import { DropdownItemBody } from "./DropdownParts";
import type { DropdownOptionDefinition } from "./DropdownParts";
import { dropdownPositionerProps } from "./dropdownPositionerProps";

export interface AutocompleteProps {
  options: readonly DropdownOptionDefinition[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  loadingContent?: ReactNode;
  emptyContent?: ReactNode;
  ariaLabel?: string;
  preferredPopupWidth?: string;
}

export function Autocomplete({
  options,
  value,
  onValueChange,
  placeholder = "Type or choose a suggestion",
  disabled,
  readOnly,
  loading = false,
  loadingContent = "Loading…",
  emptyContent = "No suggestions found.",
  ariaLabel,
  preferredPopupWidth,
}: AutocompleteProps) {
  const visibleOptions = loading ? [] : options;

  return (
    <BaseAutocomplete.Root
      items={visibleOptions.map((option) => option.value)}
      itemToStringValue={(optionValue) =>
        options.find((option) => option.value === optionValue)?.label ?? optionValue
      }
      value={value}
      onValueChange={onValueChange}
      modal={false}
      openOnInputClick
    >
      <BaseAutocomplete.InputGroup className="fc-input-frame">
        <BaseAutocomplete.Input
          className="fc-text-input"
          aria-label={ariaLabel}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
        />
        <BaseAutocomplete.Trigger className="fc-icon-button" aria-label="Show suggestions">
          <ChevronDown aria-hidden="true" size={18} />
        </BaseAutocomplete.Trigger>
      </BaseAutocomplete.InputGroup>
      <BaseAutocomplete.Portal>
        <BaseAutocomplete.Positioner
          {...dropdownPositionerProps}
          className="fc-dropdown-positioner"
          style={{ "--preferred-popup-width": preferredPopupWidth } as CSSProperties}
        >
          <BaseAutocomplete.Popup className="fc-dropdown-popup">
            <BaseAutocomplete.List className="fc-dropdown-list">
              {(optionValue: string, index: number) => {
                const option = visibleOptions.find((candidate) => candidate.value === optionValue);
                if (!option) return null;
                return (
                  <BaseAutocomplete.Item
                    aria-label={option.label}
                    className="fc-dropdown-item"
                    disabled={option.disabled}
                    index={index}
                    key={option.value}
                    value={option.value}
                  >
                    <DropdownItemBody option={option} />
                  </BaseAutocomplete.Item>
                );
              }}
            </BaseAutocomplete.List>
            <BaseAutocomplete.Empty className="fc-dropdown-message">
              {loading ? loadingContent : emptyContent}
            </BaseAutocomplete.Empty>
            <BaseAutocomplete.Status className="fc-visually-hidden">
              {loading ? "Loading suggestions" : `${visibleOptions.length} suggestions available`}
            </BaseAutocomplete.Status>
          </BaseAutocomplete.Popup>
        </BaseAutocomplete.Positioner>
      </BaseAutocomplete.Portal>
    </BaseAutocomplete.Root>
  );
}
