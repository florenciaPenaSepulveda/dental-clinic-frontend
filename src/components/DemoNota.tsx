export const esDemo = (): boolean => import.meta.env.VITE_DEMO === "true";

const DemoNota = ({ children }: { children: string }) =>
  esDemo() ? (
    <div role="note" className="mb-4 rounded-box border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-neutral">
      <strong>Demostración:</strong> {children}
    </div>
  ) : null;

export default DemoNota;
