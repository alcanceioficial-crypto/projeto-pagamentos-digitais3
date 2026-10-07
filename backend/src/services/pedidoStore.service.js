/* ======================================================
   ARMAZENAMENTO TEMPORÁRIO EM MEMÓRIA
   Guarda os pedidos por 2 horas. Depois expira sozinho.
====================================================== */

const PEDIDOS = new Map(); // txid → { pedido, expiraEm }

const TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

/* Salvar pedido */
function salvarPedido(txid, pedido) {
  PEDIDOS.set(txid, {
    pedido,
    expiraEm: Date.now() + TTL_MS
  });
  console.log(`💾 Pedido salvo em memória: ${txid}`);
}

/* Buscar pedido */
function buscarPedido(txid) {
  const entry = PEDIDOS.get(txid);
  if (!entry) return null;

  if (Date.now() > entry.expiraEm) {
    PEDIDOS.delete(txid);
    return null;
  }

  return entry.pedido;
}

/* Remover pedido */
function removerPedido(txid) {
  PEDIDOS.delete(txid);
}

/* Limpeza periódica (a cada 10 minutos) */
setInterval(() => {
  const agora = Date.now();
  let removidos = 0;
  for (const [txid, entry] of PEDIDOS.entries()) {
    if (agora > entry.expiraEm) {
      PEDIDOS.delete(txid);
      removidos++;
    }
  }
  if (removidos > 0) {
    console.log(`🧹 Limpeza: ${removidos} pedido(s) expirado(s) removido(s)`);
  }
}, 10 * 60 * 1000);

module.exports = {
  salvarPedido,
  buscarPedido,
  removerPedido
};
