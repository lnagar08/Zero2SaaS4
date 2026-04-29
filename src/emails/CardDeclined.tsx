import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";
import * as styles from "./styles";

interface PaymentFailedEmailProps {
  firstName: string;
  planName: string;
  amount: string;
  cardBrand: string;
  cardLast4: string;
  declineReason: string;
  nextRetryDate: string;
  updatePaymentUrl?: string;
  gracePeriodEndDate: string;
}

export const PaymentFailedEmail = ({
  firstName,
  planName,
  amount,
  cardBrand,
  cardLast4,
  declineReason,
  nextRetryDate,
  updatePaymentUrl= process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/settings?tab=billing&success=true` : "https://app.matterguardian.com/settings?tab=billing&success=true",
  gracePeriodEndDate,
}: PaymentFailedEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Your card was declined. We'll retry on {nextRetryDate} — update your payment method to avoid losing access.
    </Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        {/* Header */}
        <Section style={styles.header}>
          <Row>
            <Column style={{ width: "42px" }}>
              <span style={styles.logoIcon}>⇄</span>
            </Column>
            <Column>
              <Text style={styles.logoText}>MatterGuardian</Text>
            </Column>
          </Row>
        </Section>

        {/* Alert Banner */}
        <Section style={styles.alertBanner}>
          <Text style={styles.alertText}>⚠ Action needed</Text>
        </Section>

        {/* Body Content */}
        <Section style={styles.content}>
          <Heading style={styles.h1}>We couldn't process your payment.</Heading>

          <Text style={styles.paragraph}>Hi {firstName},</Text>

          <Text style={styles.paragraph}>
            Your bank declined the charge for your <strong style={styles.bold}>{planName}</strong> subscription. This usually means an expired card, a hold from your bank, or insufficient funds — most of the time it's a quick fix.
          </Text>

          {/* Decline Details Box */}
          <Section style={styles.receiptBox}>
            <Row style={styles.receiptRow}>
              <Column style={styles.label}>Amount</Column>
              <Column style={styles.value}>{amount}</Column>
            </Row>
            <Row style={styles.receiptRow}>
              <Column style={styles.label}>Card on file</Column>
              <Column style={styles.value}>{cardBrand} ending in {cardLast4}</Column>
            </Row>
            <Row style={styles.receiptRow}>
              <Column style={styles.label}>Reason from bank</Column>
              <Column style={styles.value}>{declineReason}</Column>
            </Row>
            <Row style={styles.hr}>
              <Column style={styles.label}>Next automatic retry</Column>
              <Column style={styles.value}>{nextRetryDate}</Column>
            </Row>
          </Section>

          {/* CTA Button */}
          <Section style={{ margin: "0 0 24px 0" }}>
            <Link href={updatePaymentUrl} style={styles.button}>
              Update payment method →
            </Link>
          </Section>

          <Text style={{ ...styles.paragraph, fontSize: "14px" }}>
            <strong style={styles.bold}>What happens next:</strong> we'll automatically retry on {nextRetryDate}. If that also fails, your subscription will pause on <strong style={styles.bold}>{gracePeriodEndDate}</strong> and you'll lose access until payment is resolved. Your data stays safe either way.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={styles.footerWrapper}>
          <Text style={styles.footerBrand}>MatterGuardian</Text>
          <Text style={styles.footerText}>
            This email was sent from an unmonitored address. For help, contact{" "}
            <Link href="mailto:hello@matterguardian.com" style={styles.footerLink}>
              hello@matterguardian.com
            </Link>.
          </Text>
          <Text style={styles.footerSubtext}>
            This is a transactional email about your account.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default PaymentFailedEmail;
