import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Books } from './pages/Books';
import { Upload } from './pages/Upload';

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/books" element={<Books />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/history" element={
          <div>
            <h2>Processing History</h2>
            <p>View your book processing history here.</p>
          </div>
        } />
        <Route path="/profile" element={
          <div>
            <h2>Profile</h2>
            <p>Manage your profile settings here.</p>
          </div>
        } />
        <Route path="/settings" element={
          <div>
            <h2>Settings</h2>
            <p>Adjust your application settings here.</p>
          </div>
        } />
      </Routes>
    </AppLayout>
  );
}

export default App;
