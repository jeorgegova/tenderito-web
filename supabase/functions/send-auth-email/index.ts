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

// 🎨 Plantilla HTML institucional para correos de Tenderito
function getTemplate({
  title,
  message,
  token,
  buttonText,
  url,
  logoUrl,
}: {
  title: string;
  message: string;
  token?: string;
  buttonText: string;
  url: string;
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
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px;background:#F6F8FA;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 12px 36px rgba(20,32,51,0.08);border:1px solid #EAEFEA;">
          
          <!-- CABECERA Y LOGO -->
          <tr>
            <td style="padding:36px 24px 12px 24px;text-align:center;">
              <img src="${logoUrl}" alt="${BRAND_NAME}" style="max-width:160px;height:auto;display:inline-block;margin-bottom:12px;" />
              <div style="width:48px;height:5px;background:${BRAND_ORANGE};border-radius:999px;margin:8px auto 0 auto;"></div>
            </td>
          </tr>

          <!-- CONTENIDO PRINCIPAL -->
          <tr>
            <td style="padding:16px 36px 28px 36px;text-align:center;">
              <h1 style="margin:0 0 10px 0;font-size:22px;font-weight:800;color:${BRAND_DARK};letter-spacing:-0.4px;">
                ${title}
              </h1>
              <p style="margin:0 0 24px 0;font-size:14.5px;color:#596375;line-height:1.6;">
                ${message}
              </p>

              ${
                token
                  ? `
              <!-- CAJA DEL CÓDIGO DE 6 DÍGITOS PARA MÓVIL Y WEB -->
              <div style="background:${BRAND_BG};border:2px dashed ${BRAND_ORANGE};border-radius:18px;padding:20px 16px;text-align:center;margin:0 auto 28px auto;max-width:340px;">
                <p style="font-size:12px;color:#945727;margin:0 0 6px 0;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
                  Tu código de verificación
                </p>
                <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:${BRAND_ORANGE};font-family:'Courier New',Courier,monospace;line-height:1.2;">
                  ${token}
                </div>
                <p style="font-size:11.5px;color:#7A6B60;margin:6px 0 0 0;">
                  Ingresa este código en la app de Tenderito
                </p>
              </div>
              `
                  : ""
              }

              <!-- BOTÓN DE ACCIÓN DIRECTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${url}"
                       target="_blank"
                       style="display:inline-block;background:${BRAND_ORANGE};color:#FFFFFF;
                              padding:14px 38px;border-radius:999px;
                              text-decoration:none;font-size:14px;font-weight:800;
                              letter-spacing:0.04em;text-transform:uppercase;
                              box-shadow:0 6px 18px rgba(255,107,0,0.35);">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td style="padding:0 36px;">
              <div style="height:1px;background:#EAEFEA;"></div>
            </td>
          </tr>

          <!-- ENLACE DIRECTO DE RESPALDO -->
          <tr>
            <td style="padding:20px 36px;text-align:center;">
              <p style="font-size:12px;color:#8B95A5;margin:0 0 6px 0;">
                O si prefieres, copia este enlace en tu navegador:
              </p>
              <p style="font-size:11.5px;color:${BRAND_ORANGE};word-break:break-all;margin:0;line-height:1.4;">
                ${url}
              </p>
            </td>
          </tr>

          <!-- PIE DE PÁGINA -->
          <tr>
            <td style="padding:20px 24px;text-align:center;background:#FAFBFB;border-top:1px solid #EAEFEA;font-size:11px;color:#8B95A5;line-height:1.5;">
              © ${new Date().getFullYear()} ${BRAND_NAME} — Tu libreta de fiados digital.<br/>
              Si no solicitaste este cambio, puedes ignorar este mensaje con total seguridad.
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

// ✉️ Contenidos adaptados al tipo de evento
function getContent(emailType: string) {
  switch (emailType) {
    case "recovery":
      return {
        subject: "Recupera tu contraseña en Tenderito 🔑",
        title: "Restablecer tu contraseña",
        message: "Recibimos una solicitud para cambiar tu contraseña de Tenderito. Usa el código de 6 dígitos en tu app o haz clic en el botón inferior:",
        buttonText: "Restablecer contraseña",
      };
    case "signup":
      return {
        subject: "Confirma tu cuenta en Tenderito 🛒",
        title: "¡Bienvenido a Tenderito!",
        message: "Falta un solo paso para activar tu libreta de fiados digital. Confirma tu correo para comenzar:",
        buttonText: "Confirmar mi cuenta",
      };
    case "magiclink":
      return {
        subject: "Tu acceso rápido a Tenderito ✨",
        title: "Acceso seguro a tu cuenta",
        message: "Usa este enlace o código para ingresar a tu libreta sin necesidad de contraseña:",
        buttonText: "Ingresar a mi tienda",
      };
    case "email_change":
      return {
        subject: "Confirma tu nuevo correo en Tenderito ✉️",
        title: "Confirmar cambio de correo",
        message: "Confirma este correo electrónico para actualizar tu cuenta de Tenderito.",
        buttonText: "Confirmar cambio",
      };
    default:
      return {
        subject: "Notificación de Tenderito",
        title: "Notificación de tu cuenta",
        message: "Tienes una notificación importante en tu cuenta de Tenderito.",
        buttonText: "Ir a Tenderito",
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
      buttonText: content.buttonText,
      url: actionUrl,
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
