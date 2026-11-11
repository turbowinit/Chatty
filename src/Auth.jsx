import {useState} from 'react'
import {sb} from './supabase'
export default function Auth(){
  const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[pw,setPw]=useState(''),[user,setUser]=useState(''),[msg,setMsg]=useState('')
  const go=async e=>{
    e.preventDefault();setMsg('')
    const r=mode==='login'
      ?await sb.auth.signInWithPassword({email,password:pw})
      :await sb.auth.signUp({email,password:pw,options:{data:{username:user}}})
    if(r.error)setMsg(r.error.message)
    else if(mode==='signup'&&!r.data.session)setMsg('Controlla la mail per confermare la registrazione.')
  }
  return <form className="auth" onSubmit={go}>
    <h2>{mode==='login'?'Accedi':'Registrati'}</h2>
    {mode==='signup'&&<input placeholder="Username (3-20)" value={user} onChange={e=>setUser(e.target.value)} required minLength={3} maxLength={20}/>}
    <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
    <input type="password" placeholder="Password (min 6)" value={pw} onChange={e=>setPw(e.target.value)} required minLength={6}/>
    <button>{mode==='login'?'Entra':'Crea account'}</button>
    <button type="button" className="g" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Non hai un account?':'Hai già un account?'}</button>
    <small>{msg}</small>
  </form>
}
