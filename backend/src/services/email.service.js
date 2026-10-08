
const nodemailer = require("nodemailer");

console.log("📧 EMAIL SERVICE CARREGADO");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM     = process.env.EMAIL_FROM || "onboarding@resend.dev";
const EMAIL_TO       = process.env.EMAIL_TO;

let transporter = null;

if (RESEND_API_KEY && EMAIL_TO) {
  transporter = nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: {
      user: "resend",
      pass: RESEND_API_KEY
    }
  });
  console.log(`📧 Transporter Resend configurado | from: ${EMAIL_FROM} | to: ${EMAIL_TO}`);
} else {
  console.warn("⚠️ RESEND_API_KEY ou EMAIL_TO não configurados — envio desativado");
}

function formatCurrency(v) {
  return "R$ " + Number(v).toFixed(2).replace(".", ",");
}

function montarCorpoEmail(pedido, txid) {
  const { nome, whatsapp, endereco, itens, total } = pedido;

  let itensTexto = "";
  itens.forEach((item, i) => {
    const sub = item.preco * item.quantidade;
    itensTexto +=
      `  ${i + 1}. ${item.tipo}\n` +
      `     Tamanho: ${item.tamanho}\n` +
      `     Quantidade: ${item.quantidade}\n` +
      `     Subtotal: ${formatCurrency(sub)}\n\n`;
  });

  return (
`🛒 NOVO PEDIDO PAGO — LEVANTA LIMEIRA

━━━━━━━━━━━━━━━━━━━━━━
👤 DADOS DO CLIENTE
━━━━━━━━━━━━━━━━━━━━━━
Nome: ${nome}
WhatsApp: ${whatsapp}

━━━━━━━━━━━━━━━━━━━━━━
📍 ENDEREÇO DE ENTREGA
━━━━━━━━━━━━━━━━━━━━━━
CEP: ${endereco.cep}
Rua: ${endereco.rua}, Nº ${endereco.numero}
${endereco.complemento ? "Complemento: " + endereco.complemento + "\n" : ""}Bairro: ${endereco.bairro}
Cidade: ${endereco.cidade} - ${endereco.estado}

━━━━━━━━━━━━━━━━━━━━━━
👕 ITENS DO PEDIDO
━━━━━━━━━━━━━━━━━━━━━━
${itensTexto}━━━━━━━━━━━━━━━━━━━━━━
💰 TOTAL: ${formatCurrency(total)}
━━━━━━━━━━━━━━━━━━━━━━

✅ Pagamento confirmado.
🔑 TxID: ${txid}`
  );
}

async function enviarEmailPedido(pedido, txid) {
  if (!transporter) {
    console.warn("📧 Envio de e-mail desativado (sem credenciais)");
    return;
  }

  const assunto = `✅ Pedido pago — ${pedido.nome} — ${formatCurrency(pedido.total)}`;
  const corpo = montarCorpoEmail(pedido, txid);

  try {
    await transporter.sendMail({
      from: `"Loja Levanta Limeira" <${EMAIL_FROM}>`,
      to: EMAIL_TO,
      subject: assunto,
      text: corpo
    });
    console.log(`📧 E-mail enviado para ${EMAIL_TO}`);
  } catch (err) {
    console.error("❌ Erro ao enviar e-mail:", err.message);
    if (err.response) {
      console.error("   Status:", err.response.status);
      console.error("   Body:", JSON.stringify(err.response.data));
    }
  }
}

module.exports = { enviarEmailPedido };
