import * as styles from "./styles";
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

interface WelcomeEmailProps {
  name: string;
  dashboardUrl?: string;
}

export const WelcomeEmail = ({
  name = "there",
  dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.matterguardian.com/dashboard",
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Your MatterGuardian account is ready. Here's how to get started in under 5 minutes.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        {/* Header / Brand bar */}
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
          <Heading style={styles.h1}>Welcome aboard, {name}.</Heading>
          <Text style={styles.paragraph}>
            Your MatterGuardian account is set up and ready. You're a few minutes away from seeing every active matter in your firm at a glance — and knowing exactly which ones need your attention today.
          </Text>
          <Text style={styles.paragraph}>
            Here's the fastest path to your first "aha" moment:
          </Text>

          {/* Steps */}
          {[
            { n: "1", t: "Set up your first workflow.", d: "Define the stages a matter moves through at your firm." },
            { n: "2", t: "Add a few active matters.", d: "Even three or four is enough to see the dashboard come alive." },
            { n: "3", t: "Check the At Flow Risk filter.", d: "This is where MatterGuardian earns its name." },
          ].map((step) => (
            <Row key={step.n} style={styles.stepRow}>
              <Column style={{ width: "32px", verticalAlign: "top" }}>
                <span style={styles.stepBadge}>{step.n}</span>
              </Column>
              <Column>
                <Text style={styles.stepText}>
                  <strong style={{ color: "#1b1c30" }}>{step.t}</strong> {step.d}
                </Text>
              </Column>
            </Row>
          ))}

          {/* CTA Button */}
          <Section style={{ margin: "28px 0" }}>
            <Link href={dashboardUrl} style={styles.button}>
              Open your dashboard →
            </Link>
          </Section>

          <Text style={styles.paragraph}>
            Questions, feedback, or stuck on something? Email me anytime at{" "} 
            <Link href="mailto:hello@matterguardian.com" style={styles.link}>hello@matterguardian.com</Link>.
          </Text>
          <Text style={styles.paragraph}>— Erik Weingold, Founder</Text>
        </Section>

        {/* Footer */}
        <Section style={styles.footerWrapper}>
          <Text style={styles.footerBrand}>MatterGuardian</Text>
          <Text style={styles.footerText}>
            This email was sent from an unmonitored address. For help, contact{" "}
            <Link href="mailto:hello@matterguardian.com" style={styles.footerLink}>hello@matterguardian.com</Link>
          </Text>
          <Text style={styles.footerSubtext}>You're receiving this because you signed up for MatterGuardian.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;
