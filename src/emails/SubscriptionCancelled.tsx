// emails/SubscriptionCancelled.tsx
import { Html, Body, Container, Text, Heading, Button, Section } from '@react-email/components';
import { main, container, h1, text, secondaryButton, logoText } from './styles';
export const SubscriptionCancelled = ({ name, expiryDate }: { name: string, expiryDate: string }) => (
  <Html>
    <Body style={main}>
      <Container style={container}>
        {/* Logo Section */}
        <Section>
          <Text style={logoText}>MatterGuardian</Text>
        </Section>
        
        <Heading style={h1}>Subscription Cancelled</Heading>
        <Text style={text}>Hello {name},</Text>
        <Text style={text}>
          As requested, your subscription has been cancelled. You will still have access to your premium features until <strong>{expiryDate}</strong>.
        </Text>
        <Text style={text}>We are sorry to see you go! Was there something we could have done better?</Text>
        <Button href={process.env.NEXT_PUBLIC_SITE_URL} style={secondaryButton}>Renew Subscription</Button>
      </Container>
    </Body>
  </Html>
);
