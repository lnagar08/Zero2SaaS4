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

interface CancellationEmailProps {
  firstName: string;
  planName: string;
  accessEndDate: string;
  renewUrl?: string;
}

export const CancellationEmail = ({
  firstName,
  planName,
  accessEndDate,
  renewUrl = process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/settings?tab=billing&success=true` : "https://app.matterguardian.com/settings?tab=billing&success=true",
}: CancellationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Cancellation confirmed. You keep access through {accessEndDate}.
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

        {/* Body Content */}
        <Section style={styles.content}>
          <Heading style={styles.h1}>Your cancellation is confirmed.</Heading>

          <Text style={styles.paragraph}>Hi {firstName},</Text>

          <Text style={styles.paragraph}>
            We've cancelled your <strong style={{ color: "#1b1c30" }}>{planName}</strong> subscription as requested. You'll keep full access through <strong style={{ color: "#1b1c30" }}>{accessEndDate}</strong> — after that, your account will switch to read-only and your data will be preserved for 90 days in case you come back.
          </Text>

          {/* Cancellation Details Table */}
          <Section style={styles.receiptBox}>
            <Row style={styles.receiptRow}>
              <Column style={styles.label}>Access until</Column>
              <Column style={styles.value}>{accessEndDate}</Column>
            </Row>
            <Row style={styles.receiptRow}>
              <Column style={styles.label}>Final charge</Column>
              <Column style={styles.value}>None — no further charges</Column>
            </Row>
            <Row style={styles.receiptRow}>
              <Column style={styles.label}>Data retention</Column>
              <Column style={styles.value}>90 days from {accessEndDate}</Column>
            </Row>
          </Section>

          <Heading as="h2" style={styles.h2}>Mind telling us why?</Heading>
          <Text style={{ ...styles.paragraph, fontSize: "15px" }}>
            MatterGuardian is still early, and the most useful thing you could do right now is tell us what didn't work. One sentence is plenty — email me directly at{" "}
            <Link href="mailto:hello@matterguardian.com" style={styles.link}>
              hello@matterguardian.com
            </Link>.
          </Text>

          {/* Secondary Button (Outline) */}
          <Section style={{ margin: "0 0 24px 0" }}>
            <Link href={renewUrl} style={styles.secondaryButton}>
              Reactivate subscription
            </Link>
          </Section>

          <Text style={styles.paragraph}>— Erik Weingold, Founder</Text>
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
        </Section>
      </Container>
    </Body>
  </Html>
);

export default CancellationEmail;
