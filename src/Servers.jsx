import {useEffect,useState} from 'react'
import {sb} from './supabase'
import Chat from './Chat'
import Voice from './Voice'

export function Discover({me,onOpen}){
  const [q,setQ]=useState(''),[list,setList]=useState([]),[name,setName]=useState(''),[pub,setPub]=useState(true)
  useEffect(()=>{
    const t=setTimeout(async()=>{
      const {data}=await sb.from('servers').select('id,name').eq('is_public',true).ilike('name',`%${q}%`).limit(30)
      setList(data||[])
    },250);return()=>clearTimeout(t)
  },[q])
  const join=async s=>{await sb.from('server_members').upsert({server_id:s.id,user_id:me},{ignoreDuplicates:true});onOpen(s)}
  const create=async e=>{
    e.preventDefault();if(!name.trim())return
    const {data:s,error}=await sb.from('servers').insert({name:name.trim(),is_public:pub}).select().single()
    if(error)return alert(error.message)
    await sb.from('server_members').insert({server_id:s.id,user_id:me})
    await sb.from('channels').insert([{server_id:s.id,name:'generale',kind:'text'},{server_id:s.id,name:'Vocale',kind:'voice'}])
    onOpen(s)
  }
  return <div className="pad" style={{flex:1}}>
    <h3>Crea un server</h3>
    <form className="bar" onSubmit={create}><input placeholder="Nome server" value={name} onChange={e=>setName(e.target.value)}/>
      <label><input type="checkbox" checked={pub} onChange={e=>setPub(e.target.checked)}/> pubblico</label><button>Crea</button></form>
    <h3>Server pubblici</h3>
    <input style={{width:'100%'}} placeholder="🔍 Cerca server…" value={q} onChange={e=>setQ(e.target.value)}/>
    {list.map(s=><div className="row" key={s.id}><span style={{flex:1}}>{s.name}</span><button onClick={()=>join(s)}>Unisciti</button></div>)}
  </div>
}

export function ServerView({server,me}){
  const [chs,setChs]=useState([]),[cur,setCur]=useState(null),[n,setN]=useState(''),[kind,setKind]=useState('text'),[owner,setOwner]=useState(false)
  const load=async()=>{
    const {data}=await sb.from('channels').select('*').eq('server_id',server.id).order('name')
    setChs(data||[]);setCur(c=>c&&data?.find(x=>x.id===c.id)?c:data?.find(x=>x.kind==='text')||null)
  }
  useEffect(()=>{
    load();sb.from('servers').select('owner').eq('id',server.id).single().then(({data})=>setOwner(data?.owner===me))
    const ch=sb.channel('ch:'+server.id).on('postgres_changes',{event:'*',schema:'public',table:'channels',filter:`server_id=eq.${server.id}`},load).subscribe()
    return()=>{sb.removeChannel(ch)}
  },[server.id])
  const add=async e=>{e.preventDefault();if(!n.trim())return;await sb.from('channels').insert({server_id:server.id,name:n.trim(),kind});setN('')}
  return <>
    <div className="side"><b>{server.name}</b>
      {chs.map(c=><button key={c.id} className={'item g '+(cur?.id===c.id?'on':'')} onClick={()=>setCur(c)}>{c.kind==='text'?'#':'🔊'} {c.name}</button>)}
      {owner&&<form onSubmit={add}><input style={{width:'100%'}} placeholder="Nuovo canale" value={n} onChange={e=>setN(e.target.value)}/>
        <select value={kind} onChange={e=>setKind(e.target.value)}><option value="text">testo</option><option value="voice">voce</option></select><button>＋</button></form>}
      <button className="g" style={{marginTop:8}} onClick={()=>sb.from('server_members').delete().eq('server_id',server.id).eq('user_id',me)}>Lascia server</button>
    </div>
    <div className="main">{cur?.kind==='text'&&<Chat key={cur.id} room={cur.id}/>}
      {cur?.kind==='voice'&&<div className="pad"><h3>🔊 {cur.name}</h3><Voice key={cur.id} room={cur.id} me={me}/></div>}</div>
  </>
}
