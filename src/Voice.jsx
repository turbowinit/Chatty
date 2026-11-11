import {useEffect,useState} from 'react'
import {sb} from './supabase'
// WebRTC mesh; signaling via Supabase Realtime Broadcast. Funziona per 1v1 (DM) e piccoli canali vocali.
export default function Voice({room,me}){
  const [on,setOn]=useState(false),[peers,setPeers]=useState(0),[err,setErr]=useState('')
  useEffect(()=>{
    if(!on)return
    let stream,ch,dead=false;const pcs={}
    const send=(to,type,data)=>ch?.send({type:'broadcast',event:'sig',payload:{from:me,to,type,data}})
    const mk=id=>{
      const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]})
      stream.getTracks().forEach(t=>pc.addTrack(t,stream))
      pc.onicecandidate=e=>e.candidate&&send(id,'ice',e.candidate)
      pc.ontrack=e=>{let a=document.getElementById('a'+id);if(!a){a=document.createElement('audio');a.id='a'+id;a.autoplay=true;document.body.appendChild(a)};a.srcObject=e.streams[0]}
      pcs[id]=pc;setPeers(Object.keys(pcs).length);return pc
    }
    const drop=id=>{pcs[id]?.close();delete pcs[id];document.getElementById('a'+id)?.remove();setPeers(Object.keys(pcs).length)}
    ;(async()=>{
      try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch{setErr('Microfono non disponibile');setOn(false);return}
      if(dead){stream.getTracks().forEach(t=>t.stop());return}
      ch=sb.channel('voice:'+room,{config:{broadcast:{self:false}}})
      ch.on('broadcast',{event:'sig'},async({payload:p})=>{
        if(p.to&&p.to!==me)return
        if(p.type==='hello'){const pc=mk(p.from);const o=await pc.createOffer();await pc.setLocalDescription(o);send(p.from,'offer',o)}
        else if(p.type==='offer'){const pc=pcs[p.from]||mk(p.from);await pc.setRemoteDescription(p.data);const a=await pc.createAnswer();await pc.setLocalDescription(a);send(p.from,'answer',a)}
        else if(p.type==='answer')await pcs[p.from]?.setRemoteDescription(p.data)
        else if(p.type==='ice')await pcs[p.from]?.addIceCandidate(p.data).catch(()=>{})
        else if(p.type==='bye')drop(p.from)
      }).subscribe(s=>s==='SUBSCRIBED'&&send(null,'hello'))
    })()
    return()=>{dead=true;send(null,'bye');Object.keys(pcs).forEach(drop);stream?.getTracks().forEach(t=>t.stop());const c=ch;setTimeout(()=>c&&sb.removeChannel(c),300)}
  },[on,room,me])
  return <span>{err&&<small>{err} </small>}{on&&<small>{peers} connessi </small>}
    <button className={on?'':'g'} onClick={()=>setOn(!on)}>{on?'📞 Esci dalla voce':'📞 Entra in voce'}</button></span>
}
