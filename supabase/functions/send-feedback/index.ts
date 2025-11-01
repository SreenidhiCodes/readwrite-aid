import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  name: string;
  email: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message }: FeedbackRequest = await req.json();

    if (!name || !email || !message) {
      throw new Error("All fields (name, email, message) are required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const feedbackEmail = Deno.env.get("FEEDBACK_EMAIL");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    
    if (!feedbackEmail) {
      throw new Error("FEEDBACK_EMAIL not configured");
    }

    console.log(`Sending feedback from ${name} (${email})`);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Feedback System <onboarding@resend.dev>',
        to: [feedbackEmail],
        reply_to: email,
        subject: `New Feedback from ${name}`,
        html: `
          <h2>New Feedback Received</h2>
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr>
          <h3>Message:</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${emailResponse.status}`);
    }

    const result = await emailResponse.json();
    console.log("Feedback email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, message: "Feedback sent successfully" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
