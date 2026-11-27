# Tonea

Pega un enlace, elige **video o MP3**, formato y calidad, y descarga. Tema oscuro coral (basado en tu referencia) y 6 temas intercambiables.

## Cómo abrirla

```bash
npm install     # instala todo y descarga yt-dlp + ffmpeg en ./bin
npm run app     # app de escritorio (recomendado): incluye el navegador integrado
npm start       # solo servidor: abre http://localhost:3000 en tu navegador
```

| | App de escritorio (`npm run app`) | Navegador (`npm start`) |
|---|---|---|
| Pegar enlaces, descargar, biblioteca, temas | Sí | Sí |
| Ver y buscar videos de YouTube con la interfaz de Tonea | Sí | Sí |
| Abrir otros sitios (Vimeo, TikTok…) dentro de Tonea | **Sí** | No (los sitios bloquean mostrarse dentro de otra página) |
| Inicio de sesión con Google | Sí | Sí |

## Descargas con yt-dlp (YouTube, listas y otros sitios)

- **YouTube necesita un intérprete de JavaScript.** Tonea usa Node.js (el que ya tienes instalado; en la app de escritorio lo busca en el sistema). Si quieres otro, define `JS_RUNTIME` en `.env` con la ruta del ejecutable.
- **yt-dlp se actualiza solo:** al arrancar (como mucho una vez al día) y cuando una descarga falla con un error típico de versión vieja; en ese caso actualiza y reintenta una vez. También puedes forzarlo en *Descargas → Buscar actualización de yt-dlp* o con `npm run update-ytdlp`. Para desactivarlo: `TONEA_NO_AUTOUPDATE=1`.
- **Listas de reproducción:** pega el enlace de una lista (o de un video dentro de una lista) y aparece *Descargar los N de la lista* (máximo 200), con el formato y la calidad elegidos.
- **Cookies (opcional), para sitios que exigen sesión como Instagram:** guarda un archivo `cookies.txt` (formato Netscape) en `data/`, o define `COOKIES_FROM_BROWSER=firefox` en `.env`. En Windows, las versiones recientes de Chrome cifran sus cookies de forma que yt-dlp no suele poder leerlas (Edge puede tener el mismo problema); con Firefox suele funcionar. Usa una cuenta secundaria: los sitios pueden bloquear cuentas por actividad automática.
- Nada de esto está garantizado: los sitios cambian y a veces yt-dlp tarda unos días en adaptarse.

## Ver videos dentro de Tonea (sin la interfaz de YouTube)

**Explorar** muestra videos por categorías o por búsqueda, con la interfaz de Tonea. Al tocar uno se reproduce en el reproductor propio (YouTube IFrame Player API) con controles de Tonea: pausa, barra de progreso, volumen y pantalla completa, y la lista **Más como este**. Funciona tanto en la app de escritorio como en el navegador.

Los datos salen de yt-dlp o, si pones `YOUTUBE_API_KEY` en `.env` (YouTube Data API v3, gratis en Google Cloud), de la API oficial. Algunos videos (por ejemplo, muchos de discográficas) no permiten reproducirse fuera de YouTube: ahí Tonea lo avisa y puedes descargarlo y verlo desde la Biblioteca.

## Navegar otros sitios dentro de la app

En **Explorar** (o con *Abrir YouTube* en Inicio) los sitios se abren en el navegador integrado, sin ventanas aparte. Entra al video que quieras y pulsa **Descargar este video**: se analiza esa página y eliges formato y calidad. También puedes escribir una dirección o una búsqueda en la barra.

## Inicio de sesión con Google (opcional)

Sin cuenta se usa una biblioteca de invitado. Con cuenta, cada persona tiene su carpeta y sus descargas privadas. Necesitas crear credenciales (gratis):

1. Entra a <https://console.cloud.google.com/> y crea un proyecto.
2. *APIs y servicios → Pantalla de consentimiento de OAuth*: tipo **Externo**, añade tu correo como usuario de prueba.
3. *Credenciales → Crear credenciales → ID de cliente de OAuth* → tipo **Aplicación web**.
4. En *URI de redireccionamiento autorizados* añade exactamente: `http://localhost:3000/auth/google/callback`
5. Copia `.env.example` a `.env` y pega el **ID de cliente** y el **secreto**:
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   ```
6. Reinicia Tonea y pulsa el icono de cuenta (arriba a la derecha) → *Continuar con Google*.

El inicio de sesión se completa en tu navegador del sistema (Google no permite iniciar sesión dentro de vistas incrustadas) y la app se entera sola cuando terminas.

Tonea solo recibe tu nombre, correo y foto para identificarte. Esa cuenta **no** da acceso a tus datos de YouTube.

## Dónde está la app de escritorio y cómo depurarla

La app vive en esta misma carpeta (`EscritorioAppDescarga`). No hay instalador: es la app de Electron del proyecto.

| Qué | Cómo |
|---|---|
| Abrirla | doble clic en **Iniciar Tonea.cmd**, o `npm run app` |
| Con herramientas de desarrollo (consola, red, elementos) | `Iniciar Tonea.cmd debug` o `npm run app:debug` |
| Con tamaño de teléfono (390×844) y herramientas | `Iniciar Tonea.cmd movil` o `npm run app:movil` |
| Para usarla desde el teléfono (misma Wi-Fi) | doble clic en **Iniciar Tonea telefono.cmd**, o `npm run app:lan` |
| Archivos de la interfaz (se ven al recargar con Ctrl+R) | `public/` (index.html, style.css, app.js) |
| Servidor y descargas | `server.js`, carpeta `downloads/` |
| Ventana principal de Electron | `main.js` |

## Temas y contraste

`npm run contrast` mide el contraste WCAG 2.2 de cada tema de `public/style.css` (texto 4.5:1, elementos de interfaz 3:1) y falla si algún par no llega. Ejecútalo al añadir o cambiar un tema.

## Tonea en el móvil (PWA)

Tonea ya se puede instalar en el teléfono como app (icono, pantalla completa, abre sin barra del navegador):

1. En el PC: `$env:HOST="0.0.0.0"; npm start`. La consola muestra la **clave de acceso**; averigua también la IP del PC (`ipconfig`).
2. En el móvil (misma Wi-Fi) abre `http://IP-DEL-PC:3000/?t=CLAVE` → menú del navegador → **Añadir a pantalla de inicio**. Para que Chrome ofrezca *Instalar app* de verdad hace falta HTTPS; en una red local solo se añade como acceso directo.

