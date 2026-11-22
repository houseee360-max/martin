# Guía para dejar Mesas IA instalado en el restaurante

Tiempo: 1–2 horas la primera vez. Pruébalo antes en tu casa con `Iniciar-Restaurante.bat` y tu webcam,
para no aprender delante del jefe.

---

## Antes de ir: qué pedir y qué llevar

**Pídele al jefe (por WhatsApp, antes de ir):**
1. **Una foto del grabador de las cámaras** (la caja donde llegan los cables) y de su pegatina. Ahí suele estar la marca.
2. **El usuario y la contraseña de las cámaras o del grabador.** Los tiene quien las instaló, o están en la app con la que
   el jefe mira las cámaras en el móvil (Hik-Connect, DMSS, Reolink, Tapo…).
3. **La contraseña del wifi** del local (la principal, no la de clientes).
4. ¿Qué cámaras ven el salón? Que te mande capturas de cada una desde su app.

**Lleva:**
- **El ordenador que se va a quedar allí** (un mini-PC con Windows sirve, unos 150–300 USD, o un portátil viejo).
  Lo ideal: ya preparado en tu casa con el paso 1 hecho.
- Un **cable de red** (si el router o el grabador están cerca, mejor cable que wifi).
- Un **pendrive** con la carpeta `mesas-ia` por si acaso.
- Tu móvil con Telegram.

> **Si sus cámaras no ven bien las mesas** (muy bajas, apuntando a la caja o a la puerta), en esta primera prueba
> pon una cámara nueva barata (una Tapo C200/C210, ~25 USD) en una esquina alta mirando el salón. Así no dependes de las suyas.

---

## Paso 1 · Preparar el ordenador (mejor en casa)

1. Copia la carpeta `mesas-ia` al ordenador, por ejemplo en `C:\mesas-ia`.
2. Doble clic en **`Iniciar-Restaurante.bat`**.
   - Si no tiene Python, se abre la página para descargarlo. Instálalo **marcando «Add python.exe to PATH»** y vuelve a hacer doble clic.
   - La primera vez instala todo (5–10 min). Cuando termina, se abre el navegador en la página **Instalar**.
3. Si sale el aviso del **Firewall de Windows**: marca «Redes privadas» y pulsa **Permitir acceso**.
4. Ciérralo (cierra la ventana negra). Ya está listo para llevar.

---

## Paso 2 · En el restaurante: conectar el ordenador

1. Conéctalo a la **misma red que las cámaras**: por cable al router, o al wifi principal.
2. Doble clic en **`Iniciar-Restaurante.bat`**. Se abre la página **Instalar** (si no, ve a `http://localhost:8000/instalar`).

## Paso 3 · Agregar las cámaras

En la página Instalar, sección **2 · Cámaras**:

1. Pulsa **+ Agregar cámara**.
2. Pon un nombre («Salón», «Terraza») y elige la **marca**.
3. Escribe la **IP**, el **usuario** y la **contraseña**.
   - **¿Dónde está la IP?** En la app del jefe (ajustes de la cámara → información de red), o en el router
     (lista de dispositivos conectados). Suele ser tipo `192.168.1.64`.
   - **Si tienen grabador (DVR/NVR)**: pon la IP del grabador y en «Canal» el número de la cámara (1, 2, 3…).
   - **Tapo**: el usuario y la contraseña no son los de la app. En la app Tapo → la cámara → Ajustes → Avanzado →
     **Cuenta de cámara**: créala ahí y usa esos datos.
4. Pulsa **Probar**. Tiene que salir la imagen. Si no:
   - «No responde» → revisa la IP, el usuario y la contraseña (cuidado con mayúsculas).
   - «No contestó a tiempo» → el ordenador no está en la misma red que la cámara, o la IP está mal.
   - Hikvision con contraseña bien y aun así falla → en la web de la cámara, activa RTSP / «Autenticación: digest/basic».
5. Repite con cada cámara que vea mesas. Pulsa **Guardar todo**.

## Paso 4 · Dibujar las mesas

1. En la sección **3**, pulsa **Abrir el dibujo de mesas**.
2. Elige la cámara arriba. Pulsa **+ Mesa**, luego **Dibujar zona** y haz clic alrededor de la mesa
   **incluyendo las sillas**. Doble clic para cerrar.
