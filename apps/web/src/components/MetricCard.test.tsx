import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrendingUp } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetricCard } from './MetricCard';

afterEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('MetricCard', () => {
  it('shows the label, the value and the context lines on an opaque card', () => {
    render(
      <MetricCard icon={TrendingUp} label="Coeficiente de rendimento" value="7,757">
        <p>Na formatura: entre 7,229 e 8,186.</p>
      </MetricCard>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Coeficiente de rendimento' })).toBeInTheDocument();
    expect(screen.getByText('7,757')).toHaveClass('heading-ink');
    expect(screen.getByText('Na formatura: entre 7,229 e 8,186.')).toBeInTheDocument();
    expect(screen.getByText('7,757').closest('[data-slot="card"]')).toHaveClass('rounded-card', 'bg-surface');
  });

  it('is not a link without a target', () => {
    render(<MetricCard icon={TrendingUp} label="Coeficiente de rendimento" value="7,757" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('scrolls to the detail section and focuses its title without changing the route', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/visao-geral';
    const section = document.createElement('section');
    section.id = 'desempenho';
    section.innerHTML = '<h2>Desempenho</h2>';
    document.body.append(section);
    const scrollIntoView = vi.fn();
    section.scrollIntoView = scrollIntoView;

    render(<MetricCard icon={TrendingUp} label="Coeficiente de rendimento" value="7,757" targetId="desempenho" />);
    await user.click(screen.getByRole('link', { name: /Coeficiente de rendimento/ }));

    expect(window.location.hash).toBe('#/visao-geral');
    expect(scrollIntoView).toHaveBeenCalled();
    expect(section.querySelector('h2')).toHaveFocus();
  });
});
