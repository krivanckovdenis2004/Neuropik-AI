import React, {useEffect, useState} from 'react';
import { createRoot } from 'react-dom/client';
import { Brain, Image, MessageSquare, Zap, Shield, Lock, Rocket, Infinity, Gift, User, Globe2, ArrowRight, Download, Send, Menu, X, CheckCircle, LogOut } from 'lucide-react';
import { auth, authReady, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import './styles.css';

const dict={
 ru:{home:'Главная',chat:'AI Чат',image:'Генератор изображений',history:'История',pricing:'Тарифы',faq:'FAQ',login:'Войти',start:'Начать бесплатно',hero1:'Ваш AI-помощник',hero2:'для общения и творчества',heroText:'Общайтесь с ИИ, генерируйте изображения и воплощайте любые идеи в реальность',free:'5 бесплатных кредитов после регистрации',chatTitle:'AI Чат',chatDesc:'Задавайте любые вопросы и получайте умные ответы',imgTitle:'Генерация изображений',imgDesc:'Создавайте уникальные изображения по текстовому описанию',fastTitle:'Быстро и просто',fastDesc:'Современные AI-модели для максимального результата',users:'Пользователей',dialogs:'AI диалогов',created:'Создано изображений',uptime:'Доступность сервиса',safe:'Безопасно',safeD:'Ваши данные под защитой',conf:'Конфиденциально',confD:'Мы не передаем данные третьим лицам',quick:'Быстро',quickD:'Мгновенные ответы и генерация',unlim:'Без ограничений',unlimD:'Творите и общайтесь без границ',placeholder:'Напишите вопрос ИИ...',send:'Отправить',demo:'Это демо-ответ. После подключения API здесь будет настоящий ответ ИИ.',prompt:'Опишите изображение...',generate:'Создать изображение',credits:'Кредиты',profile:'Профиль',email:'Email',password:'Пароль',register:'Регистрация',logout:'Выйти',name:'Имя',buy:'Купить кредиты',empty:'Пока пусто',tariffs:'Тарифы',soon:'Оплата будет подключена позже',haveAccount:'Уже есть аккаунт?',noAccount:'Нет аккаунта?',signin:'Войти в аккаунт',signup:'Создать аккаунт',error:'Ошибка',loading:'Загрузка...',needLogin:'Войдите или зарегистрируйтесь',createdAcc:'Аккаунт создан', loginSuccess:'Вы успешно вошли', registerSuccess:'Вы успешно зарегистрированы', logoutSuccess:'Вы вышли из аккаунта'},
 en:{home:'Home',chat:'AI Chat',image:'Image Generator',history:'History',pricing:'Pricing',faq:'FAQ',login:'Login',start:'Start free',hero1:'Your AI assistant',hero2:'for chat and creativity',heroText:'Chat with AI, generate images and turn any idea into reality',free:'5 free credits after registration',chatTitle:'AI Chat',chatDesc:'Ask anything and get smart answers',imgTitle:'Image generation',imgDesc:'Create unique images from text prompts',fastTitle:'Fast and simple',fastDesc:'Modern AI models for maximum results',users:'Users',dialogs:'AI dialogs',created:'Images created',uptime:'Service uptime',safe:'Secure',safeD:'Your data is protected',conf:'Private',confD:'We do not share your data',quick:'Fast',quickD:'Instant answers and generation',unlim:'Unlimited',unlimD:'Create and chat without limits',placeholder:'Ask AI something...',send:'Send',demo:'This is a demo answer. After API setup, real AI responses will appear here.',prompt:'Describe an image...',generate:'Generate image',credits:'Credits',profile:'Profile',email:'Email',password:'Password',register:'Register',logout:'Logout',name:'Name',buy:'Buy credits',empty:'Nothing here yet',tariffs:'Pricing',soon:'Payments will be connected later',haveAccount:'Already have an account?',noAccount:'No account?',signin:'Sign in',signup:'Create account',error:'Error',loading:'Loading...',needLogin:'Sign in or register',createdAcc:'Account created', loginSuccess:'You have successfully signed in', registerSuccess:'You have successfully registered', logoutSuccess:'You have signed out'}
};

function mapFirebaseError(e){
 const code=e?.code||'';
 if(code.includes('email-already-in-use')) return 'Этот email уже зарегистрирован';
 if(code.includes('invalid-email')) return 'Неверный email';
 if(code.includes('weak-password')) return 'Пароль должен быть минимум 6 символов';
 if(code.includes('invalid-credential')||code.includes('wrong-password')||code.includes('user-not-found')) return 'Неверный email или пароль';
 if(code.includes('permission-denied')) return 'Нет доступа к базе. Проверь правила Firestore';
 return e?.message||'Неизвестная ошибка';
}

function App(){
 const[lang,setLang]=useState('ru');
 const[page,setPage]=useState('home');
 const[mobile,setMobile]=useState(false);
 const[user,setUser]=useState(null);
 const[profile,setProfile]=useState(null);
 const[history,setHistory]=useState([]);
 const[authLoading,setAuthLoading]=useState(true);
 const[toast,setToast]=useState('');
 const t=dict[lang];
 const nav=['home','chat','image','history','pricing','faq'];
 function showToast(text){ setToast(text); window.clearTimeout(window.__npToastTimer); window.__npToastTimer=window.setTimeout(()=>setToast(''),3200); }
 function go(nextPage){ setPage(nextPage); try{ localStorage.setItem('neuropic_page', nextPage); }catch(e){} }

 useEffect(()=>{
  let unsubAuth = null;
  let unsubProfile = null;
  let unsubHistory = null;
  let cancelled = false;

  authReady.finally(()=>{
    if(cancelled) return;
    unsubAuth = onAuthStateChanged(auth, async (fbUser)=>{
      setAuthLoading(true);
      try{
        if(unsubProfile){unsubProfile(); unsubProfile=null;}
        if(unsubHistory){unsubHistory(); unsubHistory=null;}

        if(!fbUser){
          setUser(null);
          setProfile(null);
          setHistory([]);
          setPage(prev=>['chat','image','history','profile'].includes(prev)?'home':prev);
          setAuthLoading(false);
          return;
        }

        setUser(fbUser);
        setPage(prev=>{
          if(prev==='login'||prev==='home'){
            try{const saved=localStorage.getItem('neuropic_page'); if(saved&&saved!=='login'&&saved!=='home') return saved;}catch(e){}
            return 'image';
          }
          return prev;
        });
        const ref=doc(db,'users',fbUser.uid);
        const snap=await getDoc(ref);
        if(!snap.exists()){
          await setDoc(ref,{uid:fbUser.uid,name:fbUser.displayName||'User',email:fbUser.email,credits:5,createdAt:serverTimestamp()});
        }

        unsubProfile=onSnapshot(ref,(s)=>setProfile(s.exists()?s.data():null), (e)=>console.error('Profile snapshot error:', e));
        const q=query(collection(db,'users',fbUser.uid,'history'),orderBy('createdAt','desc'));
        unsubHistory=onSnapshot(q,(s)=>setHistory(s.docs.map(d=>({id:d.id,...d.data()}))), (e)=>console.error('History snapshot error:', e));
        setAuthLoading(false);
      }catch(e){
        console.error(e);
        setAuthLoading(false);
      }
    });
  });

  return ()=>{
    cancelled=true;
    if(unsubAuth) unsubAuth();
    if(unsubProfile) unsubProfile();
    if(unsubHistory) unsubHistory();
  };
 },[]);

 const credits=profile?.credits ?? 0;
 async function addHistory(item){
  if(!user) return;
  await addDoc(collection(db,'users',user.uid,'history'),{...item,createdAt:serverTimestamp(),date:new Date().toLocaleString()});
 }
 async function dec(){
  if(!user || credits<1) return false;
  await updateDoc(doc(db,'users',user.uid),{credits:credits-1});
  return true;
 }
 async function logout(){await signOut(auth); try{localStorage.removeItem('neuropic_page')}catch(e){} setPage('home'); showToast(t.logoutSuccess);}

 return <>
  <header>
   <div className="brand" onClick={()=>go(user?'image':'home')}><Brain/><b>NeuroPic <span>AI</span></b></div>
   <nav className={mobile?'open':''}>{nav.map(n=><button key={n} onClick={()=>{go(n);setMobile(false)}} className={page===n?'active':''}>{t[n]}</button>)}{user&&<><button onClick={()=>{go('profile');setMobile(false)}} className={page==='profile'?'active':''}>{t.profile}</button><button onClick={()=>{logout();setMobile(false)}}>{t.logout}</button></>}</nav>
   <div className="actions">
    <button className="pill" onClick={()=>setLang(lang==='ru'?'en':'ru')}><Globe2 size={16}/>{lang.toUpperCase()}</button>
    {user?<button className="outline userbtn" onClick={()=>go('profile')}><User size={16}/>{profile?.name||user.email} • {credits}</button>:<button className="outline" onClick={()=>go('login')}>{t.login}</button>}
    {!user&&<button className="cta" onClick={()=>go('login')}>{t.start}</button>}
    {user&&<button className="outline logoutbtn" onClick={logout}><LogOut size={16}/>{t.logout}</button>}
    <button className="burger" onClick={()=>setMobile(!mobile)}>{mobile?<X/>:<Menu/>}</button>
   </div>
  </header>
  {toast&&<div className="toast"><CheckCircle size={18}/>{toast}</div>}
  <main>
   {authLoading&&<section className="panel auth"><h2>{t.loading}</h2></section>}
   {!authLoading&&page==='home'&&<Home t={t} setPage={go} user={user}/>} 
   {!authLoading&&page==='login'&&<Auth t={t} setPage={go} showToast={showToast}/>} 
   {!authLoading&&page==='chat'&&<Chat t={t} user={user} setPage={go} lang={lang} addHistory={addHistory}/>} 
   {!authLoading&&page==='image'&&<ImageGen t={t} user={user} setPage={go} credits={credits} dec={dec} addHistory={addHistory}/>} 
   {!authLoading&&page==='history'&&<History t={t} history={history}/>} 
   {!authLoading&&page==='pricing'&&<Pricing t={t}/>} 
   {!authLoading&&page==='profile'&&<Profile t={t} user={user} profile={profile} credits={credits} logout={logout} setPage={go}/>} 
   {!authLoading&&page==='faq'&&<FAQ lang={lang}/>} 
  </main>
  <footer>© 2026 NeuroPic AI • RU / EN • Firebase MVP</footer>
 </>;
}

function Home({t,setPage,user}){return <section className="hero"><div className="heroText"><h1>{t.hero1}<br/><span>{t.hero2}</span></h1><p>{t.heroText}</p><div className="heroBtns"><button className="cta big" onClick={()=>setPage(user?'image':'login')}>{user?t.image:t.start}<ArrowRight/></button>{!user&&<button className="outline big" onClick={()=>setPage('login')}>{t.login}<User/></button>}{user&&<button className="outline big" onClick={()=>setPage('profile')}>{t.profile}<User/></button>}</div><div className="gift"><Gift/>{t.free}</div></div><div className="orb"><div className="brain"><Brain/><b>AI</b></div></div><div className="cards"><Card icon={<MessageSquare/>} title={t.chatTitle} desc={t.chatDesc}/><Card icon={<Image/>} title={t.imgTitle} desc={t.imgDesc}/><Card icon={<Zap/>} title={t.fastTitle} desc={t.fastDesc}/></div><div className="stats"><Stat n="10K+" l={t.users}/><Stat n="50K+" l={t.dialogs}/><Stat n="30K+" l={t.created}/><Stat n="99.9%" l={t.uptime}/></div><div className="mini"><Card icon={<Shield/>} title={t.safe} desc={t.safeD}/><Card icon={<Lock/>} title={t.conf} desc={t.confD}/><Card icon={<Rocket/>} title={t.quick} desc={t.quickD}/><Card icon={<Infinity/>} title={t.unlim} desc={t.unlimD}/></div></section>}
function Card(p){return <div className="card"><div className="ico">{p.icon}</div><h3>{p.title}</h3><p>{p.desc}</p></div>}
function Stat({n,l}){return <div><b>{n}</b><span>{l}</span></div>}

function Auth({t,setPage,showToast}){
 const[mode,setMode]=useState('register');
 const[name,setName]=useState('');
 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');
 const[error,setError]=useState('');
 const[loading,setLoading]=useState(false);
 async function submit(){
  setError(''); setLoading(true);
  try{
   if(mode==='register'){
    const cred=await createUserWithEmailAndPassword(auth,email,password);
    await updateProfile(cred.user,{displayName:name||'User'});
    await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,name:name||'User',email:cred.user.email,credits:5,createdAt:serverTimestamp()},{merge:true});
    showToast(t.registerSuccess);
   }else{
    await signInWithEmailAndPassword(auth,email,password);
    showToast(t.loginSuccess);
   }
   setPage('image');
  }catch(e){setError(mapFirebaseError(e));}
  setLoading(false);
 }
 return <section className="panel auth"><h2>{mode==='register'?t.register:t.signin}</h2>{mode==='register'&&<input placeholder={t.name} value={name} onChange={e=>setName(e.target.value)}/>}<input placeholder={t.email} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/><input placeholder={t.password} value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete={mode==='register'?'new-password':'current-password'}/>{error&&<p className="warn">{t.error}: {error}</p>}<button className="cta big" disabled={loading||!email||!password} onClick={submit}>{loading?t.loading:(mode==='register'?t.signup:t.signin)}</button><p>{mode==='register'?t.haveAccount:t.noAccount} <button className="linkbtn" onClick={()=>{setMode(mode==='register'?'login':'register');setError('')}}>{mode==='register'?t.login:t.register}</button></p><p>{t.free}</p></section>
}

