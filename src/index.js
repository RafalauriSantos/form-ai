const FORM_TITLE = 'Decisões do PDV — Mini Mercado';

const QUESTIONS = [
  ['discounts', 'Haverá descontos nas vendas?', ['Não haverá descontos', 'O operador poderá aplicar', 'Somente a proprietária poderá autorizar']],
  ['refunds', 'Será possível cancelar ou estornar uma venda?', ['Sim', 'Não', 'Somente com autorização da proprietária']],
  ['split_payment', 'Será possível usar mais de uma forma de pagamento na mesma venda?', ['Sim', 'Não']],
  ['pending_sale', 'Uma venda poderá ficar pendente para conclusão posterior?', ['Sim', 'Não']],
  ['credit_limit', 'Quando o limite do fiado for ultrapassado?', ['Bloquear a venda', 'Permitir e alertar a dona', 'Exigir autorização da dona']],
  ['customer_identity', 'Como o cliente do fiado será identificado?', ['Nome', 'Telefone', 'Nome e telefone']],
  ['cash_permissions', 'Quem poderá abrir e fechar o caixa?', ['Qualquer operador', 'Somente a proprietária', 'Operador autorizado']],
  ['stock_negative', 'Será permitido vender com estoque zerado?', ['Sim', 'Não', 'Somente com autorização']],
  ['offline', 'O sistema deve registrar vendas sem internet?', ['Sim', 'Não']],
  ['stone_scope', 'Qual pagamento deve ser priorizado na integração Stone?', ['Cartão', 'Pix', 'Cartão e Pix', 'Ainda não decidido']],
];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function page() {
  const fields = QUESTIONS.map(([key, label, options], index) => `
    <fieldset class="question"><legend><span class="number">${index + 1}</span>${esc(label)}</legend>
      ${[...options, 'Outra resposta'].map(option => `<label><input required type="radio" name="${key}" value="${esc(option)}"> ${esc(option)}</label>`).join('')}
      <textarea name="${key}_details" rows="2" placeholder="Se escolheu “Outra resposta”, explique (opcional)"></textarea>
    </fieldset>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${FORM_TITLE}</title>
  <style>body{font:16px system-ui,sans-serif;background:#f3f4f6;color:#202124;margin:0;padding:20px}main{max-width:640px;margin:auto;background:#fff;padding:24px;border-radius:10px;box-shadow:0 1px 4px #0001;box-sizing:border-box}h1{font-size:23px;line-height:1.25;margin:0 0 10px}p{line-height:1.5;color:#5f6368;margin:0 0 22px}fieldset{box-sizing:border-box;width:100%;border:1px solid #dadce0;margin:0 0 14px;padding:16px;border-radius:8px;background:#fff}fieldset.question{border-left:3px solid #6b7280}legend{display:block;box-sizing:border-box;width:100%;max-width:100%;font-weight:600;line-height:1.45;margin:0 0 8px;padding:0;overflow-wrap:anywhere}.number{display:inline-block;color:#6b7280;font-weight:700;margin-right:6px}label{display:block;padding:8px 2px;border-top:1px solid #f0f0f0;line-height:1.4;overflow-wrap:anywhere}label:first-of-type{border-top:0}input{accent-color:#374151;margin-right:7px}textarea{display:block;width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:10px;font:inherit;margin-top:8px;resize:vertical}button{margin-top:4px;width:100%;border:0;border-radius:6px;background:#374151;color:#fff;padding:12px;font:600 16px system-ui}#ok{display:none;background:#ecfdf5;color:#065f46;padding:14px;border-radius:8px;margin-top:16px}</style></head>
  <body><main><h1>${FORM_TITLE}</h1><p>Responda às perguntas abaixo para nos ajudar a definir o funcionamento do sistema. Leva poucos minutos.</p><form id="form"><fieldset><legend>Seu nome</legend><input required name="client_name" maxlength="120" placeholder="Digite seu nome" style="width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:10px;font:inherit"></fieldset>${fields}<fieldset><legend>Observações</legend><textarea name="notes" rows="4" placeholder="Alguma regra ou necessidade importante?"></textarea></fieldset><button>Enviar respostas</button></form><div id="ok">✅ Respostas enviadas. Obrigado!</div></main><script>
  document.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));const r=await fetch('/api/responses',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});if(r.ok){e.target.remove();document.querySelector('#ok').style.display='block'}else alert('Não foi possível enviar. Tente novamente.')});
  </script></body></html>`;
}

async function notify(env, payload) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const sections = [`👤 Pessoa: ${payload.client_name}`];
  QUESTIONS.forEach(([key, label], index) => {
    const answer = payload[key] || 'Não informado';
    const detail = String(payload[`${key}_details`] || '').trim();
    sections.push(`\n${index + 1}. ${label}\n✅ Resposta: ${answer}${detail ? `\n📝 Complemento: ${detail}` : ''}`);
  });
  const notes = String(payload.notes || '').trim();
  if (notes) sections.push(`\n💬 Observação geral:\n${notes}`);
  const lines = sections.join('\n');
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:`📋 Nova resposta — Mini Mercado\n\n${lines}`})});
}

export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/') return new Response(page(), {headers:{'content-type':'text/html; charset=utf-8', 'cache-control':'no-store, no-cache, must-revalidate'}});
  if (request.method === 'GET' && url.pathname === '/health') return Response.json({ok:true, service:'mini-mercado-decisions'});
  if (request.method === 'POST' && url.pathname === '/api/responses') {
    let payload; try { payload = await request.json(); } catch { return Response.json({error:'invalid_json'}, {status:400}); }
    if (!payload || typeof payload !== 'object' || !String(payload.client_name || '').trim() || Object.keys(payload).length > 40) return Response.json({error:'invalid_payload'}, {status:400});
    const now = new Date().toISOString();
    await env.DB.prepare('INSERT INTO responses(created_at,payload,user_agent) VALUES(?,?,?)').bind(now, JSON.stringify(payload), request.headers.get('user-agent') || '').run();
    try { await notify(env, payload); } catch { /* response remains stored even if notification fails */ }
    return Response.json({ok:true});
  }
  return Response.json({error:'not_found'}, {status:404});
} };
