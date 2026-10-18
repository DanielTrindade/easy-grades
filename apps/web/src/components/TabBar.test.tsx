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

  it('expands when the pill is tapped without trapping pointer focus', async () => {
    const user = userEvent.setup();
    render(<TabBar view="disciplinas" />);
    scrollTo(30);
    scrollTo(300);
    await user.click(screen.getByRole('button', { name: 'Disciplinas: mostrar seções' }));
    expect(screen.getByRole('link', { name: 'Disciplinas' })).toBeInTheDocument();
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

  it('stays expanded while a link holds focus, even when the page scrolls', () => {
    render(<TabBar view="disciplinas" />);
    const link = screen.getByRole('link', { name: 'Disciplinas' });
    act(() => link.focus());
    scrollTo(30);
    scrollTo(300);
    expect(link).toHaveFocus();
    expect(document.body).toHaveAttribute('data-tab-bar', 'expanded');
  });

  it('minimizes after a pointer click on a link and a later downward scroll', async () => {
    const user = userEvent.setup();
    render(<TabBar view="disciplinas" />);
    await user.click(screen.getByRole('link', { name: 'Disciplinas' }));
    scrollTo(30);
    scrollTo(300);
    expect(document.body).toHaveAttribute('data-tab-bar', 'minimized');
  });

  it('minimizes after the pill is tapped and a later downward scroll', async () => {
    const user = userEvent.setup();
    render(<TabBar view="disciplinas" />);
    scrollTo(30);
    scrollTo(300);
    await user.click(screen.getByRole('button', { name: 'Disciplinas: mostrar seções' }));
    scrollTo(30);
    scrollTo(300);
    expect(document.body).toHaveAttribute('data-tab-bar', 'minimized');
  });

  it('minimizes after focus leaves the navigation and the page scrolls down', () => {
    render(
      <>
        <TabBar view="disciplinas" />
        <button type="button">Fora da navegação</button>
      </>,
    );
    act(() => screen.getByRole('link', { name: 'Disciplinas' }).focus());
    act(() => screen.getByRole('button', { name: 'Fora da navegação' }).focus());
    scrollTo(30);
    scrollTo(300);
    expect(document.body).toHaveAttribute('data-tab-bar', 'minimized');
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
