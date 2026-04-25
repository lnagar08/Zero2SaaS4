// emails/CardDeclined.tsx
import { Html, Body, Container, Text, Heading, Button, Section } from '@react-email/components';
import { main, container, h1, text, button, logoText } from './styles';
export const CardDeclined = ({ name }: { name: string }) => (
  <Html>
    <Body style={main}>
      <Container style={container}>
        {/* Logo Section */}
        <Section>
          <Text style={logoText}>MatterGuardian</Text>
        </Section>
        
        <Heading style={{...h1, color: '#e53e3e'}}>Payment Failed</Heading>
        <Text style={text}>Hi {name},</Text>
        <Text style={text}>
          We attempted to process your subscription payment, but your bank declined the transaction.
        </Text>
        <Text style={text}>
          To avoid any interruption to your service, please update your payment method as soon as possible.
        </Text>
        <Button href={process.env.NEXT_PUBLIC_SITE_URL} style={button}>Update Payment Method</Button>
      </Container>
    </Body>
  </Html>
);
