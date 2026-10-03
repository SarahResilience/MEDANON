import React from 'react';
import '@/App.css';
import { Toaster } from 'sonner';
import { DocumentProvider, useDoc } from '@/context/DocumentContext';
import { Header } from '@/components/Header';
import { Home } from '@/pages/Home';
import { Processing } from '@/pages/Processing';
import { Review } from '@/pages/Review';
import { Preview } from '@/pages/Preview';
import { Export } from '@/pages/Export';

function Router() {
  const { step } = useDoc();
  return (
    <div className="App min-h-screen bg-[#FBF9F5]">
      <Header />
      {step === 'home' && <Home />}
      {step === 'processing' && <Processing />}
      {step === 'review' && <Review />}
      {step === 'preview' && <Preview />}
      {step === 'export' && <Export />}
    </div>
  );
}

function App() {
  return (
    <DocumentProvider>
      <Router />
      <Toaster position="bottom-right" theme="light" richColors closeButton />
    </DocumentProvider>
  );
}

export default App;
