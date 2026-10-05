const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// Detect Vercel / serverless environment
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel ? '/tmp/esquina-data' : path.join(__dirname, '..', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'esquina-demo-2026';

// Sessions store
const sessions = new Set();
let mutationQueue = Promise.resolve();
let inMemoryOrders = null;

const MENU = [
  {
    id: 'clasico',
    name: 'El Clásico',
    category: 'combos',
    price: 15,
    tag: 'MÁS VENDIDO',
    description: 'Dos piezas de pollo crujiente, papas fritas rústicas y gaseosa personal.',
    image: 'assets/pollo-hero.png'
  },
  {
    id: 'duo',
    name: 'Crunch para Dos',
    category: 'combos',
    price: 28,
    tag: 'FAVORITO',
    description: 'Cuatro piezas de pollo, papas grandes y dos salsas artesanales de la casa.',
    image: 'assets/bucket-editorial.png'
  },
  {
    id: 'cubeta',
    name: 'La Cubeta Barrio',
    category: 'combos',
    price: 39,
    tag: 'COMPARTIR',
    description: 'Seis piezas de pollo crujiente, porción doble de papas y tres salsas a elección.',
    image: 'assets/bucket-editorial.png'
  },
  {
    id: 'familiar',
    name: 'Cubetón Familiar',
    category: 'combos',
    price: 49,
    tag: 'FAMILIAR',
    description: 'Ocho piezas de pollo, dos papas grandes, ensalada coleslaw y gaseosa de 1.5L.',
    image: 'assets/bucket-editorial.png'
  },
  {
    id: 'sanguche-crispy',
    name: 'Sánguche Crispy Deluxe',
    category: 'sandwiches',
    price: 18,
    tag: 'NUEVO',
    description: 'Pechuga extra crocante en pan brioche, queso cheddar, pepinillos y salsa tártara.',
    image: 'assets/sanguche-crispy.jpg'
  },
  {
    id: 'alitas-bbq',
    name: 'Alitas BBQ Ahumadas (6 unid)',
    category: 'alitas',
    price: 20,
    tag: 'CRUJIENTES',
    description: 'Alitas bañadas en barbacoa artesanal con toque de miel y papas fritas.',
    image: 'assets/alitas-bbq.jpg'
  },
  {
    id: 'tenders',
    name: 'Tenders Extra Crunch (5 unid)',
    category: 'alitas',
    price: 19,
    tag: 'SIN HUESO',
    description: 'Tiras de pechuga empanizadas con panko y salsa honey mustard de la casa.',
    image: 'assets/tenders.jpg'
  },
  {
    id: 'papas-rusticas',
    name: 'Papas Rústicas de la Casa',
    category: 'guarniciones',
    price: 8,
    tag: 'GUARNICIÓN',
    description: 'Papas amarillas crocantes con sal marina, orégano y crema de ají pollero.',
    image: 'assets/papas-rusticas.jpg'
  },
  {
    id: 'coleslaw',
    name: 'Ensalada Coleslaw Fresca',
    category: 'guarniciones',
    price: 7,
    tag: 'FRESCO',
    description: 'Col morada, col blanca, zanahoria rallada y aderezo agridulce cremoso.',
    image: 'assets/coleslaw.jpg'
  },
  {
    id: 'chicha',
    name: 'Chicha Morada Casera (500ml)',
    category: 'bebidas',
    price: 6,
    tag: 'NATURAL',
    description: 'Hervida a fuego lento con maíz morado, piña, manzana y canela de ceja de selva.',
    image: 'assets/chicha-morada.jpg'
  },
  {
    id: 'gaseosa',
    name: 'Inca Kola / Coca-Cola (500ml)',
    category: 'bebidas',
    price: 5,
    tag: 'HELADA',
    description: 'Bebida helada personal a elección (indicar en notas o al recibir).',
    image: 'assets/gaseosa.jpg'
  }
];

async function ensureData() {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    if (!fs.existsSync(ORDERS_FILE)) {
      await fsp.writeFile(ORDERS_FILE, '[]\n');
    }
  } catch (err) {
    // Non-fatal if filesystem is restricted
  }
}

