# La Esquina — Fast-Food Ordering & Kitchen Management Platform

![Vercel Ready](https://img.shields.io/badge/Vercel-Serverless_Ready-000000?style=for-the-badge&logo=vercel&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript ES6+](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

Plataforma web full-stack para restaurantes de comida rápida y locales de pollo crujiente. Combina una interfaz comercial de alta conversión con un flujo completo de canasta, checkout para recojo o delivery, integración automática con WhatsApp, seguimiento de pedidos en vivo y un panel administrativo de cocina.

---

## Características Principales

### Experiencia del Cliente (Front-End)
* **Fotografía Gastronómica Dedicada:** Cada uno de los 11 productos cuenta con su propia fotografía publicitaria de alta resolución (pollo clásico, sánguche crispy, tenders, alitas BBQ, papas rústicas, coleslaw fresca, chicha morada artesanal y gaseosas heladas).
* **Catálogo Dinámico:** Filtrado interactivo por categorías (`combos`, `sandwiches`, `alitas`, `guarniciones`, `bebidas`) con buscador predictivo en tiempo real.
* **Canasta Persistente:** Cajón deslizante lateral con ajuste de cantidades, eliminación y cálculo automático de subtotales respaldado en `localStorage`.
* **Checkout Flexible:** Selección entre **Recojo en tienda** (costo cero) y **Delivery express** (tarifa plana fijada con dirección validada y notas de entrega).
* **Confirmación por WhatsApp en 1 Clic:** Generación automática de enlace `wa.me` formateado con el desglose detallado de los productos, código de seguimiento, datos del cliente y dirección.
* **Rastreador de Estado en Vivo (Live Order Tracker):** Stepper visual con 4 etapas (`1. Recibido` -> `2. En Cocina` -> `3. En Camino` -> `4. Entregado`), consultable mediante el código único del pedido (`ESQ-XXXX`) o por enlace directo (`?track=ESQ-XXXXX`).

### Marco Legal & Transparencia Comercial
* **Política de Privacidad (Ley N° 29733):** Cláusulas completas de protección de datos personales, limitando el uso exclusivo a la entrega del pedido y garantizando no compartición ni envío de spam.
* **Términos y Condiciones del Servicio:** Especificación de moneda (Soles PEN con IGV), radio de entrega, métodos de pago contraentrega (efectivo, Yape, Plin), tiempos de preparación y política de cancelaciones.
* **Libro de Reclamaciones Virtual (Ley N° 29571):** Formulario interactivo con generación de código de constancia (`REC-2026-XXXX`), almacenamiento local y derivación inmediata por WhatsApp.
* **Protocolo de Seguridad:** Arquitectura zero-leak sin captura de datos financieros ni riesgos de clonación bancaria.

### Panel de Recepción y Cocina (`#admin`)
* **Autenticación Protegida:** Acceso administrativo mediante credenciales configurables con generación de tokens de sesión.
* **Gestión de Comandas:** Visualización completa de pedidos entrantes, datos de contacto con marcado rápido (`tel:`), notas especiales y actualización de estados en tiempo real.

### Arquitectura Híbrida (Vercel Serverless + Node.js Local)
* **Compatibilidad Nativa con Vercel:** Diseñado para desplegarse en la red Edge de Vercel utilizando funciones serverless (`/api/index.js`), con `vercel.json` preconfigurado.
* **Manejo de Almacenamiento Resiliente:** En producción serverless utiliza `/tmp/esquina-data/` y caché en memoria; en entornos locales utiliza almacenamiento atómico en disco (`data/orders.json`).
* **Cero Dependencias Externas:** 100% código nativo Node.js sin frameworks pesados, garantizando máxima velocidad, bajo consumo de memoria y respuesta instantánea.

---

## Especificación de la API REST

| Método | Endpoint | Descripción | Autenticación |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/menu` | Obtiene el catálogo completo de productos | Pública |
| `POST` | `/api/orders` | Crea y valida un nuevo pedido | Pública |
| `GET` | `/api/orders/:id` | Consulta el estado y detalle público de un pedido | Pública |
| `POST` | `/api/admin/login` | Inicia sesión y genera token administrativo | Credenciales |
| `GET` | `/api/admin/orders` | Lista todos los pedidos con datos de cliente | Bearer Token |
| `PATCH` | `/api/admin/orders/:id` | Actualiza el estado (`nuevo`, `preparando`, etc.) | Bearer Token |

---

## Estructura del Proyecto

```text
La-Esquina/
├── api/
│   └── index.js            # Función Serverless universal para Vercel y Node.js
├── assets/                 # Recursos gráficos optimizados (hero, bucket, mark)
├── data/
│   └── orders.json         # Almacenamiento local de pedidos (creado en runtime)
├── index.html              # Interfaz completa de cliente, canasta, tracking y panel admin
├── server.js               # Servidor HTTP local para desarrollo (`npm start`)
├── vercel.json             # Configuración de rutas y headers para Vercel
├── package.json            # Scripts de ejecución y metadatos
├── .gitignore              # Exclusiones de control de versiones
└── README.md               # Documentación técnica
```

---

## Despliegue en Producción (Vercel)

El proyecto está optimizado para desplegarse en Vercel en menos de 2 minutos:

1. Ve a [vercel.com](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **Add New... > Project**.
3. Selecciona el repositorio **`Jp3528/La-Esquina`** y pulsa **Import**.
4. En la configuración del proyecto:
   * **Framework Preset:** `Other` (se detecta automáticamente gracias a `vercel.json`).
   * No requiere configurar variables de entorno para la demo (por defecto usa `admin` / `esquina-demo-2026`).
5. Haz clic en **Deploy**. ¡Tu landing y backend serverless estarán activos en segundos!

---

## Ejecución en Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/Jp3528/La-Esquina.git

# 2. Entrar a la carpeta
cd La-Esquina

# 3. Iniciar el servidor local
npm start
```

Abre tu navegador en: `http://127.0.0.1:3007`.

* **Tienda pública:** `http://127.0.0.1:3007/`
* **Panel de cocina:** `http://127.0.0.1:3007/#admin` *(Usuario: `admin` | Clave: `esquina-demo-2026`)*

---

## Licencia

Este proyecto está bajo la Licencia **MIT**. Eres libre de adaptarlo o utilizarlo para tus propios proyectos.
