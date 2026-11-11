import {useEffect,useState} from 'react'
import {sb} from './supabase'
export default function Friends({me,online,onDm}){
  const [rows,setRows]=useState([]),[name,setName]=useState(''),[msg,setMsg]=useState('')
  const load=async()=>{
    const {data}=await sb.from('friendships').select('id,status,requester,addressee,a:profiles!requester(id,username),b:profiles!addressee(id,username)')
    setRows(data||[])
  }
  useEffect(()=>{
    load()
    const ch=sb.channel('friends').on('postgres_changes',{event:'*',schema:'public',table:'friendships'},load).subscribe()
    return()=>{sb.removeChannel(ch)}
  },[])
  const add=async e=>{
    e.preventDefault();setMsg('')
    const {data:p}=await sb.from('profiles').select('id').eq('username',name.trim()).maybeSingle()
    if(!p)return setMsg('Utente non trovato')
    const {error}=await sb.from('friendships').insert({requester:me,addressee:p.id})
    setMsg(error?'Richiesta già esistente o non valida':'Richiesta inviata!');setName('')
  }
  const other=r=>r.requester===me?r.b:r.a
  const incoming=rows.filter(r=>r.status==='pending'&&r.addressee===me)
  const outgoing=rows.filter(r=>r.status==='pending'&&r.requester===me)
  const friends=rows.filter(r=>r.status==='accepted').sort((x,y)=>online.has(other(y).id)-online.has(other(x).id))
  return <div className="pad" style={{flex:1}}>
    <form className="bar" onSubmit={add}><input placeholder="Aggiungi amico per username" value={name} onChange={e=>setName(e.target.value)}/><button>Invia</button></form>
    <small>{msg}</small>
    <h4>Richieste ricevute</h4>
    {incoming.map(r=><div className="row" key={r.id}><span style={{flex:1}}>{r.a.username}</span>
      <button onClick={()=>sb.from('friendships').update({status:'accepted'}).eq('id',r.id)}>Accetta</button>
      <button className="g" onClick={()=>sb.from('friendships').delete().eq('id',r.id)}>Rifiuta</button></div>)}
    <h4>Inviate</h4>
    {outgoing.map(r=><div className="row" key={r.id}><span style={{flex:1}}>{r.b.username} (in attesa)</span><button className="g" onClick={()=>sb.from('friendships').delete().eq('id',r.id)}>Annulla</button></div>)}
    <h4>Amici — {friends.filter(r=>online.has(other(r).id)).length} online</h4>
    {friends.map(r=>{const f=other(r);return <div className="row" key={r.id}>
      <span className={'dot '+(online.has(f.id)?'on':'')}/><span style={{flex:1}}>{f.username}</span>
      <button onClick={()=>onDm(f)}>💬 Chat / 📞</button>
      <button className="g" onClick={()=>sb.from('friendships').delete().eq('id',r.id)}>Rimuovi</button></div>})}
  </div>
}
