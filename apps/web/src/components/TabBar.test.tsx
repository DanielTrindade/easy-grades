import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TabBar } from './TabBar';

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
});

describe('TabBar', () => {
  it('lists the four sections as links and marks the current one', () => {
    render(<TabBar view="disciplinas" />);
    const nav = screen.getByRole('navigation', { name: 'Seções' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Visão geral', 'Fluxograma', 'Disciplinas', 'Planejamento']);
    expect(within(nav).getByRole('link', { name: 'Disciplinas' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute('aria-current');
  });

  it('slides the indicator under the current section', () => {
    const { container } = render(<TabBar view="planejamento" />);
    expect(container.querySelector('.tab-indicator')).toHaveStyle({ transform: 'translateX(300%)' });
  });

  it('flags the body as expanded, then minimized after a downward scroll', () => {
    render(<TabBar view="disciplinas" />);
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
    scrollTo(30);
    scrollTo(300);
    expect(document.body).toHaveAttribute('data-tab-bar', 'minimized');
  });

  it('minimizes to one button that names the current section and hides the other links', () => {
    render(<TabBar view="disciplinas" />);
    scrollTo(30);
    scrollTo(300);
    const pill = screen.getByRole('button', { name: 'Disciplinas: mostrar seções' });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('expands when the pill is tapped and moves focus to the current section', async () => {
    const user = userEvent.setup();
    render(<TabBar view="disciplinas" />);
    scrollTo(30);
    scrollTo(300);
    await user.click(screen.getByRole('button', { name: 'Disciplinas: mostrar seções' }));
    expect(screen.getByRole('link', { name: 'Disciplinas' })).toHaveFocus();
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
  });

  it('expands when keyboard focus reaches the pill', async () => {
    const user = userEvent.setup();
    render(<TabBar view="visao-geral" />);
    scrollTo(30);
    scrollTo(300);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Visão geral' })).toHaveFocus();
  });

  it('never minimizes on the flowchart, whose canvas does not scroll the page', () => {
    render(<TabBar view="fluxograma" />);
    scrollTo(30);
    scrollTo(600);
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
  });

  it('frees the bottom space when it unmounts (rotation or resize past md)', () => {
    const { unmount } = render(<TabBar view="disciplinas" />);
    unmount();
    expect(document.body).not.toHaveAttribute('data-tab-bar');
  });
});
