const express = require("express");
const router = express.Router();

const { buscarPedido, removerPedido } = require("../services/pedidoStore.service");
const { enviarEmailPedido } = require("../services/email.service");
const { consultarPixPorTxid } = require("../services/efiPix.service");

/* ======================================================
   WEBHOOK — A EFÍ CHAMA ESSA ROTA QUANDO ALGO MUDA
====================================================== */
router.post("/pix", express.json(), async (req, res) => {
  // ⚠️ Responder 200 IMEDIATAMENTE para a Efí (ela exige < 25s)
  res.sendStatus(200);

  try {
    console.log("📩 Webhook recebido da Efí:", JSON.stringify(req.body));

    const notificacoes = Array.isArray(req.body) ? req.body : [req.body];

    for (const notif of notificacoes) {
      const pix = notif.pix || notif;
      if (!pix || !pix.txid) continue;

      const txid = pix.txid;

      const pedido = buscarPedido(txid);
      if (!pedido) {
        console.log(`⚠️ Pedido não encontrado para txid ${txid} (expirou?)`);
        continue;
      }

      // Confirma com a Efí se realmente foi pago
      let statusReal = pix.status;
      try {
        const consulta = await consultarPixPorTxid(txid);
        statusReal = consulta.status;
      } catch (e) {
        console.warn("⚠️ Falha ao reconfirmar status, usando o do webhook:", e.message);
      }

      if (statusReal === "CONCLUIDA") {
        console.log(`✅ PAGAMENTO CONFIRMADO: ${txid}`);
        await enviarEmailPedido(pedido, txid);
        removerPedido(txid);
      } else {
        console.log(`⏳ Status ainda é ${statusReal} para ${txid}`);
      }
    }

  } catch (err) {
    console.error("❌ Erro no webhook:", err.message);
  }
});

module.exports = router;

