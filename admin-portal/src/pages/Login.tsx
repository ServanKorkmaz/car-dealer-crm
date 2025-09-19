import React from 'react';
import { signIn, signUp } from '../auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [mode, setMode] = React.useState<'signin'|'signup'>('signin');
  const [err, setErr] = React.useState<string|null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password, name || undefined);
      nav('/');
    } catch (e:any) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <form className="space-y-3" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div>
            <label className="block text-sm">Full name</label>
            <input className="border rounded px-3 py-2 w-full" value={name} onChange={(e)=>setName(e.target.value)} />
          </div>
        )}
        <div>
          <label className="block text-sm">Email</label>
          <input className="border rounded px-3 py-2 w-full" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input className="border rounded px-3 py-2 w-full" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </div>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button disabled={loading} className="bg-black text-white rounded px-4 py-2">
          {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Sign up')}
        </button>
      </form>
      <div className="mt-4 text-sm">
        {mode === 'signin' ? (
          <button className="underline" onClick={()=>setMode('signup')}>Create an account</button>
        ) : (
          <button className="underline" onClick={()=>setMode('signin')}>I already have an account</button>
        )}
      </div>
    </div>
  );
}