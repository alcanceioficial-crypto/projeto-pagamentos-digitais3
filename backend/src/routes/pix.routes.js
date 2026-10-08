const express = require("express");
const router = express.Router();

const { criarPix, consultarPixPorTxid } = require("../services/efiPix.service");
const { salvarPedido } = require("../services/pedidoStore.service");

/* ======================================================
   CONFIGURAÇÃO
====================================================== */

const PRECO_UNITARIO = 89.22;
const DESCRICAO_PRODUTO = "Camiseta Levanta Limeira";

/* ======================================================
   GERAR PIX — AGORA SALVA O PEDIDO EM MEMÓRIA
====================================================== */
router.post("/gerar_pix", async (req, res) => {
  try {
    const { itens, nome, whatsapp, endereco } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: "Nenhum item enviado" });
    }

    if (!nome || !whatsapp || !endereco) {
      return res.status(400).json({ erro: "Dados do cliente incompletos" });
    }

    let total = 0;
    let totalPecas = 0;

    for (const item of itens) {
      const qtd = parseInt(item.quantidade, 10);
      if (!qtd || qtd < 1 || qtd > 50) {
        return res.status(400).json({ erro: "Quantidade inválida" });
      }
      total += PRECO_UNITARIO * qtd;
      totalPecas += qtd;
    }

    total = Number(total.toFixed(2));

    if (total < 1) {
      return res.status(400).json({ erro: "Valor mínimo não atingido" });
    }

    const descricao = `${DESCRICAO_PRODUTO} (${totalPecas} ${
      totalPecas === 1 ? "peça" : "peças"
    }) - ${nome}`;

    const pix = await criarPix(total, descricao);

    salvarPedido(pix.txid, {
      nome,
      whatsapp,
      endereco,
      itens: itens.map(i => ({
        tipo: "Camiseta Normal",
        tamanho: i.tamanho,
        quantidade: i.quantidade,
        preco: PRECO_UNITARIO
      })),
      total
    });

    console.log(
      `🧾 PIX GERADO | txid: ${pix.txid} | valor: R$ ${total} | peças: ${totalPecas}`
    );

    res.json({
      txid: pix.txid,
      pix: pix.pixCopiaECola,
      valor: total,
      totalPecas
    });

  } catch (err) {
    console.error("❌ Erro ao gerar PIX:", err.message);
    res.status(500).json({ erro: "Erro ao gerar PIX" });
  }
});

/* ======================================================
   STATUS DO PIX
====================================================== */
router.get("/status_pix", async (req, res) => {
  try {
    const { txid } = req.query;
    if (!txid) return res.status(400).json({ erro: "TXID não informado" });

    const pix = await consultarPixPorTxid(txid);

    if (pix.status === "CONCLUIDA") {
      return res.json({ status: "CONCLUIDA" });
    }
    return res.json({ status: "PENDENTE" });

  } catch (err) {
    console.error("❌ Erro ao consultar status:", err.message);
    res.status(500).json({ erro: "Erro ao consultar status" });
  }
});

module.exports = router;
