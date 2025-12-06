import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "@/config/queryClient";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import "./index.css";

// Lazy load App for faster initial load
const App = lazy(() => import("./App"));

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);

// Initialize monitoring systems in production
const ENABLE_MONITORING = import.meta.env.PROD;

if (ENABLE_MONITORING) {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Production monitoring initializing...');
    
    import('./utils/realUserMonitoring').then(() => {
      console.log('✅ Real User Monitoring initialized');
    }).catch(error => {
      console.warn('Failed to initialize RUM:', error);
    });

    import('./utils/securityHeaders').then(() => {
      console.log('✅ Security Headers initialized');
    }).catch(error => {
      console.warn('Failed to initialize Security Headers:', error);
    });
  });
}

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner />
          </div>
        }>
          <App />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);