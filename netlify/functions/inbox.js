export default async (req, context) => {
  const store = context.blobs;

  if (req.method === 'GET') {
    const { blobs } = await store.list({ prefix: 'inbox/' });
    const items = [];
    for (const b of blobs) {
      const obj = await store.get(b.key, { type: 'json' });
      if (obj) items.push(obj);
    }
    const now = Date.now();
    const visible = items
      .filter(m => !m.availableAt || m.availableAt <= now)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    return new Response(JSON.stringify(visible), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    const pin = req.headers.get('x-admin-pin') || '';
    if (pin !== (process.env.INBOX_PIN || '')) {
      return new Response('Unauthorized', { status: 401 });
    }
    const body = await req.json();
    const id = crypto.randomUUID();
    const item = {
      id,
      from: body.from || 'ELVES HQ',
      title: body.title || '',
      text: body.text || '',
      media: body.media || null,
      availableAt: typeof body.availableAt === 'number' ? body.availableAt : null,
      ts: body.ts || Date.now(),
    };
    await store.set(`inbox/${id}.json`, JSON.stringify(item), {
      contentType: 'application/json',
    });
    return new Response(JSON.stringify({ ok: true, id }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
};
