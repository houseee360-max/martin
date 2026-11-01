import json, re, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
guion = json.load(open(sys.argv[1])); out_wav = sys.argv[2]; out_subs = sys.argv[3]
k = Kokoro("kokoro/kokoro-v1.0.onnx", "kokoro/voices-v1.0.bin")
SR = 24000; SPEED = 0.95

# Cifras como se muestran en pantalla (más largas primero)
NUM = [
 ("tres mil trescientos cincuenta y seis soles", "S/ 3.356"),
 ("quinientos cincuenta y tres mil quinientos cincuenta y tres pesos", "$553.553"),
 ("quinientos cincuenta y tres mil quinientos cincuenta y tres", "$553.553"),
 ("mil quinientos ochenta y tres soles", "S/ 1.583"),
 ("mil doscientos treinta soles", "S/ 1.230"),
 ("ciento sesenta y seis mil pesos", "$166.000"),
 ("ciento sesenta y tres por ciento", "163%"),
 ("ciento veintinueve por ciento", "129%"),
 ("ciento veintinueve", "129%"),
 ("trescientos cuarenta mil pesos", "$340.000"),
 ("trescientos cuarenta mil", "$340.000"),
 ("doscientos treinta mil pesos", "$230.000"),
 ("novecientos mil pesos", "$900.000"),
 ("cuarenta y dos por ciento", "42%"),
 ("sesenta y uno por ciento", "61%"),
 ("treinta por ciento", "30%"),
 ("cien metros cuadrados", "100 m²"),
 ("dieciocho", "18"),
]

def words_with_times(text, s, start):
    # recorta silencio inicial/final
    env = np.abs(s) > 0.01
    idx = np.where(env)[0]
    a, b = (idx[0], idx[-1]) if len(idx) else (0, len(s))
    t0, t1 = start + a / SR, start + b / SR
    toks = text.split()
    def weight(w):
        base = len(re.sub(r"[^\wáéíóúñü]", "", w, flags=re.I)) + 1.5
        if re.search(r"[.?!]$", w): base += 6
        elif re.search(r"[,:;]$", w): base += 4
        return base
    ws = [weight(w) for w in toks]; tot = sum(ws); t = t0; out = []
    for w, wt in zip(toks, ws):
        d = (t1 - t0) * wt / tot
        pause = 6 if re.search(r"[.?!]$", w) else 4 if re.search(r"[,:;]$", w) else 0
        speak = d * (wt - pause) / wt
        out.append({"text": w, "start": round(t, 3), "end": round(t + speak, 3)})
        t += d
    return out

def merge_numbers(words):
    res = []; i = 0
    while i < len(words):
        for phrase, disp in NUM:
            p = phrase.split(); n = len(p)
            cand = [re.sub(r"[^\wáéíóúñü]", "", w["text"].lower()) for w in words[i:i+n]]
            if cand == p:
                tail = re.search(r"[^\wáéíóúñü%]+$", words[i+n-1]["text"])
                head = re.match(r"^[¿¡]", words[i]["text"])
                txt = (head.group(0) if head else "") + disp + (tail.group(0) if tail else "")
                res.append({"text": txt, "start": words[i]["start"], "end": words[i+n-1]["end"]}); i += n; break
        else:
            res.append(words[i]); i += 1
    return res

track = np.zeros(int(360 * SR), dtype=np.float32); subs = []; end = 0.0
for e in guion:
    for f in e["frases"]:
        s, sr = k.create(f["texto"], voice="em_alex", speed=SPEED, lang="es")
        start = f["t"] if "t" in f else end + f.get("gap", 0.8)
        if start < end + 0.3: print(f"  ! solapa {start:.1f}->{end+0.3:.1f}"); start = end + 0.3
        end = start + len(s) / sr
        if end > e["fin"] - 0.3: print(f"  ! esc {e['escena']} se pasa: {end:.1f} > {e['fin']}")
        a = int(start * SR); track[a:a+len(s)] += s
        subs += merge_numbers(words_with_times(f["texto"], s, start))
peak = np.max(np.abs(track)); track = track / peak * 0.89
sf.write(out_wav, track, SR)
json.dump(subs, open(out_subs, "w"), ensure_ascii=False, indent=0)
print("palabras:", len(subs), "fin voz:", round(end, 1))
