---
name: tokens-diseno
description: Define, nombra y exporta los tokens de diseño de Tonea (color por tema, tipografía, espaciado, radios, sombras) para Figma (variables con modos), CSS y Flutter. Úsala al crear o cambiar temas, al preparar Figma o al pasar el diseño a código.
---

# Tokens de diseño de Tonea

## Principio
Dos capas: **primitivos** (valores crudos) y **semánticos** (para qué sirven). Las pantallas usan solo los semánticos; cada tema solo reasigna los semánticos. Nunca poner un hex suelto en una pantalla.

## Tokens semánticos de color (iguales en todos los temas)
`bg`, `surface`, `surface2`, `thumb`, `border`, `ink`, `muted`, `accent`, `accentInk`, `overlay`, `chipOn`, `chipOnInk`, `shadow`, `navShadow`.

## Valores por tema (fuente: opción E del lienzo)

| Token | Luz | Medianoche | Negro puro | Atardecer | Lavanda |
|---|---|---|---|---|---|
| bg | #F5F6F8 | #0B0D12 | #000000 | #FBF6F1 | #F6F4FB |
| surface | #FFFFFF | #151922 | #101113 | #FFFFFF | #FFFFFF |
| surface2 | #ECEEF2 | #1E2430 | #1A1C1F | #F3EAE1 | #ECE8F6 |
| thumb | #D9DDE6 | #262D3B | #25282D | #E8DACB | #DDD7EE |
| border | #D5D9E1 | #2B3344 | #2A2D32 | #E3D6C8 | #D9D3EA |
| ink | #11141A | #F2F4F8 | #F5F6F7 | #231815 | #1B1730 |
| muted | #5B6270 | #9AA3B2 | #9A9FA6 | #6E5F57 | #5E5878 |
| accent | #3B5BFF | #7C9BFF | #3DDC97 | #D9480F | #6A3DF0 |

`accentInk` NO se escribe a mano: se calcula (blanco si contraste con `accent` ≥ 4.5:1, si no `#0B0D12`).
Acentos opcionales: azul #4C6FFF, menta #2DD4A0, naranja #FF7A45, violeta #8B5CF6, rosa #F0527C.

## Tipografía
Manrope (400, 500, 700, 800). Escala: 11 / 12 / 13 / 14 / 15 / 16 / 20 / 22 / 26 px. Títulos de pantalla 26 px peso 800, interletrado -0.8 px. Nunca por debajo de 11 px.

## Espaciado, radios y alturas
- Espaciado base 4: 4, 8, 12, 14, 16, 18, 20, 24.
- Margen lateral de pantalla 20; separación entre bloques 16.
- Radios: chips y botones 22-28 (píldora), tarjetas 22-24, miniaturas 22-24, hoja inferior 28 arriba.
- Altura mínima táctil 44; botón principal 56; barra de navegación 64.

## Exportación

**Figma (variables):** crea una colección "Color" con 5 modos (uno por tema) y los tokens semánticos como variables; colección "Tipografía" y "Espaciado" de un solo modo. Nombra con barra: `color/bg`, `color/accent`.

**CSS:** `:root[data-theme="midnight"] { --bg: #0B0D12; ... }`; sin valores sueltos en componentes.

**Flutter:** una clase `TonaTokens` (ThemeExtension) con los tokens semánticos y un `ThemeData` por tema; `accentInk` derivado con la función de contraste.

## Antes de dar un token por bueno
Pasa los pares críticos por la skill `auditoria-accesibilidad`: `ink/bg`, `muted/surface`, `accentInk/accent`, `chipOnInk/chipOn`.
