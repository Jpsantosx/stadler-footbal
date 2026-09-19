// Short synthesized crowd/impact layers. Sources stop and disconnect after every reaction.
const buffers=new WeakMap<AudioContext,AudioBuffer>();
export function playStadiumReaction(audio:AudioContext,kind:'kick'|'goal'|'whistle'|'tackle'|'save'){
  let buffer=buffers.get(audio);
  if(!buffer){buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate);const data=buffer.getChannelData(0);let smooth=0;
    for(let i=0;i<data.length;i++){smooth=smooth*.8+(Math.random()*2-1)*.2;data[i]=smooth;}buffers.set(audio,buffer);}
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
  const crowd=kind==='goal'||kind==='save'||kind==='whistle';
  const now=audio.currentTime,duration=kind==='goal'?2.6:kind==='save'?1.1:kind==='whistle'?.9:.13;
  source.buffer=buffer;filter.type='bandpass';filter.frequency.value=crowd?650:150;filter.Q.value=.6;
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='goal'?.65:crowd?.16:.35,now+.035);
  gain.gain.exponentialRampToValueAtTime(.0001,now+duration);source.connect(filter);filter.connect(gain);gain.connect(audio.destination);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(now);source.stop(now+duration+.02);
}