3. Ponle el nombre que usan en el local («Mesa 4», «Ventana 2») y cuántas personas caben.
4. Repite con todas las mesas. Que las zonas **no se pisen** entre sí.
5. (Opcional) **Dibujar zona de entrada**: donde espera la gente, para contar la fila.
6. Abajo a la derecha, **arrastra cada mesa** en el plano para que se parezca al local.
7. **Guardar**.
8. Comprueba: en el panel (`http://localhost:8000`) → pestaña **Cámaras**, las personas salen recuadradas y las
   mesas se pintan de colores. Siéntate en una mesa: en 30 segundos se pone roja.

## Paso 5 · Avisos al móvil del jefe (Telegram)

1. En **tu** Telegram: busca **@BotFather** → escribe `/newbot` → ponle un nombre (ej. «Mesas Parrilla Don José») →
   te da un **token**. Cópialo.
2. Pégalo en la sección **4** de Instalar.
3. El **jefe** busca el bot en su Telegram y le escribe «hola».
   (Mejor aún: creáis un **grupo** con el jefe y los encargados, y agregáis el bot al grupo.)
4. Pulsa **Buscar chat** → elige al jefe o al grupo → **Enviar mensaje de prueba**. Le tiene que llegar.

## Paso 6 · Contraseña

Sección **5**: pon una contraseña y **Guardar todo**. El navegador la pedirá una vez (usuario: cualquiera, por ejemplo «jefe»).
Apúntasela al jefe.

## Paso 7 · Que arranque solo

1. Doble clic en **`Arranque-automatico-Windows.bat`**. A partir de ahora, al encender el ordenador, Mesas IA arranca solo.
   También quita la suspensión del ordenador.
2. **Que Windows entre solo sin contraseña** (si no, tras un corte de luz se queda en la pantalla de inicio de sesión):
   tecla Windows + R → escribe `netplwiz` → desmarca «Los usuarios deben escribir su nombre y contraseña» → Aceptar.
   (Si esa casilla no aparece: Configuración → Cuentas → Opciones de inicio de sesión → desactiva «Solo permitir Windows Hello».)
3. **Prueba de verdad**: reinicia el ordenador y espera 2 minutos. Al jefe le llega por Telegram
   «✅ Mesas IA está en marcha… Panel: http://…». Si llega, todo funciona solo.

## Paso 8 · El móvil del jefe

1. En el ordenador abre `http://localhost:8000/conectar` → que el jefe **escanee el QR «Panel del jefe»**
   (con el móvil en el wifi del local).
2. En el móvil: menú del navegador → **Añadir a pantalla de inicio**. Ya tiene su «app».
3. Si algún día cambia la dirección (el router le dio otra al ordenador), el mensaje de Telegram que llega
   al encender trae siempre la dirección nueva.
   Para que no cambie nunca: en el router, «reserva de IP / DHCP estática» para el ordenador.

## Paso 9 · Explicarle al jefe (5 minutos)

- **Verde**: mesa libre. **Rojo**: clientes esperando al mozo, con el tiempo que llevan. **Naranja oscuro**: ya atendidos.
  **Amarillo**: se fueron y falta limpiar.
- **Alertas** (en el panel y en Telegram): mesa sin atender 5 min, mesa sin limpiar 2 min, fila en la entrada.
- **Reporte** (pestaña en el panel): después de una semana, horas pico y cuántos mozos poner.
- **El ordenador no se apaga** y la ventana negra no se cierra. Si se corta la luz, vuelve solo.
- Deja un **cartel de videovigilancia** si no lo tienen (en muchos países es obligatorio). Las imágenes no se guardan
  ni salen del local: solo se guardan los conteos.

## Después de dejarlo instalado

- **La primera semana**, pásate o pídele capturas: si alguna mesa se marca mal, ajusta su zona en «Calibrar».
- Si las alertas saltan demasiado o muy poco, los tiempos están en `config.json` → `tiempos`
  (por ejemplo `alerta_sin_atencion_s: 300` = 5 minutos). Después, cierra y vuelve a abrir la ventana negra.

## Si algo falla

| Problema | Solución |
|---|---|
| El móvil no abre el panel | Mismo wifi que el ordenador; aviso del Firewall → Permitir; prueba la dirección que llegó por Telegram |
| Una cámara «Sin señal» | ¿Se desenchufó o cambió de IP? Revisa en Instalar → Probar |
| No llegan los Telegram | ¿Hay internet en el local? En Instalar → Enviar mensaje de prueba |
| Una mesa siempre ocupada | Su zona pisa un pasillo o la mesa de al lado: redibújala más ajustada |
| Una mesa nunca se ocupa | La cámara no la ve bien (tapada, lejos): otra cámara o mover la existente |
| Va lento | En `config.json` baja `fps_analisis` a 1 en cada cámara |
