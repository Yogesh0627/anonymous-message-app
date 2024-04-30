import { Font } from "@react-email/font";
import { Head } from "@react-email/head";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Heading } from "@react-email/heading";
import { Preview } from "@react-email/preview";
import { Row } from "@react-email/row";
import { Section } from "@react-email/section";



  
  interface VerificationEmailProps {
    username: string;
    otp: string;
  }
  
  export default function ForgotPassword({ username, otp }: VerificationEmailProps) {
    return (
      <Html lang="en" dir="ltr">
        <Head>
          <title>Forgot Password Code</title>
        
          <Font
            fontFamily="Roboto"
            fallbackFontFamily="Verdana"
            webFont={{
              url: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2',
              format: 'woff2',
            }}
            fontWeight={400}
            fontStyle="normal"
          />
        </Head>
        <Preview>Here&apos;s your forgot password code: {otp}</Preview>
        <Section>
          <Row>
            <Heading as="h2">Hello {username},</Heading>
          </Row>
          <Row>
            <Text>
            We received a request to reset your password. If this wasn&apos;t you, please ignore this email.
            To reset your password.
            </Text>
          </Row>
          <Row>
            <Text>{otp}</Text> 
          </Row>
          <Row>
            <Text>
              If you did not request this code, please ignore this email.
            </Text>
          </Row>
          {/* <Row>
            <Button
              href={`http://localhost:3000/forgot-password/${username}`}
              style={{ color: '#61dafb' }}
            >
              Verify here
            </Button>
          </Row> */}
        </Section>
      </Html>
    );
  }