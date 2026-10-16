import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBodyData } from './body-data';

afterEach(() => {
  delete document.body.dataset.tabBar;
  delete document.body.dataset.bottomAccessory;
});

describe('useBodyData', () => {
  it('sets the body data attribute while mounted and removes it on unmount', () => {
    const { unmount } = renderHook(() => useBodyData('tabBar', 'expanded'));
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
    unmount();
    expect(document.body).not.toHaveAttribute('data-tab-bar');
  });

  it('follows value changes', () => {
    const { rerender } = renderHook(({ value }) => useBodyData('tabBar', value), { initialProps: { value: 'expanded' } });
    rerender({ value: 'minimized' });
    expect(document.body).toHaveAttribute('data-tab-bar', 'minimized');
  });

  it('removes the attribute when the value becomes null', () => {
    const { rerender } = renderHook(({ value }: { value: string | null }) => useBodyData('bottomAccessory', value), {
      initialProps: { value: '' as string | null },
    });
    expect(document.body).toHaveAttribute('data-bottom-accessory', '');
    rerender({ value: null });
    expect(document.body).not.toHaveAttribute('data-bottom-accessory');
  });
});
