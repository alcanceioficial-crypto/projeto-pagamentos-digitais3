const express = require("express");
const router = express.Router();

const { buscarPedido, removerPedido } = require("../services/pedidoStore.service");
const { enviarEmailPedido } = require("../services/email.service");
const { consultarPixPorTxid } = require("../services/efiPix.service");

/* ======================================================
   WEBHOOK — A EFÍ CHAMA ESSA ROTA QUANDO ALGO MUDA
====================================================== */
router.post("/pix", express.json(), async (req, res) => {
  // ⚠️ Responder 200 IMEDIATAMENTE para a Efí
  res.sendStatus(200);

  try {
    console.log("📩 Webhook recebido da Efí:", JSON.stringify(req.body));

    // 🔧 NORMALIZA: aceita formato { pix: [...] }, { pix: {...} }, [...] ou {...}
    let lista = [];

    if (req.body.pix) {
      // Formato { pix: [...] } ou { pix: {...} }
      lista = Array.isArray(req.body.pix) ? req.body.pix : [req.body.pix];
    } else if (Array.isArray(req.body)) {
      // Formato [ {...}, {...} ]
      lista = req.body;
    } else {
      // Formato { txid: "...", ... }
      lista = [req.body];
    }

    console.log(`📋 Total de notificações a processar: ${lista.length}`);

    for (const pix of lista) {
      if (!pix || !pix.txid) {
        console.log("⏭️ Item sem txid, ignorando:", JSON.stringify(pix));
        continue;
      }

      const txid = pix.txid;
      console.log(`🔎 Processando txid: ${txid}`);

      const pedido = buscarPedido(txid);
      if (!pedido) {
        console.log(`⚠️ Pedido não encontrado para txid ${txid} (expirou?)`);
        continue;
      }

      console.log(`📦 Pedido encontrado em memória para ${txid}`);

      // Confirma com a Efí se realmente foi pago
      let statusReal = pix.status || "CONCLUIDA"; // Efí só manda webhook de cobrança paga
      try {
        const consulta = await consultarPixPorTxid(txid);
        console.log(`🔍 Consulta Efí para ${txid}: status=${consulta.status}`);
        statusReal = consulta.status;
      } catch (e) {
        console.warn("⚠️ Falha ao reconfirmar status, assumindo CONCLUIDA:", e.message);
      }

      console.log(`🔔 Status final para ${txid}: ${statusReal}`);

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
    console.error(err);
  }
});

module.exports = router;
