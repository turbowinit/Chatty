import {useEffect,useRef,useState} from 'react'
import {sb} from './supabase'
export default function Chat({room}){
  const [msgs,setMsgs]=useState([]),[txt,setTxt]=useState(''),end=useRef()
  useEffect(()=>{
    sb.from('messages').select('*,profiles(username)').eq('room',room).order('created_at').limit(100).then(({data})=>setMsgs(data||[]))
    const ch=sb.channel('msg:'+room).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`room=eq.${room}`},async({new:m})=>{
      const {data}=await sb.from('profiles').select('username').eq('id',m.sender).single()
      setMsgs(x=>x.some(y=>y.id===m.id)?x:[...x,{...m,profiles:data}])
    }).subscribe()
    return()=>{sb.removeChannel(ch)}
  },[room])
  useEffect(()=>end.current?.scrollIntoView(),[msgs])
  const send=async e=>{e.preventDefault();const c=txt.trim();if(!c)return;setTxt('');await sb.from('messages').insert({room,content:c})}
  return <>
    <div className="msgs">{msgs.map(m=><div key={m.id}><b>{m.profiles?.username}</b> <small>{new Date(m.created_at).toLocaleTimeString()}</small><div>{m.content}</div></div>)}<div ref={end}/></div>
    <form className="bar" onSubmit={send}><input placeholder="Scrivi un messaggio…" value={txt} onChange={e=>setTxt(e.target.value)} maxLength={2000}/><button>Invia</button></form>
  </>
}
