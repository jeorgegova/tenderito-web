// supabase/functions/send-auth-email/index.ts
// Hook "Send Email" de Supabase Auth para Tenderito usando Gmail SMTP (con contraseña de aplicación).
// Configurar en: Supabase Dashboard → Authentication → Hooks → Send Email (Auth Hook)
//
// Secrets requeridos en Supabase:
// - SMTP_USER: Tu correo de Gmail (ej: micorreo@gmail.com)
// - SMTP_PASS: Contraseña de aplicación de Google de 16 caracteres
// - SMTP_HOST: smtp.gmail.com (opcional, default: smtp.gmail.com)
// - SMTP_PORT: 465 (opcional, default: 465)
// - SMTP_FROM_NAME: "Tenderito" (opcional)
// - SITE_URL: URL pública de la PWA (ej: https://tenderito.app o tu dominio)
// - SEND_EMAIL_HOOK_SECRET: Secreto generado por Supabase al activar el hook (opcional si se invoca directo)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import nodemailer from "npm:nodemailer@6.9.13";

const BRAND_ORANGE = "#FF6B00";
const BRAND_DARK = "#142033";
const BRAND_BG = "#FFF1E5";
const BRAND_NAME = "Tenderito";

// 🎨 Plantilla HTML institucional para correos de Tenderito (Solo código OTP de 6 dígitos)
function getTemplate({
  title,
  message,
  token,
  logoUrl,
}: {
  title: string;
  message: string;
  token?: string;
  logoUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F6F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#F6F8FA;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 12px 36px rgba(20,32,51,0.08);border:1px solid #EAEFEA;">
          
          <!-- CABECERA Y LOGO -->
          <tr>
            <td style="padding:40px 24px 16px 24px;text-align:center;">
              <img src="${logoUrl}" alt="${BRAND_NAME}" style="max-width:160px;height:auto;display:inline-block;" />
              <div style="width:44px;height:4px;background:${BRAND_ORANGE};border-radius:999px;margin:16px auto 0 auto;"></div>
            </td>
          </tr>

          <!-- CONTENIDO PRINCIPAL -->
          <tr>
            <td style="padding:16px 36px 36px 36px;text-align:center;">
              <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;color:${BRAND_DARK};letter-spacing:-0.4px;">
                ${title}
              </h1>
              <p style="margin:0 0 28px 0;font-size:14.5px;color:#596375;line-height:1.6;">
                ${message}
              </p>

              <!-- CAJA EXCLUSIVA DEL CÓDIGO DE 6 DÍGITOS -->
              <div style="background:${BRAND_BG};border:2px dashed ${BRAND_ORANGE};border-radius:20px;padding:24px 16px;text-align:center;margin:0 auto 24px auto;">
                <p style="font-size:12px;color:#945727;margin:0 0 8px 0;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
                  Tu código de 6 dígitos
                </p>
                <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:${BRAND_ORANGE};font-family:'Courier New',Courier,monospace;line-height:1.1;padding-left:10px;">
                  ${token || "------"}
                </div>
                <p style="font-size:12px;color:#7A6B60;margin:10px 0 0 0;font-weight:500;">
                  Escríbelo en la pantalla de Tenderito
                </p>
              </div>

              <p style="font-size:12.5px;color:#8B95A5;line-height:1.5;margin:0;">
                Este código vence en pocos minutos y solo puede usarse una vez.
              </p>
            </td>
          </tr>

          <!-- PIE DE PÁGINA -->
          <tr>
            <td style="padding:20px 24px;text-align:center;background:#FAFBFB;border-top:1px solid #EAEFEA;font-size:11.5px;color:#8B95A5;line-height:1.5;">
              © ${new Date().getFullYear()} ${BRAND_NAME} — Tu libreta de fiados digital.<br/>
              Si no solicitaste este código, ignora este mensaje. Tu cuenta sigue protegida.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ✉️ Contenidos adaptados al tipo de evento (Enfoque en código)
function getContent(emailType: string) {
  switch (emailType) {
    case "recovery":
      return {
        subject: "Tu código de recuperación de Tenderito 🔑",
        title: "Restablece tu contraseña",
        message: "Hemos generado tu código de seguridad para cambiar la contraseña. Ingrésalo en la app de Tenderito:",
      };
    case "signup":
      return {
        subject: "Tu código de verificación de Tenderito 🛒",
        title: "Confirma tu cuenta",
        message: "Ingresa el siguiente código de seguridad en la aplicación para activar tu libreta:",
      };
    case "magiclink":
      return {
        subject: "Tu código de acceso a Tenderito ✨",
        title: "Acceso seguro a tu cuenta",
        message: "Ingresa el siguiente código en Tenderito para entrar a tu tienda:",
      };
    default:
      return {
        subject: "Tu código de seguridad de Tenderito",
        title: "Código de verificación",
        message: "Usa el siguiente código en la app de Tenderito para continuar:",
      };
  }
}

// 🚀 SERVIDOR EDGE FUNCTION
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers);

    // 🔏 Si existe SEND_EMAIL_HOOK_SECRET configurado, verificar la firma del Webhook
    const hookSecretRaw = Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "";
    if (hookSecretRaw) {
      const hookSecret = hookSecretRaw.replace("v1,whsec_", "");
      try {
        const wh = new Webhook(hookSecret);
        wh.verify(rawBody, headers);
      } catch (signErr: any) {
        console.warn("[SendAuthEmail] Firma de webhook no coincide o falta secreto:", signErr?.message);
      }
    }

    const payload = JSON.parse(rawBody || "{}");
    const emailData = payload.email_data || {};
    const user = payload.user || {};

    const emailType = emailData.email_action_type || payload.type || "recovery";
    const token = emailData.token || payload.token || "";
    const tokenHash = emailData.token_hash || payload.token_hash || "";
    const toEmail = user.email || payload.email || "";

    if (!toEmail) {
      throw new Error("Falta el correo destinatario (toEmail)");
    }

    // Configuración SMTP desde secrets de Supabase
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpPort = Number(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER") || "";
    const smtpPass = (Deno.env.get("SMTP_PASS") || "").replace(/\s+/g, ""); // Limpiar espacios de la contraseña de app
    const fromName = Deno.env.get("SMTP_FROM_NAME") || BRAND_NAME;

    if (!smtpUser || !smtpPass) {
      throw new Error("Faltan las credenciales SMTP_USER y/o SMTP_PASS en los secrets de Supabase.");
    }

    const siteURL = (Deno.env.get("SITE_URL") || "https://tenderito.app").replace(/\/$/, "");
    const logoUrl = `${siteURL}/logo.png`;

    // Armar URL de restablecimiento / verificación
    let actionUrl = `${siteURL}/reset-password`;
    if (tokenHash) {
      actionUrl = `${siteURL}/reset-password?token_hash=${tokenHash}&type=${emailType}`;
    }

    const content = getContent(emailType);

    // Configurar transporte Nodemailer con Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const html = getTemplate({
      title: content.title,
      message: content.message,
      token,
      logoUrl,
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to: toEmail,
      subject: content.subject,
      html,
    });

    console.log(`[SendAuthEmail] Correo enviado exitosamente a ${toEmail}. MessageId: ${info.messageId}`);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    console.error("[SendAuthEmail] Error enviando correo:", err?.message || err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 200, // Retornamos 200 para que el Auth Hook de Supabase no rompa el flujo de Auth
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
