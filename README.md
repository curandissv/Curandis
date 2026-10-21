# Curandis

Curandis es un prototipo de una plataforma que conecta a familias con profesionales de enfermería para coordinar servicios de cuidado a domicilio.

## Ver el proyecto

El sitio es estático y no requiere instalar dependencias. Puedes abrir `index.html` en un navegador o iniciar un servidor local desde la carpeta del proyecto:

```sh
python -m http.server 8000
```

Después, visita <http://localhost:8000>.

## Cuentas de demostración

Desde la pantalla de inicio de sesión puedes probar estos perfiles:

| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Familia | `familia@demo.com` | `Demo1234!` |
| Profesional aprobado | `pro@demo.com` | `Demo1234!` |
| Profesional pendiente | `pendiente@demo.com` | `Demo1234!` |

Las cuentas y los perfiles son datos ficticios incluidos para probar la interfaz.

## Importante: prototipo, no usar con datos reales

Esta versión no tiene backend. Los registros y otros datos se guardan en `localStorage` del navegador; las contraseñas y los documentos cargados no están protegidos como lo estarían en un sistema de producción. El formulario también envía algunos datos de contacto y registro al correo de administración mediante FormSubmit. No uses información personal, documentos de identidad ni credenciales reales.

Antes de aceptar usuarios reales, se necesita un backend con autenticación, autorización, almacenamiento seguro de documentos y protección de datos. Consulta [SECURITY.md](./SECURITY.md) para recomendaciones adicionales.

## Publicar con GitHub Pages

En la configuración del repositorio, abre **Settings → Pages**, selecciona la rama `main` y la carpeta raíz (`/`). Guarda los cambios para publicar el sitio. GitHub Pages sirve el contenido de este repositorio públicamente; publicar el código no convierte los datos del prototipo en privados.
