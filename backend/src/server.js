const fs = require("fs");
const app = require("./app");
const { registrarWebhookPix } = require("./services/efiWebhook.service");

// 🔐 Certificado Efí
const certPath = "/tmp/efi-cert.p12";

if (!fs.existsSync(certPath)) {
  const base64Cert = process.env.EFI_CERT_BASE64;

  if (!base64Cert) {
    console.error("❌ EFI_CERT_BASE64 não definido");
    process.exit(1);
  }

  fs.writeFileSync(certPath, Buffer.from(base64Cert, "base64"));
  console.log("📄 Certificado Efí recriado em /tmp");
}

const PORT = process.env.PORT || 3333;

(async () => {
  try {
    console.log("⚠️ Iniciando servidor SEM banco (Render Free)");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });

    // 🔗 Registra o webhook na Efí ao subir
    try {
      console.log("🔗 Registrando webhook na Efí...");
      const result = await registrarWebhookPix();
      console.log("✅ Webhook registrado:", JSON.stringify(result));
    } catch (err) {
      console.error("❌ Falha ao registrar webhook:", err.message);
      if (err.response) {
        console.error("   Status:", err.response.status);
        console.error("   Body:", JSON.stringify(err.response.data));
      }
    }

  } catch (err) {
    console.error("❌ Falha ao iniciar servidor:", err);
    process.exit(1);
  }
})();
