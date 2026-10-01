# 상모고 홍보영상용 오리지널 비트 (120 BPM, 30초) — 직접 합성한 음원이라 저작권/라이선스 문제 없음
import numpy as np, wave
from scipy.signal import lfilter, butter
SR=44100; BPM=120; BEAT=60/BPM; DUR=30.0
N=int(SR*DUR); L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def add(buf,start,sig,gain=1.0):
    i=int(start*SR)
    if i>=N: return
    s=sig[:N-i]; buf[i:i+len(s)]+=s*gain
def lp(x,f,o=2): b,a=butter(o,f/(SR/2),'low'); return lfilter(b,a,x)
def hp(x,f,o=2): b,a=butter(o,f/(SR/2),'high'); return lfilter(b,a,x)
def bp(x,f1,f2): b,a=butter(2,[f1/(SR/2),f2/(SR/2)],'band'); return lfilter(b,a,x)
def t_(d): return np.arange(int(SR*d))/SR
def kick():
    t=t_(0.4); f=45+130*np.exp(-t*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t*7)*1.0 + np.exp(-t*300)*0.5*rng.standard_normal(len(t))*0.3
def clap():
    t=t_(0.3); n=rng.standard_normal(len(t)); e=np.zeros_like(t)
    for o in (0,0.012,0.024): e+=np.where(t>=o,np.exp(-(t-o)*60),0)*(t>=o)
    e=e*0.45+np.exp(-t*18)*0.55
    return bp(n,900,6500)*e*0.9
def hat(d=0.06,g=1.0):
    t=t_(d); return hp(rng.standard_normal(len(t)),7000)*np.exp(-t/(d/5))*g
def saw(f,t): return 2*((f*t)%1)-1
def bass(f,d):
    t=t_(d); e=np.minimum(1,t*200)*np.exp(-t*3.2)
    return lp(saw(f,t)*0.6+np.sin(2*np.pi*f*t)*0.7,420)*e
def pluck(freqs,d=0.35):
    t=t_(d); s=sum(saw(f*(1+dt),t) for f in freqs for dt in (-0.004,0.004))
    e=np.exp(-t*9); return lp(s,3800)*e*0.14
def lead(f,d=0.12):
    t=t_(d); s=np.sign(np.sin(2*np.pi*f*t))*0.5+saw(f*2.003,t)*0.25
    return lp(s,5200)*np.exp(-t*14)*np.minimum(1,t*400)*0.5
def riser(d):
    t=t_(d); n=rng.standard_normal(len(t)); out=np.zeros_like(t); k=len(t)//24
    for i in range(24):
        a=i*k; seg=n[a:a+k]; f=300+ (i/24)**2*9000
        out[a:a+k]=hp(seg,f)
    return out*(t/d)**2*0.5
def impact():
    t=t_(1.2); b=np.sin(2*np.pi*(38+60*np.exp(-t*8))*t)*np.exp(-t*3.5)
    n=lp(rng.standard_normal(len(t)),3000)*np.exp(-t*5)*0.5
    return b*1.1+n
def note(m): return 440*2**((m-69)/12)
# 진행: Am F C G (bar마다)
roots=[33,29,36,31]   # A1 F1 C2 G1
chords=[[57,60,64],[53,57,60],[60,64,67],[55,59,62]]
arp=[[69,72,76,81],[65,69,72,77],[72,76,79,84],[67,71,74,79]]
side=np.ones(N)  # 사이드체인
bassb=np.zeros(N); mus=np.zeros(N)
bars=int(DUR/(4*BEAT))
for bar in range(bars):
    b0=bar*4*BEAT; ch=bar%4
    for beat in range(4):
        tb=b0+beat*BEAT
        add(L,tb,kick(),0.95); add(R,tb,kick(),0.95)
        i=int(tb*SR); n2=int(0.28*SR)
        env=1-0.85*np.exp(-np.arange(min(n2,N-i))/(0.09*SR)); side[i:i+n2]*=env[:N-i] if i<N else 1
        if beat in (1,3) and bar>=1:
            c=clap(); add(L,tb,c,0.8); add(R,tb,c,0.8)
        # 8분 오프비트 오픈햇 + 16분 햇
        h=hat(0.16,0.55); add(L,tb+BEAT/2,h,0.35); add(R,tb+BEAT/2,h,0.35)
        if bar>=2:
            for sx in (0.25,0.75):
                h2=hat(0.04,0.5); add(L,tb+BEAT*sx,h2,0.22*(1 if sx==.25 else .8)); add(R,tb+BEAT*sx,h2,0.2)
    # 베이스 8분 패턴
    for k in range(8):
        if bar==0 and k<4: continue
        f=note(roots[ch]+(12 if k in (3,7) else 0)); d=0.2
        add(bassb,b0+k*BEAT/2,bass(f,d),0.9)
    # 코드 스탭 (x..x..x.)
    if bar>=0:
        for k in (0,3,6):
            p=pluck([note(m) for m in chords[ch]]); add(mus,b0+k*BEAT/2+ (0 if k else 0),p,1.0)
    # 리드 아르페지오 (bar 4~)
    if bar>=4 and not (bar in (7,8)):
        for k in range(16):
            f=note(arp[ch][k%4]); add(mus,b0+k*BEAT/4,lead(f),0.55)
    # 마지막 비트 라이저/롤
    if bar in (1,3,4,6,7,9,11,13):
        r=riser(BEAT*2); add(mus,b0+2*BEAT,r,0.5)
    if bar in (13,):
        for k in range(8):
            c=clap(); add(L,b0+2*BEAT+k*BEAT/4,c,0.5*(0.4+k/8)); add(R,b0+2*BEAT+k*BEAT/4,c,0.5*(0.4+k/8))
# 장면 전환 임팩트 (bar 시작)
for bar in (2,4,5,6,7,9,11,13):
    im=impact(); add(mus,bar*4*BEAT,im,0.55)
add(mus,28.0,impact(),0.8)
mix=bassb*side*0.9+mus*(0.55+0.45*side)
L+=mix; R+=mix*0.98
# 마스터: 소프트클립 + 페이드아웃
fade=np.ones(N); nf=int(0.4*SR); fade[-nf:]=np.linspace(1,0,nf)
for ch in (L,R): ch[:]=np.tanh(ch*1.15)*fade
peak=max(abs(L).max(),abs(R).max()); L/=peak*1.05; R/=peak*1.05
st=(np.stack([L,R],1)*32767*0.92).astype('<i2')
with wave.open('music.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok',N/SR)
