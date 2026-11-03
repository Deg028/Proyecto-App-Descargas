---
name: auditoria-accesibilidad
description: Audita pantallas o diseños de la app Tonea contra WCAG 2.2 AA (contraste, tamaño táctil, etiquetas, foco, color como único indicador, movimiento). Úsala cuando se pida revisar accesibilidad, contraste, legibilidad, o antes de entregar un diseño o implementarlo en código.
---

# Auditoría de accesibilidad (WCAG 2.2 AA) para Tonea

## Qué revisar, en este orden

1. **Contraste de texto**: 4.5:1 para texto normal, 3:1 para texto de 24 px o más (o 18.66 px en negrita). Aplica también a texto gris pequeño (11-12 px).
2. **Contraste de elementos no textuales**: 3:1 para bordes de campos, iconos que transmiten información, estados seleccionados y anillos de progreso.
3. **Tamaño táctil**: mínimo 44×44 px (iOS) / 48×48 dp (Android) en botones, chips, filas y pestañas.
4. **Nombres accesibles**: todo botón de solo icono lleva etiqueta (`aria-label` en web, `Semantics(label:)` en Flutter, `accessibilityLabel` en React Native).
5. **Estados**: seleccionado, desactivado y en progreso deben comunicarse por texto o forma, además del color (`aria-pressed`, `aria-checked`, `role="switch"`).
6. **Orden de foco y lectura**: coincide con el orden visual; el panel inferior (hoja de formatos) captura el foco mientras está abierto y tiene botón de cerrar.
7. **Color no es el único indicador**: la calidad elegida no puede diferenciarse solo por tono; usar también relleno, borde o marca de verificación.
8. **Movimiento**: respetar "reducir animaciones" del sistema; sin parpadeos de más de 3 por segundo.
9. **Texto escalable**: la interfaz no se rompe con texto al 200 %; no fijar alturas que recorten texto.
10. **Idioma**: declarar `es` como idioma de la interfaz.

## Cómo calcular el contraste

```
canal = c/255; lineal = canal <= 0.03928 ? canal/12.92 : ((canal+0.055)/1.055)^2.4
L = 0.2126*R + 0.7152*G + 0.0722*B   (con canales lineales)
ratio = (Lmayor + 0.05) / (Lmenor + 0.05)
```

Calcula el valor real de cada par; no digas "parece suficiente". 4.3:1 no pasa.

## Reglas específicas de Tonea

- Los temas (Luz, Medianoche, Negro puro, Atardecer, Lavanda) permiten cambiar el color de acento. El color del texto sobre el acento NO es fijo: elige blanco si el contraste con el acento es ≥ 4.5:1; si no, usa casi negro `#0B0D12`. Verifica los 5 colores de acento extra (azul, menta, naranja, violeta, rosa) en cada tema.
- Texto secundario (`muted`) sobre `surface` y sobre `bg` debe llegar a 4.5:1 en los 5 temas.
- Los iconos de acento sobre superficies neutras son decorativos: no dependen de ellos para comunicar nada.
- Progreso de descarga: mostrar siempre el porcentaje en texto, no solo la barra.

## Formato del informe

Entrega una tabla ordenada por gravedad:

| Gravedad | Pantalla / tema | Problema | Valor medido | Corrección propuesta |
|---|---|---|---|---|

Gravedad: **Bloqueante** (impide usar), **Alta** (falla AA), **Media** (mejora clara), **Baja**.
Termina con lo que SÍ pasa, para que se sepa qué está verificado y qué no. Si no pudiste medir algo (p. ej. no hay captura del tema), dilo en vez de suponer que pasa.