Cuidado de interfaz y accesibilidad incluidos: objetos táctiles de 48 px en pantallas táctiles, barra inferior con zona segura, foco visible de alto contraste, enlace «Saltar al contenido», foco al encabezado al cambiar de pantalla (lectores de pantalla), `aria-current` en la pestaña activa, reproductor operable con teclado (espacio, ←/→ ±5 s, M silenciar, F pantalla completa), barra de progreso con tiempo hablado, respeto a «reducir movimiento» y al modo de contraste forzado, y todo el texto escalable. En el móvil el reproductor oculta el volumen (se usan los botones del teléfono).

## Abrir en el teléfono con un QR

`npm run qr` arranca Tonea en la red local, muestra un QR en el terminal y abre una página con los códigos. El QR ya incluye la clave de acceso. Escanéalo con la cámara del teléfono (misma Wi-Fi) y se abre Tonea en el navegador del móvil.

## App del teléfono (Expo Go)

La carpeta `movil/` es una app Expo nativa (sin WebView) para **buscar y descargar música y video con licencia libre**. Funciona sola, sin el PC.

- **Buscar:** Internet Archive (audio y video) y Jamendo (música). Solo salen resultados con licencia Creative Commons o dominio público reconocida; en Jamendo, solo pistas que el artista permite descargar. Cada resultado muestra licencia y condiciones (crédito, uso comercial, derivadas).
- **Biblioteca:** los archivos se guardan en el teléfono junto a un `.txt` con el crédito y la licencia. Reproductor de audio y video integrado.
- **Ajustes:** aquí pegas tu clave de Jamendo (se guarda solo en el teléfono) y puedes abrir *Tonea del PC* (el modo anterior: la interfaz completa del servidor del PC en un WebView).

Cómo probarla:

1. Instala **Expo Go** en el teléfono (Play Store / App Store).
2. `cd movil; npm install; npx expo start` y escanea el QR con Expo Go (Android) o con la cámara (iPhone).
3. En *Ajustes* añade la clave de Jamendo (crea una cuenta gratuita en <https://devportal.jamendo.com/> y una aplicación de uso no comercial; copia su `client_id`). Internet Archive no necesita clave.

### Descargar de YouTube desde el teléfono (Tonea del PC)

Expo Go no puede ejecutar yt-dlp, así que el teléfono usa tu PC como motor de descarga (misma Wi-Fi, uso personal):

1. En el PC abre Tonea con doble clic en **Iniciar Tonea telefono.cmd** (o `npm run app:lan` en una terminal). La primera vez Windows puede preguntar por el firewall: permite **redes privadas**.
2. En el PC, pulsa el icono de cuenta (arriba a la derecha) → **Usar desde el teléfono**: verás un código QR con la clave de acceso incluida.
3. En el teléfono: *Ajustes → Conectar con Tonea del PC → Escanear código QR*.
4. Descarga como en el PC. Al pulsar **Guardar** en una descarga terminada, el archivo se copia a la Biblioteca del teléfono.

También funciona con `npm run qr` o `$env:HOST="0.0.0.0"; npm start` (la clave sale en la consola).

El código de las fuentes está en `shared/providers/` y lo comparten la app móvil y el PC. `npm test` ejecuta sus pruebas (`TONEA_LIVE=1 npm test` añade una consulta real a Internet Archive).

## Uso desde el móvil

Doble clic en **Iniciar Tonea telefono.cmd** (o `$env:HOST="0.0.0.0"; npm start`) y abre `http://IP-DEL-PC:3000/?t=CLAVE` en la misma red Wi-Fi. La app de escritorio muestra ese enlace con su QR en *Cuenta → Usar desde el teléfono*.

**Clave de acceso:** cuando `HOST` no es localhost, todo lo que llegue desde otro dispositivo exige una clave (`TONEA_TOKEN` en `.env`, o una generada y guardada en `data/token.txt`). La primera visita con `?t=CLAVE` guarda una cookie y ya no hace falta repetirla. Desde el propio PC no se pide. Si pones Tonea detrás de un proxy inverso o túnel, las peticiones llegan como locales y se saltan la clave: protégelo en el proxy. Sigue siendo HTTP sin cifrar: úsalo solo en redes de confianza. El navegador integrado no está disponible en el móvil.

## Problemas frecuentes

- **Falla una descarga que antes funcionaba:** Tonea intenta actualizar yt-dlp solo; si no basta, `npm run update-ytdlp` (los sitios cambian a menudo).
- **`npm run app` da `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`:** tu terminal tiene `ELECTRON_RUN_AS_NODE` definida. Quítala (`Remove-Item Env:ELECTRON_RUN_AS_NODE`) y vuelve a lanzar.
- **Puerto ocupado:** cambia `PORT` en `.env`.

## Aviso legal

Descarga solo contenido propio, con licencia que lo permita o que el sitio autorice. Descargar de YouTube y de muchos otros sitios incumple sus términos de uso, y las tiendas de apps (Google Play, App Store) no admiten apps que lo hagan. Cada usuario es responsable del uso que haga.
