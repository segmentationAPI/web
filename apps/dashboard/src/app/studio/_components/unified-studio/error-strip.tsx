import { ErrorBanner } from "./studio-ui-primitives";
import { useStudioErrorViewModel } from "./use-studio-view-model";

export function ErrorStrip() {
  const { runError, refreshError } = useStudioErrorViewModel();

  if (!runError && !refreshError) {
    return null;
  }

  return (
    <div className="space-y-2 border-b border-border/20 px-4 py-3 sm:px-5">
      {runError ? <ErrorBanner message={runError} /> : null}
      {refreshError ? <ErrorBanner message={refreshError} /> : null}
    </div>
  );
}
