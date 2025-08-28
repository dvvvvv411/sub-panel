import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface EmployeeNotificationEmailProps {
  employee_name: string;
  type: 'assignment' | 'appointment_confirmation';
  order_title?: string;
  order_number?: string;
  provider?: string;
  scheduled_at?: string;
}

export const EmployeeNotificationEmail = ({
  employee_name,
  type,
  order_title,
  order_number,
  provider,
  scheduled_at,
}: EmployeeNotificationEmailProps) => {
  const isAssignment = type === 'assignment';
  const previewText = isAssignment ? 'Neuer Auftrag zugewiesen' : 'Terminbestätigung für Ihren WhatsApp-Auftrag';

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Innovatech</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h2}>
              {isAssignment ? '✅ Neuer Auftrag zugewiesen' : '📅 Terminbestätigung'}
            </Heading>

            <Text style={greeting}>
              Hallo {employee_name},
            </Text>

            {isAssignment ? (
              <>
                <Text style={text}>
                  Ihnen wurde ein neuer Auftrag zugewiesen:
                </Text>

                <Section style={orderBox}>
                  <Text style={orderTitle}>{order_title}</Text>
                  <Text style={orderDetails}>
                    <strong>Auftragsnummer:</strong> {order_number}<br />
                    <strong>Anbieter:</strong> {provider}
                  </Text>
                </Section>

                <Text style={text}>
                  Bitte schauen Sie sich diesen Auftrag unter{' '}
                  <Link href="https://web.innovaatech.de" style={link}>
                    web.innovaatech.de
                  </Link>{' '}
                  in Ihrem persönlichen Mitarbeiter-Konto an.
                </Text>
              </>
            ) : (
              <>
                <Text style={text}>
                  Ihr Termin wurde erfolgreich gebucht und bestätigt:
                </Text>

                <Section style={appointmentBox}>
                  <Text style={appointmentTime}>
                    {scheduled_at && formatDateTime(scheduled_at)}
                  </Text>
                </Section>

                <Text style={text}>
                  <strong>Bitte bereiten Sie sich vor:</strong>
                </Text>
                <Text style={preparationList}>
                  • Sorgen Sie für eine stabile Internetverbindung<br />
                  • Suchen Sie sich einen ruhigen Ort oder Raum<br />
                  • Halten Sie einen gültigen Personalausweis bereit
                </Text>
              </>
            )}

            <Section style={buttonContainer}>
              <Button href="https://web.innovaatech.de" style={button}>
                Zum Mitarbeiter-Portal
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Diese E-Mail wurde automatisch gesendet.<br />
              Bei Fragen wenden Sie sich an Ihr Team.
            </Text>
            <Text style={footerBrand}>
              <strong>Innovatech</strong> - Ihr Partner für digitale Lösungen
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmployeeNotificationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 32px 20px',
  backgroundColor: '#2563eb',
  borderRadius: '8px 8px 0 0',
};

const content = {
  padding: '32px 32px 20px',
};

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const orderBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const appointmentBox = {
  backgroundColor: '#ecfdf5',
  border: '1px solid #10b981',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const orderTitle = {
  color: '#1e293b',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const orderDetails = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const appointmentTime = {
  color: '#065f46',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0',
};

const preparationList = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '12px 0',
  paddingLeft: '4px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  lineHeight: '24px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '20px 0',
};

const footer = {
  padding: '0 32px',
};

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const footerBrand = {
  color: '#2563eb',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
};