# i18n Refactoring Guide

## Objetivo
Convertir todos los strings hardcoded en español a un sistema de traducción automática sin tocar la lógica de los componentes.

## Sistema Implementado

### 1. **screenStrings.js**
- Archivo centralizado que mapea strings UI a claves de traducción
- Estructura: `SCREEN_STRINGS.category.stringName` → `'i18n.key.path'`
- Ejemplo:
  ```js
  buttons: {
    newTransaction: 'common.newTransaction',
    newGoal: 'common.newGoal',
  }
  ```

### 2. **useScreenStrings() Hook**
- Hook que devuelve `SCREEN_STRINGS` con traducciones automáticas aplicadas
- Usa Proxy de JavaScript para traducir on-the-fly
- No requiere cambios en la lógica del componente

## Cómo Usar

### Antes (Hardcoded):
```jsx
export default function StitchLedger() {
  return (
    <>
      <h1>Transacciones</h1>
      <button>Nueva transacción</button>
      <p>9 registros - Sincronizado</p>
    </>
  );
}
```

### Después (Con i18n):
```jsx
import { useScreenStrings } from '../i18n/useScreenStrings';

export default function StitchLedger() {
  const strings = useScreenStrings();
  
  return (
    <>
      <h1>{strings.ledger.title}</h1>
      <button>{strings.buttons.newTransaction}</button>
      <p>9 {strings.ledger.records} - {strings.ledger.synchronized}</p>
    </>
  );
}
```

**¡Eso es todo!** El componente sigue siendo igual de simple, pero ahora está completamente traducido.

## Refactorizar Un Componente

1. Importa `useScreenStrings`:
   ```jsx
   import { useScreenStrings } from '../i18n/useScreenStrings';
   ```

2. En el componente:
   ```jsx
   const strings = useScreenStrings();
   ```

3. Reemplaza strings hardcoded:
   - `"Transacciones"` → `{strings.ledger.title}`
   - `"Nueva transacción"` → `{strings.buttons.newTransaction}`
   - `"Registros"` → `{strings.ledger.records}`

4. Si falta una clave en `screenStrings.js`, agrégala:
   ```js
   myFeature: {
     myString: 'i18n.key.path',
   }
   ```

## Componentes Prioritarios Para Refactorizar

Estos son los que aparecen en las fotos:
1. **StitchLedger** - Transacciones (CRÍTICA)
2. **StitchVaults** - Ahorros / Metas
3. **StitchDebts** - Deudas
4. **StitchCards** - Tarjetas
5. **StitchBudget** - Presupuesto
6. **StitchCalendar** - Calendario
7. **StitchReports** - Reportes
8. **StitchCategories** - Categorías
9. **StitchSettings** - Ajustes

## Ventajas de Este Enfoque

✅ **Cero cambios en lógica** - Solo reemplazos de strings  
✅ **Mantenible** - Todos los strings en un lugar  
✅ **Escalable** - Agregar un nuevo idioma es trivial  
✅ **Reversible** - Si algo sale mal, revertir es fácil  
✅ **Automático** - Los strings se traducen solos sin código extra  

## Añadir un Nuevo String

1. En `screenStrings.js`, agrega la clave:
   ```js
   myFeature: {
     newString: 'i18n.namespace.key',
   }
   ```

2. En `translations.js`, agrega la traducción:
   ```js
   es: {
     namespace: {
       key: 'Texto en español',
     }
   },
   en: {
     namespace: {
       key: 'Text in English',
     }
   }
   ```

3. En tu componente:
   ```jsx
   {strings.myFeature.newString}
   ```

## Notas

- Los strings en `screenStrings.js` son las "claves" que apuntan a traducciones reales en `translations.js`
- El `useScreenStrings()` hook se encarga de resolver esas claves a texto traducido
- No toques la lógica, solo reemplaza los strings
