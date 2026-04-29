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

interface SubscriptionSuccessProps {
  isTrial: boolean;
  trialDays?: string;
  planName: string;
  firstName: string;
  firstChargeAmount: string;
  firstChargeDate: string;
  periodStart: string;
  periodEnd: string;
  amountPaid: string;
  dashboardUrl?: string;
  billingUrl?: string;
}

export const SubscriptionSuccess = ({
  isTrial,
  trialDays,
  planName,
  firstName,
  firstChargeAmount,
  firstChargeDate,
  periodStart,
  periodEnd,
  amountPaid,
  dashboardUrl=process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` : "https://app.matterguardian.com/dashboard",
  billingUrl=process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/settings?tab=billing&success=true` : "https://app.matterguardian.com/settings?tab=billing&success=true",
}: SubscriptionSuccessProps) => {
  const previewText = isTrial 
    ? `Your ${trialDays}-day trial is active. Card not charged today.` 
    : "Subscription confirmed.";
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
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

          {/* Body Content */}
          <Section style={styles.content}>
            <Heading style={styles.h1}>
              {isTrial ? "Your trial is active." : "Subscription confirmed."}
            </Heading>

            <Text style={styles.paragraph}>Hi {firstName},</Text>

            {isTrial ? (
              <Text style={styles.paragraph}>
                Your <strong style={{ color: "#1b1c30" }}>{trialDays}-day {planName} trial</strong> is now active. You have full access to every feature — no limits, nothing held back. Your card will be charged <strong style={{ color: "#1b1c30" }}>{firstChargeAmount}</strong> on <strong style={{ color: "#1b1c30" }}>{firstChargeDate}</strong> unless you cancel before then.
              </Text>
            ) : (
              <Text style={styles.paragraph}>
                Your payment was processed and your <strong style={{ color: "#1b1c30" }}>{planName}</strong> subscription is active. Receipt details below.
              </Text>
            )}

            {/* Receipt Table */}
            <Section style={styles.receiptBox}>
              <Row style={styles.receiptRow}>
                <Column style={styles.label}>Plan</Column>
                <Column style={styles.value}>{planName}</Column>
              </Row>
              <Row style={styles.receiptRow}>
                <Column style={styles.label}>{isTrial ? "Trial period" : "Billing cycle"}</Column>
                <Column style={styles.value}>{periodStart} – {periodEnd}</Column>
              </Row>
              <Row style={styles.receiptRow}>
                <Column style={styles.label}>{isTrial ? "Charged today" : "Amount paid"}</Column>
                <Column style={styles.value}>{amountPaid}</Column>
              </Row>
              {isTrial && (
                <Row style={styles.receiptRow}>
                  <Column style={styles.label}>Next charge</Column>
                  <Column style={styles.value}>{firstChargeAmount} on {firstChargeDate}</Column>
                </Row>
              )}
              <Row style={styles.hr}>
                <Column style={styles.label}>Status</Column>
                <Column style={{ textAlign: "right" }}>
                  <span style={styles.statusBadge}>Active</span>
                </Column>
              </Row>
            </Section>

            {/* CTA */}
            <Section style={{ margin: "0 0 24px 0" }}>
              <Link href={dashboardUrl} style={styles.button}>
                Go to dashboard →
              </Link>
            </Section>

            <Text style={{ ...styles.paragraph, fontSize: "14px", color: "#5a5d72" }}>
              {isTrial ? (
                <>
                  Need to cancel before the trial ends? You can do it anytime from{" "}
                  <Link href={billingUrl} style={styles.link}>Billing settings</Link> — no email required.
                </>
              ) : (
                <>
                  Manage your subscription anytime in{" "}
                  <Link href={billingUrl} style={styles.link}>Billing settings</Link>.
                </>
              )}
            </Text>
          </Section>

          {/* Footer ( reusing previous logic) */}
          <Section style={styles.footerWrapper}>
             <Text style={styles.footerBrand}>MatterGuardian</Text>
             <Text style={styles.footerText}>
                This email was sent from an unmonitored address. For billing questions, contact{" "}
                <Link href="mailto:hello@matterguardian.com" style={styles.footerLink}>hello@matterguardian.com</Link>.
             </Text>
             <Text style={styles.footerSubtext}>
                This is a transactional email about your account.
             </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default SubscriptionSuccess;
