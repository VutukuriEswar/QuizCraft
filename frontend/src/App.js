import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import LandingPage from '@/pages/LandingPage';
import GeneratorPage from '@/pages/GeneratorPage';
import '@/App.css';

function App() {
    return (
        <BrowserRouter>
            <div className="App bg-grid min-h-screen">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/generate" element={<GeneratorPage />} />
                </Routes>
                <Toaster richColors position="top-center" />
            </div>
        </BrowserRouter>
    );
}

export default App;