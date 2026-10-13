import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface ChoiceItem<T extends string> {
  value: T;
  content: ReactNode;
}

interface ChoiceGroupProps<T extends string> {
  /** Accessible name of the radiogroup. */
  label: string;
  items: readonly ChoiceItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  /** Styling for each radio. Selection styles go on `aria-checked:` variants. */
  itemClassName?: string;
}

/**
 * Single-select radiogroup: one tab stop (the checked radio), arrow keys move and select, Home and End jump to the ends.
 * Styling is up to the caller, so the same behaviour serves the status chips and the segmented control.
 */
export function ChoiceGroup<T extends string>({ label, items, value, onValueChange, className, itemClassName }: ChoiceGroupProps<T>) {
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const checkedIndex = items.findIndex((item) => item.value === value);
  const tabStop = checkedIndex === -1 ? 0 : checkedIndex;

  function select(index: number) {
    const item = items[index];
    if (!item) return;
    radios.current[index]?.focus();
    onValueChange(item.value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        select(index === last ? 0 : index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        select(index === 0 ? last : index - 1);
        break;
      case 'Home':
        select(0);
        break;
      case 'End':
        select(last);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {items.map((item, index) => (
        <button
          key={item.value}
          ref={(element) => {
            radios.current[index] = element;
          }}
          type="button"
          role="radio"
          aria-checked={index === checkedIndex}
          tabIndex={index === tabStop ? 0 : -1}
          onClick={() => onValueChange(item.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={itemClassName}
        >
          {item.content}
        </button>
      ))}
    </div>
  );
}
