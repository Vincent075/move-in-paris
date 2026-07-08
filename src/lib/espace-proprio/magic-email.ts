// Email transactionnel "lien d'accès" de l'espace propriétaire.
// Charte MIP : header noir + logo doré, accents dorés, footer signature.
// Règles typo projet : jamais de cadratins, point médian · en séparateur.

export function magicLinkEmail(link: string): { subject: string; html: string } {
  const subject = "Votre lien d'accès · Espace Propriétaire Move in Paris";
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
</head>
<body style="margin:0;padding:0;background-color:#F5F0EB;font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F5F0EB;opacity:0;">
    Votre lien d'accès sécurisé à l'Espace Propriétaire, valable 15 minutes.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F0EB;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background-color:#FFFFFF;border:1px solid #E8E4DF;">

          <tr>
            <td align="center" style="background-color:#0D0D0D;padding:6px 40px;">
              <img src="https://www.move-in-paris.com/Logo-gold.png" alt="Move in Paris" width="140" style="display:block;border:0;height:auto;max-width:140px;" />
            </td>
          </tr>
          <tr><td style="background-color:#B88B58;height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr>

          <tr>
            <td align="center" style="padding:36px 40px 0 40px;">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#B88B58;text-transform:uppercase;">
                Espace Propriétaire
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 8px 40px;font-size:16px;line-height:1.75;color:#0D0D0D;">
              <p style="margin:0 0 16px 0;">Bonjour,</p>
              <p style="margin:0;">
                Voici votre lien d'accès sécurisé à votre espace propriétaire. Il est valable <strong>15 minutes</strong> et ne peut être utilisé qu'une seule fois.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 40px;">
              <a href="${link}" style="display:inline-block;background-color:#B88B58;color:#0D0D0D;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;text-decoration:none;padding:16px 40px;">
                Accéder à mon espace
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#6B6B6B;">
              Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email : personne ne peut accéder à votre espace sans ce lien.
            </td>
          </tr>

          <tr>
            <td align="center" style="background-color:#F5F0EB;padding:18px 40px;border-top:1px solid #E8E4DF;">
              <div style="color:#B88B58;font-style:italic;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
                The art of Parisian living
              </div>
            </td>
          </tr>
          <tr><td style="background-color:#B88B58;height:2px;line-height:2px;font-size:0;">&nbsp;</td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
}
