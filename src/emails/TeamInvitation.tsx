// emails/TeamInvitation.tsx
import { Html, Body, Container, Text, Heading, Button, Section, Head, Preview, Hr } from '@react-email/components';
import { main, container, h1, text, button, logoText } from './styles';

interface TeamInvitationProps {
  invitedByEmail?: string; 
  role: string;           // Example: 'Admin', 'Editor', 'Viewer'
  organization: string;   // Example: 'Acme Corp'
  inviteLink: string;
}

export const TeamInvitation = ({ 
  invitedByEmail = "A team member", 
  role = "Member",
  organization = "MatterGuardian Org",
  inviteLink = "#" 
}: TeamInvitationProps) => (
  <Html>
    <Head />
    <Preview>Join {organization} on MatterGuardian</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section>
          <Text style={logoText}>MatterGuardian</Text>
        </Section>

        <Heading style={h1}>Team Invitation</Heading>
        
        <Text style={text}>
          Hi there,
        </Text>
        <Text style={text}>
          <strong>{invitedByEmail}</strong> has invited you to join <strong>{organization}</strong> as an <strong>{role}</strong>.
        </Text>

        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button href={inviteLink} style={button}>
            Join {organization}
          </Button>
        </Section>

        <Text style={{ ...text, fontSize: '14px', color: '#666' }}>
          <strong>Role details:</strong> As an {role}, you will have access to the team's shared resources according to your permission level.
        </Text>

        <Hr style={{ borderTop: '1px solid #eee', margin: '30px 0' }} />
        <Text style={{ ...text, fontSize: '12px', color: '#888', textAlign: 'center' as const }}>
          MatterGuardian
        </Text>
      </Container>
    </Body>
  </Html>
);
