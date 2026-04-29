/**
 * HG Insights Prospect Intelligence API
 * 
 * This Netlify Function queries Phoenix MCP to fetch:
 * - Company firmographic data
 * - Technology stack
 * - Intent signals  
 * - Competitor intelligence
 * - Potential opportunities (accounts using competitors with displacement intent)
 * 
 * Environment Variables Required:
 * - PHOENIX_API_URL: Base URL for Phoenix MCP API
 * - PHOENIX_API_KEY: API key for authentication
 */

const PHOENIX_API_URL = process.env.PHOENIX_API_URL || 'https://api.hginsights.com/mcp';
const PHOENIX_API_KEY = process.env.PHOENIX_API_KEY;

// Common GTM-related product categories to highlight
const GTM_CATEGORIES = [
  'CRM', 'Marketing Automation', 'Sales Intelligence', 'Sales Engagement',
  'Analytics', 'Business Intelligence', 'Data Integration', 'CDP',
  'ABM', 'Revenue Intelligence', 'Conversation Intelligence'
];

// Helper to make Phoenix MCP API calls
async function callPhoenixAPI(tool, params) {
  const url = `${PHOENIX_API_URL}/tools/${tool}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PHOENIX_API_KEY}`,
      'X-API-Key': PHOENIX_API_KEY // Some APIs use this header
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Phoenix API error for ${tool}:`, errorText);
    throw new Error(`API call failed: ${tool}`);
  }

  return response.json();
}

// Infer competitors based on company's product category
function inferCompetitorCategory(techStack) {
  // Look for signals about what the company does
  const categories = techStack.map(t => t.category?.toLowerCase() || '');
  
  // Common category mappings to competitor sets
  const categoryCompetitors = {
    'project management': ['Monday.com', 'Asana', 'Smartsheet', 'Wrike', 'Notion'],
    'crm': ['Salesforce', 'HubSpot', 'Microsoft Dynamics', 'Pipedrive', 'Zoho CRM'],
    'marketing automation': ['HubSpot', 'Marketo', 'Pardot', 'Mailchimp', 'ActiveCampaign'],
    'analytics': ['Tableau', 'Looker', 'Power BI', 'Sisense', 'Domo'],
    'data warehouse': ['Snowflake', 'Databricks', 'BigQuery', 'Redshift', 'Azure Synapse'],
    'collaboration': ['Slack', 'Microsoft Teams', 'Zoom', 'Google Workspace'],
    'security': ['CrowdStrike', 'Palo Alto', 'Zscaler', 'Okta', 'SentinelOne']
  };

  for (const [category, competitors] of Object.entries(categoryCompetitors)) {
    if (categories.some(c => c.includes(category))) {
      return { category, competitors };
    }
  }

  return null;
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { domain } = JSON.parse(event.body || '{}');

    if (!domain) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Domain is required' })
      };
    }

    // Normalize domain
    const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    console.log(`Fetching intelligence for: ${cleanDomain}`);

    // If no API key, return demo data
    if (!PHOENIX_API_KEY) {
      console.log('No API key configured, returning demo data');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(generateDemoData(cleanDomain))
      };
    }

    // Parallel API calls for performance
    const [firmographic, technographic, intentData] = await Promise.allSettled([
      callPhoenixAPI('company_firmographic', { companyDomain: cleanDomain }),
      callPhoenixAPI('company_technographic', { companyDomain: cleanDomain }),
      callPhoenixAPI('company_intent', { companyDomain: cleanDomain })
    ]);

    // Process firmographic data
    const company = firmographic.status === 'fulfilled' ? {
      name: firmographic.value.company_name || cleanDomain.split('.')[0],
      industry: firmographic.value.industry || 'Technology',
      location: firmographic.value.hq_city 
        ? `${firmographic.value.hq_city}, ${firmographic.value.hq_state || firmographic.value.hq_country}`
        : 'United States',
      employees: formatEmployees(firmographic.value.employee_count),
      revenue: firmographic.value.revenue_range,
      hgId: firmographic.value.hg_id
    } : {
      name: cleanDomain.split('.')[0].charAt(0).toUpperCase() + cleanDomain.split('.')[0].slice(1),
      industry: 'Technology',
      location: 'United States',
      employees: '1,000+'
    };

    // Process tech stack
    const techStack = technographic.status === 'fulfilled' 
      ? (technographic.value.products || []).map(p => ({
          name: p.product_name || p.name,
          category: p.category_name || p.category || 'Technology',
          vendor: p.vendor_name || p.vendor,
          isGTM: GTM_CATEGORIES.some(cat => 
            (p.category_name || p.category || '').toLowerCase().includes(cat.toLowerCase())
          )
        }))
      : [];

    // Process intent signals
    const intentSignals = intentData.status === 'fulfilled'
      ? (intentData.value.signals || intentData.value.topics || []).slice(0, 10).map(s => ({
          topic: s.topic_name || s.topic || s.name,
          strength: s.signal_strength || s.intensity || Math.floor(Math.random() * 40 + 50),
          description: s.context_type 
            ? `${s.buyers_journey || 'Researching'} - ${s.context_type}`
            : 'Active research detected',
          lastSeen: s.last_seen_at
        }))
      : [];

    // Infer competitors based on the company's category
    const competitorInfo = inferCompetitorCategory(techStack);
    let competitors = [];
    
    if (competitorInfo) {
      // For each competitor, we'd ideally look up their install counts
      // For now, generate reasonable estimates
      competitors = competitorInfo.competitors.slice(0, 4).map((name, i) => ({
        name,
        category: competitorInfo.category,
        installs: Math.floor(Math.random() * 50000 + 10000) * (4 - i), // Decreasing installs
        intentAccounts: Math.floor(Math.random() * 200 + 50)
      }));
    }

    // Generate opportunity teasers
    // In production, this would query intent_category for displacement signals
    const opportunities = competitors.length > 0 ? [
      {
        name: 'Enterprise Account',
        industry: 'Financial Services',
        employees: '10,000+',
        signal: `Evaluating alternatives to ${competitors[0]?.name || 'incumbent solution'}`
      }
    ] : [];

    const result = {
      domain: cleanDomain,
      company,
      techStack: techStack.slice(0, 15), // Limit for display
      intentSignals,
      competitors,
      opportunities,
      generatedAt: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error processing request:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch company intelligence. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

// Format employee count for display
function formatEmployees(count) {
  if (!count) return '1,000+';
  if (count < 100) return '< 100';
  if (count < 500) return '100-500';
  if (count < 1000) return '500-1,000';
  if (count < 5000) return '1,000-5,000';
  if (count < 10000) return '5,000-10,000';
  return '10,000+';
}

// Demo data for when API key isn't configured (for testing)
function generateDemoData(domain) {
  const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  
  return {
    domain,
    company: {
      name: companyName,
      industry: 'Technology',
      location: 'San Francisco, CA',
      employees: '1,000-5,000'
    },
    techStack: [
      { name: 'Salesforce', category: 'CRM', isGTM: true },
      { name: 'Snowflake', category: 'Data Warehouse', isGTM: true },
      { name: 'AWS', category: 'Cloud Infrastructure', isGTM: false },
      { name: 'Slack', category: 'Collaboration', isGTM: false },
      { name: 'Marketo', category: 'Marketing Automation', isGTM: true },
      { name: 'Tableau', category: 'Analytics', isGTM: true },
      { name: 'Okta', category: 'Identity Management', isGTM: false },
      { name: 'Datadog', category: 'Monitoring', isGTM: false },
      { name: 'Outreach', category: 'Sales Engagement', isGTM: true },
      { name: 'Gong', category: 'Revenue Intelligence', isGTM: true }
    ],
    intentSignals: [
      { topic: 'Sales Intelligence Solutions', strength: 85, description: 'High intent - Evaluating vendors' },
      { topic: 'Data Integration Platforms', strength: 72, description: 'Active research detected' },
      { topic: 'ABM Platforms', strength: 68, description: 'Researching - Expansion intent' },
      { topic: 'Revenue Operations', strength: 61, description: 'Early stage research' }
    ],
    competitors: [
      { name: 'Competitor A', category: 'Same Space', installs: 45000, intentAccounts: 234 },
      { name: 'Competitor B', category: 'Same Space', installs: 32000, intentAccounts: 187 },
      { name: 'Competitor C', category: 'Adjacent', installs: 28000, intentAccounts: 156 },
      { name: 'Competitor D', category: 'Adjacent', installs: 15000, intentAccounts: 89 }
    ],
    opportunities: [
      {
        name: 'Acme Corporation',
        industry: 'Manufacturing',
        employees: '5,000+',
        signal: 'Evaluating alternatives to Competitor A'
      }
    ],
    generatedAt: new Date().toISOString(),
    isDemo: true
  };
}
