// emails/SubscriptionSuccess.tsx
import { Html, Body, Container, Text, Heading, Button, Section, Hr } from '@react-email/components';
import { main, container, h1, text, button, box, details, hr, footer, logoText } from './styles';
export const SubscriptionSuccess = ({ name, planName, amount }: { name: string, planName: string, amount: string }) => (
  <Html>
    <Body style={main}>
      <Container style={container}>
        {/* Logo Section */}
        <Section>
          <Text style={logoText}>MatterGuardian</Text>
        </Section>
        
        <Heading style={h1}>Subscription Confirmed!</Heading>
        <Text style={text}>Hi {name},</Text>
        <Text style={text}>
          Great news! Your payment was successful, and your <strong>{planName}</strong> plan is now active. You have full access to all our premium features.
        </Text>
        <Section style={box}>
          <Text style={details}>Plan: {planName}</Text>
          <Text style={details}>Amount Paid: <strong>{amount}</strong></Text>
          <Text style={details}>Status: Active</Text>
        </Section>
        <Button href={process.env.NEXT_PUBLIC_SITE_URL} style={button}>Go to Dashboard</Button>
        <Hr style={hr} />
        {/*<Text style={footer}>If you have any questions about your invoice, please reply to this email.</Text>*/}
      </Container>
    </Body>
  </Html>
);
