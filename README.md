# Desde / Hasta

Contador de días con widget de iPhone, hecho desde Windows y sin cuenta de Apple Developer.

- **App:** Expo + React Native exportada como **PWA** (se instala en la pantalla de inicio del iPhone), hosteada gratis en Vercel.
- **Widget:** script de **Scriptable** que lee los datos de Supabase.
- **Backend:** Supabase (plan gratuito).

---

## Requisitos (Windows)

- [Node.js](https://nodejs.org) 20 o más nuevo (`node -v`)
- Git
- VS Code
- Una cuenta gratis en [supabase.com](https://supabase.com)

```powershell
git clone <tu-repo> desde-hasta
cd desde-hasta
npm install
```

---

## 1. Crear el proyecto en Supabase y aplicar las migraciones

1. Entrá a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Elegí la región más cercana (por ejemplo, São Paulo) y guardá la contraseña de la base.
2. Cuando termine de crearse, andá a **Project Settings → API Keys** (o **Data API**) y copiá:
   - la **Project URL** (`https://xxxx.supabase.co`)
   - la **anon key** (legacy) o la **publishable key** (`sb_publishable_...`). Cualquiera de las dos sirve: son públicas y RLS protege los datos.
   - ⚠️ **Nunca** uses la `service_role` / `secret` key en la app ni en el widget.
3. En la raíz del proyecto, copiá `.env.example` a `.env` y completalo:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...   (o sb_publishable_...)
   ```

   `.env` está en `.gitignore`: no se commitea.

4. Aplicá las migraciones de [`supabase/migrations`](supabase/migrations). Elegí **una** de estas dos opciones:

   **Opción A: SQL Editor (la más simple).** En el dashboard: **SQL Editor → New query**. Pegá el contenido de cada archivo **en orden** y tocá **Run**:
   1. `20261003000000_events.sql`
   2. `20261003000100_widget_tokens.sql`

   **Opción B: Supabase CLI.** No hace falta instalarlo, `npx` lo baja la primera vez:

   ```powershell
   npx supabase@latest login        # abre el navegador para autorizar
   npm run db:link                  # te pide elegir el proyecto y la contraseña de la base
   npm run db:push                  # aplica las migraciones pendientes
   npm run db:types                 # regenera src/types/database.ts desde la base real
   ```

5. Comprobá que quedó bien: en **Table Editor** tienen que aparecer `events` y `widget_tokens`, las dos con el candado de **RLS enabled**. En **Database → Functions** tienen que aparecer `create_widget_token` y `get_widget_events`.

### Qué crean las migraciones

| Objeto                       | Para qué                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `events`                     | Los eventos. RLS: cada usuario solo puede leer, crear, editar y borrar los suyos.                                               |
| `widget_tokens`              | Hashes sha256 de los tokens del widget. El usuario solo puede ver y revocar (borrar) los suyos; no puede insertarlos a mano.    |
| `create_widget_token()`      | Genera un token aleatorio de 256 bits, guarda **solo el hash** y devuelve el token una única vez. Solo para usuarios logueados. |
| `get_widget_events(p_token)` | La llama el widget con la anon key: valida el token, actualiza `last_used_at` y devuelve los eventos no archivados del dueño.   |

---

## 2. Configurar el login con código de 6 dígitos

La app usa **código por email** (`signInWithOtp` + `verifyOtp`) y no magic links: en iOS el link se abriría en Safari y no en la PWA instalada, y la sesión quedaría en el lugar equivocado.

Por defecto Supabase manda un **link**. Hay que cambiar las plantillas para que manden el **código** (`{{ .Token }}`):

> ⚠️ **Plan gratis:** Supabase no deja editar las plantillas mientras uses su servidor de email incluido. Primero configurá un SMTP propio en **Authentication → Emails → SMTP Settings** (activá **Enable custom SMTP**). Con Gmail: creá una contraseña de aplicación en https://myaccount.google.com/apppasswords (requiere verificación en 2 pasos) y poné Host `smtp.gmail.com`, Port `587`, Username y Sender email = tu Gmail, Password = la contraseña de aplicación. Por eso `npx supabase config push` falla con las plantillas de [`supabase/config.toml`](supabase/config.toml): hacé este paso desde el dashboard.

1. Dashboard → **Authentication → Emails → Templates**.
2. Editá **dos** plantillas: **Magic Link** (usuarios existentes) y **Confirm signup** (la primera vez que entrás con un email nuevo).
3. En cada una, poné esto:

   **Asunto:** `Tu código para Desde / Hasta: {{ .Token }}`

   **Cuerpo (HTML):**

   ```html
   <h2>Tu código para entrar</h2>
   <p>Escribí este código en la app:</p>
   <p style="font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace">
     {{ .Token }}
   </p>
   <p>Vence en una hora. Si no lo pediste, ignorá este email.</p>
   ```

   Lo importante es que **no** haya `{{ .ConfirmationURL }}`.

4. **Authentication → Sign In / Providers → Email**: dejá **Enable Email provider** activado y poné **Email OTP Length** en **6** (en proyectos nuevos puede venir en 8). La app espera 6 dígitos.
5. **Límite de emails.** Gmail permite unos 500 emails por día, de sobra para uso personal. Si necesitás más o un remitente con dominio propio, [Resend](https://resend.com) tiene plan gratis.

---

## Probar en la computadora

```powershell
npm test            # tests de la lógica de conteo (zona con horario de verano)
npm run test:tz     # los mismos tests en 4 zonas horarias con horario de verano
npm run typecheck
npm run lint
npm run web         # abre la app en el navegador (http://localhost:8081)
```

En el navegador:

1. Escribí tu email → **Mandar código**.
2. Te llega un email con 6 dígitos. Escribilos: al completar el sexto, entra solo.
3. Ves tu lista de eventos (vacía la primera vez). Recargá la página: la sesión sigue (queda en `localStorage`).
4. Tocá **+** para crear un evento: elegí **Desde**, **Hasta** o **Período**, la fecha, la unidad y el color. La tarjeta de arriba muestra cómo va a quedar.
5. Tocá un evento para editarlo, fijarlo arriba, archivarlo o borrarlo. Los archivados se ven en la pestaña **Archivados**. Los de tipo **Desde** tienen **Reiniciar desde hoy** (por ejemplo, si se corta un contador de "sin fumar").
6. **Cerrar sesión** (al final de la lista) te devuelve al login.

---

## 3. Publicar en Vercel e instalarla en el iPhone

La app es una PWA: se publica como página web y se instala en la pantalla de inicio desde Safari. Se ve a pantalla completa, con su ícono, como una app más.

1. Creá una cuenta gratis en [vercel.com](https://vercel.com) (podés entrar con GitHub o con tu email).
2. En la terminal de VS Code, en la carpeta del proyecto:

   ```powershell
   npx vercel@latest login     # elegí cómo entrar y autorizá en el navegador
   npm run deploy              # la primera vez pregunta cosas: aceptá lo que propone con Enter
   ```

   Al final te muestra la dirección, por ejemplo `https://desde-hasta.vercel.app`. Vercel compila la app en sus servidores con `npm run build:web` y lee la URL y la key de Supabase del `.env` que sube el CLI.

   Cada vez que cambies algo, volvé a correr `npm run deploy`.

3. En el iPhone, abrí esa dirección en **Safari** (tiene que ser Safari) → botón **Compartir** → **Agregar a inicio** → **Agregar**.
4. Abrí la app desde el ícono nuevo y entrá con tu email. La app instalada guarda su sesión aparte de Safari, así que hay que entrar una vez desde ahí.

> Si más adelante conectás el repo de GitHub a Vercel en vez de usar el CLI, el `.env` no se sube (está en `.gitignore`): cargá `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en **Vercel → Project → Settings → Environment Variables**.

## 4. Widget en el iPhone (Scriptable)

1. Instalá [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) (gratis) desde la App Store.
2. En la app instalada, tocá **Widget** (arriba en la lista) → **Generar script** → **Copiar script**.
3. Abrí Scriptable → **+** → pegá → ponele de nombre `Desde Hasta` → **Listo**.
4. En la pantalla de inicio: mantené apretado → **Editar** → **Agregar widget** → **Scriptable** → elegí el tamaño → **Agregar**.
5. Tocá el widget (en modo edición) → **Script** → `Desde Hasta`. Opcional: en **Parameter** escribí parte del nombre de un evento para que muestre ese. Si no, muestra el primero de la lista (los fijados van arriba).

Tamaños: el chico muestra un evento; el mediano, 3; el grande, 8. También funciona en la pantalla bloqueada (rectangular, circular o en línea). Al tocarlo abre la app.

El widget se actualiza solo (iOS decide cuándo, por lo general varias veces por hora) y recalcula el conteo a medianoche. Sin conexión, muestra lo último que descargó.

El script tiene un token personal que solo permite leer tus eventos no archivados. En la pantalla **Widget** de la app ves los tokens creados y cuándo se usaron por última vez, y podés **revocar** cualquiera.

---

## Estructura

```
app/                 rutas (Expo Router)
src/components/      componentes de UI
src/hooks/           hooks (sesión, tema)
src/lib/counter.ts   lógica de conteo: única fuente de verdad (app + widget)
src/lib/supabase.ts  cliente de Supabase
src/types/           tipos de la base
supabase/migrations/ SQL
widget/src/          widget de Scriptable (se empaqueta en public/widget.js)
scripts/             scripts de soporte (íconos, tests por zona horaria)
public/              archivos que la PWA sirve tal cual
```

## Scripts

| Script                                                  | Qué hace                                    |
| ------------------------------------------------------- | ------------------------------------------- |
| `npm run web`                                           | App en el navegador con recarga en caliente |
| `npm run build:web`                                     | Exporta la PWA a `dist/`                    |
| `npm run build:widget`                                  | Empaqueta el widget en `public/widget.js`   |
| `npm run deploy`                                        | Publica la PWA en Vercel                    |
| `npm test` / `npm run test:tz`                          | Tests                                       |
| `npm run typecheck` / `npm run lint` / `npm run format` | Calidad                                     |
| `npm run db:link` / `db:push` / `db:types`              | Supabase CLI                                |
