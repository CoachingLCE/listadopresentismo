# Presentismo ILCE — Setup inicial

## 1. Crear el Google Sheet

Creá una hoja nueva en Google Sheets llamada **"Presentismo ILCE — Base de datos"**, con estas
pestañas. El nombre de cada pestaña, y de cada columna en la fila 1, tiene que ser EXACTO
(mayúsculas incluidas) — es lo que usa el código para encontrarlas.

### Pestaña `Usuarios`
| Email | Nombre | Roles | PasswordHash | Activo | FechaCreacion |
|---|---|---|---|---|---|
| diego.lerner@institutoilce.com | Diego Lerner | SuperAdmin | (se completa solo) | TRUE | (se completa solo) |

- **Roles**: uno solo por persona — `SuperAdmin`, `Coordinacion`, `Academico`, `Docente` o `Staff`.
- **PasswordHash**: se deja vacío al crear el usuario — la persona asigna su contraseña la primera vez desde `/setup-password` con la `SETUP_BOOTSTRAP_KEY`.
- **Activo**: `TRUE` o `FALSE`.

### Pestaña `Historial`
| Fecha | Email | Usuario | Accion | Detalle |
|---|---|---|---|---|

Se completa sola (auditoría de acciones). Dejala solo con los encabezados. Solo la ven SuperAdmin y Coordinación.

### Pestaña `Docentes`
| Id | Nombre | Email | Cursos | Activo |
|---|---|---|---|---|

- **Cursos**: códigos separados por coma, de esta lista: `CO` (Coaching Ontológico), `CE` (Coaching Educativo), `CEQUI` (Coaching de Equipos), `CDEP` (Coaching Deportivo), `CV` (Coaching Vocacional), `OR` (Oratoria), `INMOB` (Coaching Inmobiliario), `COPY` (Copywriting).
- No hace falta cargar nada acá para arrancar: el roster de los 18 docentes que ya pasaste viene precargado en el código. Esta pestaña se usa para agregar gente nueva o para editar/dar de baja a alguien del roster (en ese momento su fila se crea acá sola).

### Pestaña `Ediciones`
| Id | Curso | Numero | FechaInicio | FechaFin | TotalClases | DocenteEmail | DocenteNombre | StaffEmail | StaffNombre | Estado | FechaCreacion | CreadoPor |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

Se completa sola al crear una edición nueva desde `/nueva-edicion`. `Estado` es `Activa`, `Finalizada` o `Suspendida`.

### Pestaña `Clases`
| Id | EdicionId | Numero | Fecha | Cuatrimestre |
|---|---|---|---|---|

Se completa sola: al crear una edición se generan todas sus clases de una (16 corridas para la mayoría de los cursos, o 48 en 3 bloques de 16 con receso para Coaching Ontológico). `Cuatrimestre` solo se completa para Coaching Ontológico (1/2/3).

### Pestaña `Estudiantes`
| Id | EdicionId | Nombre | FechaIncorporacion | Estado | FechaBaja | Observaciones |
|---|---|---|---|---|---|---|

`Estado` es `Regular`, `Asincronico`, `Baja` o `CambioEdicion` — se carga a mano, es independiente de la alerta automática de seguimiento.

### Pestaña `Presentismo`
| Id | EstudianteId | ClaseId | EdicionId | Estado | Notas | ModificadoPor | FechaModificacion |
|---|---|---|---|---|---|---|---|

Una fila por (estudiante, clase). `Estado` es uno de: `P` (Presente), `A` (Ausente), `AJ` (Ausente Justificado), `Asinc` (Asincrónico), `SI` (Sesión individual), `CC` (se incorporó/cursa distinto), `Baja`.

### Pestaña `Seguimiento`
| Id | EstudianteId | EdicionId | Area | Motivo | Responsable | Observaciones | Fecha | Estado |
|---|---|---|---|---|---|---|---|---|

`Estado` es `Pendiente`, `EnRevision` o `Resuelto` — así queda registrado en la app y no depende solo de un mail.

## 2. Compartir el Sheet con la cuenta de servicio

Compartí el Sheet (botón "Compartir") con:
```
carga-clases-bot@carga-clases-ilce.iam.gserviceaccount.com
```
con permiso de **Editor**. Es la MISMA cuenta que ya usás en Cronograma ILCE / Salas Zoom — no hace falta crear credenciales nuevas.

## 3. Sacar el ID del Sheet

De la URL del Sheet:
```
https://docs.google.com/spreadsheets/d/EL_ID_VA_ACA/edit
```

## 4. Variables de entorno en Vercel

Al importar este proyecto a Vercel, en **Settings → Environment Variables** agregás (ver `env.example`):

- `GOOGLE_SHEET_ID` → el ID del paso 3.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` → `carga-clases-bot@carga-clases-ilce.iam.gserviceaccount.com`
- `GOOGLE_PRIVATE_KEY` → la misma `private_key` que ya usás en las otras apps del ILCE (pedime ayuda para extraerla del JSON si hace falta; no la pegues en el chat).
- `SESSION_SECRET` → un texto largo y random (por ejemplo, `openssl rand -hex 32`). Obligatorio.
- `SETUP_BOOTSTRAP_KEY` → un texto largo y random — se lo pasás a cada persona para que asigne su primera contraseña.
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` → quedan preparadas para cuando sumemos los avisos automáticos (todavía no se usan).

## 5. Cargar el primer usuario a mano

En la fila 2 de `Usuarios`, poné tu email como `SuperAdmin`, con `Activo = TRUE` y `PasswordHash` vacío. Entrá a `/setup-password` con la `SETUP_BOOTSTRAP_KEY` para asignar tu contraseña.

## Qué incluye esta primera entrega

- Login con roles: SuperAdmin, Coordinación, Académico, Docente, Staff (ver descripciones en `/accesos`).
- Ediciones: listado (filtrado según tu rol), alta con generador automático de calendario (Coaching Ontológico: 48 clases en 3 bloques de 16 con receso de 2 semanas; el resto: clases corridas semanales), detalle con grilla de presentismo por clase.
- Docentes: roster combinado (18 precargados + los que se agreguen), asignables a ediciones.
- Estudiantes: carga masiva por edición, búsqueda global por nombre, estado manual + observaciones.
- Carga de asistencia: pantalla simplificada para marcar presentismo clase por clase.
- Seguimiento: registro de incidencias (área, motivo, estado Pendiente/En revisión/Resuelto), enlazable a un estudiante puntual.
- Alerta automática (Normal/Atención/Riesgo) calculada sola a partir del % de presentismo y de ausencias seguidas — ver `lib/alertas.js` si en algún momento hay que ajustar los números.
- Historial de acciones (solo SuperAdmin/Coordinación).

## Lo que queda para más adelante (no está en esta entrega)

- Alertas automáticas por mail (resumen semanal) — el envío de mails ya está preparado en el código (`lib/mailer.js`) pero todavía no hay ningún cron conectado.
- Pantalla de "Revisión" para que Coordinación vea de un vistazo qué ediciones tienen carga pendiente.
- Reportes / dashboards con métricas institucionales.
- Integración con Cronograma/Leads (mencionado como posible cruce a futuro, no está pedido todavía).
