import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UploadScreen } from './UploadScreen';

const OFFLINE_MESSAGE = 'Você está offline. Para ler novos PDFs, conecte-se. Seus dados já salvos continuam disponíveis.';

function setOnLine(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  setOnLine(true);
});

describe('UploadScreen offline', () => {
  it('explains that new PDFs need a connection and disables reading them', () => {
    setOnLine(false);
    render(<UploadScreen onParsed={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_MESSAGE);
    expect(screen.getByRole('button', { name: 'Ler meus PDFs' })).toBeDisabled();
  });

  it('shows no notice while online', () => {
    setOnLine(true);
    render(<UploadScreen onParsed={vi.fn()} />);
    expect(screen.queryByText(OFFLINE_MESSAGE)).not.toBeInTheDocument();
  });

  it('updates when the connection drops and returns', () => {
    setOnLine(true);
    render(<UploadScreen onParsed={vi.fn()} />);
    setOnLine(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(OFFLINE_MESSAGE);
    setOnLine(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(OFFLINE_MESSAGE)).not.toBeInTheDocument();
  });
});
