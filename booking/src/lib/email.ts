// E-mail értesítések: minden levél először az email_outbox táblába kerül (tranzakción belül),
// majd a kézbesítő elküldi. EMAIL_DRIVER=outbox esetén nem megy ki levél (fejlesztés/demó),
// csak 'logged' státuszt kap és az adminban megtekinthető.
import { query, type Db } from "./db";
import { formatDate, formatHuf } from "./format";
import type { Quote } from "./booking/pricing";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  template: string;
  bookingId?: string | null;
}

export async function queueEmail(db: Db, mail: OutgoingEmail): Promise<void> {
  if (!mail.to) return;
  await query(
    "INSERT INTO email_outbox (to_addr, subject, body_text, template, booking_id) VALUES ($1, $2, $3, $4, $5)",
    [mail.to, mail.subject, mail.text, mail.template, mail.bookingId ?? null],
    db,
  );
}

export async function deliverOutbox(limit = 20): Promise<{ sent: number; failed: number }> {
  const driver = process.env.EMAIL_DRIVER ?? "outbox";
  const rows = await query<{ id: number; to_addr: string; subject: string; body_text: string }>(
    `UPDATE email_outbox SET attempts = attempts + 1
     WHERE id IN (SELECT id FROM email_outbox WHERE status = 'queued' AND attempts < 5 ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED)
     RETURNING id, to_addr, subject, body_text`,
    [limit],
  );
  let sent = 0;
  let failed = 0;
  if (driver !== "smtp") {
    for (const r of rows) await query("UPDATE email_outbox SET status = 'logged', sent_at = now() WHERE id = $1", [r.id]);
    return { sent: rows.length, failed: 0 };
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  for (const r of rows) {
    try {
      await transport.sendMail({ from: process.env.EMAIL_FROM, to: r.to_addr, subject: r.subject, text: r.body_text });
      await query("UPDATE email_outbox SET status = 'sent', sent_at = now(), error = NULL WHERE id = $1", [r.id]);
      sent++;
    } catch (err) {
      failed++;
      await query(
        "UPDATE email_outbox SET status = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'queued' END, error = $2 WHERE id = $1",
        [r.id, String((err as Error).message).slice(0, 500)],
      );
    }
  }
  return { sent, failed };
}

// ——— Sablonok ———

interface BookingMailData {
  reference: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  quote: Quote;
  propertyName: string;
  status: string;
  manageUrl?: string;
  bankTransferInfo?: string;
  cancellationText?: string;
}

function summary(d: BookingMailData): string {
  const lines = [
    `Foglalási azonosító: ${d.reference}`,
    `Szállás: ${d.propertyName}`,
    `Érkezés: ${formatDate(d.checkIn)}`,
    `Távozás: ${formatDate(d.checkOut)} (${d.quote.nights} éjszaka)`,
    `Vendégek: ${d.adults} felnőtt${d.children ? `, ${d.children} gyermek` : ""}`,
    `Végösszeg: ${formatHuf(d.quote.total)}`,
  ];
  if (d.quote.deposit < d.quote.total) {
    lines.push(`Előleg: ${formatHuf(d.quote.deposit)}`);
    if (d.quote.balanceDueDate) lines.push(`Hátralék (${formatHuf(d.quote.balance)}) esedékessége: ${formatDate(d.quote.balanceDueDate)}`);
  }
  return lines.join("\n");
}

const SIGNATURE = "\n\nÜdvözlettel:\n[PLACEHOLDER: aláírás / szállásadó neve]\n";

export function guestRequestReceived(d: BookingMailData): Pick<OutgoingEmail, "subject" | "text"> {
  return {
    subject: `Foglalási igényét megkaptuk – ${d.reference}`,
    text:
      `Kedves ${d.guestName}!\n\nKöszönjük foglalási igényét. Hamarosan visszajelzünk az elérhetőség és a fizetés részleteivel. ` +
      `A foglalás csak a visszaigazolás után végleges.\n\n${summary(d)}` +
      (d.manageUrl ? `\n\nFoglalását itt tekintheti meg: ${d.manageUrl}` : "") +
      SIGNATURE,
  };
}

export function guestConfirmed(d: BookingMailData): Pick<OutgoingEmail, "subject" | "text"> {
  return {
    subject: `Foglalását visszaigazoltuk – ${d.reference}`,
    text:
      `Kedves ${d.guestName}!\n\nÖrömmel visszaigazoljuk foglalását.\n\n${summary(d)}` +
      `\n\nFizetési információ:\n${d.bankTransferInfo || "[PLACEHOLDER: fizetési / átutalási információ]"}` +
      `\n\nLemondási feltételek:\n${d.cancellationText || "[PLACEHOLDER: lemondási feltételek]"}` +
      (d.manageUrl ? `\n\nFoglalását itt tekintheti meg: ${d.manageUrl}` : "") +
      SIGNATURE,
  };
}

export function guestCancelled(d: BookingMailData, reason?: string | null): Pick<OutgoingEmail, "subject" | "text"> {
  return {
    subject: `Foglalás lemondva – ${d.reference}`,
    text: `Kedves ${d.guestName}!\n\nA(z) ${d.reference} azonosítójú foglalást lemondtuk.${reason ? `\nIndok: ${reason}` : ""}\n\n${summary(d)}${SIGNATURE}`,
  };
}

export function guestPaymentReceived(d: BookingMailData, amount: number): Pick<OutgoingEmail, "subject" | "text"> {
  return {
    subject: `Befizetés rögzítve – ${d.reference}`,
    text: `Kedves ${d.guestName}!\n\nRögzítettük ${formatHuf(amount)} összegű befizetését.\n\n${summary(d)}${SIGNATURE}`,
  };
}

export function adminNewBooking(d: BookingMailData, adminUrl: string): Pick<OutgoingEmail, "subject" | "text"> {
  return {
    subject: `Új foglalás (${d.status}) – ${d.reference}`,
    text: `Új foglalás érkezett a weboldalon.\n\n${summary(d)}\n\nVendég: ${d.guestName}\n\nKezelés: ${adminUrl}`,
  };
}
