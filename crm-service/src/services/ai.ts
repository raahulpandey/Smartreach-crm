import { OpenAI } from 'openai';
import { SegmentRules } from '../../../shared/types';

// Instantiate OpenAI client. It will fail gracefully if apiKey is missing
const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * Heuristic/Regex based fallback parser when OpenAI API key is not provided.
 * Handles patterns like:
 * - "spent more than 5000" -> spend.gt = 5000
 * - "inactive for 90 days" -> inactiveDays = 90
 * - "age under 30" -> age.lt = 30
 * - "lives in London" -> city = "London"
 */
function parseSegmentPromptHeuristics(prompt: string): { rules: SegmentRules; explanation: string } {
  const cleanPrompt = prompt.toLowerCase();
  const rules: SegmentRules = {};
  const explanationParts: string[] = [];

  // Parse Spend
  const spendGtRegex = /(?:spent|spend|purchased|bought)(?:\s+more\s+than|\s*>\s*)(\d+)/i;
  const spendLtRegex = /(?:spent|spend|purchased|bought)(?:\s+less\s+than|\s*<\s*)(\d+)/i;
  
  const spendGtMatch = cleanPrompt.match(spendGtRegex);
  if (spendGtMatch) {
    const val = parseFloat(spendGtMatch[1]);
    rules.spend = rules.spend || {};
    rules.spend.gt = val;
    explanationParts.push(`Total spend is greater than $${val}`);
  }

  const spendLtMatch = cleanPrompt.match(spendLtRegex);
  if (spendLtMatch) {
    const val = parseFloat(spendLtMatch[1]);
    rules.spend = rules.spend || {};
    rules.spend.lt = val;
    explanationParts.push(`Total spend is less than $${val}`);
  }

  // Parse Age
  const ageGtRegex = /(?:age|aged|older\s+than|older)(?:\s+greater\s+than|\s*>\s*|\s+over\s+)(\d+)/i;
  const ageLtRegex = /(?:age|aged|younger\s+than|younger|under)(?:\s+less\s+than|\s*<\s*|\s+under\s+)(\d+)/i;

  const ageGtMatch = cleanPrompt.match(ageGtRegex);
  if (ageGtMatch) {
    const val = parseInt(ageGtMatch[1], 10);
    rules.age = rules.age || {};
    rules.age.gt = val;
    explanationParts.push(`Age is greater than ${val}`);
  }

  const ageLtMatch = cleanPrompt.match(ageLtRegex);
  if (ageLtMatch) {
    const val = parseInt(ageLtMatch[1], 10);
    rules.age = rules.age || {};
    rules.age.lt = val;
    explanationParts.push(`Age is less than ${val}`);
  }

  // Parse City
  const cityRegex = /(?:in|lives\s+in|living\s+in|from)\s+([a-zA-z\s]+?)(?:\s+and|\s+who|\s+aged|\s+spent|\s+inactive|\.|$)/i;
  const cityMatch = prompt.match(cityRegex); // Use case-sensitive prompt for correct capitalisation
  if (cityMatch) {
    const city = cityMatch[1].trim();
    // Exclude noise words
    const noiseWords = ['who', 'customers', 'spent', 'bought', 'last', 'month', 'days', 'years', 'more', 'less', 'than'];
    if (!noiseWords.includes(city.toLowerCase())) {
      rules.city = city;
      explanationParts.push(`Living in ${city}`);
    }
  }

  // Parse Inactive Days
  const inactiveRegex = /(?:inactive|not\s+purchased|no\s+orders?)(?:\s+for|\s+in)?\s+(?:the\s+last\s+)?(\d+)\s*days/i;
  const inactiveMatch = cleanPrompt.match(inactiveRegex);
  if (inactiveMatch) {
    const days = parseInt(inactiveMatch[1], 10);
    rules.inactiveDays = days;
    explanationParts.push(`Inactive for at least ${days} days`);
  }

  // Fallback default
  if (Object.keys(rules).length === 0) {
    rules.spend = { gt: 1000 };
    explanationParts.push('Spent more than $1000 (Default Fallback)');
  }

  return {
    rules,
    explanation: `Targeting customers where: ${explanationParts.join(' AND ')}`
  };
}

/**
 * Parses natural language input to build customer segment rules.
 */
export async function parseSegmentPrompt(prompt: string): Promise<{ rules: SegmentRules; explanation: string }> {
  if (!openai) {
    console.log('OpenAI key missing. Using rule-based heuristic fallback.');
    return parseSegmentPromptHeuristics(prompt);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert CRM database rules builder. Convert the user's natural language request into structured filter criteria rules in JSON format.
          The schema of rules JSON is:
          {
            "spend": { "gt": number, "lt": number },
            "age": { "gt": number, "lt": number },
            "city": "string",
            "inactiveDays": number
          }
          Only include keys present in the user request. For example, "spent more than 5000" -> { "spend": { "gt": 5000 } }.
          Return a JSON object with two fields:
          1. "rules": The JSON rules object.
          2. "explanation": A clear human-readable string explaining what the segment targets.
          Response MUST be valid JSON only. Do not include markdown code block syntax.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    const data = JSON.parse(response.choices[0].message.content || '{}');
    return {
      rules: data.rules || {},
      explanation: data.explanation || 'Audience selected by AI rules.'
    };
  } catch (error) {
    console.error('OpenAI segment parse error, falling back to heuristics:', error);
    return parseSegmentPromptHeuristics(prompt);
  }
}

/**
 * Generates personalized marketing copy based on the segment description and campaign goals.
 */
