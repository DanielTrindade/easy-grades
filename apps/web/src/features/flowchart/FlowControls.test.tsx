import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowLegendPanel, FlowZoomControls } from './FlowControls';

const zoomIn = vi.fn();
const zoomOut = vi.fn();
const fitView = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useReactFlow: () => ({ zoomIn, zoomOut, fitView }),
}));

function mockMedia(matches: (query: string) => boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: matches(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

beforeEach(() => {
  zoomIn.mockClear();
  zoomOut.mockClear();
  fitView.mockClear();
});

afterEach(() => vi.restoreAllMocks());

describe('FlowZoomControls', () => {
  it('is a glass capsule of three 44 px buttons', () => {
    mockMedia(() => false);
    render(<FlowZoomControls />);
    const group = screen.getByRole('group', { name: 'Zoom' });
    expect(group).toHaveClass('glass', 'rounded-full');
    for (const name of ['Aproximar', 'Afastar', 'Ajustar à tela']) {
      expect(screen.getByRole('button', { name })).toHaveClass('size-11');
    }
  });

  it('zooms and fits with a short animation', async () => {
    mockMedia(() => false);
    const user = userEvent.setup();
    render(<FlowZoomControls />);
    await user.click(screen.getByRole('button', { name: 'Aproximar' }));
    await user.click(screen.getByRole('button', { name: 'Afastar' }));
    await user.click(screen.getByRole('button', { name: 'Ajustar à tela' }));
    expect(zoomIn).toHaveBeenCalledWith({ duration: 200 });
    expect(zoomOut).toHaveBeenCalledWith({ duration: 200 });
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 });
  });

  it('does not animate with reduced motion', async () => {
    mockMedia((query) => query.includes('prefers-reduced-motion'));
    const user = userEvent.setup();
    render(<FlowZoomControls />);
    await user.click(screen.getByRole('button', { name: 'Aproximar' }));
    await user.click(screen.getByRole('button', { name: 'Ajustar à tela' }));
    expect(zoomIn).toHaveBeenCalledWith({ duration: 0 });
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 0 });
  });
});

describe('FlowLegendPanel', () => {
  it('starts collapsed on a phone and opens on demand', async () => {
    mockMedia(() => false);
    const user = userEvent.setup();
    render(<FlowLegendPanel nodes={[]} />);
    const toggle = screen.getByRole('button', { name: 'Legenda' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Legenda' })).not.toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: 'Legenda' }).closest('.glass')).not.toBeNull();
  });

  it('starts open from md up', () => {
    mockMedia((query) => query.includes('min-width'));
    render(<FlowLegendPanel nodes={[]} />);
    expect(screen.getByRole('button', { name: 'Legenda' })).toHaveAttribute('aria-expanded', 'true');
  });
});
