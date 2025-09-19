import React from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function JoinOrg() {
  const nav = useNavigate();
  const [msg, setMsg] = React.useState('Joining…');

  React.useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (!token) { setMsg('Missing token'); return; }
      const { error } = await supabase.rpc('accept_invite', { invite_token: token });
      if (error) { setMsg(error.message); return; }
      setMsg('Joined successfully. Redirecting…');
      setTimeout(()=>nav('/admin'), 800);
    })();
  }, []);

  return <div className="p-6">{msg}</div>;
}