function Chat({t,user,setPage,lang,addHistory}){const[msg,setMsg]=useState('');const[list,setList]=useState([]);const[busy,setBusy]=useState(false);const[error,setError]=useState('');if(!user)return <NeedLogin t={t} setPage={setPage}/>;async function send(){const text=msg.trim();if(!text||busy)return;setError('');const next=[...list,{role:'me',text}];setList(next);setMsg('');setBusy(true);try{const apiMessages=list.map(m=>({role:m.role==='me'?'user':'assistant',content:m.text}));const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,messages:apiMessages,lang})});const data=await r.json();if(!r.ok)throw new Error(data?.error||'API error');const answer=data.answer||'Ответ пустой';setList([...next,{role:'ai',text:answer}]);await addHistory({type:'chat',prompt:text,answer,status:'completed',model:data.model||'gpt-4o-mini'});}catch(e){console.error(e);setError(e.message||'Ошибка API');setList([...next,{role:'ai',text:'Ошибка API: '+(e.message||'проверь ROCKAPI_KEY и баланс')}]);}setBusy(false);}return <section className="panel chat"><h2>{t.chatTitle}</h2><div className="chatbox">{list.map((m,i)=><div key={i} className={m.role}>{m.text}</div>)}{busy&&<div className="ai">{t.loading}</div>}</div>{error&&<p className="warn">{error}</p>}<div className="inputrow"><input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}} placeholder={t.placeholder}/><button className="cta" disabled={busy||!msg.trim()} onClick={send}><Send size={18}/>{busy?t.loading:t.send}</button></div></section>}

