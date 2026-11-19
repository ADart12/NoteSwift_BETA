import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : {
  emails: {
    send: async (options) => {
      console.warn("Resend API key not configured. Mocking email send:", options.to, options.subject);
      return { success: true, message: "Email mocked because RESEND_API_KEY is not set." };
    }
  }
};
