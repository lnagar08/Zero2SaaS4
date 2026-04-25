// emails/WelcomeEmail.tsx
import { Html, Body, Container, Text, Heading, Button, Section } from '@react-email/components';
import { main, container, h1, text, button, logoText } from './styles';
export const WelcomeEmail = ({ name }: { name: string }) => (
  <Html>
    <Body style={main}>
      <Container style={container}>
        {/* Logo Section */}
        <Section>
          <Text style={logoText}>MatterGuardian</Text>
        </Section>
        
        <Heading style={h1}>Welcome to MatterGuardian! 🚀</Heading>
        <Text style={text}>Hi {name},</Text>
        <Text style={text}>
          We're thrilled to have you here! Your account is officially set up and ready to go.
        </Text>
        <Text style={text}>
          Start exploring your dashboard to see what you can build today.
        </Text>
        <Button href={process.env.NEXT_PUBLIC_SITE_URL} style={button}>Get Started</Button>
      </Container>
    </Body>
  </Html>
);
