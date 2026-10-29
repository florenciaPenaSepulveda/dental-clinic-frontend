import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  fallo: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { fallo: false };

  static getDerivedStateFromError(): State {
    return { fallo: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.fallo) {
      return this.props.children;
    }
    return (
      <div role="alert" className="mx-auto mt-24 max-w-md space-y-4 px-4 text-center">
        <h1 className="page-title">Algo salió mal</h1>
        <p className="text-base-content/70">Ocurrió un error inesperado. Recarga la página para continuar; si el problema persiste, avisa a la clínica.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Recargar la página
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
