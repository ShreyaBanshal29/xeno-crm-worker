const mongoose = require('mongoose');
const Redis = require('ioredis');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error(`Error connecting to MongoDB: ${err.message}`);
        process.exit(1);
    });

// Define mongoose models (we need them in the worker too)
const CampaignSchema = new mongoose.Schema({
    name: String,
    rules: Object,
    audienceSize: Number,
    status: {
        type: String,
        enum: ['DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'DRAFT'
    }
}, { timestamps: true });

const CustomerSchema = new mongoose.Schema({
    name: String,
    email: String,
    totalSpend: Number,
    visits: Number,
    lastActiveDate: Date
}, { timestamps: true });

const Campaign = mongoose.model('Campaign', CampaignSchema);
const Customer = mongoose.model('Customer', CustomerSchema);

// Redis client for subscribing to campaign events
const redis = new Redis(process.env.REDIS_URL);

// Function to build MongoDB query from filter rules
const buildQueryFromRules = (rules) => {
    const query = {};

    Object.entries(rules).forEach(([field, rule]) => {
        if (typeof rule === 'object') {
            Object.entries(rule).forEach(([operator, value]) => {
                switch (operator) {
                    case 'gt':
                        query[field] = { ...query[field], $gt: value };
                        break;
                    case 'gte':
                        query[field] = { ...query[field], $gte: value };
                        break;
                    case 'lt':
                        query[field] = { ...query[field], $lt: value };
                        break;
                    case 'lte':
                        query[field] = { ...query[field], $lte: value };
                        break;
                    case 'eq':
                        query[field] = value;
                        break;
                    case 'ne':
                        query[field] = { ...query[field], $ne: value };
                        break;
                    default:
                        break;
                }
            });
        } else {
            query[field] = rule;
        }
    });

    return query;
};

// API endpoint for sending messages (could be internal or external)
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Process a campaign
const processCampaign = async (campaignData) => {
    try {
        const { campaignId, rules } = JSON.parse(campaignData);
        console.log(`Processing campaign: ${campaignId}`);

        // Update campaign status to PROCESSING
        await Campaign.findByIdAndUpdate(campaignId, { status: 'PROCESSING' });

        // Find customers that match the rules
        const query = buildQueryFromRules(rules);
        const customers = await Customer.find(query);

        console.log(`Found ${customers.length} customers for campaign ${campaignId}`);

        // Send message to each customer
        let successCount = 0;
        let failureCount = 0;

        for (const customer of customers) {
            try {
                // Make API call to send message
                const response = await axios.post(`${API_URL}/vendor/send`, {
                    campaignId,
                    customerId: customer._id,
                    message: `Hello ${customer.name}, we have a special offer for you!`
                });

                if (response.data.status === 'SENT') {
                    successCount++;
                } else {
                    failureCount++;
                }

                // Add small delay to prevent overloading the vendor API
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error sending message to customer ${customer._id}:`, error.message);
                failureCount++;
            }
        }

        // Update campaign status based on results
        const status = failureCount === 0 ? 'COMPLETED' : (successCount > 0 ? 'COMPLETED' : 'FAILED');

        await Campaign.findByIdAndUpdate(campaignId, { status });

        console.log(`Campaign ${campaignId} processed. Success: ${successCount}, Failures: ${failureCount}`);
    } catch (error) {
        console.error('Error processing campaign:', error);

        // Try to update campaign status if we have the ID
        try {
            const { campaignId } = JSON.parse(campaignData);
            await Campaign.findByIdAndUpdate(campaignId, { status: 'FAILED' });
        } catch (e) {
            console.error('Could not update campaign status:', e.message);
        }
    }
};

// Subscribe to campaign:new events
redis.subscribe('campaign:new', (err) => {
    if (err) {
        console.error('Failed to subscribe to Redis channel:', err);
        process.exit(1);
    }
    console.log('Subscribed to campaign:new channel');
});

// Listen for messages
redis.on('message', async (channel, message) => {
    if (channel === 'campaign:new') {
        await processCampaign(message);
    }
});

console.log('Campaign worker started');

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await redis.quit();
    await mongoose.connection.close();
    process.exit(0);
});