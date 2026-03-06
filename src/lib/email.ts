import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

const APP_URL = process.env.NEXTAUTH_URL || "https://brosplit.vercel.app";

export async function sendInviteEmail({
  to,
  inviterName,
  groupName,
  groupId,
}: {
  to: string;
  inviterName: string;
  groupName: string;
  groupId: string;
}) {
  const inviteLink = `${APP_URL}/invite/${groupId}`;

  try {
    await getResend().emails.send({
      from: "BROSPLIT <onboarding@resend.dev>",
      to,
      subject: `${inviterName} invited you to "${groupName}" on BROSPLIT`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0a0a0a; color: #e5e5e5; border-radius: 16px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px; color: #ffffff;">BROSPLIT 💸</h1>
          <p style="color: #a3a3a3; margin: 0 0 32px; font-size: 14px;">Split expenses with friends</p>

          <div style="background: #171717; border: 1px solid #262626; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 16px;">
              <strong style="color: #ffffff;">${inviterName}</strong> invited you to join:
            </p>
            <h2 style="margin: 0; font-size: 22px; color: #a78bfa;">${groupName}</h2>
          </div>

          <p style="color: #a3a3a3; font-size: 14px; margin: 0 0 24px;">
            Open the link below to view the group, track shared expenses, and settle up with your friends.
          </p>

          <a href="${inviteLink}" style="display: block; text-align: center; background: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 16px;">
            View Group →
          </a>

          <p style="color: #525252; font-size: 12px; margin: 32px 0 0; text-align: center;">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send invite email:", error);
    return { success: false, error };
  }
}
