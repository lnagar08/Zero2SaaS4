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

interface InviteEmailProps {
  inviterName: string;
  firmName: string;
  recipientFirstName?: string;
  roleLabel: string;
  //roleDescription: string;
  acceptUrl: string;
}

export const TeamInvitation = ({
  inviterName,
  firmName,
  recipientFirstName,
  roleLabel,
  //roleDescription,
  acceptUrl,
}: InviteEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {inviterName} invited you to join {firmName} on MatterGuardian.
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
          <Heading style={styles.h1}>You've been invited to {firmName}.</Heading>

          <Text style={styles.paragraph}>
            Hi{recipientFirstName ? ` ${recipientFirstName}` : ""},
          </Text>

          <Text style={styles.paragraph}>
            <strong style={styles.bold}>{inviterName}</strong> has invited you to join{" "}
            <strong style={styles.bold}>{firmName}</strong> on MatterGuardian as a{" "}
            <strong style={styles.bold}>{roleLabel}</strong>.
          </Text>

          {/* Role Box */}
          <Section style={styles.receiptBox}>
            <Text style={styles.roleBadgeLabel}>Your role</Text>
            <Text style={styles.roleTitle}>{roleLabel}</Text>
            
          </Section>

          {/* Accept Button */}
          <Section style={{ margin: "0 0 24px 0" }}>
            <Link href={acceptUrl} style={styles.button}>
              Accept invitation →
            </Link>
          </Section>

          {/* Expiration and Fallback link */}
          <Text style={styles.smallText}>
            This invitation expires in 7 days. If you weren't expecting it, you can safely ignore this email.
          </Text>
          <Text style={{ ...styles.smallText, margin: 0 }}>
            Trouble with the button? Paste this into your browser:<br />
            <span style={{ color: "#1d2027", wordBreak: "break-all" }}>{acceptUrl}</span>
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
        </Section>
      </Container>
    </Body>
  </Html>
);

export default TeamInvitation;
