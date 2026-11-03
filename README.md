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
| Archivos de la interfaz (se ven al recargar con Ctrl+R) | `public/` (index.html, style.css, app.js) |
| Servidor y descargas | `server.js`, carpeta `downloads/` |
| Ventana principal de Electron | `main.js` |

## Tonea en el móvil (PWA)

Tonea ya se puede instalar en el teléfono como app (icono, pantalla completa, abre sin barra del navegador):

1. En el PC: `$env:HOST="0.0.0.0"; npm start` y averigua la IP del PC (`ipconfig`).
2. En el móvil (misma Wi-Fi) abre `http://IP-DEL-PC:3000` → menú del navegador → **Añadir a pantalla de inicio**. Para que Chrome ofrezca *Instalar app* de verdad hace falta HTTPS; en una red local solo se añade como acceso directo.

Cuidado de interfaz y accesibilidad incluidos: objetos táctiles de 48 px en pantallas táctiles, barra inferior con zona segura, foco visible de alto contraste, enlace «Saltar al contenido», foco al encabezado al cambiar de pantalla (lectores de pantalla), `aria-current` en la pestaña activa, reproductor operable con teclado (espacio, ←/→ ±5 s, M silenciar, F pantalla completa), barra de progreso con tiempo hablado, respeto a «reducir movimiento» y al modo de contraste forzado, y todo el texto escalable. En el móvil el reproductor oculta el volumen (se usan los botones del teléfono).

## Abrir en el teléfono con un QR

`npm run qr` arranca Tonea en la red local, muestra un QR en el terminal y abre una página con los códigos. Escanéalo con la cámara del teléfono (misma Wi-Fi) y se abre Tonea en el navegador del móvil.

## Probar en el teléfono con Expo Go

La carpeta `movil/` es un proyecto Expo que muestra Tonea en un WebView apuntando al servidor de tu PC (con el reproductor, las descargas y los temas).

1. Instala **Expo Go** en el teléfono (Play Store / App Store).
2. Terminal 1, en la raíz: `$env:HOST="0.0.0.0"; npm start`  (si Windows pregunta por el firewall, permite redes privadas).
3. Terminal 2: `cd movil; npm install; npx expo start` y escanea el QR con Expo Go (Android) o con la cámara (iPhone).
4. En la primera pantalla escribe la IP del PC con el puerto (ej. `192.168.1.182:3000`; mírala con `ipconfig`). Queda guardada. Para cambiarla, mantén pulsada la esquina superior izquierda (sobre el logo) casi 1 segundo.

Teléfono y PC deben estar en la misma Wi-Fi. Cambios en `public/` se ven al recargar la app (agita el teléfono → *Reload*); cambios en `movil/App.js` recargan solos. Limitación: los archivos descargados quedan en el PC; guardarlos en el teléfono requeriría añadir `expo-file-system` (siguiente paso).

## Uso desde el móvil

`$env:HOST="0.0.0.0"; npm start` y abre `http://IP-DEL-PC:3000` en la misma red Wi-Fi. No hay contraseña: hazlo solo en redes de confianza. El navegador integrado no está disponible en el móvil.

## Problemas frecuentes

- **Falla una descarga que antes funcionaba:** `npm run update-ytdlp` (los sitios cambian a menudo).
- **`npm run app` da `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`:** tu terminal tiene `ELECTRON_RUN_AS_NODE` definida. Quítala (`Remove-Item Env:ELECTRON_RUN_AS_NODE`) y vuelve a lanzar.
- **Puerto ocupado:** cambia `PORT` en `.env`.

## Aviso legal

Descarga solo contenido propio, con licencia que lo permita o que el sitio autorice. Descargar de YouTube y de muchos otros sitios incumple sus términos de uso, y las tiendas de apps (Google Play, App Store) no admiten apps que lo hagan. Cada usuario es responsable del uso que haga.