async function readOrders() {
  await ensureData();
  try {
    const raw = await fsp.readFile(ORDERS_FILE, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    inMemoryOrders = parsed;
    return parsed;
  } catch (e) {
    return inMemoryOrders || [];
  }
}

async function writeOrders(orders) {
  inMemoryOrders = orders;
  await ensureData();
  try {
    const temp = `${ORDERS_FILE}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fsp.writeFile(temp, JSON.stringify(orders, null, 2));
    await fsp.rename(temp, ORDERS_FILE);
  } catch (err) {
    // In-memory fallback
  }
}

function mutateOrders(change) {
  const run = mutationQueue.then(async () => {
    const orders = await readOrders();
    const result = await change(orders);
    await writeOrders(orders);
    return result;
  });
  mutationQueue = run.catch(() => {});
  return run;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(body));
}

function clientError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 100_000) {
        reject(clientError('Solicitud demasiado grande.'));
        req.destroy();
        return;
      }
      raw += c;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(clientError('JSON inválido en el cuerpo de la petición.'));
      }
    });
    req.on('error', reject);
  });
}

function getBearerToken(req) {
  return (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

function isAdmin(req) {
  const token = getBearerToken(req);
  return token && sessions.has(token);
}

function publicOrder(order) {
  const { customer, ...safe } = order;
  return safe;
}

// Universal Request Handler (Vercel Serverless Function & Local Node Server)
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const host = req.headers.host || 'localhost';
  const url = new URL(req.url, `http://${host}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  try {
    // 1. GET /api/menu
    if (req.method === 'GET' && (pathname === '/api/menu' || pathname === '/menu')) {
      return sendJson(res, 200, MENU);
    }

    // 2. POST /api/orders
    if (req.method === 'POST' && (pathname === '/api/orders' || pathname === '/orders')) {
      const input = await parseBody(req);
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw clientError('Solicitud inválida.');
      }

      if (!['pickup', 'delivery'].includes(input.fulfillment)) {
        throw clientError('Selecciona modalidad de entrega: recojo o delivery.');
      }

      const type = input.fulfillment;
      const items = input.items;

      if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
        throw clientError('Debes agregar entre 1 y 20 productos a tu pedido.');
      }

      const lines = items.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          throw clientError('Producto inválido en la canasta.');
        }
        const product = MENU.find(p => p.id === item.id);
        if (!product) {
          throw clientError('Uno de los productos seleccionados ya no está disponible.');
        }
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
          throw clientError('Las cantidades deben ser enteros válidos entre 1 y 20.');
        }
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity
        };
      });

      const customer = input.customer;
      if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
        throw clientError('Ingresa tus datos de contacto.');
      }

      const name = String(customer.name || '').trim();
      const phone = String(customer.phone || '').trim();
      const address = String(customer.address || '').trim();
      const notes = String(customer.notes || '').trim();

      if (!name || name.length > 80) throw clientError('Por favor ingresa un nombre válido.');
      if (!phone || phone.length < 6 || phone.length > 30) throw clientError('Ingresa un número telefónico válido para coordinar.');
      if (type === 'delivery' && (!address || address.length > 200)) {
        throw clientError('Para pedidos con delivery requerimos una dirección válida de entrega.');
      }

      const subtotal = lines.reduce((acc, line) => acc + (line.price * line.quantity), 0);
      const deliveryFee = type === 'delivery' ? 3 : 0;
      const total = subtotal + deliveryFee;

      const orderId = `ESQ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const order = {
        id: orderId,
        createdAt: new Date().toISOString(),
        status: 'nuevo',
        fulfillment: type,
        payment: 'Efectivo o Yape al entregar/recoger',
        items: lines,
        subtotal,
        deliveryFee,
        total,
        customer: {
          name,
          phone,
          address: type === 'delivery' ? address : '',
          notes
        }
      };

      await mutateOrders(orders => orders.unshift(order));
      return sendJson(res, 201, { order: publicOrder(order) });
    }

    // 3. GET /api/orders/:id
    const orderMatch = pathname.match(/^\/(?:api\/)?orders\/([a-zA-Z0-9_-]+)$/);
    if (req.method === 'GET' && orderMatch) {
      const orderId = decodeURIComponent(orderMatch[1]);
      const orders = await readOrders();
      const found = orders.find(o => o.id === orderId);
      if (!found) {
        return sendJson(res, 404, { error: 'Pedido no encontrado. Revisa el código ingresado.' });
      }
      return sendJson(res, 200, { order: publicOrder(found) });
    }

    // 4. POST /api/admin/login
    if (req.method === 'POST' && (pathname === '/api/admin/login' || pathname === '/admin/login')) {
      const input = await parseBody(req);
      if (input.username !== ADMIN_USER || input.password !== ADMIN_PASSWORD) {
        return sendJson(res, 401, { error: 'Credenciales de acceso incorrectas.' });
      }
      const token = crypto.randomBytes(24).toString('hex');
      sessions.add(token);
      return sendJson(res, 200, { token });
    }

    // 5. GET /api/admin/orders
    if (req.method === 'GET' && (pathname === '/api/admin/orders' || pathname === '/admin/orders')) {
      if (!isAdmin(req)) {
        return sendJson(res, 401, { error: 'No autorizado. Inicia sesión como administrador.' });
      }
      const orders = await readOrders();
      return sendJson(res, 200, { orders });
    }

    // 6. PATCH /api/admin/orders/:id
    const adminOrderMatch = pathname.match(/^\/(?:api\/)?admin\/orders\/([a-zA-Z0-9_-]+)$/);
    if (req.method === 'PATCH' && adminOrderMatch) {
      if (!isAdmin(req)) {
        return sendJson(res, 401, { error: 'No autorizado.' });
      }
      const orderId = decodeURIComponent(adminOrderMatch[1]);
      const input = await parseBody(req);
      const validStatuses = ['nuevo', 'preparando', 'listo', 'entregado', 'cancelado'];

      if (!validStatuses.includes(input.status)) {
        return sendJson(res, 400, { error: 'Estado de pedido no válido.' });
      }

      const updated = await mutateOrders(orders => {
        const found = orders.find(o => o.id === orderId);
        if (!found) throw clientError('Pedido no encontrado.', 404);
        found.status = input.status;
        found.updatedAt = new Date().toISOString();
        return found;
      });

      return sendJson(res, 200, { order: updated });
    }

    // 404 for unhandled API route
    return sendJson(res, 404, { error: `Ruta de API no encontrada: ${pathname}` });

  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('API Error:', error);
    return sendJson(res, status, { error: error.message || 'Error interno del servidor.' });
  }
};
