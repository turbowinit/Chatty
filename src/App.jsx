import {useEffect,useState} from 'react'
import {sb} from './supabase'
import Auth from './Auth'
import Friends from './Friends'
import Chat from './Chat'
import Voice from './Voice'
import {Discover,ServerView} from './Servers'

export default function App(){
  const [session,setSession]=useState(null),[ready,setReady]=useState(false)
  useEffect(()=>{
    sb.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)})
    const {data:l}=sb.auth.onAuthStateChange((_e,s)=>setSession(s))
    return()=>l.subscription.unsubscribe()
  },[])
  if(!ready)return null
  return session?<Main user={session.user}/>:<Auth/>
}

function Main({user}){
  const [online,setOnline]=useState(new Set()),[view,setView]=useState({t:'friends'}),[mine,setMine]=useState([])
  useEffect(()=>{ // presenza online/offline realtime
    const ch=sb.channel('presence:global',{config:{presence:{key:user.id}}})
    ch.on('presence',{event:'sync'},()=>setOnline(new Set(Object.keys(ch.presenceState()))))
    ch.subscribe(s=>s==='SUBSCRIBED'&&ch.track({at:Date.now()}))
    return()=>{sb.removeChannel(ch)}
  },[user.id])
  const load=async()=>{
    const {data}=await sb.from('server_members').select('servers(id,name)').eq('user_id',user.id)
    setMine((data||[]).map(r=>r.servers).filter(Boolean))
  }
  useEffect(()=>{
    load()
    const ch=sb.channel('my-servers').on('postgres_changes',{event:'*',schema:'public',table:'server_members',filter:`user_id=eq.${user.id}`},load).subscribe()
    return()=>{sb.removeChannel(ch)}
  },[user.id])
  const dm=f=>setView({t:'dm',f,room:'dm:'+[user.id,f.id].sort().join('_')})
  return <div className="app">
    <div className="rail">
      <button className={view.t==='friends'||view.t==='dm'?'on':''} onClick={()=>setView({t:'friends'})} title="Amici">🏠</button>
      {mine.map(s=><button key={s.id} className={view.s?.id===s.id?'on':'g'} title={s.name} onClick={()=>setView({t:'server',s})}>{s.name[0].toUpperCase()}</button>)}
      <button className="g" title="Esplora / crea server" onClick={()=>setView({t:'discover'})}>＋</button>
      <button className="g" title="Esci" onClick={()=>sb.auth.signOut()}>⎋</button>
    </div>
    {view.t==='friends'&&<Friends me={user.id} online={online} onDm={dm}/>}
    {view.t==='dm'&&<div className="main"><div className="bar"><b style={{flex:1}}>@{view.f.username}</b><Voice room={view.room} me={user.id}/></div><Chat key={view.room} room={view.room}/></div>}
    {view.t==='discover'&&<Discover me={user.id} onOpen={s=>setView({t:'server',s})}/>}
    {view.t==='server'&&<ServerView key={view.s.id} server={view.s} me={user.id}/>}
  </div>
}
