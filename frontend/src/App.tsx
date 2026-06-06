import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Nav } from './components/Nav';
import { ToastProvider } from './components/Toast';
import { InvoiceList } from './pages/InvoiceList';
import { CustomerProfile } from './pages/CustomerProfile';
import { Summary } from './pages/Summary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route path="/" element={<InvoiceList />} />
            <Route path="/customers/:idOrName" element={<CustomerProfile />} />
            <Route path="/summary" element={<Summary />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
