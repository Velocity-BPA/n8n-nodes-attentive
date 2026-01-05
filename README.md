# n8n-nodes-attentive

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for Attentive, the leading SMS marketing platform with 99% open rates. Integrate your n8n workflows with Attentive's powerful SMS/MMS messaging, subscriber management, custom events, eCommerce tracking, and campaign analytics.

![n8n](https://img.shields.io/badge/n8n-community--node-orange)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.3-blue)

## Features

- **Subscriber Management**: Subscribe, unsubscribe, and manage SMS subscribers with full E.164 phone number validation
- **SMS/MMS Messaging**: Send single, bulk, and transactional messages with media support
- **Custom Events**: Track custom user events for personalized journey triggers
- **Custom Attributes**: Set and manage subscriber attributes for segmentation
- **eCommerce Tracking**: Track product views, cart actions, purchases, and abandonment
- **Segments**: Create, manage, and query subscriber segments
- **Journeys**: Monitor and manage automated messaging journeys
- **Sign-Up Units**: Track performance of sign-up forms, popups, and keywords
- **Keywords**: Manage SMS keywords for opt-in flows
- **Webhooks**: Create and manage webhooks for event notifications
- **Trigger Node**: Receive real-time webhook events from Attentive

## Installation

### Community Nodes (Recommended)

1. Go to **Settings** > **Community Nodes** in your n8n instance
2. Select **Install**
3. Enter `n8n-nodes-attentive` in the npm package name field
4. Accept the risks and click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation directory
cd ~/.n8n

# Install the package
npm install n8n-nodes-attentive
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/Velocity-BPA/n8n-nodes-attentive.git
cd n8n-nodes-attentive

# Install dependencies
npm install

# Build the project
npm run build

# Create symlink to n8n custom nodes
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-attentive

# Restart n8n
```

## Credentials Setup

### Attentive API

| Field | Description |
|-------|-------------|
| API Key | Your Attentive API key from the App Marketplace |

To obtain your API key:

1. Log in to your Attentive dashboard
2. Navigate to **Integrations** > **API Keys**
3. Create a new API key or copy an existing one
4. Enter the key in the n8n credentials dialog

## Resources & Operations

### Subscriber

| Operation | Description |
|-----------|-------------|
| Subscribe | Opt-in a new subscriber with phone number and sign-up source |
| Unsubscribe | Opt-out a subscriber from messaging |
| Get | Retrieve subscription status for a phone number |
| Update | Update subscriber attributes and preferences |

### Message

| Operation | Description |
|-----------|-------------|
| Send | Send a single SMS/MMS message |
| Send Bulk | Send messages to multiple recipients |
| Send Transactional | Send a transactional message using templates |

### Custom Event

| Operation | Description |
|-----------|-------------|
| Send | Send a custom event for journey triggers |
| Send Batch | Send multiple custom events at once |

### Custom Attribute

| Operation | Description |
|-----------|-------------|
| Set | Set custom attribute values for a subscriber |
| Set Batch | Set attributes for multiple subscribers |
| Delete | Remove a custom attribute from a subscriber |

### eCommerce

| Operation | Description |
|-----------|-------------|
| Product View | Track when a user views a product |
| Add To Cart | Track when a user adds items to cart |
| Remove From Cart | Track when a user removes items from cart |
| Purchase | Track completed purchases |
| Abandoned | Track abandoned carts or checkouts |

### Segment

| Operation | Description |
|-----------|-------------|
| Create | Create a new segment |
| Get | Get segment details |
| Get All | List all segments |
| Update | Update segment properties |
| Delete | Delete a segment |
| Get Members | Get subscribers in a segment |

### Journey

| Operation | Description |
|-----------|-------------|
| Get | Get journey details |
| Get All | List all journeys |
| Get Stats | Get journey performance statistics |

### Sign-Up Unit

| Operation | Description |
|-----------|-------------|
| Get | Get sign-up unit details |
| Get All | List all sign-up units |
| Get Stats | Get sign-up unit performance statistics |

### Keyword

| Operation | Description |
|-----------|-------------|
| Get | Get keyword details |
| Get All | List all keywords |

### Webhook

| Operation | Description |
|-----------|-------------|
| Create | Create a new webhook subscription |
| Get All | List all webhooks |
| Delete | Delete a webhook |

## Trigger Node

The Attentive Trigger node allows you to start workflows when events occur in Attentive:

**Supported Events:**
- `subscription.created` - New subscriber opted in
- `subscription.opted_out` - Subscriber opted out
- `message.sent` - Message was sent
- `message.delivered` - Message was delivered
- `message.clicked` - Link in message was clicked
- `message.replied` - Subscriber replied to message
- `message.failed` - Message delivery failed

## Usage Examples

### Subscribe a New User

```javascript
// Subscribe with phone and email
{
  "phone": "+19148440001",
  "signUpSourceId": "your-signup-source-id",
  "email": "user@example.com",
  "subscriptionType": "MARKETING",
  "customAttributes": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Send an SMS Message

```javascript
// Send a marketing message
{
  "to": "+19148440001",
  "body": "Hello! Thanks for subscribing. Reply STOP to opt out.",
  "subscriptionType": "MARKETING",
  "useShortLinks": true
}
```

### Track a Purchase

```javascript
// Track an eCommerce purchase
{
  "phone": "+19148440001",
  "orderId": "ORDER-12345",
  "items": [
    {
      "productId": "SKU123",
      "name": "Blue T-Shirt",
      "price": 29.99,
      "quantity": 2
    }
  ],
  "totalAmount": 59.98,
  "currency": "USD"
}
```

## Phone Number Format

All phone numbers must be in E.164 format:

| Valid | Invalid |
|-------|---------|
| +19148440001 | 9148440001 |
| +442071838750 | 1-914-844-0001 |
| +861012345678 | (914) 844-0001 |

The node will automatically format phone numbers, but it's recommended to provide them in E.164 format.

## Compliance Notes

- **Consent Required**: Marketing messages require explicit opt-in consent
- **Transactional Opt-in**: Transactional messages need separate opt-in
- **TCPA Compliance**: Include compliant disclosures in sign-up flows
- **Quiet Hours**: Attentive respects quiet hours (typically 9pm-9am local time)

## Error Handling

The node handles common API errors:

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Check your input parameters |
| 401 | Unauthorized - Invalid API key |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Rate Limited - Too many requests |
| 500 | Server Error - Attentive API issue |

Use the "Continue On Fail" option to handle errors gracefully in your workflows.

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint the code
npm run lint

# Fix linting issues
npm run lint:fix

# Watch mode for development
npm run dev
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)
- Email: [licensing@velobpa.com](mailto:licensing@velobpa.com)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use

Permitted for personal, educational, research, and internal business use.

### Commercial Use

Use of this node within any SaaS, PaaS, hosted platform, managed service, or paid automation offering requires a commercial license.

For licensing inquiries: **licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Documentation**: [Attentive API Docs](https://docs.attentivemobile.com/)
- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-attentive/issues)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io/)

## Acknowledgments

- [Attentive](https://attentive.com/) for their powerful SMS marketing platform
- [n8n](https://n8n.io/) for the workflow automation platform
- The n8n community for inspiration and support