export async function generateCampaignCopy(
  campaignName: string,
  segmentName: string,
  channel: string,
  description: string
): Promise<string> {
  if (!openai) {
    console.log('OpenAI key missing. Generating copy using prebuilt templates.');
    
    // Heuristic fallbacks based on campaign & channel names
    const nameLower = campaignName.toLowerCase();
    let template = '';
    
    if (nameLower.includes('discount') || nameLower.includes('sale')) {
      if (channel === 'EMAIL') {
        template = `Subject: Special VIP Sale Inside! 🌟\n\nHi [Customer Name],\n\nBecause you are one of our top customers in ${segmentName}, we're excited to offer you an exclusive 20% discount on our entire collection!\n\nUse code VIP20 at checkout. Click here to shop now: https://smartreach.ai/shop\n\nCheers,\nSmartReach Retail Team`;
      } else if (channel === 'SMS' || channel === 'WHATSAPP') {
        template = `Hi [Customer Name]! Exclusive VIP Sale: Get 20% off with code VIP20. Shop now: smartreach.ai/shop. Opt-out reply STOP.`;
      } else {
        template = `Hello [Customer Name]! As a VIP customer, enjoy a premium 20% savings. Tap to view products: https://smartreach.ai/shop`;
      }
    } else if (nameLower.includes('winback') || nameLower.includes('re-engage') || nameLower.includes('miss')) {
      if (channel === 'EMAIL') {
        template = `Subject: We miss you! Here is $10 on us 🎁\n\nHi [Customer Name],\n\nIt has been a while since your last purchase. We would love to welcome you back! Here is a $10 gift voucher valid for the next 7 days.\n\nUse code WE_MISS_YOU at checkout. Shop: https://smartreach.ai/shop\n\nWarmly,\nSmartReach Team`;
      } else {
        template = `Hi [Customer Name], we miss you! Here is a $10 coupon for your next purchase. Use code WE_MISS_YOU. Shop here: smartreach.ai/shop`;
      }
    } else {
      // General Template
      if (channel === 'EMAIL') {
        template = `Subject: New Updates from SmartReach\n\nHi [Customer Name],\n\nWe have exciting new collections curated just for you. Explore our new catalogs and grab your favorites today!\n\nShop: https://smartreach.ai/shop\n\nBest regards,\nSmartReach`;
      } else {
        template = `Hello [Customer Name]! Check out our new releases at SmartReach. Order today for free delivery: smartreach.ai/shop`;
      }
    }
    return template;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert copywriter. Write a highly converting personalized marketing message.
          The user will specify the Campaign Name, Segment Name, Channel, and description.
          Make sure to personalize the message by using the placeholder "[Customer Name]" where appropriate (it will be replaced dynamically later).
          Adjust your tone based on the channel:
          - EMAIL: Include a "Subject:" line, followed by double line breaks, and a professional email body with a greeting and call to action.
          - SMS: Max 160 characters. Punchy, short, clear.
          - WHATSAPP: Catchy, emojis, conversational, medium length.
          - RCS: Rich and visual text, clear actionable call-to-action button text included at the bottom.
          Provide ONLY the copy of the message itself. No commentary.`
        },
        {
          role: 'user',
          content: `Campaign Name: ${campaignName}\nSegment Name: ${segmentName}\nChannel: ${channel}\nDescription/Context: ${description}`
        }
      ]
    });

    return response.choices[0].message.content || 'Hello [Customer Name]! Check out our latest products.';
  } catch (error) {
    console.error('OpenAI copy generation error:', error);
    return `Hi [Customer Name]! Exclusive Campaign: Enjoy special benefits. Details at: smartreach.ai`;
  }
}

/**
 * Recommends marketing campaign strategies based on current database insights.
 */
export async function suggestCampaigns(segmentName: string, description: string): Promise<any[]> {
  if (!openai) {
    // Return standard list of recommendations
    return [
      {
        title: 'Exclusive Rewards Promotion',
        channel: 'WHATSAPP',
        message: 'Hi [Customer Name]! Since you are in our VIP group, enjoy early access to our luxury drop. Code: EXCLUSIVE',
        rationale: 'WhatsApp has high open rates for VIP consumers.'
      },
      {
        title: 'Win-back Engagement Discount',
        channel: 'EMAIL',
        message: 'Subject: We miss you! Take 15% off inside...\n\nHi [Customer Name],\n\nCome back and check out what is new. Use code COMEBACK15.',
        rationale: 'Email allows for long-form explanation and voucher attachments.'
      }
    ];
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI growth marketer. Recommend 2 tailored campaign concepts for a segment.
          The segment name is: "${segmentName}" and it is described as: "${description}".
          Provide a JSON response representing an array of 2 campaign suggestions.
          Each object in the array should contain:
          1. "title": The campaign title
          2. "channel": Recommended channel (must be one of: WHATSAPP, SMS, EMAIL, RCS)
          3. "message": A sample generated personalized message (using "[Customer Name]" placeholders)
          4. "rationale": Why this campaign fits this specific segment.
          Response MUST be valid JSON only. Do not include markdown code block syntax.`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const data = JSON.parse(response.choices[0].message.content || '{}');
    return data.suggestions || data.campaigns || data;
  } catch (error) {
    console.error('OpenAI suggest campaigns error:', error);
    return [
      {
        title: 'AI Special Discount Offer',
        channel: 'SMS',
        message: 'Hi [Customer Name]! Special offer for you: Get 10% off using code SMART10.',
        rationale: 'Quick, low-barrier incentive to drive repeat purchases.'
      }
    ];
  }
}
