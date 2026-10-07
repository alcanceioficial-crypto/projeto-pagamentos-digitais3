const express = require("express");
const router = express.Router();

const { criarPix, consultarPixPorTxid } = require("../services/efiPix.service");

/* ======================================================
   CONFIGURAÇÃO DO PRODUTO
====================================================== */

// 💰 Preço unitário da camiseta (em reais)
const PRECO_UNITARIO = 89.22;

// 📦 Descrição padrão (aparece no app do banco do cliente)
const DESCRICAO_PRODUTO = "Camiseta Levanta Limeira";

/* ======================================================
   CRIAR PIX — VALOR CALCULADO PELO BACKEND
====================================================== */
router.post("/gerar_pix", async (req, res) => {
  try {
    const { itens, nome } = req.body;

    // 🔒 Validação: precisa vir uma lista de itens
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: "Nenhum item enviado" });
    }

    // 🔢 Calcula o total no backend (à prova de fraude)
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

    // Arredonda para 2 casas decimais (segurança contra float)
    total = Number(total.toFixed(2));

    // 🔒 Segurança extra: valor mínimo
    if (total < 1) {
      return res.status(400).json({ erro: "Valor mínimo não atingido" });
    }

    const descricao = `${DESCRICAO_PRODUTO} (${totalPecas} ${
      totalPecas === 1 ? "peça" : "peças"
    })${nome ? " - " + nome : ""}`;

    const pix = await criarPix(total, descricao);

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
   STATUS DO PIX (CONSULTA DIRETA NA EFÍ)
====================================================== */
router.get("/status_pix", async (req, res) => {
  try {
    const { txid } = req.query;

    if (!txid) {
      return res.status(400).json({ erro: "TXID não informado" });
    }

    const pix = await consultarPixPorTxid(txid);

    if (pix.status === "CONCLUIDA") {
      console.log("✅ PIX PAGO:", txid);
      return res.json({ status: "CONCLUIDA" });
    }

    return res.json({ status: "PENDENTE" });

  } catch (err) {
    console.error("❌ Erro ao consultar status:", err.message);
    res.status(500).json({ erro: "Erro ao consultar status" });
  }
});

module.exports = router;
