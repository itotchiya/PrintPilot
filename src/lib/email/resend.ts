import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@mail.mbouf.site';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'PrintPilot';

// Brand colors
const PRIMARY = '#2DD4A0';
const PRIMARY_DARK = '#22b589';
const DARK_BG = '#0f1117';
const CARD_BG = '#f9fafb';
const TEXT = '#111827';
const MUTED = '#6b7280';

// Logo SVG (inline — same icon as sidebar, primary color)
const LOGO_SVG = `<svg width="140" height="36" viewBox="0 0 156 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PrintPilot">
  <g fill="${PRIMARY}">
    <path d="M17.3431 2.65705L20.0001 0L40.0001 20L20.0001 40L17.343 37.3429L34.686 20L17.3431 2.65705Z"/>
    <path d="M13.8745 6.1258L16.5315 3.46875L33.0629 20.0002L16.5315 36.5316L13.8745 33.8746L27.7488 20.0002L13.8745 6.1258Z"/>
    <path d="M0 20.0003L13.0628 6.9375L26.1256 20.0003L13.0628 33.0631L10.4058 30.4061L20.8115 20.0003L13.0628 12.2516L2.65705 22.6573L0 20.0003Z"/>
    <path d="M13.0629 13.875L10.4059 16.532L13.8745 20.0006L6.93726 26.9378L9.5943 29.5948L19.1886 20.0006L13.0629 13.875Z"/>
    <path d="M6.12556 26.1259L3.46851 23.4689L9.56635 17.3711L12.2234 20.0281L6.12556 26.1259Z"/>
  </g>
  <g fill="#ffffff">
    <path d="M51.7913 29.0377V10.8778H55.081V18.5656H63.4958V10.8778H66.7944V29.0377H63.4958V21.3233H55.081V29.0377H51.7913Z"/>
    <path d="M76.5261 29.0377H70.3723V10.8778H76.6502C78.4532 10.8778 80.002 11.2414 81.2966 11.9685C82.5971 12.6897 83.5961 13.7271 84.2936 15.0809C84.9912 16.4346 85.34 18.0543 85.34 19.94C85.34 21.8317 84.9882 23.4573 84.2848 24.8169C83.5872 26.1766 82.5793 27.2199 81.2611 27.947C79.9488 28.6741 78.3704 29.0377 76.5261 29.0377ZM73.662 26.1913H76.3664C77.6315 26.1913 78.6867 25.9608 79.532 25.4997C80.3773 25.0327 81.0128 24.3381 81.4384 23.4159C81.8641 22.4878 82.0769 21.3292 82.0769 19.94C82.0769 18.5508 81.8641 17.3981 81.4384 16.4819C81.0128 15.5597 80.3832 14.871 79.5497 14.4158C78.7221 13.9547 77.6936 13.7242 76.464 13.7242H73.662V26.1913Z"/>
    <path d="M94.6593 29.0377V10.8778H101.469C102.864 10.8778 104.035 11.1379 104.981 11.6581C105.932 12.1784 106.651 12.8936 107.135 13.804C107.626 14.7084 107.871 15.737 107.871 16.8897C107.871 18.0543 107.626 19.0888 107.135 19.9932C106.645 20.8977 105.921 21.61 104.963 22.1302C104.005 22.6445 102.826 22.9016 101.425 22.9016H96.9115V20.1972H100.982C101.797 20.1972 102.465 20.0553 102.986 19.7716C103.506 19.4878 103.89 19.0977 104.138 18.6011C104.392 18.1045 104.52 17.5341 104.52 16.8897C104.52 16.2454 104.392 15.6779 104.138 15.1873C103.89 14.6966 103.503 14.3153 102.977 14.0434C102.456 13.7656 101.785 13.6266 100.964 13.6266H97.949V29.0377H94.6593Z"/>
    <path d="M110.587 29.0377V15.4178H113.699V17.6878H113.841C114.089 16.9016 114.515 16.2956 115.118 15.87C115.727 15.4385 116.421 15.2227 117.202 15.2227C117.379 15.2227 117.577 15.2316 117.796 15.2493C118.02 15.2611 118.207 15.2818 118.354 15.3114V18.2641C118.218 18.2169 118.003 18.1755 117.707 18.14C117.417 18.0986 117.137 18.0779 116.865 18.0779C116.28 18.0779 115.753 18.205 115.286 18.4592C114.825 18.7075 114.462 19.0533 114.196 19.4967C113.93 19.94 113.797 20.4514 113.797 21.0307V29.0377H110.587Z"/>
    <path d="M120.487 29.0377V15.4178H123.697V29.0377H120.487ZM122.101 13.4848C121.592 13.4848 121.155 13.3163 120.788 12.9793C120.422 12.6365 120.239 12.2256 120.239 11.7468C120.239 11.2621 120.422 10.8512 120.788 10.5143C121.155 10.1714 121.592 10 122.101 10C122.615 10 123.052 10.1714 123.413 10.5143C123.78 10.8512 123.963 11.2621 123.963 11.7468C123.963 12.2256 123.78 12.6365 123.413 12.9793C123.052 13.3163 122.615 13.4848 122.101 13.4848Z"/>
    <path d="M130.208 10.8778V29.0377H126.998V10.8778H130.208Z"/>
    <path d="M139.449 29.3037C138.119 29.3037 136.966 29.0111 135.991 28.4258C135.016 27.8406 134.259 27.0219 133.721 25.9697C133.189 24.9174 132.923 23.6879 132.923 22.2809C132.923 20.874 133.189 19.6415 133.721 18.5834C134.259 17.5252 135.016 16.7035 135.991 16.1183C136.966 15.5331 138.119 15.2405 139.449 15.2405C140.779 15.2405 141.932 15.5331 142.907 16.1183C143.883 16.7035 144.637 17.5252 145.169 18.5834C145.706 19.6415 145.975 20.874 145.975 22.2809C145.975 23.6879 145.706 24.9174 145.169 25.9697C144.637 27.0219 143.883 27.8406 142.907 28.4258C141.932 29.0111 140.779 29.3037 139.449 29.3037ZM139.467 26.7322C140.188 26.7322 140.791 26.5342 141.276 26.1381C141.761 25.7362 142.121 25.1982 142.358 24.5243C142.6 23.8504 142.721 23.0997 142.721 22.2721C142.721 21.4386 142.6 20.6849 142.358 20.011C142.121 19.3312 141.761 18.7903 141.276 18.3883C140.791 17.9863 140.188 17.7853 139.467 17.7853C138.728 17.7853 138.113 17.9863 137.623 18.3883C137.138 18.7903 136.774 19.3312 136.532 20.011C136.296 20.6849 136.177 21.4386 136.177 22.2721C136.177 23.0997 136.296 23.8504 136.532 24.5243C136.774 25.1982 137.138 25.7362 137.623 26.1381C138.113 26.5342 138.728 26.7322 139.467 26.7322Z"/>
    <path d="M155.501 15.4178V17.9006H147.671V15.4178H155.501ZM149.604 12.1547H152.814V24.9411C152.814 25.3726 152.879 25.7036 153.009 25.9342C153.145 26.1588 153.323 26.3125 153.541 26.3953C153.76 26.478 154.002 26.5194 154.268 26.5194C154.469 26.5194 154.653 26.5046 154.818 26.4751C154.99 26.4455 155.12 26.4189 155.208 26.3953L155.749 28.9047C155.578 28.9638 155.332 29.0288 155.013 29.0997C154.7 29.1707 154.316 29.2121 153.861 29.2239C153.057 29.2475 152.332 29.1263 151.688 28.8603C151.044 28.5884 150.532 28.1687 150.154 27.6012C149.782 27.0337 149.598 26.3243 149.604 25.4731V12.1547Z"/>
  </g>
</svg>`;

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Shared email base layout */
function emailLayout(headerContent: string, bodyContent: string, year: number): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; color: ${TEXT}; line-height: 1.6; }
    .wrapper { max-width: 600px; margin: 32px auto; }
    .header { background: ${DARK_BG}; padding: 28px 32px; border-radius: 12px 12px 0 0; text-align: center; }
    .header-sub { color: #9ca3af; font-size: 13px; margin-top: 8px; }
    .body { background: #ffffff; padding: 36px 32px; }
    .footer { background: ${CARD_BG}; padding: 20px 32px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px; color: ${MUTED}; border-top: 1px solid #e5e7eb; }
    .btn { display: inline-block; background: ${PRIMARY}; color: #ffffff !important; padding: 13px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; letter-spacing: 0.01em; }
    .btn:hover { background: ${PRIMARY_DARK}; }
    .card { background: ${CARD_BG}; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
    .card-accent { border-left: 4px solid ${PRIMARY}; }
    .pill { display: inline-block; background: rgba(45,212,160,0.12); color: #059669; border: 1px solid rgba(45,212,160,0.3); border-radius: 100px; padding: 3px 12px; font-size: 12px; font-weight: 600; }
    ul.features { list-style: none; padding: 0; margin: 12px 0; }
    ul.features li { padding: 6px 0; padding-left: 24px; position: relative; font-size: 14px; }
    ul.features li::before { content: "✓"; position: absolute; left: 0; color: ${PRIMARY}; font-weight: 700; }
    .link-box { background: #f3f4f6; border-radius: 6px; padding: 10px 14px; font-size: 13px; word-break: break-all; color: ${MUTED}; margin: 8px 0; }
    .warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #dc2626; margin: 16px 0; }
    h2 { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
    p { margin-bottom: 12px; font-size: 15px; }
    strong { font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      ${LOGO_SVG}
      ${headerContent}
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>Si vous n'attendiez pas cet e-mail, vous pouvez l'ignorer.</p>
      <p style="margin-top:8px;">© ${year} PrintPilot. Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send email using Resend
 */
export async function sendEmail({ to, subject, html, text }: EmailTemplate) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Erreur d\'envoi d\'e-mail :', error);
      throw new Error(`Impossible d'envoyer l'e-mail : ${error.message}`);
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Exception d\'envoi d\'e-mail :', error);
    throw error;
  }
}

/**
 * Invitation fournisseur
 */
export async function sendSupplierInvitation(
  to: string,
  invitationToken: string,
  companyName: string
) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const invitationLink = `${baseUrl}/invitation/${invitationToken}`;
  const year = new Date().getFullYear();

  const header = `<p class="header-sub" style="color:#9ca3af;font-size:13px;margin-top:12px;">Invitation fournisseur</p>`;

  const body = `
    <h2>Bienvenue sur PrintPilot, ${companyName} !</h2>
    <p>Vous avez été invité(e) à rejoindre <strong>PrintPilot</strong> en tant que fournisseur d'impression.</p>
    <p>PrintPilot est la plateforme moderne qui vous connecte avec vos clients et automatise votre processus de devis :</p>
    <ul class="features">
      <li>Configurez vos tarifs une seule fois, obtenez des devis instantanément</li>
      <li>Invitez vos clients à générer leurs propres devis</li>
      <li>Partagez des devis PDF professionnels avec votre logo</li>
      <li>Suivez toute l'activité devis en temps réel</li>
    </ul>
    <div style="text-align:center;">
      <a href="${invitationLink}" class="btn">Accepter l'invitation &amp; Créer mon compte</a>
    </div>
    <p style="font-size:13px;color:${MUTED};">Ou copiez ce lien dans votre navigateur :</p>
    <div class="link-box">${invitationLink}</div>
    <div class="warning">
      <strong>⏳ Attention :</strong> Cette invitation expire dans <strong>7 jours</strong>.
    </div>
  `;

  const html = emailLayout(header, body, year);

  const text = `Bienvenue sur PrintPilot, ${companyName} !

Vous avez été invité(e) à rejoindre PrintPilot en tant que fournisseur d'impression.

Cliquez sur le lien ci-dessous pour accepter votre invitation et créer votre compte :
${invitationLink}

Cette invitation expire dans 7 jours.

Si vous n'attendiez pas cette invitation, ignorez cet e-mail.
© ${year} PrintPilot. Tous droits réservés.`;

  return sendEmail({
    to,
    subject: `Invitation à rejoindre PrintPilot — ${companyName}`,
    html,
    text,
  });
}

/**
 * Invitation client (envoyée par un fournisseur)
 */
export async function sendClientInvitation(
  to: string,
  invitationToken: string,
  supplierName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  supplierLogo?: string | null // réservé pour usage futur
) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const invitationLink = `${baseUrl}/invitation/${invitationToken}`;
  const year = new Date().getFullYear();

  const header = `<p class="header-sub" style="color:#9ca3af;font-size:13px;margin-top:12px;">Invitation client</p>`;

  const body = `
    <h2>Vous avez été invité(e) par <span style="color:${PRIMARY}">${supplierName}</span></h2>
    <p><strong>${supplierName}</strong> vous invite à rejoindre <strong>PrintPilot</strong>, la plateforme où vous pouvez générer vos devis d'impression instantanément et comparer les prix.</p>
    <ul class="features">
      <li>Générez vos devis 24h/24, 7j/7</li>
      <li>Comparez les prix entre plusieurs fournisseurs</li>
      <li>Téléchargez des devis PDF professionnels</li>
      <li>Consultez l'historique de vos devis à tout moment</li>
    </ul>
    <div style="text-align:center;">
      <a href="${invitationLink}" class="btn">Accepter l'invitation</a>
    </div>
    <p style="font-size:13px;color:${MUTED};">Ou copiez ce lien dans votre navigateur :</p>
    <div class="link-box">${invitationLink}</div>
    <div class="warning">
      <strong>⏳ Attention :</strong> Cette invitation expire dans <strong>7 jours</strong>.
    </div>
  `;

  const html = emailLayout(header, body, year);

  const text = `${supplierName} vous invite à rejoindre PrintPilot !

Générez vos devis d'impression instantanément et comparez les prix.

Cliquez sur ce lien pour accepter votre invitation :
${invitationLink}

Cette invitation expire dans 7 jours.

Si vous n'attendiez pas cette invitation, ignorez cet e-mail.
© ${year} PrintPilot. Tous droits réservés.`;

  return sendEmail({
    to,
    subject: `${supplierName} vous invite sur PrintPilot`,
    html,
    text,
  });
}

/**
 * E-mail de bienvenue après création du compte
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: 'SUPPLIER' | 'CLIENT'
) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const loginLink = `${baseUrl}/login`;
  const year = new Date().getFullYear();

  const roleContent = role === 'SUPPLIER'
    ? {
        pill: 'Fournisseur',
        title: `Bienvenue sur PrintPilot, ${name} !`,
        message: 'Votre compte fournisseur est maintenant actif. Vous pouvez commencer à configurer vos tarifs et à inviter vos clients.',
        cta: 'Accéder à mon tableau de bord',
        features: [
          'Configurez vos tarifs avec notre assistant guidé',
          'Importez vos prix existants via Excel',
          'Invitez vos clients à générer des devis',
          'Recevez une notification dès qu\'un client télécharge un PDF',
        ],
      }
    : {
        pill: 'Client',
        title: `Bienvenue sur PrintPilot, ${name} !`,
        message: 'Votre compte est prêt. Vous pouvez désormais générer vos devis d\'impression instantanément.',
        cta: 'Créer mon premier devis',
        features: [
          'Générez des devis auprès de plusieurs fournisseurs',
          'Comparez les prix côte à côte',
          'Téléchargez des devis PDF professionnels',
          'Consultez votre historique de devis',
        ],
      };

  const header = `<p class="header-sub" style="color:#9ca3af;font-size:13px;margin-top:12px;">Bienvenue</p>`;

  const body = `
    <span class="pill">${roleContent.pill}</span>
    <h2 style="margin-top:16px;">${roleContent.title}</h2>
    <p>${roleContent.message}</p>
    <div class="card">
      <p style="font-weight:600;margin-bottom:8px;">Prochaines étapes :</p>
      <ul class="features">
        ${roleContent.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
    <div style="text-align:center;">
      <a href="${loginLink}" class="btn">${roleContent.cta}</a>
    </div>
    <p style="font-size:13px;color:${MUTED};text-align:center;">URL de connexion : <code>${loginLink}</code></p>
  `;

  const html = emailLayout(header, body, year);

  return sendEmail({
    to,
    subject: `Bienvenue sur PrintPilot, ${name} !`,
    html,
  });
}

interface PdfDownloadNotificationParams {
  to: string;
  supplierName: string;
  clientName: string;
  quoteId: string;
  quoteSpecs?: string;
}

/**
 * Notification de téléchargement PDF (envoyée au fournisseur)
 */
export async function sendPdfDownloadedNotification({
  to,
  supplierName,
  clientName,
  quoteId,
  // quoteSpecs is available for future use
}: PdfDownloadNotificationParams) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const quoteUrl = `${baseUrl}/supplier/quotes/${quoteId}`;
  const year = new Date().getFullYear();

  const header = `<p class="header-sub" style="color:#9ca3af;font-size:13px;margin-top:12px;">Notification d'activité</p>`;

  const body = `
    <h2>⬇️ Un devis PDF a été téléchargé</h2>
    <p>Bonjour <strong>${supplierName}</strong>,</p>
    <p>Un client a téléchargé un devis PDF depuis votre compte fournisseur.</p>
    <div class="card card-accent">
      <p><strong>Client :</strong> ${clientName}</p>
      <p><strong>Référence devis :</strong> #${quoteId.slice(0, 8).toUpperCase()}</p>
      <p><strong>Téléchargé le :</strong> ${new Date().toLocaleString('fr-FR')}</p>
    </div>
    <div style="text-align:center;">
      <a href="${quoteUrl}" class="btn">Voir les détails du devis</a>
    </div>
    <p style="font-size:13px;color:${MUTED};">Il s'agit d'une notification automatique. Le client pourrait vous contacter prochainement pour finaliser la commande.</p>
  `;

  const html = emailLayout(header, body, year);

  return sendEmail({
    to,
    subject: `Devis PDF téléchargé par ${clientName}`,
    html,
  });
}

export { resend };
