import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Bot webhook received:', JSON.stringify(event, null, 2));

  try {
    // Parse the webhook body
    const body = event.body ? JSON.parse(event.body) : {};
    console.log('Telegram update:', JSON.stringify(body, null, 2));

    // For now, just acknowledge the webhook
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
