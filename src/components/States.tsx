import { ReactNode } from "react";

export const Spinner = ({ label = "Cargando..." }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-3 py-10 text-base-content/70">
    <span className="loading loading-spinner loading-md text-primary" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

interface EmptyProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyProps) => (
  <div className="flex flex-col items-center gap-2 rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-10 text-center">
    <p className="subsection-title">{title}</p>
    {description && <p className="max-w-md text-base-content/70">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const Notice = ({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) => {
  const styles = { success: "alert-success", error: "alert-error", info: "alert-info" };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`alert ${styles[tone]} text-sm`}>
      <span>{children}</span>
    </div>
  );
};
