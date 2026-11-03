---
name: app-movil-tonea
description: Guía para pasar el diseño de Tonea (o de cualquier diseño de Figma) a una app móvil real en Flutter (recomendado) o React Native, con temas, navegación, descargas en segundo plano y reproductor. Úsala al empezar a programar la app o al convertir pantallas del diseño a código.
---

# De diseño a app móvil: Tonea

## Elección de tecnología
Recomendación por defecto: **Flutter** (una base de código para Android e iOS, control total del dibujo, buen soporte de temas). Alternativa: React Native + Expo si el equipo ya domina JavaScript. Pregunta cuál usar si el usuario no lo ha dicho; si no puede decidir, usa Flutter.

## Mapa de pantallas (opción E del diseño)
1. **Descubrir**: búsqueda/pegar enlace, categorías, tarjetas de video; botón de descarga abre la hoja de formatos.
2. **Hoja de formatos**: selector Video / Audio MP3, formato (MP4, WEBM, 3GP, MKV / MP3, M4A, OPUS, WAV), calidad, botón con el resumen "Descargar MP4 · 720p".
3. **Descargas**: pestañas En curso / Completadas, progreso, estados.
4. **Archivos**: cuadrícula con filtros Todo / Video / MP3.
5. **Reproductor**.
6. **Apariencia**: 5 temas + color de acento (siempre accesible desde el icono de paleta).

## Estructura sugerida (Flutter)
```
lib/
  core/theme/        # tokens, temas, accentInk calculado (ver skill tokens-diseno)
  features/discover/ features/downloads/ features/library/ features/player/ features/appearance/
  data/              # repositorio de descargas, base local (Drift o Isar), preferencias
  services/          # cola de descargas, conversión, notificaciones
```
Estado: Riverpod o Bloc, una sola fuente de verdad para tema y acento (guardados en preferencias locales).

## Descargas y conversión (puntos críticos)
- Las descargas corren en **segundo plano** con servicio en primer plano y notificación de progreso (Android) y tareas de fondo (iOS, con sus límites).
- La extracción de enlaces y la conversión a MP3 no se hacen en el teléfono sin más: lo habitual es un servicio propio (p. ej. con yt-dlp y ffmpeg) o una librería nativa. Define esto con el usuario antes de programar.
- Guarda en carpeta elegida por el usuario (almacenamiento con alcance en Android); evita pedir permisos amplios.
- Reanudar descargas, reintentos con espera, cancelar y límite de simultáneas (configurable en Ajustes).

## Aviso legal y de tiendas (decirlo siempre que se hable de publicar)
Descargar de YouTube y de muchos sitios va contra sus términos de uso, y Google Play y App Store rechazan o retiran apps que lo hacen. Antes de invertir en la parte de descarga, el usuario debe revisar los términos de cada sitio y las políticas de las tiendas; considerar distribuir solo contenido propio, con licencia libre o del que el sitio permita descargar.

## Del diseño al código
- Usa los **tokens** del diseño; no copies hex de las capturas.
- Si hay MCP de Figma disponible, lee el diseño con `get_design_context` y adáptalo al proyecto; no pegues su código tal cual.
- Cada componente de las pantallas (chip, tarjeta de video, fila de descarga, hoja inferior, barra flotante) es un widget reutilizable con sus estados: normal, seleccionado, desactivado, cargando.
- Respeta los mínimos de `auditoria-accesibilidad` (44 px, etiquetas, contraste).

## Entrega por etapas
1) Tema y navegación vacía. 2) Descubrir con datos de prueba. 3) Hoja de formatos. 4) Cola de descargas real. 5) Archivos y reproductor. 6) Apariencia persistente. Probar cada etapa en un dispositivo o emulador antes de pasar a la siguiente.
