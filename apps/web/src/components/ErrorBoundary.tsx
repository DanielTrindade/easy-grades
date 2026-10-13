import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Clears the stored data; the page reloads afterwards, so the upload screen shows up. */
  onReset: () => void | Promise<void>;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/** Keeps a failed lazy chunk or render error from blanking the whole page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo) {
    // Only the name: messages and stacks can carry data from the student's PDFs.
    console.error(error.name);
  }

  handleReset = async () => {
    // Reload even when clearing the data fails, so the page never stays stuck on the error screen.
    try {
      await this.props.onReset();
    } catch (error) {
      console.error(error instanceof Error ? error.name : 'reset failed');
    } finally {
      window.location.reload();
    }
  };

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto grid max-w-[60ch] content-center gap-4 px-4 py-16">
        <h2 className="text-2xl">Algo não carregou.</h2>
        <p className="text-muted-foreground">
          Recarregue a página. Se continuar, limpe os dados salvos e envie os PDFs de novo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={() => window.location.reload()}>
            Recarregar
          </Button>
          <Button size="lg" variant="outline" onClick={this.handleReset}>
            Limpar dados e recomeçar
          </Button>
        </div>
      </div>
    );
  }
}
