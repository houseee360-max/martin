import numpy as np, wave, sys
SR=48000; DUR=30.0; N=int(SR*DUR)
rng=np.random.default_rng(21)
L=np.zeros(N); R=np.zeros(N)
def t(d): return np.arange(int(SR*d))/SR
def band(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X[(f<lo)|(f>hi)]=0; return np.fft.irfft(X,len(x))
def norm(x): return x/(np.max(np.abs(x))+1e-9)
def add(at,x,g=1.0,pan=0.0):
    i=int(at*SR); x=x[:max(0,N-i)]
    L[i:i+len(x)]+=x*g*(1-max(0,pan)); R[i:i+len(x)]+=x*g*(1+min(0,pan))
def golpe(d,f0,dec,ruido=0.5,lo=100,hi=2500):
    tt=t(d); return norm(np.sin(2*np.pi*f0*tt)*np.exp(-tt*dec)+band(rng.standard_normal(len(tt)),lo,hi)*np.exp(-tt*dec*3)*ruido)
def bip(f0,f1,d,dec=6):
    tt=t(d); return np.sin(2*np.pi*(f0*tt+(f1-f0)*tt**2/(2*d)))*np.exp(-tt*dec)*np.minimum(1,tt*300)
def whoosh(d,lo=300,hi=3500):
    tt=t(d); return norm(band(rng.standard_normal(len(tt)),lo,hi))*np.sin(np.pi*tt/d)**2
def tambor(d):
    tt=t(d); r=band(rng.standard_normal(len(tt)),40,220)*0.8+band(rng.standard_normal(len(tt)),600,3000)*0.25*(0.6+0.4*np.sin(2*np.pi*0.73*tt))
    return norm(r*(0.75+0.25*np.sin(2*np.pi*0.73*tt)))
def pasos(at,n,paso,g=0.3):
    for k in range(n):
        tt=t(0.07); add(at+k*paso, np.sin(2*np.pi*(2300+300*(k%2))*tt)*np.exp(-tt*85)+band(rng.standard_normal(len(tt)),2000,8000)*np.exp(-tt*130)*.4, g, pan=-0.5+k/n)

# 1 · dentro del tambor: giro y agua, compuerta, robo
add(0, tambor(3.0), 0.5)
add(0.07, whoosh(0.35,500,2500), 0.3)
add(0.35, bip(900,1500,0.16,9), 0.3)
add(0.6, whoosh(0.4,800,5000), 0.55)
tt=t(0.2); add(1.0, np.sin(2*np.pi*(300+1400*tt)*tt)*np.exp(-tt*22), 0.75)
add(1.8, golpe(0.3,160,24,1.0,400,5000), 0.75)
# 2 · corre por el pasillo secreto
pasos(3.05, 24, 0.14, 0.32)
tt=t(3.4); add(3.0, norm(band(rng.standard_normal(len(tt)),50,180)), 0.1)
# 3 · la bóveda: clac, clac, clac + acorde de asombro
for at,f0 in [(7.23,150),(8.17,170),(9.1,190)]:
    add(at, golpe(0.4,f0,16,1.0,500,6000), 0.85)
    tt=t(1.0); add(at+0.02, norm(sum(np.sin(2*np.pi*110*h*tt)/h for h in range(1,7)))*np.exp(-tt*3), 0.1)
tt=t(2.6); acorde=sum(np.sin(2*np.pi*fr*tt)*(1+0.004*np.sin(2*np.pi*5*tt)) for fr in [261.6,329.6,392,523.3,659.3,784])
add(9.1, norm(acorde)*np.minimum(1,tt/0.5)*np.minimum(1,(2.6-tt)/0.9), 0.3)
for k in range(10):
    tt=t(0.5); add(9.3+k*0.17, np.sin(2*np.pi*(1568+rng.integers(0,5)*262)*tt)*np.exp(-tt*9), 0.08, pan=rng.uniform(-.6,.6))
# 4 · lanza el calcetín a la montaña
add(12.0, whoosh(0.3,600,4000), 0.5)
tt=t(1.25); add(12.17, np.sin(2*np.pi*(700*tt+260*tt**2-150*tt**3))*0.4*np.sin(np.pi*tt/1.25), 0.25)
add(13.43, golpe(0.25,110,20,0.8,200,1500), 0.5)
add(13.6, bip(800,1200,0.14,8), 0.3); add(13.8, bip(1000,1600,0.2,8), 0.3)
# 5 · abres la lavadora: queda uno solo
add(14.97, golpe(0.12,1500,60,1.0,1200,8000), 0.6)
tt=t(1.4); add(15.0, norm(band(rng.standard_normal(len(tt)),300,2200))*np.sin(np.pi*tt/1.4)*(0.5+0.5*np.sin(2*np.pi*4*tt)), 0.2)
for k,(fr,d) in enumerate([(392,0.3),(370,0.3),(349,0.3),(311,0.75)]):
    tt=t(d); add(16.4+k*0.31, np.sign(np.sin(2*np.pi*fr*tt))*0.4*np.minimum(1,tt*60)*np.exp(-tt*(1.5 if k==3 else 3))*(1+0.02*np.sin(2*np.pi*6*tt)), 0.16)
# 6 · el dato real: el calcetín se cuela por el borde
tt=t(6.0); add(18.0, norm(np.sin(2*np.pi*98*tt)+0.6*np.sin(2*np.pi*147*tt)+0.3*np.sin(2*np.pi*196*tt))*np.minimum(1,tt/1)*np.minimum(1,(6-tt)/1), 0.12)
tt=t(2.2); add(18.9, norm(band(rng.standard_normal(len(tt)),1200,6000))*np.sin(np.pi*tt/2.2)*(0.6+0.4*np.sin(2*np.pi*3*tt)), 0.14)
tt=t(0.3); add(21.0, np.sin(2*np.pi*(500-900*tt)*tt)*np.exp(-tt*14), 0.6)
tt=t(1.8); add(21.3, norm(band(rng.standard_normal(len(tt)),800,4000))*np.sin(np.pi*tt/1.8), 0.14)
add(23.0, golpe(0.2,200,26,0.6), 0.35)
# 7 · el robot lo atrapa
tt=t(1.0); add(24.13, np.sin(2*np.pi*(1400*tt-500*tt**2))*0.4*np.minimum(1,tt*10)*np.minimum(1,(1-tt)*10), 0.22)
tt=t(0.2); add(25.13, np.sin(2*np.pi*(300+1400*tt)*tt)*np.exp(-tt*22), 0.7)
add(25.3, bip(700,1100,0.12,8), 0.32); add(25.46, bip(900,1400,0.12,8), 0.32); add(25.62, bip(1100,1800,0.22,7), 0.32)
# 8 · otro lavado: entran dos, se cierra la puerta, arranca el tambor (empalma con el inicio)
add(27.13, whoosh(0.35,500,3500), 0.45); add(27.33, whoosh(0.35,500,3500), 0.45, pan=0.3)
add(28.0, golpe(0.2,130,24,0.7,200,1500), 0.4); add(28.2, golpe(0.2,120,24,0.7,200,1500), 0.4)
add(29.0, golpe(0.5,70,11,0.8), 0.9)
tt=t(0.93); add(29.07, tambor(0.93)*np.minimum(1,tt/0.6), 0.5)

x=np.stack([L,R],1); x=x/np.max(np.abs(x))*0.89
with wave.open(sys.argv[1],"wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype('<i2').tobytes())
print("ok")
