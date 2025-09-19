import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import './index.css';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import UsageAdmin from './pages/UsageAdmin';
import Home from './pages/Home';
import AdminPage from './pages/admin/AdminPage';
import JoinOrg from './pages/admin/JoinOrg';

function AuthedRoute({ children }: { children: JSX.Element }) {
  const [ready, setReady] = React.useState(false);
  const [authed, setAuthed] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  if (!ready) return <div className="p-6">Loading…</div>;
  return authed ? children : <Navigate to="/login" replace />;
}

function Nav() {
  return (
    <nav className="p-4 border-b flex gap-4">
      <Link to="/">Home</Link>
      <Link to="/admin">Admin</Link>
      <Link to="/admin/usage">Admin Usage</Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<JoinOrg />} />
        <Route path="/admin" element={
          <AuthedRoute><AdminPage /></AuthedRoute>
        } />
        <Route path="/admin/usage" element={
          <AuthedRoute><UsageAdmin/></AuthedRoute>
        } />
        <Route path="/" element={
          <AuthedRoute><Home/></AuthedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<App />);