function ImageGen({t,user,setPage,credits,dec,addHistory}){const[p,setP]=useState('');const[img,setImg]=useState('');const[busy,setBusy]=useState(false);const[status,setStatus]=useState('');if(!user)return <NeedLogin t={t} setPage={setPage}/>;async function generate(){const prompt=p.trim();if(!prompt||credits<1||busy)return;setBusy(true);setStatus('Создаем изображение через DALL·E 3...');let genRef=null;try{genRef=await addDoc(collection(db,'generations'),{uid:user.uid,email:user.email,prompt,type:'image',status:'pending',createdAt:serverTimestamp(),date:new Date().toLocaleString()});const r=await fetch('/api/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,size:'1024x1024'})});const data=await r.json();if(!r.ok)throw new Error(data?.error||'Image API error');const imageUrl=data.imageUrl;if(!imageUrl)throw new Error('API не вернул картинку');setImg(imageUrl);await dec();await updateDoc(genRef,{status:'completed',img:imageUrl,model:data.model||'dall-e-3',completedAt:serverTimestamp()});await addHistory({generationId:genRef.id,type:'image',prompt,img:imageUrl,status:'completed',model:data.model||'dall-e-3'});setStatus('Готово. Картинка сохранена в историю');}catch(e){console.error(e);setStatus(e.message||'Ошибка генерации');if(genRef){try{await updateDoc(genRef,{status:'failed',error:e.message||'Ошибка генерации',failedAt:serverTimestamp()});}catch(_){}}}setBusy(false);}return <section className="panel"><h2>{t.imgTitle}</h2><div className="credits">{t.credits}: <b>{credits}</b></div><textarea value={p} onChange={e=>setP(e.target.value)} placeholder={t.prompt}/><button className="cta big" disabled={!p.trim()||credits<1||busy} onClick={generate}>{busy?t.loading:t.generate}</button>{status&&<p className={status.includes('Ошибка')||status.includes('API')?'warn':'notice'}>{status}</p>}{credits<1&&<p className="warn">{t.buy}</p>}{img&&<div className="result"><img src={img}/><a className="outline" download="neuropic-ai.png" href={img} target="_blank"><Download/>Download</a></div>}</section>}

function History({t,history}){return <section className="panel"><h2>{t.history}</h2>{!history.length?<p>{t.empty}</p>:<div className="gallery">{history.map((h,i)=><div className="work" key={h.id||i}>{h.img?<img src={h.img}/>:<div className="chatPreview"><MessageSquare/><span>{h.answer||'AI chat'}</span></div>}<b>{h.prompt}</b><small>{h.type==='chat'?'AI Chat':'Image'} • {h.date||''}</small></div>)}</div>}</section>}
function Pricing({t}){return <section className="panel"><h2>{t.tariffs}</h2><div className="prices"><Plan n="Free" p="0₽" d="5 credits"/><Plan n="Start" p="199₽" d="100 credits"/><Plan n="Pro" p="499₽" d="350 credits"/></div><p>{t.soon}</p></section>}
function Plan({n,p,d}){return <div className="price"><h3>{n}</h3><b>{p}</b><p>{d}</p><button className="cta">Выбрать</button></div>}
function Profile({t,user,profile,credits,logout,setPage}){if(!user)return <NeedLogin t={t} setPage={setPage}/>;return <section className="panel auth"><h2>{t.profile}</h2><p>{t.name}: <b>{profile?.name||user.displayName||'User'}</b></p><p>{t.email}: <b>{user.email}</b></p><p>{t.credits}: <b>{credits}</b></p><button className="outline" onClick={logout}>{t.logout}</button></section>}
function FAQ({lang}){return <section className="panel"><h2>FAQ</h2><h3>{lang==='ru'?'Это уже подключено к настоящему ИИ?':'Is real AI connected?'}</h3><p>{lang==='ru'?'Сейчас подключены регистрация Firebase, кредиты, история и настоящий AI-чат через RockAPI. Реальные картинки подключаются следующим этапом.':'Firebase auth, credits, history and real AI chat via RockAPI are connected. Real image generation comes next.'}</p></section>}
function NeedLogin({t,setPage}){return <section className="panel auth"><h2>{t.needLogin}</h2><p>{t.free}</p><button className="cta big" onClick={()=>setPage('login')}>{t.start}</button></section>}

createRoot(document.getElementById('root')).render(<App/>);
